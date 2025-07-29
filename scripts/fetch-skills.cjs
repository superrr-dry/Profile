#!/usr/bin/env node

/**
 * GitHub Actions用のスキルデータ取得スクリプト
 * Google Sheets APIから安全にデータを取得し、静的JSONファイルを生成
 */

const https = require('https');
const crypto = require('crypto');

// 環境変数から設定を取得
const config = {
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
  projectId: process.env.GOOGLE_PROJECT_ID,
  spreadsheetId: process.env.GOOGLE_SHEETS_ID,
};

// 設定検証
function validateConfig() {
  const missing = [];
  if (!config.clientEmail) missing.push('GOOGLE_CLIENT_EMAIL');
  if (!config.privateKey) missing.push('GOOGLE_PRIVATE_KEY');
  if (!config.projectId) missing.push('GOOGLE_PROJECT_ID');
  if (!config.spreadsheetId) missing.push('GOOGLE_SHEETS_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }

  // 秘密鍵のフォーマット検証
  if (!config.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('❌ Invalid private key format. Make sure it includes proper PEM headers.');
    process.exit(1);
  }
}

// Base64URL エンコード
function base64UrlEncode(data) {
  if (typeof data === 'string') {
    data = Buffer.from(data, 'utf8');
  }
  return data.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// JWT作成
function createJWT() {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto.sign('RSA-SHA256', Buffer.from(data), config.privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${data}.${encodedSignature}`;
}

// アクセストークン取得
async function getAccessToken() {
  const jwt = createJWT();
  
  const postData = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const tokenData = JSON.parse(body);
          resolve(tokenData.access_token);
        } else {
          reject(new Error(`Token request failed: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// スプレッドシートデータ取得
async function fetchSpreadsheetData(accessToken) {
  // メタデータ取得
  const metadata = await httpsRequest(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}`, {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });

  // シート名決定
  const targetSheet = metadata.sheets?.find(sheet => 
    sheet.properties.title === '経歴書'
  );
  const sheetName = targetSheet ? targetSheet.properties.title : metadata.sheets[0].properties.title;

  // データ取得
  const range = encodeURIComponent(`'${sheetName}'!A:AP`);
  const data = await httpsRequest(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}`, {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });

  if (!data.values || data.values.length === 0) {
    throw new Error('No data found in spreadsheet');
  }

  return parseSpreadsheetData(data.values);
}

// HTTPS リクエスト
function httpsRequest(url, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Request failed: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// スプレッドシートデータ解析
function parseSpreadsheetData(rows) {
  const skillMap = new Map();

  for (const [i, row] of rows.entries()) {
    if (!row || row.length < 37) continue;

    const projectNumber = row[0]?.trim();
    const projectName = row[6]?.trim();
    
    if (!/^\d+$/.test(projectNumber) || !projectName) continue;

    // 期間を探す
    const periodSearchLimit = Math.min(i + 6, rows.length);
    const searchRows = rows.slice(i + 1, periodSearchLimit);
    const periodRow = searchRows.find(checkRow => 
      checkRow && checkRow[2] && /\d+年\d+ヶ月|\d+ヶ月/.test(checkRow[2])
    );
    const period = periodRow ? periodRow[2].trim() : '';

    // 技術データを取得
    const languages = row[28] || '';
    const frameworks = row[32] || '';
    const servers = row[36] || '';

    // スキル抽出
    extractSkills(languages, period, 'backend', skillMap);
    extractSkills(frameworks, period, 'tools', skillMap);
    extractSkills(servers, period, 'devops', skillMap);
  }

  // スキル配列に変換
  const skills = [];
  skillMap.forEach((data, skillName) => {
    const totalMonths = calculateTotalMonths(data.periods);
    
    skills.push({
      name: skillName,
      level: totalMonths,
      category: data.category,
      experience: formatExperience(totalMonths)
    });
  });

  return skills.sort((a, b) => b.level - a.level);
}

// スキル抽出
function extractSkills(skillText, period, category, skillMap) {
  if (!skillText) return;

  const skills = skillText
    .split(/\n/)
    .map(skill => skill.trim())
    .filter(skill => skill && skill !== '')
    .map(skill => {
      const cleaned = skill
        .replace(/\s*\d+(\.\d+)*\s*,?\s*\d+(\.\d+)*\s*$/, '')
        .replace(/\s*\d+(\.\d+)*\s*,?\s*$/, '')
        .replace(/\s+\d+(\.\d+)*$/, '')
        .replace(/^[\s\-・]+/, '')
        .trim();
      return cleaned;
    })
    .filter(skill => skill.length > 1);

  skills.forEach(skillName => {
    const normalizedCategory = normalizeSkillCategory(skillName, category);
    const normalizedSkillName = normalizeSkillName(skillName);
    
    const existingEntry = Array.from(skillMap.entries()).find(([key]) => 
      normalizeSkillName(key) === normalizedSkillName
    );
    const existingKey = existingEntry ? existingEntry[0] : '';
    
    if (existingKey) {
      skillMap.get(existingKey).periods.push(period);
    } else {
      skillMap.set(skillName, {
        periods: [period],
        category: normalizedCategory
      });
    }
  });
}

// 合計月数計算
function calculateTotalMonths(periods) {
  return periods.reduce((total, period) => {
    const months = parseMonthsFromPeriod(period);
    return total + months;
  }, 0);
}

// 期間から月数解析
function parseMonthsFromPeriod(period) {
  if (!period) return 0;

  const yearMatch = period.match(/(\d+)年/);
  const monthMatch = period.match(/(\d+)ヶ月/);
  
  const years = yearMatch ? parseInt(yearMatch[1]) : 0;
  const months = monthMatch ? parseInt(monthMatch[1]) : 0;
  
  return years * 12 + months;
}

// 経験値フォーマット
function formatExperience(months) {
  if (months < 12) {
    return `${months}ヶ月`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years}年`;
  }
  
  return `${years}年${remainingMonths}ヶ月`;
}

// スキルカテゴリー正規化
function normalizeSkillCategory(skillName, defaultCategory) {
  const skill = skillName.toLowerCase().trim();
  
  if (/^(php|python|java|ruby|go|rust|c#|c\+\+|sql)$/i.test(skill)) {
    return 'backend';
  }
  
  if (/^(javascript|typescript)$/i.test(skill)) {
    return 'frontend';
  }
  
  if (/^(swift|kotlin|objective-c)$/i.test(skill)) {
    return 'mobile';
  }
  
  if (/^(react|vue|angular|html|css|scss|sass|less|jquery|svelte|next\.?js?|nuxt\.?js?|vite|webpack|parcel|rollup|babel|tailwind|bootstrap|mui|material.ui|styled.components|emotion|chakra.ui|ant.design|blade|twig|smarty|wireui|livewire|react.hook.form|react.router.dom|playwright)$/i.test(skill)) {
    return 'frontend';
  }
  
  if (/^(laravel|symfony|codeigniter|rails|django|flask|fastapi|spring|express|nest\.?js?|koa|hapi|gin|echo|fiber|asp\.?net|node|node\.js|pest|phpunit|php.unit)$/i.test(skill)) {
    return 'backend';
  }
  
  if (/^(react.native|flutter|expo|swiftui|jetpack.compose|xamarin|ionic|cordova|phonegap|android|ios)$/i.test(skill)) {
    return 'mobile';
  }
  
  if (/^(postgresql|mysql|oracle|sql.server|mongodb|redis|elasticsearch|aws|gcp|google.cloud|azure|docker|kubernetes|k8s|terraform|ansible|jenkins|gitlab.ci|github.actions|nginx|apache|linux|ubuntu|centos|rhel)$/i.test(skill)) {
    return 'devops';
  }
  
  return 'tools';
}

// スキル名正規化
function normalizeSkillName(skillName) {
  return skillName
    .toLowerCase()
    .trim()
    .replace(/^php\s*\d+(\.\d+)*\s*,?\s*\d+(\.\d+)*\s*$/g, 'php')
    .replace(/^php\s*\d+(\.\d+)*\s*,?\s*$/g, 'php')
    .replace(/^php\s*\d+(\.\d+)*$/g, 'php')
    .replace(/^node\s*\d+(\.\d+)*$/g, 'node')
    .replace(/^react\s*\d+(\.\d+)*$/g, 'react')
    .replace(/^vue\s*\d+(\.\d+)*$/g, 'vue')
    .replace(/^angular\s*\d+(\.\d+)*$/g, 'angular')
    .replace(/^typescript\s*\d+(\.\d+)*$/g, 'typescript')
    .replace(/^javascript\s*\d+(\.\d+)*$/g, 'javascript')
    .replace(/\s*\d+(\.\d+)*\s*,?\s*\d+(\.\d+)*\s*$/g, '')
    .replace(/\s*\d+(\.\d+)*\s*,?\s*$/g, '')
    .replace(/\s*\d+(\.\d+)*\s*$/g, '')
    .replace(/[\s\-.,]/g, '')
    .replace(/javascript/g, 'js')
    .replace(/typescript/g, 'ts')
    .replace(/reactnative/g, 'reactnative')
    .replace(/nodejs/g, 'node')
    .replace(/nextjs/g, 'next')
    .replace(/nuxtjs/g, 'nuxt')
    .replace(/vuejs/g, 'vue')
    .replace(/angularjs/g, 'angular')
    .replace(/jquery/g, 'jquery');
}

// メイン実行
async function main() {
  try {
    console.error('🔍 Validating configuration...');
    validateConfig();
    
    console.error('🔑 Getting access token...');
    const accessToken = await getAccessToken();
    
    console.error('📊 Fetching spreadsheet data...');
    const skills = await fetchSpreadsheetData(accessToken);
    
    console.error(`✅ Successfully processed ${skills.length} skills`);
    
    // JSON出力（stdoutに出力、stderrはログ用）
    console.log(JSON.stringify(skills, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}
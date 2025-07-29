interface SkillData {
  name: string;
  level: number;
  category: "frontend" | "backend" | "devops" | "mobile" | "tools";
  experience?: string;
}

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface GoogleSheetsState {
  accessToken: string | null;
  tokenExpiry: number;
}

// 状態管理用のモジュールレベル変数
const googleSheetsState: GoogleSheetsState = {
  accessToken: null,
  tokenExpiry: 0
};

const getServiceAccountInfo = (): GoogleServiceAccount => {
  const clientEmail = import.meta.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = import.meta.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = import.meta.env.GOOGLE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Google Service Account credentials are not properly configured');
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
    project_id: projectId
  };
};

const base64UrlEncode = (data: string | ArrayBuffer): string => {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const signData = async (data: string, privateKey: string): Promise<ArrayBuffer> => {
  // PEM形式の秘密鍵をCryptoKeyに変換
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\r?\n/g, '')
    .replace(/\s/g, '');

  // Base64デコード
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // 秘密鍵をインポート
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // データに署名
  return await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(data)
  );
};

const createJWT = async (): Promise<string> => {
  const serviceAccount = getServiceAccountInfo();
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = await signData(data, serviceAccount.private_key);
  const encodedSignature = base64UrlEncode(signature);

  return `${data}.${encodedSignature}`;
};

const getAccessToken = async (): Promise<string> => {
  // トークンがまだ有効な場合は再利用
  if (googleSheetsState.accessToken && Date.now() / 1000 < googleSheetsState.tokenExpiry - 60) {
    return googleSheetsState.accessToken;
  }

  const jwt = await createJWT();
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token request failed:', errorText);
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const tokenData = await response.json();
  googleSheetsState.accessToken = tokenData.access_token;
  googleSheetsState.tokenExpiry = Math.floor(Date.now() / 1000) + tokenData.expires_in;
  
  return googleSheetsState.accessToken!;
};

const extractSkills = (
  skillText: string, 
  period: string, 
  category: SkillData['category'], 
  skillMap: Map<string, { periods: string[], category: SkillData['category'] }>
) => {
  if (!skillText) return;

  // 改行で分割して各スキルを抽出
  const skills = skillText
    .split(/\n/)
    .map(skill => skill.trim())
    .filter(skill => skill && skill !== '')
    .map(skill => {
      // バージョン番号とカンマを除去してクリーンアップ
      const cleaned = skill
        .replace(/\s*\d+(\.\d+)*\s*,?\s*\d+(\.\d+)*\s*$/, '') // "8.1, 8.2" のような複数バージョンを除去
        .replace(/\s*\d+(\.\d+)*\s*,?\s*$/, '') // 末尾のバージョン番号とカンマを除去
        .replace(/\s+\d+(\.\d+)*$/, '') // 末尾のバージョン番号を除去
        .replace(/^[\s\-・]+/, '') // 先頭の記号を除去
        .trim();
      return cleaned;
    })
    .filter(skill => skill.length > 1);

  skills.forEach(skillName => {
    const normalizedCategory = normalizeSkillCategory(skillName, category);
    const normalizedSkillName = normalizeSkillName(skillName);
    
    console.log(`🔍 DEBUG: Skill "${skillName}" -> normalized: "${normalizedSkillName}" -> category: ${normalizedCategory}`);
    
    // 既存のスキルを探す
    const existingEntry = Array.from(skillMap.entries()).find(([key]) => 
      normalizeSkillName(key) === normalizedSkillName
    );
    const existingKey = existingEntry ? existingEntry[0] : '';
    
    if (existingKey) {
      console.log(`🔍 DEBUG: Merging "${skillName}" with existing "${existingKey}"`);
      skillMap.get(existingKey)!.periods.push(period);
    } else {
      console.log(`🔍 DEBUG: Adding new skill "${skillName}"`);
      skillMap.set(skillName, {
        periods: [period],
        category: normalizedCategory
      });
    }
  });
};

const calculateTotalMonths = (periods: string[]): number => {
  return periods.reduce((total, period) => {
    const months = parseMonthsFromPeriod(period);
    return total + months;
  }, 0);
};

const parseMonthsFromPeriod = (period: string): number => {
  if (!period) return 0;

  // "1年0ヶ月" や "0年6ヶ月" の形式を解析
  const yearMatch = period.match(/(\d+)年/);
  const monthMatch = period.match(/(\d+)ヶ月/);
  
  const years = yearMatch ? parseInt(yearMatch[1]) : 0;
  const months = monthMatch ? parseInt(monthMatch[1]) : 0;
  
  return years * 12 + months;
};

const formatExperience = (months: number): string => {
  if (months < 12) {
    return `${months}ヶ月`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years}年`;
  }
  
  return `${years}年${remainingMonths}ヶ月`;
};

const normalizeSkillCategory = (skillName: string, defaultCategory: SkillData['category']): SkillData['category'] => {
  const skill = skillName.toLowerCase().trim();
  
  // プログラミング言語（バックエンド）
  if (/^(php|python|java|ruby|go|rust|c#|c\+\+|sql)$/i.test(skill)) {
    return 'backend';
  }
  
  // JavaScript/TypeScript（使用文脈により判断）
  if (/^(javascript|typescript)$/i.test(skill)) {
    // デフォルトでフロントエンドとするが、文脈により調整可能
    return 'frontend';
  }
  
  // Swift（モバイル）
  if (/^(swift|kotlin|objective-c)$/i.test(skill)) {
    return 'mobile';
  }
  
  // フロントエンド技術
  if (/^(react|vue|angular|html|css|scss|sass|less|jquery|svelte|next\.?js?|nuxt\.?js?|vite|webpack|parcel|rollup|babel|tailwind|bootstrap|mui|material.ui|styled.components|emotion|chakra.ui|ant.design|blade|twig|smarty|wireui|livewire|react.hook.form|react.router.dom|playwright)$/i.test(skill)) {
    return 'frontend';
  }
  
  // バックエンドフレームワーク・ライブラリ
  if (/^(laravel|symfony|codeigniter|rails|django|flask|fastapi|spring|express|nest\.?js?|koa|hapi|gin|echo|fiber|asp\.?net|node|node\.js|pest|phpunit|php.unit)$/i.test(skill)) {
    return 'backend';
  }
  
  // モバイル技術
  if (/^(react.native|flutter|expo|swiftui|jetpack.compose|xamarin|ionic|cordova|phonegap|android|ios)$/i.test(skill)) {
    return 'mobile';
  }
  
  // データベース・インフラ・DevOps技術
  if (/^(postgresql|mysql|oracle|sql.server|mongodb|redis|elasticsearch|aws|gcp|google.cloud|azure|docker|kubernetes|k8s|terraform|ansible|jenkins|gitlab.ci|github.actions|nginx|apache|linux|ubuntu|centos|rhel)$/i.test(skill)) {
    return 'devops';
  }
  
  // 開発ツール・その他ツール
  if (/^(git|github|gitlab|bitbucket|svn|git\.copilot|copilot|vscode|intellij|phpstorm|webstorm|sublime|atom|vim|emacs|postman|insomnia|jira|confluence|slack|teams|discord|figma|sketch|adobe\.xd|photoshop|illustrator|npm|yarn|pnpm|composer|pip|maven|gradle|cmake|makefile|dockerfile|vagrant|virtualbox|vmware|wireshark|charles|fiddler|chrome\.devtools|firefox\.devtools|xcode|android\.studio|unity|unreal|blender|obs|ffmpeg|handbrake|7zip|winrar|notepad\+\+|terminal|iterm|powershell|bash|zsh|fish|oh\.my\.zsh|tmux|screen|htop|top|ps|netstat|lsof|grep|sed|awk|curl|wget|ssh|scp|rsync|cron|systemd|supervisord|pm2|forever|nodemon|concurrently|cross\.env|dotenv|eslint|prettier|stylelint|husky|lint\.staged|commitizen|conventional\.commits|semantic\.release|storybook|chromatic|percy|cypress|selenium|webdriver|puppeteer|jest|mocha|chai|jasmine|karma|qunit|tap|ava|vitest|testing\.library|enzyme|sinon|nock|supertest|artillery|k6|jmeter|gatling|sonarqube|sonar|snyk|dependabot|renovate|greenkeeper|david|bundlesize|lighthouse|web\.vitals|gtmetrics|pingdom|new\.relic|datadog|splunk|elk|grafana|prometheus|jaeger|zipkin|sentry|bugsnag|rollbar|loggly|papertrail|cloudwatch|stackdriver|azure\.monitor|application\.insights|mixpanel|google\.analytics|adobe\.analytics|hotjar|fullstory|logrocket|amplitude|segment|rudderstack|snowplow|firebase|supabase|planetscale|neon|vercel|netlify|heroku|railway|render|fly\.io|digitalocean|linode|vultr|cloudflare|fastly|cloudfront|maxcdn|keycdn|bunnycdn|stripe|paypal|square|braintree|adyen|klarna|afterpay|twilio|sendgrid|mailgun|mailchimp|constant\.contact|hubspot|salesforce|zendesk|intercom|drift|crisp|tawk\.to|freshchat|livechat|olark|purechat|zopim|typeform|jotform|gravity\.forms|contact\.form\.7|ninja\.forms|wpforms|elementor|divi|beaver\.builder|gutenberg|acf|yoast|rankmath|jetpack|wordfence|sucuri|w3\.total\.cache|wp\.rocket|litespeed|nginx\.helper|redis\.cache|memcached|opcache|apcu|xcache|wincache|query\.monitor|debug\.bar|xdebug|blackfire|tideways|pagespeed\.insights)$/i.test(skill)) {
    return 'tools';
  }
  
  // テストフレームワーク（ツール） - フロントエンド・その他テスト
  if (/^(jest|mocha|chai|jasmine|karma|qunit|tap|ava|vitest|cypress|selenium|rspec|minitest|junit|testng|mockito|powermock|easymock|wiremock)$/i.test(skill)) {
    return 'tools';
  }
  
  return defaultCategory;
};

const normalizeSkillName = (skillName: string): string => {
  return skillName
    .toLowerCase()
    .trim()
    // PHPの特別処理 - より包括的に
    .replace(/^php\s*\d+(\.\d+)*\s*,?\s*\d+(\.\d+)*\s*$/g, 'php') // "PHP8.1, 8.2" 形式
    .replace(/^php\s*\d+(\.\d+)*\s*,?\s*$/g, 'php') // "PHP8.1," 形式
    .replace(/^php\s*\d+(\.\d+)*$/g, 'php') // "PHP 8" 形式
    // その他の技術のバージョン番号を除去
    .replace(/^node\s*\d+(\.\d+)*$/g, 'node')
    .replace(/^react\s*\d+(\.\d+)*$/g, 'react')
    .replace(/^vue\s*\d+(\.\d+)*$/g, 'vue')
    .replace(/^angular\s*\d+(\.\d+)*$/g, 'angular')
    .replace(/^typescript\s*\d+(\.\d+)*$/g, 'typescript')
    .replace(/^javascript\s*\d+(\.\d+)*$/g, 'javascript')
    // 一般的なバージョン番号を除去 (末尾のもの)
    .replace(/\s*\d+(\.\d+)*\s*,?\s*\d+(\.\d+)*\s*$/g, '') // 複数バージョン
    .replace(/\s*\d+(\.\d+)*\s*,?\s*$/g, '') // 単一バージョン+カンマ
    .replace(/\s*\d+(\.\d+)*\s*$/g, '') // 単一バージョン
    // スペース、ハイフン、ドット、カンマを除去
    .replace(/[\s\-.,]/g, '')
    // よくある表記の統一
    .replace(/javascript/g, 'js')
    .replace(/typescript/g, 'ts')
    .replace(/reactnative/g, 'reactnative')
    .replace(/nodejs/g, 'node')
    .replace(/nextjs/g, 'next')
    .replace(/nuxtjs/g, 'nuxt')
    .replace(/vuejs/g, 'vue')
    .replace(/angularjs/g, 'angular')
    .replace(/jquery/g, 'jquery');
};

const parseSpreadsheetData = (rows: string[][]): SkillData[] => {
  const skillMap = new Map<string, { periods: string[], category: SkillData['category'] }>();

  // プロジェクトデータの抽出 - より安全な方法で全プロジェクトを処理
  for (const [i, row] of rows.entries()) {
    if (!row || row.length < 37) continue;

    // プロジェクト行の判定: 1列目が数字で始まり、6列目に案件名がある
    const projectNumber = row[0]?.trim();
    const projectName = row[6]?.trim();
    
    if (!/^\d+$/.test(projectNumber) || !projectName) continue;

    // 作業期間を探す（現在行から下3-4行以内）
    const periodSearchLimit = Math.min(i + 6, rows.length);
    const searchRows = rows.slice(i + 1, periodSearchLimit);
    const periodRow = searchRows.find(checkRow => 
      checkRow && checkRow[2] && /\d+年\d+ヶ月|\d+ヶ月/.test(checkRow[2])
    );
    const period = periodRow ? periodRow[2].trim() : '';

    // 技術データを取得（28, 32, 36列目）
    const languages = row[28] || '';
    const frameworks = row[32] || '';
    const servers = row[36] || '';

    console.log(`🔍 DEBUG: Project ${projectNumber} (${period}):`);
    console.log(`  Languages (col 28): "${languages}"`);
    console.log(`  Frameworks (col 32): "${frameworks}"`);
    console.log(`  Servers (col 36): "${servers}"`);

    // 各技術カテゴリーを処理（デフォルトカテゴリーを設定、詳細分類は normalizeSkillCategory で行う）
    extractSkills(languages, period, 'backend', skillMap);
    extractSkills(frameworks, period, 'tools', skillMap);
    extractSkills(servers, period, 'devops', skillMap);
  }

  // Map から SkillData 配列に変換
  const skills: SkillData[] = [];
  skillMap.forEach((data, skillName) => {
    const totalMonths = calculateTotalMonths(data.periods);
    
    skills.push({
      name: skillName,
      level: totalMonths, // 実際の月数をレベルとして使用
      category: data.category,
      experience: formatExperience(totalMonths)
    });
  });

  return skills.sort((a, b) => b.level - a.level);
};

const getSpreadsheetData = async (spreadsheetId: string): Promise<SkillData[]> => {
  try {
    const accessToken = await getAccessToken();
    
    // スプレッドシートのメタデータを取得
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('❌ Metadata request failed:', errorText);
      throw new Error(`Failed to get spreadsheet metadata: ${metadataResponse.status} - ${errorText}`);
    }

    const metadata = await metadataResponse.json();

    // 「経歴書」シートを探す
    const targetSheet = metadata.sheets?.find((sheet: { properties: { title: string } }) => 
      sheet.properties.title === '経歴書'
    );

    if (!targetSheet) {
      // 「経歴書」が見つからない場合は最初のシートを使用
      if (!metadata.sheets || metadata.sheets.length === 0) {
        throw new Error('No sheets found in spreadsheet');
      }
    }

    const sheetName = targetSheet ? targetSheet.properties.title : metadata.sheets[0].properties.title;

    // データを取得
    const range = `'${sheetName}'!A:AP`;
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const dataResponse = await fetch(dataUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error('❌ Data request failed:', errorText);
      throw new Error(`Failed to get spreadsheet data: ${dataResponse.status} - ${errorText}`);
    }

    const data = await dataResponse.json();
    console.log('🔍 DEBUG: Raw spreadsheet data sample (first 20 rows):', data.values?.slice(0, 20));

    if (!data.values || data.values.length === 0) {
      throw new Error('No data found in spreadsheet');
    }

    return parseSpreadsheetData(data.values);
  } catch (error) {
    console.error('❌ Google Sheets API error:', error);
    throw error;
  }
};

// 外部から呼び出す関数
export const fetchSkillsFromGoogleAPI = async (): Promise<SkillData[]> => {
  const spreadsheetId = import.meta.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_ID is not configured');
  }

  return await getSpreadsheetData(spreadsheetId);
};

// CSVエクスポート機能（フォールバック用）
export const fetchSkillsFromCSVExport = async (): Promise<SkillData[]> => {
  const spreadsheetId = import.meta.env.GOOGLE_SHEETS_ID;
  const gid = import.meta.env.VITE_GOOGLE_SHEETS_GID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_ID is not configured');
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
  
  const response = await fetch(csvUrl, {
    mode: 'cors',
    headers: {
      'Accept': 'text/csv',
    },
  });

  if (!response.ok) {
    throw new Error(`CSV export failed: ${response.status} - ${response.statusText}`);
  }

  const csvText = await response.text();
  
  if (!csvText.trim()) {
    throw new Error('No CSV data received');
  }

  const rows = parseCSV(csvText);
  return parseSpreadsheetData(rows);
};

// 簡単なCSVパーサー
function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    const state = { current: '', inQuotes: false };
    
    for (const char of line) {
      if (char === '"') {
        state.inQuotes = !state.inQuotes;
      } else if (char === ',' && !state.inQuotes) {
        result.push(state.current.trim());
        state.current = '';
      } else {
        state.current += char;
      }
    }
    result.push(state.current.trim());
    
    return result;
  });
}
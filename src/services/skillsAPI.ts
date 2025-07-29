// 静的JSONファイルからスキルデータを取得するシンプルなAPI

interface SkillData {
  name: string;
  level: number;
  category: "frontend" | "backend" | "devops" | "mobile" | "tools";
  experience?: string;
}

/**
 * 静的JSONファイルからスキルデータを取得
 * ビルド時にGitHub Actionsで生成されたskills.jsonを読み込み
 */
export const fetchSkillsFromStaticFile = async (): Promise<SkillData[]> => {
  try {
    const response = await fetch('/skills.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch skills data: ${response.status} ${response.statusText}`);
    }
    
    const skills: SkillData[] = await response.json();
    
    if (!Array.isArray(skills)) {
      throw new Error('Invalid skills data format');
    }
    
    return skills;
  } catch (error) {
    console.error('Error fetching skills from static file:', error);
    throw error;
  }
};

/**
 * フォールバック: 空のスキルデータを返す
 */
export const getEmptySkillsData = (): SkillData[] => {
  return [];
};

/**
 * スキルデータのキャッシュ機能付き取得
 */
let skillsCache: SkillData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export const fetchSkillsWithCache = async (): Promise<SkillData[]> => {
  const now = Date.now();
  
  // キャッシュが有効な場合は返す
  if (skillsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return skillsCache;
  }
  
  try {
    const skills = await fetchSkillsFromStaticFile();
    skillsCache = skills;
    cacheTimestamp = now;
    return skills;
  } catch (error) {
    // キャッシュがある場合は古いデータを返す
    if (skillsCache) {
      console.warn('Failed to fetch fresh skills data, using cached version');
      return skillsCache;
    }
    
    // キャッシュもない場合は空配列を返す
    console.error('Failed to fetch skills data and no cache available');
    return getEmptySkillsData();
  }
};
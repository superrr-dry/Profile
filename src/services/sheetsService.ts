import { fetchSkillsFromGoogleAPI, fetchSkillsFromCSVExport } from './googleSheetsAPI';

interface SkillData {
  name: string;
  level: number;
  category: "frontend" | "backend" | "devops" | "mobile" | "tools";
  experience?: string;
}

// フォールバック用のスキルデータ
const getFallbackSkills = (): SkillData[] => [
  { name: "React", level: 90, category: "frontend", experience: "3年" },
  { name: "TypeScript", level: 85, category: "frontend", experience: "2年" },
  { name: "Vue.js", level: 75, category: "frontend", experience: "1年" },
  { name: "Node.js", level: 80, category: "backend", experience: "2年" },
  { name: "Python", level: 70, category: "backend", experience: "1年" },
  { name: "AWS", level: 85, category: "devops", experience: "2年" },
  { name: "Docker", level: 88, category: "devops", experience: "2年" },
  { name: "Kubernetes", level: 75, category: "devops", experience: "1年" },
  { name: "React Native", level: 70, category: "mobile", experience: "1年" },
  { name: "Swift", level: 65, category: "mobile", experience: "6ヶ月" },
];

// フォールバックデータを返す
export const fetchSkillsFromCSV = async (): Promise<SkillData[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return getFallbackSkills();
};

// カテゴリを調整する関数
const adjustSkillCategories = (skills: SkillData[]): SkillData[] => {
  return skills.map(skill => {
    // SupabaseとFirebaseをdevopsカテゴリに変更
    if (skill.name.toLowerCase().includes('supabase') || skill.name.toLowerCase().includes('firebase')) {
      return { ...skill, category: 'devops' as const };
    }
    return skill;
  });
};

// Google Sheets API 統合関数
export const fetchSkillsFromAPI = async (): Promise<SkillData[]> => {
  try {
    const skills = await fetchSkillsFromGoogleAPI();
    return adjustSkillCategories(skills);
  } catch {
    try {
      const skills = await fetchSkillsFromCSVExport();
      return adjustSkillCategories(skills);
    } catch {
      return await fetchSkillsFromCSV();
    }
  }
};

// 統合されたスキル取得関数（推奨）
export const fetchSkills = async (preferAPI: boolean = true): Promise<{
  skills: SkillData[];
  source: 'api' | 'csv' | 'fallback';
}> => {
  if (!preferAPI) {
    return {
      skills: await fetchSkillsFromCSV(),
      source: 'fallback'
    };
  }

  try {
    // Google Sheets APIを試行
    const skills = await fetchSkillsFromGoogleAPI();
    return {
      skills: adjustSkillCategories(skills),
      source: 'api'
    };
  } catch {
    try {
      const skills = await fetchSkillsFromCSVExport();
      return {
        skills: adjustSkillCategories(skills),
        source: 'csv'
      };
    } catch {
      const skills = await fetchSkillsFromCSV();
      return {
        skills,
        source: 'fallback'
      };
    }
  }
};

export default {
  fetchSkillsFromAPI,
  fetchSkillsFromCSV,
  fetchSkills
};
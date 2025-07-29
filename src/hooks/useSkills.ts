import { useState, useEffect, useCallback } from 'react';
import { fetchSkillsWithCache } from '../services/skillsAPI';

interface SkillData {
  name: string;
  level: number;
  category: "frontend" | "backend" | "devops" | "mobile" | "tools";
  experience?: string;
}

export const useSkills = () => {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const skillsData = await fetchSkillsWithCache();
      
      setSkills(skillsData);
      setLastUpdated(new Date());
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // スキルデータをカテゴリー別に分類
  const getSkillsByCategory = (category: SkillData['category']) => {
    return skills.filter(skill => skill.category === category);
  };

  // 手動でリロード
  const refetchSkills = () => {
    loadSkills();
  };

  return {
    skills,
    loading,
    error,
    lastUpdated,
    getSkillsByCategory,
    refetchSkills
  };
};
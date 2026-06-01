export interface UserReputation {
  userId: string;
  level: number;
  xp: number;
  reputation: number;
  questsCompleted: number;
  badges: string[];
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path or icon name
  requirement: string; // Human-readable requirement
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface LevelInfo {
  level: number;
  xpRequired: number;
  title: string;
  benefits: string[];
}

export interface XPProgress {
  current: number;
  needed: number;
  percentage: number;
}

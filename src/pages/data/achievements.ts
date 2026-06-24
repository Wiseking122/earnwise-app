import { Trophy, Target, Users, Zap, Flame, Award, Star } from 'lucide-react';
import React from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  condition: (profile: any) => boolean;
  rewardXp: number;
  rewardCash: number;
  color: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_task',
    title: 'First Blood',
    description: 'Complete your first task',
    icon: Target,
    condition: (p) => (p.tasksCompleted || 0) >= 1,
    rewardXp: 100,
    rewardCash: 50,
    color: 'text-blue-500'
  },
  {
    id: 'referral_starter',
    title: 'Networker',
    description: 'Refer at least 1 friend',
    icon: Users,
    condition: (p) => (p.referralEarnings || 0) > 0,
    rewardXp: 200,
    rewardCash: 100,
    color: 'text-purple-500'
  },
  {
    id: 'streak_3',
    title: 'Consistent',
    description: 'Maintain a 3-day streak',
    icon: Flame,
    condition: (p) => (p.streak || 0) >= 3,
    rewardXp: 300,
    rewardCash: 150,
    color: 'text-orange-500'
  },
  {
    id: 'high_earner',
    title: 'Big Bag',
    description: 'Earn more than ₦5,000 from tasks',
    icon: Trophy,
    condition: (p) => (p.taskEarnings || 0) >= 5000,
    rewardXp: 500,
    rewardCash: 500,
    color: 'text-amber-500'
  },
  {
    id: 'level_5',
    title: 'Veteran',
    description: 'Reach Level 5',
    icon: Award,
    condition: (p) => (p.level || 1) >= 5,
    rewardXp: 1000,
    rewardCash: 1000,
    color: 'text-indigo-500'
  }
];

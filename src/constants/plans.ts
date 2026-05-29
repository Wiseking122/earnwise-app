import { PlanType } from '../types';

export interface PlanDetails {
  id: PlanType;
  name: string;
  cost: number;
  multiplier: number;
  perks: string[];
  color: string;
}

export const PLANS: PlanDetails[] = [
  {
    id: 'free',
    name: 'Free',
    cost: 0,
    multiplier: 1.0,
    perks: ['Standard Base Rewards', 'Basic Tasks Only', 'No AI Support'],
    color: 'bg-gray-500'
  },
  {
    id: 'elite',
    name: 'Elite',
    cost: 1000,
    multiplier: 1.2,
    perks: ['1.2x Multiplier', 'AI Task Breakdown', 'Premium Sync'],
    color: 'bg-indigo-500'
  },
  {
    id: 'starter',
    name: 'Starter',
    cost: 2000,
    multiplier: 1.5,
    perks: ['1.5x Multiplier', 'AI Task Breakdown', 'Premium Sync'],
    color: 'bg-blue-500'
  },
  {
    id: 'pro',
    name: 'Pro',
    cost: 3000,
    multiplier: 1.8,
    perks: ['1.8x Earnings Multiplier', 'Weekly Bonus Tasks', 'Pro Support'],
    color: 'bg-emerald-500'
  },
  {
    id: 'bronze',
    name: 'Bronze',
    cost: 5000,
    multiplier: 2.5,
    perks: ['2.5x Earnings Multiplier', 'Bronze Exclusive Tasks', 'Faster Withdrawals'],
    color: 'bg-orange-700'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    cost: 7000,
    multiplier: 3.5,
    perks: ['3.5x Earnings Multiplier', 'Diamond Exclusive Tasks', 'VIP Support'],
    color: 'bg-cyan-500'
  },
  {
    id: 'silver',
    name: 'Silver',
    cost: 10000,
    multiplier: 5.0,
    perks: ['5.0x Earnings Multiplier', 'Silver VIP Support', 'Increased Limits'],
    color: 'bg-slate-400'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    cost: 15000,
    multiplier: 7.5,
    perks: [
      '7.5x Earnings Multiplier',
      'Dedicated Account Manager',
      'Instant Multi-Node Approvals',
      'Priority VIP Support',
      'Unlimited AI Protocol Access'
    ],
    color: 'bg-indigo-600'
  },
  {
    id: 'golden',
    name: 'Golden',
    cost: 25000,
    multiplier: 10.0,
    perks: [
      '10.0x Earnings Multiplier',
      'Ultimate Global Priority',
      'Golden Revenue Share Split',
      'Zero-Wait Withdrawals',
      'Elite VIP Concierge'
    ],
    color: 'bg-amber-500'
  }
];

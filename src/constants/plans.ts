import { PlanType } from '../types';

export interface PlanDetails {
  id: PlanType;
  name: string;
  cost: number;
  multiplier: number;
  perks: string[];
  color: string;
  description: string;
}

export const PLANS: PlanDetails[] = [
  {
    id: 'free',
    name: 'Free',
    cost: 0,
    multiplier: 1.0,
    perks: ['Standard Base Rewards', 'Basic Tasks Only', 'No AI Support'],
    color: 'bg-gray-500',
    description: 'Our entry-level basic package. Earn standard base rewards on basic social tasks. AI Assistant and specialized premium tasks are locked.'
  },
  {
    id: 'elite',
    name: 'Elite',
    cost: 1000,
    multiplier: 1.2,
    perks: ['1.2x Multiplier', 'AI Task Breakdown', 'Premium Sync'],
    color: 'bg-indigo-500',
    description: 'Multiply all your social and ad earnings by 1.2x! Includes core AI assistance, limited to 3 daily queries (Unlimited for Course Buyers), and faster payout verification.'
  },
  {
    id: 'starter',
    name: 'Starter',
    cost: 2000,
    multiplier: 1.5,
    perks: ['1.5x Multiplier', 'AI Task Breakdown', 'Premium Sync'],
    color: 'bg-blue-500',
    description: 'A great value package featuring a strong 1.5x earnings multiplier. Includes access to our Wise AI assistant with a limit of 3 daily queries (Unlimited for Course Buyers).'
  },
  {
    id: 'pro',
    name: 'Pro',
    cost: 3000,
    multiplier: 1.8,
    perks: ['1.8x Earnings Multiplier', 'Weekly Bonus Tasks', 'Pro Support'],
    color: 'bg-emerald-500',
    description: 'Accelerate your digital wealth. Earn 1.8x more on every task and enjoy 3 daily Wise AI Assistant queries (Unlimited for Course Buyers) plus dedicated support.'
  },
  {
    id: 'bronze',
    name: 'Bronze',
    cost: 5000,
    multiplier: 2.5,
    perks: ['2.5x Earnings Multiplier', 'Bronze Exclusive Tasks', 'Faster Withdrawals'],
    color: 'bg-orange-700',
    description: 'Power up to a huge 2.5x multiplier on all personal task submissions. Includes access to our Wise AI Assistant, limited to 3 queries daily (Unlimited for Course Buyers).'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    cost: 7000,
    multiplier: 3.5,
    perks: ['3.5x Earnings Multiplier', 'Diamond Exclusive Tasks', 'VIP Support'],
    color: 'bg-cyan-500',
    description: 'Prestige VIP tier. Boost your earnings by 3.5x, unlock Diamond-exclusive tasks, and VIP priority support. Includes access to our Wise AI Assistant, limited to 3 queries daily (Unlimited for Course Buyers).'
  },
  {
    id: 'silver',
    name: 'Silver',
    cost: 10000,
    multiplier: 5.0,
    perks: ['5.0x Earnings Multiplier', 'Silver VIP Support', 'Increased Limits'],
    color: 'bg-slate-400',
    description: 'Our elite institutional package. Receive a massive 5.0x payout multiplier on all approved tasks, with UNLIMITED Wise AI and instant withdrawal priority.'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    cost: 15000,
    multiplier: 7.5,
    perks: [
      '7.5x Earnings Multiplier',
      '2 Free Premium Courses',
      'Dedicated Account Manager',
      'Instant Multi-Node Approvals',
      'Priority VIP Support',
      'Unlimited AI Protocol Access'
    ],
    color: 'bg-indigo-600',
    description: 'Prestige institutional tier. Benefit from a massive 7.5x earning multiplier, 2 free premium courses, an individual WhatsApp account manager, and UNLIMITED daily Wise AI requests.'
  },
  {
    id: 'golden',
    name: 'Golden',
    cost: 25000,
    multiplier: 10.0,
    perks: [
      '10.0x Earnings Multiplier',
      '4 Free Premium Courses',
      'Ultimate Global Priority',
      'Golden Revenue Share Split',
      'Zero-Wait Withdrawals',
      'Elite VIP Concierge'
    ],
    color: 'bg-amber-500',
    description: 'The absolute apex of the Earnwise network. Experience a massive 1,000% boost (10x earnings) on every action, 4 free premium courses, zero-wait withdrawals, and UNLIMITED daily Wise AI queries.'
  }
];

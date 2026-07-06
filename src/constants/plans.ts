import { PlanType } from '../types';

export interface PlanDetails {
  id: PlanType;
  name: string;
  cost: number;
  multiplier: number;
  perks: string[];
  color: string;
  description: string;
  dailyLimit: string;
  maxEarnings: string;
}

export const PLANS: PlanDetails[] = [
  {
    id: 'free',
    name: 'Free',
    cost: 0,
    multiplier: 1.0,
    perks: ['Standard Base Rewards', 'Basic Tasks Only', 'No AI Support'],
    color: 'bg-gray-500',
    description: 'Our entry-level basic package. Earn standard base rewards on basic social tasks. AI Assistant and specialized premium tasks are locked.',
    dailyLimit: '₦0 / Day',
    maxEarnings: '₦0'
  },
  {
    id: 'elite',
    name: 'Elite',
    cost: 1000,
    multiplier: 1.2,
    perks: ['Earn up to ₦235 Daily', 'Max Earnings: ₦7,000', '1.2x Multiplier', 'AI Task Breakdown'],
    color: 'bg-indigo-500',
    description: 'Earn up to ₦235 daily with a maximum total lifetime earnings cap of ₦7,000! Multiply all your social and ad earnings by 1.2x. Includes core AI assistance, limited to 3 daily queries (Unlimited for Course Buyers), and faster payout verification.',
    dailyLimit: '₦235 / Day',
    maxEarnings: '₦7,000'
  },
  {
    id: 'starter',
    name: 'Starter',
    cost: 2000,
    multiplier: 1.5,
    perks: ['Earn up to ₦470 Daily', 'Max Earnings: ₦14,000', '1.5x Multiplier', 'Premium Sync'],
    color: 'bg-blue-500',
    description: 'Earn up to ₦470 daily with a maximum total lifetime earnings cap of ₦14,000! A great value package featuring a strong 1.5x earnings multiplier. Includes access to our Wise AI assistant with a limit of 3 daily queries (Unlimited for Course Buyers).',
    dailyLimit: '₦470 / Day',
    maxEarnings: '₦14,000'
  },
  {
    id: 'pro',
    name: 'Pro',
    cost: 3000,
    multiplier: 1.8,
    perks: ['Earn up to ₦735 Daily', 'Max Earnings: ₦22,000', '1.8x Earnings Multiplier', 'Weekly Bonus Tasks'],
    color: 'bg-emerald-500',
    description: 'Earn up to ₦735 daily with a maximum total lifetime earnings cap of ₦22,000! Accelerate your digital wealth. Earn 1.8x more on every task and enjoy 3 daily Wise AI Assistant queries (Unlimited for Course Buyers) plus dedicated support.',
    dailyLimit: '₦735 / Day',
    maxEarnings: '₦22,000'
  },
  {
    id: 'bronze',
    name: 'Bronze',
    cost: 5000,
    multiplier: 2.5,
    perks: ['Earn up to ₦1,170 Daily', 'Max Earnings: ₦35,000', '2.5x Earnings Multiplier', 'Bronze Exclusive Tasks'],
    color: 'bg-orange-700',
    description: 'Earn up to ₦1,170 daily with a maximum total lifetime earnings cap of ₦35,000! Power up to a huge 2.5x multiplier on all personal task submissions. Includes access to our Wise AI Assistant, limited to 3 queries daily (Unlimited for Course Buyers).',
    dailyLimit: '₦1,170 / Day',
    maxEarnings: '₦35,000'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    cost: 7000,
    multiplier: 3.5,
    perks: ['Earn up to ₦1,500 Daily', 'Max Earnings: ₦45,000', '3.5x Earnings Multiplier', 'Diamond Exclusive Tasks'],
    color: 'bg-cyan-500',
    description: 'Earn up to ₦1,500 daily with a maximum total lifetime earnings cap of ₦45,000! Prestige VIP tier. Boost your earnings by 3.5x, unlock Diamond-exclusive tasks, and VIP priority support. Includes access to our Wise AI Assistant, limited to 3 queries daily (Unlimited for Course Buyers).',
    dailyLimit: '₦1,500 / Day',
    maxEarnings: '₦45,000'
  },
  {
    id: 'silver',
    name: 'Silver',
    cost: 10000,
    multiplier: 5.0,
    perks: ['Earn up to ₦2,500 Daily', 'Max Earnings: ₦55,000', '5.0x Earnings Multiplier', 'Silver VIP Support'],
    color: 'bg-slate-400',
    description: 'Earn up to ₦2,500 daily with a maximum total lifetime earnings cap of ₦55,000! Our elite institutional package. Receive a massive 5.0x payout multiplier on all approved tasks, with UNLIMITED Wise AI and instant withdrawal priority.',
    dailyLimit: '₦2,500 / Day',
    maxEarnings: '₦55,000'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    cost: 15000,
    multiplier: 7.5,
    perks: [
      'Earn up to ₦3,000 Daily',
      'Unlimited Lifetime Earnings',
      '7.5x Earnings Multiplier',
      '2 Free Premium Courses'
    ],
    color: 'bg-indigo-600',
    description: 'Earn up to ₦3,000 daily with completely unlimited total lifetime earnings! Prestige institutional tier. Benefit from a massive 7.5x earning multiplier, 2 free premium courses, an individual WhatsApp account manager, and UNLIMITED daily Wise AI requests.',
    dailyLimit: '₦3,000 / Day',
    maxEarnings: 'Unlimited'
  },
  {
    id: 'golden',
    name: 'Golden',
    cost: 25000,
    multiplier: 10.0,
    perks: [
      'Earn up to ₦4,000 Daily',
      'Unlimited Lifetime Earnings',
      '10.0x Earnings Multiplier',
      '4 Free Premium Courses'
    ],
    color: 'bg-amber-500',
    description: 'Earn up to ₦4,000 daily with completely unlimited total lifetime earnings! The absolute apex of the Earnwise network. Experience a massive 1,000% boost (10x earnings) on every action, 4 free premium courses, zero-wait withdrawals, and UNLIMITED daily Wise AI queries.',
    dailyLimit: '₦4,000 / Day',
    maxEarnings: 'Unlimited'
  }
];

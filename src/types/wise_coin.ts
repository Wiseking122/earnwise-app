import { CompletionStatus } from '../types';

export type WiseCoinTransactionAction = 'credit' | 'deduction' | 'conversion';

export interface WiseCoinWallet {
  userId: string;
  balance: number;
  updatedAt: any;
}

export interface SurveySubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  surveyTitle?: string;
  screenshots: string[];
  note?: string;
  status: CompletionStatus;
  rewardAmount?: number;
  adminId?: string;
  submittedAt: any;
  reviewedAt?: any;
  rejectionReason?: string;
}

export interface WiseCoinTransaction {
  id: string;
  userId: string;
  adminId?: string;
  amount: number;
  action: WiseCoinTransactionAction;
  reason: string;
  status: 'completed';
  createdAt: any;
}

export interface CoinConversion {
  id: string;
  userId: string;
  adminId: string;
  wiseCoins: number;
  nairaAmount: number;
  createdAt: any;
}

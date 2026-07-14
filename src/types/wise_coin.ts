import { CompletionStatus } from '../types';

export type WiseCoinTransactionAction = 'credit' | 'deduction' | 'conversion';

export interface WiseCoinWallet {
  userId: string;
  balance: number;
  updatedAt: any;
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

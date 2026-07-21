export type TaskType = 'ad' | 'app_download' | 'referral' | 'content_creation' | 'video' | 'offers' | 'survey';
export type TaskStatus = 'active' | 'inactive';
export type CompletionStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type TransactionType = 'earning' | 'withdrawal' | 'referral' | 'staking' | 'bonus';
export type UserRole = 'user' | 'admin' | 'advertiser';
export type PlanType = 'free' | 'elite' | 'starter' | 'pro' | 'bronze' | 'diamond' | 'silver' | 'platinum' | 'golden';
export type RankType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface BankDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  bankCode: string;
}

export interface VaultEntry {
  id: string;
  userId: string;
  amount: number;
  bonus: number;
  payoutAmount: number;
  status: 'locked' | 'unlocked';
  lockedAt: any;
  unlocksAt: any;
  claimedAt?: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  role: UserRole;
  pendingBalance: number;
  withdrawableBalance: number;
  depositBalance?: number;
  taskEarnings?: number;
  totalOfferwallEarnings?: number;
  referralEarnings?: number;
  bonusEarnings?: number;
  totalEarnings?: number;
  taskBalance: number;
  referralBalance: number;
  telegramId?: string | null;
  deviceFingerprint?: string | null;
  wiseCoins: number; // Task wallet
  balance: number; // Naira/Available balance
  rank: RankType;
  vaultBalance?: number;
  tasksCompleted?: number;
  xp?: number;
  level?: number;
  streak?: number;
  referredBy?: string;
  lastActive?: any;
  lastCheckIn?: any;
  achievements?: string[];
  badges?: string[];
  behavioralTags?: string[];
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  dailyEmailEnabled?: boolean;
  dailyPushEnabled?: boolean;
  coachingStep?: number;
  lastCoachingAt?: any;
  demographics?: {
    deviceType?: string;
    location?: string;
    age?: number;
  };
  securityMetrics?: {
    lastIp?: string;
    deviceFingerprint?: string;
    isSuspended?: boolean;
    suspensionReason?: string;
  };
  plan: PlanType;
  planEndDate?: any;
  googleTokens?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
  };
  welcomeEmailSent?: boolean;
  subscriptionTier: 'free' | 'premium';
  referralCode: string;
  totalReferrals?: number;
  hasReceivedReferralBonus?: boolean;
  freeCoursesUsed?: number;
  bankDetails?: BankDetails;
  completedAds?: {
    id: string;
    timestamp: string;
    reward: number;
  }[];
  createdAt: any;
}

export interface PlatformSettings {
  wiseCoinName: string;
  wiseCoinSymbol: string;
  exchangeRate: number; // 1 WiseCoin = X Naira
  minConversion: number;
  maxConversion: number;
  exchangeEnabled: boolean;
  websiteName: string;
  supportEmail: string;
  telegramLink: string;
  aiKnowledge: string;
  faqs: { question: string; answer: string }[];
  withdrawalSettings: {
    minWithdrawal: number;
    maxWithdrawal: number;
    feePercentage: number;
  };
  ogadsConversionRate?: number;
}

export interface Task {
  id: string;
  advertiserId: string;
  title: string;
  description?: string;
  type: TaskType;
  reward?: number;
  requirements?: string;
  isRepeatable?: boolean;
  totalBudget: number;
  remainingBudget: number;
  userPayout: number;
  platformMargin: number;
  targetDemographics?: string[];
  tag: string;
  link?: string;
  videoUrl?: string;
  imageUrl?: string;
  shareText?: string;
  enableSocialShare?: boolean;
  requiresProof?: boolean; // Add this
  status: 'active' | 'paused' | 'completed' | 'pending' | 'pending_payment' | 'rejected';
  durationDays?: number;
  expiresAt?: any;
  targetCount?: number;
  completedCount?: number;
  clicksCount?: number;
  createdAt: any;
}

export interface TaskCompletion {
  id: string;
  userId: string;
  taskId: string;
  status: CompletionStatus;
  rewardEarned: number;
  submittedAt: any;
  verifiedAt?: any;
  rejectionReason?: string;
  screenshot?: string;
  proofText?: string;
  proof?: string;
  isCampaignTask?: boolean;
  advertiserId?: string;
  taskTitle?: string;
  taskType?: string;
  taskPlatform?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  withdrawalType?: 'task' | 'referral';
  bankDetails: BankDetails;
  requestedAt: any;
  processedAt?: any;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status?: 'pending' | 'completed' | 'rejected' | 'failed';
  description: string;
  createdAt: any;
  receiptDetails?: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  steps: string[];
  incomePotential: string;
  image: string;
  imageUrl?: string;
}

export interface CoursePurchase {
  id: string;
  userId: string;
  courseId: string;
  purchasedAt: any;
}

export interface OfferSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  offerId: string;
  offerTitle: string;
  payout: number;
  screenshotUrl: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  reviewedAt?: any;
  rejectionReason?: string;
  adminNotes?: string;
}

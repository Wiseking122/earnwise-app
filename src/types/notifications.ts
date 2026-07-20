import { Timestamp } from 'firebase/firestore';

export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationCategory = 'system' | 'reward' | 'withdrawal' | 'promo' | 'security' | 'task';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'scheduled' | 'draft';

export interface Notification {
  id?: string;
  userId: string | 'all' | 'premium' | 'free' | 'new';
  targetPlanIds?: string[]; // Specific plans like ['elite', 'pro']
  title: string;
  subtitle?: string;
  message: string;
  image?: string;
  icon?: string;
  buttonText?: string;
  buttonUrl?: string;
  deepLink?: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  status: NotificationStatus;
  createdAt: Timestamp | Date;
  scheduledAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  readBy?: string[]; // For broadcast notifications
  isRead?: boolean; // For individual notifications
}

export interface DeviceToken {
  token: string;
  userId: string;
  deviceType: string;
  browser: string;
  platform: 'web' | 'android' | 'ios' | 'telegram';
  createdAt: Timestamp | Date;
  lastUsedAt: Timestamp | Date;
}

export interface NotificationLog {
  id?: string;
  notificationId: string;
  userId: string;
  status: 'success' | 'failure';
  error?: string;
  deliveredAt: Timestamp | Date;
  deviceInfo: {
    platform: string;
    browser: string;
  };
}

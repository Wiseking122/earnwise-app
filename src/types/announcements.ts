import { Timestamp } from 'firebase/firestore';

export type AnnouncementPlacement = 
  | 'home_top' 
  | 'home_middle' 
  | 'home_bottom' 
  | 'home_floating'
  | 'dashboard_header' 
  | 'dashboard_footer'
  | 'task_center_top' 
  | 'task_center_bottom'
  | 'survey_page'
  | 'learning_hub'
  | 'wallet_page'
  | 'withdrawal_page'
  | 'referral_page'
  | 'profile_page'
  | 'login_page'
  | 'registration_page'
  | 'full_screen_popup'
  | 'sticky_banner'
  | 'modal_popup'
  | 'floating_card'
  | 'scrolling_marquee'
  | 'sidebar'
  | 'footer';

export type AnnouncementType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'promo' 
  | 'maintenance' 
  | 'update' 
  | 'offer' 
  | 'alert';

export type AnnouncementAnimation = 'fade' | 'slide' | 'bounce' | 'zoom';

export interface Announcement {
  id?: string;
  title: string;
  shortMessage: string;
  fullDescription?: string;
  bannerImage?: string;
  icon?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  textColor?: string;
  priority: number; // High number = shows first
  category: AnnouncementType;
  placements: AnnouncementPlacement[];
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  isActive: boolean;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  
  // Targeting
  targetAudience: 'everyone' | 'new' | 'existing' | 'activated' | 'non_activated' | 'premium' | 'telegram' | 'web';
  targetPlanIds?: string[];
  targetUserIds?: string[];

  // Display Options
  displayFrequency: 'once' | 'every_visit' | 'every_login';
  autoHide?: boolean;
  displayDuration?: number; // seconds
  manualClose: boolean;
  stickyUntilClosed: boolean;
  requireAcknowledgement: boolean;
  animationType: AnnouncementAnimation;
  
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AnnouncementAnalytics {
  announcementId: string;
  totalViews: number;
  totalClicks: number;
  totalDismissals: number;
  totalAcknowledgements: number;
  deviceStats: Record<string, number>;
  browserStats: Record<string, number>;
  countryStats: Record<string, number>;
}

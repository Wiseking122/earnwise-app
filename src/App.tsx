import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAdsterraScript } from './hooks/useAdsterraScript';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnimatePresence } from 'motion/react';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import FloatingAIAssistant from './components/FloatingAIAssistant';
import LoadingScreen from './components/LoadingScreen';
import Home from './pages/Home';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import Earnings from './pages/Earnings';
import Withdrawal from './pages/Withdrawal';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome';
import Invite from './pages/Invite';
import Leaderboard from './pages/Leaderboard';
import Referral from './pages/Referral';
import Upgrade from './pages/Upgrade';
import Deposit from './pages/Deposit';
import Transactions from './pages/Transactions';
import Vault from './pages/Vault';
import AdvertiserPortal from './pages/AdvertiserPortal';
import Achievements from './pages/Achievements';
import EarningsOutline from './pages/EarningsOutline';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Support from './pages/Support';
import Academy from './pages/Academy';
import SurveySubmission from './pages/SurveySubmission';
import SurveyHistory from './pages/SurveyHistory';
import Offers from './pages/Offers';
import SubmitProof from './pages/SubmitProof';
import PlatformSettings from './pages/admin/PlatformSettings';

import CoursePlayer from './pages/CoursePlayer';
import VideoPlayer from './pages/VideoPlayer';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTasks from './pages/admin/Tasks';
import AdminPayments from './pages/admin/Payments';
import AdminUsers from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';
import SurveyVerification from './pages/admin/SurveyVerification';
import OfferVerification from './pages/admin/OfferVerification';
import WiseCoinManager from './pages/admin/WiseCoinManager';
import AdminAds from './pages/admin/Ads';
import AdminNotifications from './pages/admin/Notifications';
import AdminAnnouncements from './pages/admin/Announcements';
import InstallAppModal from './components/InstallAppModal';
import { TelegramJoinPopup } from './components/TelegramJoinPopup';
import WelcomePopup from './components/WelcomePopup';
import SuspendedScreen from './components/SuspendedScreen';
import AdminAppeals from './pages/admin/AppealsManager';

function PrivateRoute({ children, adminOnly = false, bypassPlanCheck = false }: { children: React.ReactNode, adminOnly?: boolean, bypassPlanCheck?: boolean }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  if (!user) return <Navigate to="/welcome" />;
  
  // Guard for suspended users (excluding admins / wiseking)
  if (profile?.securityMetrics?.isSuspended && profile?.role !== 'admin' && user.email?.toLowerCase() !== 'wiseking7890@gmail.com') {
    return <SuspendedScreen />;
  }
  
  if (adminOnly && profile?.role !== 'admin' && user.email?.toLowerCase() !== 'wiseking7890@gmail.com') return <Navigate to="/" />;
  
  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingScreen />;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/invite/:code" element={<Invite />} />
        
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/tasks" element={<PrivateRoute><TaskList /></PrivateRoute>} />
        <Route path="/tasks/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
        <Route path="/earnings" element={<PrivateRoute><Earnings /></PrivateRoute>} />
        <Route path="/withdrawal" element={<PrivateRoute><Withdrawal /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute bypassPlanCheck><Profile /></PrivateRoute>} />
        <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
        <Route path="/referral" element={<PrivateRoute><Referral /></PrivateRoute>} />
        <Route path="/upgrade" element={<PrivateRoute bypassPlanCheck><Upgrade /></PrivateRoute>} />
        <Route path="/deposit" element={<PrivateRoute bypassPlanCheck><Deposit /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
        <Route path="/vault" element={<PrivateRoute><Vault /></PrivateRoute>} />
        <Route path="/advertiser" element={<PrivateRoute><AdvertiserPortal /></PrivateRoute>} />
        <Route path="/achievements" element={<PrivateRoute><Achievements /></PrivateRoute>} />
        <Route path="/academy" element={<PrivateRoute><Academy /></PrivateRoute>} />
        <Route path="/submit-survey" element={<PrivateRoute><SurveySubmission /></PrivateRoute>} />
        <Route path="/survey-history" element={<PrivateRoute><SurveyHistory /></PrivateRoute>} />
        <Route path="/offers" element={<PrivateRoute><Offers /></PrivateRoute>} />
        <Route path="/submit-proof" element={<PrivateRoute><SubmitProof /></PrivateRoute>} />

        <Route path="/academy/course/:id" element={<PrivateRoute><CoursePlayer /></PrivateRoute>} />
        <Route path="/player" element={<PrivateRoute><VideoPlayer /></PrivateRoute>} />
        <Route path="/outline" element={<EarningsOutline />} />
        
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/support" element={<PrivateRoute bypassPlanCheck><Support /></PrivateRoute>} />
        
        <Route path="/admin" element={<PrivateRoute adminOnly bypassPlanCheck><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/tasks" element={<PrivateRoute adminOnly bypassPlanCheck><AdminTasks /></PrivateRoute>} />
        <Route path="/admin/payments" element={<PrivateRoute adminOnly bypassPlanCheck><AdminPayments /></PrivateRoute>} />
        <Route path="/admin/survey-verification" element={<PrivateRoute adminOnly bypassPlanCheck><SurveyVerification /></PrivateRoute>} />
        <Route path="/admin/proof-review" element={<PrivateRoute adminOnly bypassPlanCheck><OfferVerification /></PrivateRoute>} />
        <Route path="/admin/wise-coin" element={<PrivateRoute adminOnly bypassPlanCheck><WiseCoinManager /></PrivateRoute>} />
        <Route path="/admin/platform-settings" element={<PrivateRoute adminOnly bypassPlanCheck><PlatformSettings /></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute adminOnly bypassPlanCheck><AdminUsers /></PrivateRoute>} />
        <Route path="/admin/courses" element={<PrivateRoute adminOnly bypassPlanCheck><AdminCourses /></PrivateRoute>} />
        <Route path="/admin/ads" element={<PrivateRoute adminOnly bypassPlanCheck><AdminAds /></PrivateRoute>} />
        <Route path="/admin/notifications" element={<PrivateRoute adminOnly bypassPlanCheck><AdminNotifications /></PrivateRoute>} />
        <Route path="/admin/announcements" element={<PrivateRoute adminOnly bypassPlanCheck><AdminAnnouncements /></PrivateRoute>} />
        <Route path="/admin/appeals" element={<PrivateRoute adminOnly bypassPlanCheck><AdminAppeals /></PrivateRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ServiceWorkerRegistration />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppContent() {
  useAdsterraScript();
  
  React.useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        if (typeof tg.ready === 'function') tg.ready();
        if (typeof tg.expand === 'function') tg.expand();
        if (typeof tg.enableClosingConfirmation === 'function') {
           tg.enableClosingConfirmation();
         }
        if (typeof tg.setHeaderColor === 'function') {
           tg.setHeaderColor('#0f172a'); // slate-900
        }
      }
    } catch (err) {
      console.log('Telegram App Init Error:', err);
    }
  }, []);
  
  return (
    <>
      <AppRoutes />
      <FloatingAIAssistant />
      <InstallAppModal />
      <TelegramJoinPopup />
      <WelcomePopup />
    </>
  );
}

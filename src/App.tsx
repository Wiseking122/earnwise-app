import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import LuckySpin from './pages/LuckySpin';
import Transactions from './pages/Transactions';
import Vault from './pages/Vault';
import AdvertiserPortal from './pages/AdvertiserPortal';
import Achievements from './pages/Achievements';
import EarningsOutline from './pages/EarningsOutline';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Support from './pages/Support';
import Academy from './pages/Academy';
import CoursePlayer from './pages/CoursePlayer';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTasks from './pages/admin/Tasks';
import AdminPayments from './pages/admin/Payments';
import AdminUsers from './pages/admin/Users';
import { CpxWidget } from './components/CpxWidget';

function PrivateRoute({ children, adminOnly = false, bypassPlanCheck = false }: { children: React.ReactNode, adminOnly?: boolean, bypassPlanCheck?: boolean }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  if (!user) return <Navigate to="/welcome" />;
  if (adminOnly && profile?.role !== 'admin' && user.email !== 'wiseking7890@gmail.com') return <Navigate to="/" />;

  // Enforce plan activation for non-admin users on free plan
  if (!bypassPlanCheck && profile?.role !== 'admin' && user.email !== 'wiseking7890@gmail.com' && profile?.plan === 'free') {
    return <Navigate to="/upgrade" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useAuth();
  
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
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
      <Route path="/lucky-spin" element={<PrivateRoute><LuckySpin /></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
      <Route path="/vault" element={<PrivateRoute><Vault /></PrivateRoute>} />
      <Route path="/advertiser" element={<PrivateRoute><AdvertiserPortal /></PrivateRoute>} />
      <Route path="/achievements" element={<PrivateRoute><Achievements /></PrivateRoute>} />
      <Route path="/academy" element={<PrivateRoute><Academy /></PrivateRoute>} />
      <Route path="/academy/course/:id" element={<PrivateRoute><CoursePlayer /></PrivateRoute>} />
      <Route path="/outline" element={<EarningsOutline />} />
      
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/support" element={<PrivateRoute bypassPlanCheck><Support /></PrivateRoute>} />
      
      <Route path="/admin" element={<PrivateRoute adminOnly bypassPlanCheck><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/tasks" element={<PrivateRoute adminOnly bypassPlanCheck><AdminTasks /></PrivateRoute>} />
      <Route path="/admin/payments" element={<PrivateRoute adminOnly bypassPlanCheck><AdminPayments /></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute adminOnly bypassPlanCheck><AdminUsers /></PrivateRoute>} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppContent() {
  const { profile } = useAuth();
  
  return (
    <>
      {profile?.uid && <CpxWidget userId={profile.uid} />}
      <AppRoutes />
    </>
  );
}

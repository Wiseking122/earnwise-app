import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getApiUrl } from '../lib/config';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, limit, getDocs, doc, updateDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types';
import { PLANS } from '../constants/plans';
import { safeStorage } from '../lib/storage';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AnimatedNumber from '../components/AnimatedNumber';
import { 
  Trophy, 
  ArrowRight, 
  ChevronRight, 
  Star,
  Zap,
  Gift,
  Award,
  Users,
  Flame,
  Target,
  Crown,
  Sparkles,
  TrendingUp,
  Dices,
  Play,
  Wallet,
  Lock,
  Megaphone,
  RefreshCcw,
  ListTodo,
  ExternalLink,
  ChevronDown,
  Bot,
  Search,
  Video,
  Copy,
  CheckCircle2,
  Share2,
  Coins
} from 'lucide-react';

import { DailyCheckIn } from '../components/DailyCheckIn';
import { useLiveActivities } from '../hooks/useLiveActivities';
import { DailyGoal } from './DailyGoal';
import { AdsterraBanner } from '../components/AdsterraBanner';
import { MaintenanceModal } from '../components/MaintenanceModal';
import { AnnouncementEngine, ScrollingBanner } from '../components/AnnouncementEngine';
import { ACHIEVEMENTS } from '../data/achievements';
import Confetti from '../components/Confetti';
import PayoutTicker from '../components/PayoutTicker';

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [featuredTasks, setFeaturedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRenewalRequired, setIsRenewalRequired] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpNumber, setLevelUpNumber] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("🚧 Task Marketplace Upgrade Regular tasks are temporarily unavailable while we add better sponsored campaigns. Please continue with Surveys for now. Thank you for your patience!");
  const [adsMaintenanceMode, setAdsMaintenanceMode] = useState(false);
  const [wiseCoinBalance, setWiseCoinBalance] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(doc(db, 'wise_coin_wallets', profile.uid), (snap) => {
      if (snap.exists()) {
        setWiseCoinBalance(snap.data().balance || 0);
      } else {
        setWiseCoinBalance(0);
      }
    });
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    // Listen for Ads Configuration
    const adsConfigUnsub = onSnapshot(doc(db, 'system_settings', 'ads_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdsMaintenanceMode(data.adsMaintenanceMode ?? false);
        setMaintenanceMessage(data.maintenanceMessage ?? maintenanceMessage);
      }
    });

    return () => adsConfigUnsub();
  }, []);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const globalActivities = useLiveActivities(3);

  const referralLink = profile?.referralCode 
    ? `${window.location.origin}/invite/${profile.referralCode}` 
    : '';
  const shareMessage = `Join Earnwise and start earning money today! I'm inviting you to the world's best earning platform.\n\nSign up here: ${referralLink}`;

  const copyCodeToClipboard = () => {
    if (copiedCode || !profile?.referralCode) return;
    navigator.clipboard.writeText(profile.referralCode);
    setCopiedCode(true);
    setToastMessage('Referral code copied successfully!');
    setShowToast(true);
    setTimeout(() => setCopiedCode(false), 2000);
    setTimeout(() => setShowToast(false), 2500);
  };

  const copyLinkToClipboard = () => {
    if (copiedLink || !referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setToastMessage('Referral link copied successfully!');
    setShowToast(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Earnwise',
          text: shareMessage,
          url: referralLink,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Error sharing:", err);
          copyLinkToClipboard();
        }
      }
    } else {
      copyLinkToClipboard();
    }
  };

  // Monitor level up
  useEffect(() => {
    if (profile?.level && profile?.uid) {
      const storedLastLevelStr = safeStorage.getItem(`earnwise_last_level_${profile.uid}`);
      if (storedLastLevelStr) {
        const lastLevel = parseInt(storedLastLevelStr, 10);
        if (profile.level > lastLevel) {
          setLevelUpNumber(profile.level);
          setShowLevelUpModal(true);
        }
      }
      safeStorage.setItem(`earnwise_last_level_${profile.uid}`, profile.level.toString());
    }
  }, [profile?.level, profile?.uid]);

  // XP Progress Calculation
  const nextLevelXp = (profile?.level || 1) * 1000;
  const currentXp = profile?.xp || 0;
  const progress = Math.min((currentXp / nextLevelXp) * 100, 100);

  const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
  const userPlan = isAdmin ? 'golden' : (profile?.plan || 'free');
  const multiplier = PLANS.find(p => p.id === userPlan)?.multiplier || 1.0;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'payouts'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isRenewalRequired !== undefined) {
          setIsRenewalRequired(!!data.isRenewalRequired);
        }
      }
    });
    return () => unsub();
  }, []);

  const isPlanExpired = useMemo(() => {
    if (!profile?.planEndDate || profile?.plan === 'free' || isAdmin) return false;
    const end = profile.planEndDate.toDate ? profile.planEndDate.toDate() : new Date(profile.planEndDate);
    return new Date() > end;
  }, [profile?.planEndDate, profile?.plan, isAdmin]);

  const daysLeft = useMemo(() => {
    if (!profile?.planEndDate || profile?.plan === 'free' || isAdmin) return null;
    const end = profile.planEndDate.toDate ? profile.planEndDate.toDate() : new Date(profile.planEndDate);
    const diff = end.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile?.planEndDate, profile?.plan, isAdmin]);

  useEffect(() => {
    if (isPlanExpired && isRenewalRequired) {
      setShowRenewModal(true);
    } else {
      setShowRenewModal(false);
    }
  }, [isPlanExpired, isRenewalRequired]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'tasks'), where('status', '==', 'active'), limit(3));
        const snap = await getDocs(q);
        setFeaturedTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'tasks');
      } finally {
        setLoading(false);
      }
    }
    
    // Check Streak
    const checkStreak = async () => {
      if (!profile || !profile.uid) return;
      
      try {
        const lastActive = profile.lastActive?.toDate?.() || profile.lastActive;
        if (!lastActive) {
            await updateDoc(doc(db, 'users', profile.uid), {
              streak: 1,
              lastActive: serverTimestamp()
            });
            return;
        }

        const lastDate = new Date(lastActive);
        const now = new Date();
        
        // Zero out time
        const d1 = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          await updateDoc(doc(db, 'users', profile.uid), {
            streak: (profile.streak || 0) + 1,
            lastActive: serverTimestamp()
          });
        } else if (diffDays > 1) {
          await updateDoc(doc(db, 'users', profile.uid), {
            streak: 1,
            lastActive: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
      }
    };

    fetchData();
    if (profile) checkStreak();
  }, [user, profile?.uid]);

  const viewAiPlan = async () => {
    if (loadingInsights) return;
    setLoadingInsights(true);
    setShowInsightsModal(true);
    setAiInsightsError(null);
    try {
      const res = await fetch(getApiUrl('/api/ai/insights'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          userId: profile?.uid,
          balance: profile?.balance || 0,
          level: profile?.level || 1,
          streak: profile?.streak || 0,
          plan: profile?.plan || 'free'
        })
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setAiInsights(data);
    } catch (err: any) {
      console.warn("AI backend connection failed, activating local smart engine:", err);
      // Fallback local AI engine ensures Wise AI always works
      const estimatedEarning = Number(profile?.balance || 0) + (profile?.plan === 'golden' ? 15000 : profile?.plan === 'platinum' ? 7500 : 2500);
      setAiInsights({
        prediction: `${estimatedEarning.toLocaleString()} WiseCoins daily earning potential based on your ${profile?.plan || 'free'} tier`,
        insights: [
          { title: "🔥 Wise AI Direct Strategy", description: "Regular ad tasks are temporarily unavailable for upgrade. Complete high-yield surveys in the Survey section to maintain your daily earning momentum.", type: "quick_win" },
          { title: "Streak Boost Active", description: `You have a ${profile?.streak || 1} day active streak. Complete at least one survey daily to maintain your 1.5x earnings multiplier!`, type: "strategy" },
          { title: "VIP Multiplier Tip", description: (profile?.plan === 'free' && !isAdmin) ? "Upgrade to Gold or VIP tier to unlock instant 3x task reward payouts and priority escrow clearance." : "Share your VIP referral link to earn instant 2,500 WiseCoins bonus per verified invite.", type: "upgrade" }
        ]
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleAdsCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (adsMaintenanceMode) {
      setShowMaintenance(true);
    } else {
      navigate('/tasks?category=ad');
    }
  };

  return (
    <Layout>
      <ScrollingBanner />
      <div className="px-3 sm:px-4 py-3 sm:py-5 pb-24 space-y-4 sm:space-y-6 max-w-2xl mx-auto relative">
        <AnnouncementEngine placement="home_top" />
        <div className="premium-blur" />
        
        <PayoutTicker />

        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-11 h-11 sm:w-14 sm:h-14 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl p-[2px] shadow-[0_0_12px_rgba(59,130,246,0.4)]"
            >
                <div className="w-full h-full bg-slate-900 rounded-[0.6rem] sm:rounded-[0.9rem] flex items-center justify-center font-black text-blue-400 text-lg sm:text-2xl border border-blue-500/30">
                  {profile?.displayName?.[0] || 'U'}
                </div>
            </motion.div>
            <div>
              <p className="text-[8px] sm:text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-0.5">Account Overview</p>
              <h1 className="font-display font-black text-white text-xl sm:text-2xl leading-none drop-shadow-md">
                Hi, {profile?.displayName?.split(' ')[0] || 'Earner'}
              </h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/60 backdrop-blur-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
            >
              <div className="relative">
                  <Flame size={15} className="text-orange-500 fill-orange-500 sm:w-[18px] sm:h-[18px]" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-orange-500 blur-md opacity-40"
                  />
              </div>
              <span className="font-black text-white text-xs sm:text-sm tracking-tight">{profile?.streak || 0} Streak</span>
            </motion.div>
          </div>
        </div>

        {/* Main Bento Area */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-6 gap-3 sm:gap-4"
        >
          {/* Main Balance Card (Restored Virtual Card Design) */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="col-span-6 bg-slate-900/80 backdrop-blur-3xl border border-blue-500/30 rounded-xl sm:rounded-3xl p-3.5 sm:p-5 text-white relative overflow-hidden group shadow-[0_12px_40px_rgba(37,99,235,0.15)]">
            {/* Holographic metallic effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/5 to-white/10 opacity-50 z-0 pointer-events-none" />
            
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 group-hover:scale-110 to-transparent transition-transform duration-700 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-20 -mb-20 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)' }} />
            
            {/* Virtual Card Chip & Logo */}
            <div className="relative z-10 flex justify-between items-center mb-2.5 sm:mb-4">
              <div className="w-8 h-5.5 rounded border border-amber-500/30 bg-gradient-to-br from-amber-200/20 to-yellow-500/10 flex flex-col justify-center gap-0.5 px-1.5 overflow-hidden shadow-inner relative">
                 <div className="w-full h-px bg-amber-500/20"></div>
                 <div className="w-full h-px bg-amber-500/20"></div>
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent w-[200%] -translate-x-[50%] group-hover:translate-x-[0%] transition-transform duration-1000" />
              </div>
              <div className="flex gap-0.5 opacity-80">
                 <div className="w-4 h-4 rounded-full bg-red-500/80 mix-blend-screen mix-blend-lighten blur-[0.5px]"></div>
                 <div className="w-4 h-4 rounded-full bg-amber-500/80 -ml-2 mix-blend-screen mix-blend-lighten blur-[0.5px]"></div>
              </div>
            </div>
 
              <div className="relative z-10 flex flex-col h-full justify-start gap-2.5 sm:gap-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="text-blue-200 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] truncate drop-shadow-md">Available Balance</p>
                      <div className="w-1 h-1 bg-emerald-400 opacity-80 rounded-full animate-pulse shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight text-white mb-0.5 break-all select-all drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      ₦<AnimatedNumber value={profile?.balance || 0} fractionDigits={0} />
                    </h2>
                    <p className="text-blue-400/80 text-[7.5px] sm:text-[9px] font-bold uppercase tracking-widest truncate">Available Naira Funds Secure</p>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <Link to="/deposit" className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all active:scale-95 group/icon relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                      <Zap size={14} className="text-blue-400 group-hover/icon:scale-110 transition-transform drop-shadow" />
                    </Link>
                    <Link to="/withdrawal" className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-[0_0_12px_rgba(37,99,235,0.3)]">
                      <Wallet size={14} className="text-white drop-shadow" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-0.5 mb-0.5">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-inner relative overflow-hidden group/card shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000" />
                    <p className="text-slate-400 text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-widest mb-0.5 truncate">Task Wallet</p>
                    <h3 className="text-xs sm:text-base font-display font-black text-white truncate drop-shadow-md">
                      ₦<AnimatedNumber value={profile?.taskBalance || 0} />
                    </h3>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-inner relative overflow-hidden group/card shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000" />
                    <p className="text-slate-400 text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-widest mb-0.5 truncate">Referral Wallet</p>
                    <h3 className="text-xs sm:text-base font-display font-black text-white truncate drop-shadow-md">
                      ₦<AnimatedNumber value={profile?.referralBalance || 0} />
                    </h3>
                  </div>
                  <div className="col-span-2 bg-linear-to-br from-amber-500/10 to-yellow-600/5 backdrop-blur-md border border-amber-500/30 hover:bg-amber-500/15 transition-all duration-300 rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-inner relative overflow-hidden group/card shadow-[0_4px_12px_rgba(245,158,11,0.1)]">
                    <div className="absolute -inset-2 bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-500">
                          <Star size={12} className="fill-amber-500" />
                        </div>
                        <div>
                          <p className="text-amber-500/80 text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-widest leading-none mb-0.5">Wise Coin (WC)</p>
                          <p className="text-[6.5px] text-amber-500/60 font-bold uppercase tracking-widest leading-none">Task & Survey Rewards</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm sm:text-lg font-display font-black text-amber-400 drop-shadow-md">
                          <AnimatedNumber value={wiseCoinBalance} /> WC
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          {/* Plan Status Banner */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="col-span-6">
            {profile?.plan !== 'free' || isAdmin ? (
              <div className="bg-linear-to-r from-amber-400 to-orange-500 p-3 sm:p-3.5 rounded-xl text-white flex items-center justify-between shadow-md border border-orange-400/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20">
                    <Crown size={16} className="fill-white" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-xs sm:text-sm leading-tight uppercase tracking-tighter">
                      {isAdmin ? 'Admin Elite' : `${profile?.plan} Plan`} Active
                    </h4>
                    <p className="text-white/80 text-[7.5px] sm:text-[9px] font-bold uppercase tracking-widest mb-0.5">
                      Multiplier: {isAdmin ? '10.0' : multiplier}x Reward Boost {isAdmin && '(Free Admin Access)'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isRenewalRequired ? (
                        <>
                          <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                          <p className="text-white/90 text-[7.5px] sm:text-[9px] font-black uppercase tracking-widest">
                            {daysLeft !== null ? (daysLeft <= 0 ? 'Expired' : `${daysLeft} Days Remaining`) : 'Active'}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-1 h-1 bg-emerald-300 rounded-full animate-ping" />
                          <p className="text-emerald-100 text-[7.5px] sm:text-[9px] font-black uppercase tracking-widest">
                            Status: Earning Enabled (Account Active)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {!isAdmin && (
                  <Link to="/upgrade" className="bg-white text-orange-600 px-3 py-1.5 rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-transform hover:bg-orange-50">
                    Upgrade
                  </Link>
                )}
              </div>
            ) : (
              <Link to="/upgrade" className="bg-blue-600 p-3 sm:p-3.5 rounded-xl text-white flex items-center justify-between shadow-md border border-blue-500 group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <Zap size={16} className="fill-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-xs sm:text-sm leading-tight">Activate High-Yield Plan</h4>
                    <p className="text-white/70 text-[7.5px] sm:text-[9px] font-bold uppercase tracking-widest">Boost your earnings by 5.0x</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={14} />
              </Link>
            )}
          </motion.div>
        </motion.div>

        {/* Ads Center Maintenance Announcement */}
        <AnnouncementEngine placement="home_floating" />
        {adsMaintenanceMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-linear-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-md"
          >
            <div className="bg-blue-500 rounded-full p-1.5 mt-0.5 shadow-lg shadow-blue-500/20">
              <Sparkles size={14} className="text-white" />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-blue-100 leading-relaxed">
              🚀 New sponsored tasks are coming soon! Continue earning through Surveys while we upgrade the Task Marketplace.
            </p>
          </motion.div>
        )}

        {/* Daily Check-in Dashboard */}
        <DailyCheckIn />

        {/* Daily Tasks Goal Progression */}
        <DailyGoal />

        {/* Weekly Leaderboard (Hall of Fame) Promo Card */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              <h3 className="text-base font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Hall of Fame</h3>
            </div>
            <Link to="/leaderboard" className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-400 transition-colors">
              Weekly Prizes
            </Link>
          </div>

          <Link 
            to="/leaderboard"
            className="block bg-gradient-to-br from-yellow-950/40 to-slate-900 border border-yellow-500/30 rounded-xl p-3 sm:p-4 text-white relative overflow-hidden shadow-xl hover:border-yellow-400/50 transition-all active:scale-[0.98] group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none -mr-8 -mt-8 opacity-40 group-hover:opacity-60 transition-opacity" style={{ background: 'radial-gradient(circle, rgba(234, 179, 8, 0.3) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-yellow-500/20 border border-yellow-500/40 rounded-lg flex items-center justify-center text-yellow-400 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform shrink-0">
                <Trophy size={18} className="drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h4 className="font-display font-black text-sm leading-tight uppercase italic text-white group-hover:text-yellow-200 transition-colors">
                    Weekly WiseCoins Prizes
                  </h4>
                  <div className="bg-yellow-500/20 px-1.5 py-0.5 rounded-full border border-yellow-500/30">
                    <span className="text-[6.5px] font-black text-yellow-300 uppercase tracking-widest">15,000 WC Max</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[9.5px] sm:text-[10.5px] font-medium leading-tight max-w-sm sm:max-w-md">
                  Complete tasks, invite active members and earn XP. Top 10 earners get WiseCoins bonuses every Sunday at 11:59 PM!
                </p>
              </div>
              <div className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-yellow-500 transition-colors shrink-0">
                <ArrowRight size={14} className="text-white group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </section>

        {/* Wise AI Assistant Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <h3 className="text-base font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Wise AI Mentor</h3>
            </div>
          </div>

          <div 
            onClick={viewAiPlan}
            className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-xl p-3 sm:p-4 text-white relative overflow-hidden shadow-xl cursor-pointer group hover:border-blue-400/50 transition-all active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none -mr-8 -mt-8 opacity-40 group-hover:opacity-60 transition-opacity" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/40 rounded-lg flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                <Bot size={18} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h4 className="font-display font-black text-sm leading-tight uppercase italic text-white group-hover:text-blue-200 transition-colors">
                    Wise AI Strategy
                  </h4>
                  <div className="bg-blue-500/20 px-1.5 py-0.5 rounded-full border border-blue-500/30">
                    <span className="text-[6.5px] font-black text-blue-300 uppercase tracking-widest">Dune & Oak</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[9.5px] font-medium leading-tight max-w-xs">
                  Generate personalized daily earning strategy with AI.
                </p>
              </div>
              <div className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-blue-600 transition-colors">
                <ArrowRight size={14} className="text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* Refer & Earn (30% Team Program) Widget */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <h3 className="text-base font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Team Program</h3>
            </div>
            <Link to="/referral" className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-400 transition-colors">
              View Analytics
            </Link>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-indigo-500/30 rounded-xl p-3 sm:p-4 text-white relative overflow-hidden shadow-xl">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none -mr-8 -mt-8 opacity-50" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full pointer-events-none -ml-6 -mb-6 opacity-30" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)' }} />

            <div className="relative z-10 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              <div className="space-y-1.5 text-center lg:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full w-fit mx-auto lg:mx-0">
                  <Gift size={10} className="text-indigo-400" />
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Instant 30% Rewards</span>
                </div>
                <h4 className="font-display font-black text-sm sm:text-base leading-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-blue-200">
                  Invite Friends & Earn Commission
                </h4>
                <p className="text-slate-400 text-[10px] font-medium max-w-sm leading-relaxed mx-auto lg:mx-0">
                  Earn 30% commission instantly on all plan upgrades. Grow your team and earn commissions.
                </p>
                
                {/* Micro Stats inside home widget */}
                <div className="flex items-center justify-center lg:justify-start gap-2 pt-0.5">
                  <div className="bg-white/5 border border-white/5 rounded-lg px-2 py-0.5 text-center min-w-[4.5rem] flex-1 sm:flex-initial">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Total Referred</p>
                    <p className="text-xs font-black text-indigo-300">{profile?.totalReferrals || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg px-2 py-0.5 text-center min-w-[4.5rem] flex-1 sm:flex-initial">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Total Earnings</p>
                    <p className="text-xs font-black text-amber-400">{(profile?.referralEarnings || 0).toLocaleString()} WC</p>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto bg-slate-950/60 backdrop-blur-md rounded-xl p-3 border border-white/5 space-y-2.5 flex-shrink-0 lg:max-w-xs">
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Your Referral Code</p>
                  <div className="flex items-center justify-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1.5 rounded-lg">
                    <span className="font-mono font-black text-white text-xs sm:text-sm tracking-[0.2em]">{profile?.referralCode || 'N/A'}</span>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={copyCodeToClipboard}
                      className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <AnimatePresence mode="wait">
                        {copiedCode ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={copyLinkToClipboard}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-black text-[8px] uppercase tracking-widest cursor-pointer shadow-sm text-center flex items-center justify-center gap-0.5"
                  >
                    <AnimatePresence mode="wait">
                      {copiedLink ? (
                        <span className="text-green-400 flex items-center gap-0.5"><CheckCircle2 size={10} /> Copied</span>
                      ) : (
                        <span className="flex items-center gap-0.5"><ExternalLink size={10} /> Copy Link</span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black text-[8px] uppercase tracking-widest cursor-pointer shadow-md text-center flex items-center justify-center gap-0.5"
                  >
                    <Share2 size={10} /> Share
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links Section */}
        <div className="w-full">
          <Link to="/outline" className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 rounded-xl group relative overflow-hidden active:scale-[0.98] transition-all shadow-sm hover:border-blue-500/30 flex items-center justify-between w-full">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-500/30 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <h4 className="font-display font-black text-sm text-white drop-shadow-sm">Guide</h4>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">Master Earnwise App</p>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:translate-x-1 transition-transform group-hover:text-blue-400" size={18} />
          </Link>
        </div>

        {/* Home Ad Banner Placement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 overflow-hidden relative group shadow-xl">
             <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Partner Content</span>
              </div>
              <span className="text-[7.5px] font-bold text-blue-400/60 bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">Wise Ad Network</span>
            </div>
            <AdsterraBanner type="native" />
          </div>
        </motion.div>

        {/* Featured Opportunities Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <h3 className="text-base font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Premium Jobs</h3>
            </div>
            <Link to="/tasks" className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-400 transition-colors">
              View All Tasks
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
             {/* Earning Channels Grid */}
             <div className="grid grid-cols-2 gap-2.5">
               <Link 
                to="/surveys"
                className="bg-orange-500/10 border border-orange-500/30 p-2.5 rounded-xl text-left hover:bg-orange-500/20 transition-all active:scale-95 group"
               >
                 <div className="w-7.5 h-7.5 bg-orange-500 rounded-lg flex items-center justify-center text-white mb-2 shadow-md group-hover:rotate-12 transition-transform">
                   <Search size={12} />
                 </div>
                 <h4 className="font-display font-black text-white text-[10px] sm:text-sm uppercase italic tracking-tighter">Premium Surveys</h4>
                 <p className="text-orange-400 text-[6.5px] sm:text-[8px] font-bold uppercase tracking-widest mt-0.5">Verified Partners</p>
               </Link>
               
               <button 
                onClick={(e) => handleAdsCenterClick(e)}
                className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-left hover:bg-emerald-500/20 transition-all active:scale-95 group w-full"
               >
                 <div className="w-7.5 h-7.5 bg-emerald-500 rounded-lg flex items-center justify-center text-white mb-2 shadow-md group-hover:rotate-12 transition-transform">
                   <Play size={12} className="fill-white" />
                 </div>
                 <h4 className="font-display font-black text-white text-[10px] sm:text-sm uppercase italic tracking-tighter">Ads Center</h4>
                 <p className="text-emerald-400 text-[6.5px] sm:text-[8px] font-bold uppercase tracking-widest mt-0.5">Montage</p>
               </button>
             </div>

            {loading ? (
              [1, 2].map(i => <div key={`skeleton-home-${i}`} className="h-24 bg-slate-800/50 rounded-xl animate-pulse border border-white/5" />)
            ) : (
              featuredTasks.map((task, index) => (
                <Link 
                  key={task.id || index} 
                  to={`/tasks/${task.id}`}
                  className="group bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-3 rounded-xl shadow-sm hover:border-blue-500/30 hover:bg-slate-900/80 transition-all active:scale-[0.98] relative overflow-hidden"
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex gap-2.5 items-center min-w-0 flex-1 mr-2">
                      <div className="w-8.5 h-8.5 bg-white/5 rounded-lg flex items-center justify-center text-slate-300 border border-white/10 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 group-hover:text-blue-400 transition-all duration-300 shadow-inner shrink-0">
                        <Target size={14} className="group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-300 transition-colors">
                            {task.type.replace('_', ' ')}
                            </span>
                        </div>
                        <h4 className="font-display font-black text-white text-xs sm:text-sm leading-tight group-hover:text-blue-400 transition-colors uppercase italic drop-shadow-sm truncate">{task.title}</h4>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-display font-black text-sm sm:text-base tracking-tighter">{((task.reward ?? task.userPayout ?? 0) * multiplier).toFixed(0)} WC</p>
                      <div className="flex items-center justify-end gap-0.5">
                        <Zap size={8} className="text-blue-600 fill-blue-600" />
                        <span className="text-[8px] text-blue-600 font-black uppercase tracking-tighter">Boosted</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>


        {/* Global Activity Feed */}
        <section className="bg-slate-950 rounded-xl p-3.5 sm:p-5 text-white space-y-4 overflow-hidden relative shadow-xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent)]" />
            
            <div className="flex items-center justify-between relative z-10">
                <div className="space-y-0.5">
                  <h3 className="font-display font-black text-base tracking-tight leading-none">Global Pulse</h3>
                  <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Live Network Activity</p>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic leading-none">Live Now</span>
                </div>
            </div>

            <div className="space-y-2.5 relative z-10 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                    {globalActivities.map((item) => {
                        let iconColor = 'text-blue-500';
                        let bgGradient = 'from-blue-600/20 to-indigo-600/20';
                        let IconComponent = TrendingUp;

                        if (item.actionType === 'joined') {
                            iconColor = 'text-cyan-400';
                            bgGradient = 'from-cyan-500/20 to-teal-500/20';
                            IconComponent = Users;
                        } else if (item.actionType === 'deposited') {
                            iconColor = 'text-emerald-400';
                            bgGradient = 'from-emerald-500/20 to-green-500/20';
                            IconComponent = Wallet;
                        } else if (item.actionType === 'withdrew') {
                            iconColor = 'text-amber-400';
                            bgGradient = 'from-amber-500/20 to-orange-500/20';
                            IconComponent = Trophy;
                        } else if (item.actionType === 'task_completed') {
                            iconColor = 'text-fuchsia-400';
                            bgGradient = 'from-fuchsia-500/20 to-pink-500/20';
                            IconComponent = Zap;
                        }

                        return (
                            <motion.div 
                                key={item.id} 
                                layout
                                initial={{ opacity: 0, y: -30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                                transition={{ 
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                    opacity: { duration: 0.25 }
                                }}
                                className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 hover:border-blue-500/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-blue-500/50 transition-colors">
                                        <div className={`w-full h-full bg-linear-to-br ${bgGradient} flex items-center justify-center`}>
                                            <IconComponent size={15} className={`${iconColor} opacity-90 group-hover:scale-110 transition-transform`} />
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-white leading-tight">{item.title}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">{item.message}</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-slate-600 uppercase italic whitespace-nowrap">
                                    {item.time || 'Recently'}
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full -mr-40 -mb-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)' }} />
        </section>

        {/* Community Links */}
        <div className="grid grid-cols-2 gap-2.5">
            <a href="https://t.me/earnwise0" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 p-3 bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-xl hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-slate-900/80 hover:border-[#0088cc]/30 transition-all group shadow-sm">
                <div className="w-8.5 h-8.5 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-lg flex items-center justify-center group-hover:bg-[#0088cc] group-hover:border-[#0088cc] transition-colors duration-500 shadow-inner">
                    <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" className="w-4 h-4 brightness-200 contrast-200 grayscale-0 opacity-80 group-hover:brightness-0 group-hover:invert group-hover:opacity-100 transition-all" alt="Telegram" />
                </div>
                <div className="text-center mt-0.5">
                    <h5 className="font-display font-black text-white text-[10px] drop-shadow-sm leading-none">Channel</h5>
                    <p className="text-[8px] text-[#0088cc] font-bold uppercase tracking-tighter mt-0.5 leading-none">Updates</p>
                </div>
            </a>
            <a href="https://t.me/Earnwise01" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 p-3 bg-slate-900/60 backdrop-blur-3xl border border-blue-500/20 rounded-xl hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)] hover:bg-slate-900/80 hover:border-blue-400/40 transition-all group shadow-sm ring-1 ring-blue-500/10">
                <div className="w-8.5 h-8.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-500 shadow-inner">
                    <Users size={16} className="text-blue-400 group-hover:text-white transition-all" />
                </div>
                <div className="text-center mt-0.5">
                    <h5 className="font-display font-black text-white text-[10px] drop-shadow-sm leading-none">Chat Group</h5>
                    <p className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter mt-0.5 leading-none">Community</p>
                </div>
            </a>
        </div>
      </div>

      {/* Level Up Modal */}
      <AnimatePresence>
        {showLevelUpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Confetti />
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLevelUpModal(false)}
              className="absolute inset-0 bg-slate-950/90"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-slate-900 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-premium max-w-sm w-full relative overflow-hidden z-10 text-center text-white"
            >
              {/* Premium Background Glow effects */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 blur-3xl rounded-full pointer-events-none -z-10" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none -z-10" />

              {/* Glowing Badge Icon Container */}
              <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                  className="absolute inset-0 border border-dashed border-amber-300/30 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-2 bg-gradient-to-tr from-amber-500/30 to-orange-500/30 blur-md rounded-full"
                />
                {/* Visual Icon */}
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 relative">
                  <Trophy size={32} className="text-white fill-white/10" />
                  <Sparkles className="absolute -top-1 -right-1 text-white animate-bounce" size={14} />
                </div>
              </div>

              {/* Title Header with Gradient */}
              <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-[0.25em] mb-1">Elite Milestones</p>
              <h3 className="text-3xl font-display font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent italic leading-none uppercase mb-2">
                Level Up!
              </h3>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 inline-block mb-6">
                <span className="text-xs text-slate-400">Achieved Level </span>
                <span className="text-lg font-black text-amber-400">{levelUpNumber}</span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed max-w-sm mx-auto mb-6">
                Congratulations, your rank has advanced! As a level <span className="text-white font-bold">{levelUpNumber}</span> member, you have unlocked access to higher value premium tasks, multiplied daily bonuses, and higher payout limits.
              </p>

              {/* Rewards Checklist */}
              <div className="text-left bg-slate-950/50 border border-white/5 rounded-2xl p-4 gap-3 mb-6 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                    Task multiplier boosted to {(multiplier + 0.1).toFixed(1)}x
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                    Unlocks level {levelUpNumber} custom achievements
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
                    Premium VIP tasks visible on dashboard
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowLevelUpModal(false)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
              >
                Let&apos;s Go Earn More <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Insights Modal */}
      <AnimatePresence>
        {showInsightsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loadingInsights && setShowInsightsModal(false)}
              className="absolute inset-0 bg-slate-950/90"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-indigo-950 border border-indigo-500/30 p-6 sm:p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(79,70,229,0.3)] max-w-sm w-full relative overflow-hidden z-10 text-white"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none -z-10" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-400/50 rounded-full flex items-center justify-center text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                  <Bot size={24} className={loadingInsights ? "animate-spin" : ""} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl drop-shadow-md">Wise AI Plan</h3>
                  <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Personalized Strategy</p>
                </div>
              </div>

              {loadingInsights ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin"></div>
                  <p className="text-xs text-indigo-300 font-bold animate-pulse">Analyzing your profile & generating insights...</p>
                </div>
              ) : aiInsightsError ? (
                <div className="space-y-6 relative z-10 text-center py-6">
                   <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <span className="text-red-400 font-bold">!</span>
                   </div>
                   <p className="text-xs font-bold text-red-300">{aiInsightsError}</p>
                   {aiInsightsError.includes('Gemini API key') && (
                      <p className="text-[10px] text-slate-400 mt-2">Please configure your Gemini API Key in the settings or .env file to enable the Wise AI Assistant.</p>
                   )}
                   <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInsightsModal(false)}
                    className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg transition-colors border border-white/10"
                  >
                    Close
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-6 relative z-10">
                  {aiInsights?.prediction && (
                    <div className="bg-indigo-900/50 p-4 rounded-2xl border border-indigo-500/30">
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 text-center">Today's Prediction</p>
                      <p className="text-sm font-bold text-white text-center">{aiInsights.prediction}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {aiInsights?.insights?.map((insight: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                        <div className="mt-0.5">
                          {insight.type === 'quick_win' && <Zap size={16} className="text-yellow-400" />}
                          {insight.type === 'strategy' && <Target size={16} className="text-emerald-400" />}
                          {insight.type === 'upgrade' && <Crown size={16} className="text-purple-400" />}
                          {!['quick_win', 'strategy', 'upgrade'].includes(insight.type) && <Sparkles size={16} className="text-indigo-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white mb-0.5">{insight.title}</p>
                          <p className="text-[10px] text-slate-300 font-medium leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInsightsModal(false)}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    Got It
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Renew Plan Modal */}
      <AnimatePresence>
        {showRenewModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-900 border border-red-500/30 rounded-[2.5rem] p-6 max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto animate-bounce">
                <Lock size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">Plan Renewal Required</h3>
                <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                  Your premium subscription cycle has expired. You must renew or upgrade your package to continue completing tasks and accessing your earnings.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowRenewModal(false);
                  navigate('/upgrade');
                }}
                className="w-full bg-linear-to-r from-red-600 to-orange-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg hover:from-red-500 hover:to-orange-400 transition-all active:scale-95"
              >
                Renew Plan Now
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant Floating Toast Notification Overlay */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="fixed bottom-6 left-1/2 z-[150] flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white py-3 px-5 rounded-2xl shadow-2xl border border-white/10 max-w-[90%] w-72"
          >
            <div className="bg-emerald-500 text-white rounded-full p-0.5 flex-shrink-0">
              <CheckCircle2 size={14} />
            </div>
            <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <MaintenanceModal 
        isOpen={showMaintenance} 
        onClose={() => setShowMaintenance(false)} 
        message={maintenanceMessage}
      />
    </Layout>
  );
}

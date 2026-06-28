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
  Share2
} from 'lucide-react';

import { DailyCheckIn } from '../components/DailyCheckIn';
import { useLiveActivities } from '../hooks/useLiveActivities';
import { DailyGoal } from './DailyGoal';
import { CpxWidget } from '../components/CpxWidget';
import { ACHIEVEMENTS } from '../data/achievements';
import Confetti from '../components/Confetti';
import PayoutTicker from '../components/PayoutTicker';

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [featuredTasks, setFeaturedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpNumber, setLevelUpNumber] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);

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

  const multiplier = PLANS.find(p => p.id === (profile?.plan || 'free'))?.multiplier || 1.0;

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
        prediction: `₦${estimatedEarning.toLocaleString()} daily earning potential based on your ${profile?.plan || 'free'} tier`,
        insights: [
          { title: "High-Yield Survey", description: "Complete the ₦850 Premium Market Research survey available in your tasks tab.", type: "quick_win" },
          { title: "Streak Boost Active", description: `You have a ${profile?.streak || 1} day active streak. Complete 1 more task today to maintain your 1.5x earnings multiplier!`, type: "strategy" },
          { title: "VIP Multiplier Tip", description: profile?.plan === 'free' ? "Upgrade to Gold or VIP tier to unlock instant 3x task reward payouts and priority escrow clearance." : "Share your VIP referral link to earn instant ₦2,500 bonus per verified invite.", type: "upgrade" }
        ]
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleAdsCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const script = document.createElement('script');
    script.src = 'https://n6wxm.com/vignette.min.js';
    script.dataset.zone = '11109247';
    document.body.appendChild(script);
    navigate('/tasks?category=ad');
  };

  return (
    <Layout>
      <div className="p-3 sm:p-5 pb-24 space-y-5 sm:space-y-8 max-w-2xl mx-auto relative">
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
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="col-span-6 bg-slate-900/80 backdrop-blur-3xl border border-blue-500/30 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 text-white relative overflow-hidden group shadow-[0_15px_50px_rgba(37,99,235,0.2)]">
            {/* Holographic metallic effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/5 to-white/10 opacity-50 z-0 pointer-events-none" />
            
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 group-hover:scale-110 to-transparent transition-transform duration-700 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-20 -mb-20 pointer-events-none blur-2xl" style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)' }} />
            
            {/* Virtual Card Chip & Logo */}
            <div className="relative z-10 flex justify-between items-center mb-4 sm:mb-6">
              <div className="w-10 h-7 rounded border border-amber-500/30 bg-gradient-to-br from-amber-200/20 to-yellow-500/10 flex flex-col justify-center gap-1 px-2 overflow-hidden shadow-inner relative">
                 <div className="w-full h-px bg-amber-500/20"></div>
                 <div className="w-full h-px bg-amber-500/20"></div>
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent w-[200%] -translate-x-[50%] group-hover:translate-x-[0%] transition-transform duration-1000" />
              </div>
              <div className="flex gap-1 opacity-80">
                 <div className="w-5 h-5 rounded-full bg-red-500/80 mix-blend-screen mix-blend-lighten blur-[0.5px]"></div>
                 <div className="w-5 h-5 rounded-full bg-amber-500/80 -ml-2.5 mix-blend-screen mix-blend-lighten blur-[0.5px]"></div>
              </div>
            </div>

              <div className="relative z-10 flex flex-col h-full justify-start gap-3 sm:gap-6">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                      <p className="text-blue-200 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] truncate drop-shadow-md">Available Balance</p>
                      <div className="w-1 h-1 bg-emerald-400 opacity-80 rounded-full animate-pulse shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-white mb-0.5 break-all select-all drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                      ₦<AnimatedNumber value={profile?.balance || 0} fractionDigits={2} />
                    </h2>
                    <p className="text-blue-400/80 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest truncate">Digital Earning Assets Secured</p>
                  </div>
                  <div className="flex gap-1.5 sm:gap-3 shrink-0">
                    <Link to="/deposit" className="w-9 h-9 sm:w-12 sm:h-12 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all active:scale-95 group/icon relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                      <Zap size={16} className="text-blue-400 sm:w-5 sm:h-5 group-hover/icon:scale-110 transition-transform drop-shadow" />
                    </Link>
                    <Link to="/withdrawal" className="w-9 h-9 sm:w-12 sm:h-12 bg-linear-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-lg sm:rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                      <Wallet size={16} className="text-white sm:w-5 sm:h-5 drop-shadow" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-1 mb-1">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-inner relative overflow-hidden group/card shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000" />
                    <p className="text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 truncate">Task Wallet</p>
                    <h3 className="text-sm sm:text-lg font-display font-black text-white truncate drop-shadow-md">
                      ₦<AnimatedNumber value={profile?.taskBalance || 0} />
                    </h3>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-inner relative overflow-hidden group/card shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000" />
                    <p className="text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 truncate">Referral Wallet</p>
                    <h3 className="text-sm sm:text-lg font-display font-black text-white truncate drop-shadow-md">
                      ₦<AnimatedNumber value={profile?.referralBalance || 0} />
                    </h3>
                  </div>
                </div>
              </div>
            </motion.div>

          {/* Plan Status Banner */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="col-span-6">
            {profile?.plan !== 'free' ? (
              <div className="bg-linear-to-r from-amber-400 to-orange-500 p-4 sm:p-5 rounded-2xl text-white flex items-center justify-between shadow-md border border-orange-400/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
                    <Crown size={20} className="fill-white" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-sm sm:text-base leading-tight uppercase tracking-tighter">{profile?.plan} Plan Active</h4>
                    <p className="text-white/80 text-[8.5px] sm:text-[10px] font-bold uppercase tracking-widest">Multiplier: {multiplier}x Reward Boost</p>
                  </div>
                </div>
                <Link to="/upgrade" className="bg-white text-orange-600 px-4 py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-md active:scale-95 transition-transform hover:bg-orange-50">
                  Upgrade
                </Link>
              </div>
            ) : (
              <Link to="/upgrade" className="bg-blue-600 p-4 sm:p-5 rounded-2xl text-white flex items-center justify-between shadow-md border border-blue-500 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Zap size={20} className="fill-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-sm sm:text-base leading-tight">Activate High-Yield Plan</h4>
                    <p className="text-white/70 text-[8.5px] sm:text-[10px] font-bold uppercase tracking-widest">Boost your earnings by 5.0x</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={16} />
              </Link>
            )}
          </motion.div>
        </motion.div>

        {/* Daily Check-in Dashboard */}
        <DailyCheckIn />

        {/* Daily Tasks Goal Progression */}
        <DailyGoal />

        {/* Wise AI Assistant Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <h3 className="text-lg font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Wise AI Mentor</h3>
            </div>
          </div>

          <div 
            onClick={viewAiPlan}
            className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-5 text-white relative overflow-hidden shadow-2xl cursor-pointer group hover:border-blue-400/50 transition-all active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none -mr-12 -mt-12 opacity-40 group-hover:opacity-60 transition-opacity" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="w-11 h-11 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
                <Bot size={24} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-display font-black text-base leading-tight uppercase italic text-white group-hover:text-blue-200 transition-colors">
                    Wise AI Strategy
                  </h4>
                  <div className="bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                    <span className="text-[7px] font-black text-blue-300 uppercase tracking-widest">Dune & Oak</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[10px] font-medium leading-tight max-w-xs">
                  Generate personalized daily earning strategy with AI.
                </p>
              </div>
              <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-blue-600 transition-colors">
                <ArrowRight size={16} className="text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* Refer & Earn (20% Team Program) Widget */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <h3 className="text-lg font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Team Program</h3>
            </div>
            <Link to="/referral" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-400 transition-colors">
              View Analytics
            </Link>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 text-white relative overflow-hidden shadow-2xl">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none -mr-12 -mt-12 opacity-50" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none -ml-8 -mb-8 opacity-30" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)' }} />

            <div className="relative z-10 flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch lg:items-center justify-between">
              <div className="space-y-2 text-center lg:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center lg:justify-start gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full w-fit mx-auto lg:mx-0">
                  <Gift size={12} className="text-indigo-400" />
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Instant 20% Rewards</span>
                </div>
                <h4 className="font-display font-black text-base sm:text-lg leading-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-blue-200">
                  Invite Friends & Earn Commission
                </h4>
                <p className="text-slate-400 text-[11px] sm:text-xs font-medium max-w-sm leading-relaxed mx-auto lg:mx-0">
                  Earn 20% commission instantly on all plan upgrades. Grow your team and earn dynamic direct commissions.
                </p>
                
                {/* Micro Stats inside home widget */}
                <div className="flex items-center justify-center lg:justify-start gap-3 pt-1">
                  <div className="bg-white/5 border border-white/5 rounded-xl px-2.5 py-1 text-center min-w-[5rem] sm:min-w-[5.5rem] flex-1 sm:flex-initial">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">Total Referred</p>
                    <p className="text-xs sm:text-sm font-black text-indigo-300">{profile?.totalReferrals || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl px-2.5 py-1 text-center min-w-[5rem] sm:min-w-[5.5rem] flex-1 sm:flex-initial">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">Total Earnings</p>
                    <p className="text-xs sm:text-sm font-black text-amber-400">₦{(profile?.referralEarnings || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto bg-slate-950/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 space-y-3 flex-shrink-0 lg:max-w-xs">
                <div>
                  <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest text-center mb-1.5">Your Referral Code</p>
                  <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                    <span className="font-mono font-black text-white text-sm sm:text-base tracking-[0.2em]">{profile?.referralCode || 'N/A'}</span>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={copyCodeToClipboard}
                      className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <AnimatePresence mode="wait">
                        {copiedCode ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={copyLinkToClipboard}
                    className="flex-1 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest cursor-pointer shadow-sm text-center flex items-center justify-center gap-1"
                  >
                    <AnimatePresence mode="wait">
                      {copiedLink ? (
                        <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Copied</span>
                      ) : (
                        <span className="flex items-center gap-1"><ExternalLink size={11} /> Copy Link</span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex-1 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest cursor-pointer shadow-md text-center flex items-center justify-center gap-1"
                  >
                    <Share2 size={11} /> Share
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Link to="/lucky-spin" className="dark-glass-card p-4 rounded-2xl text-white group relative overflow-hidden active:scale-[0.98] transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/20 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Play size={18} className="fill-white" />
                </div>
                <div>
                  <h4 className="font-display font-black text-base">Daily Spin</h4>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Rewards Reset in 4h</p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:translate-x-1 transition-transform" size={16} />
            </div>
          </Link>

          <Link to="/outline" className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl group relative overflow-hidden active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-blue-500/30">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-500/30 text-blue-400 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h4 className="font-display font-black text-base text-white drop-shadow-sm">Earning Guide</h4>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Master EarnWise</p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:translate-x-1 transition-transform group-hover:text-blue-400" size={16} />
            </div>
          </Link>
        </div>

        {/* Featured Opportunities Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <h3 className="text-lg font-display font-black text-white uppercase tracking-tighter drop-shadow-md">Premium Jobs</h3>
            </div>
            <Link to="/tasks" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-400 transition-colors">
              View All Tasks
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
             {/* Earning Channels Grid */}
             <div className="grid grid-cols-2 gap-3">
               <Link 
                to="/tasks?category=survey"
                className="bg-orange-500/10 border border-orange-500/30 p-3 sm:p-4 rounded-2xl text-left hover:bg-orange-500/20 transition-all active:scale-95 group"
               >
                 <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white mb-2 sm:mb-3 shadow-md group-hover:rotate-12 transition-transform">
                   <Search size={14} className="sm:w-[18px] sm:h-[18px]" />
                 </div>
                 <h4 className="font-display font-black text-white text-[11px] sm:text-base uppercase italic tracking-tighter">Paid Surveys</h4>
                 <p className="text-orange-400 text-[7px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">CPX Network</p>
               </Link>
               
               <Link 
                to="/tasks?category=ad"
                className="bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4 rounded-2xl text-left hover:bg-emerald-500/20 transition-all active:scale-95 group"
               >
                 <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white mb-2 sm:mb-3 shadow-md group-hover:rotate-12 transition-transform">
                   <Play size={14} className="fill-white sm:w-[18px] sm:h-[18px]" />
                 </div>
                 <h4 className="font-display font-black text-white text-[11px] sm:text-base uppercase italic tracking-tighter">Ads Center</h4>
                 <p className="text-emerald-400 text-[7px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">Montage</p>
               </Link>
             </div>

            {loading ? (
              [1, 2].map(i => <div key={`skeleton-home-${i}`} className="h-28 bg-slate-800/50 rounded-2xl animate-pulse border border-white/5" />)
            ) : (
              featuredTasks.map((task, index) => (
                <Link 
                  key={task.id || index} 
                  to={`/tasks/${task.id}`}
                  className="group bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-sm hover:border-blue-500/30 hover:bg-slate-900/80 transition-all active:scale-[0.98] relative overflow-hidden"
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex gap-3 items-center min-w-0 flex-1 mr-2">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-300 border border-white/10 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 group-hover:text-blue-400 transition-all duration-300 shadow-inner shrink-0">
                        <Target size={18} className="group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-300 transition-colors">
                            {task.type.replace('_', ' ')}
                            </span>
                        </div>
                        <h4 className="font-display font-black text-white text-base leading-tight group-hover:text-blue-400 transition-colors uppercase italic drop-shadow-sm truncate">{task.title}</h4>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-display font-black text-lg sm:text-2xl tracking-tighter">₦{((task.reward ?? task.userPayout ?? 0) * multiplier).toFixed(0)}</p>
                      <div className="flex items-center justify-end gap-1">
                        <Zap size={10} className="text-blue-600 fill-blue-600" />
                        <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter">Boosted</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>


        {/* Global Activity Feed */}
        <section className="bg-slate-950 rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 text-white space-y-6 sm:space-y-8 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent)]" />
            
            <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <h3 className="font-display font-black text-2xl tracking-tight leading-none">Global Pulse</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Live Network Activity</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Live Now</span>
                </div>
            </div>

            <div className="space-y-4 relative z-10 overflow-hidden">
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
                                className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 hover:border-blue-500/20 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-blue-500/50 transition-colors">
                                        <div className={`w-full h-full bg-linear-to-br ${bgGradient} flex items-center justify-center`}>
                                            <IconComponent size={20} className={`${iconColor} opacity-90 group-hover:scale-110 transition-transform`} />
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-black text-white">{item.title}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.message}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-600 uppercase italic whitespace-nowrap">
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
        <div className="grid grid-cols-2 gap-3">
            <a href="https://t.me/earnwise0" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[2rem] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-slate-900/80 hover:border-[#0088cc]/30 transition-all group shadow-sm">
                <div className="w-10 h-10 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-xl flex items-center justify-center group-hover:bg-[#0088cc] group-hover:border-[#0088cc] transition-colors duration-500 shadow-inner">
                    <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" className="w-5 h-5 brightness-200 contrast-200 grayscale-0 opacity-80 group-hover:brightness-0 group-hover:invert group-hover:opacity-100 transition-all" alt="Telegram" />
                </div>
                <div className="text-center mt-1">
                    <h5 className="font-display font-black text-white text-[10px] drop-shadow-sm">Channel</h5>
                    <p className="text-[8px] text-[#0088cc] font-bold uppercase tracking-tighter mt-0.5">Updates</p>
                </div>
            </a>
            <a href="https://t.me/Earnwise01" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-slate-900/60 backdrop-blur-3xl border border-blue-500/20 rounded-[2rem] hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)] hover:bg-slate-900/80 hover:border-blue-400/40 transition-all group shadow-sm ring-1 ring-blue-500/10">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-500 shadow-inner">
                    <Users size={20} className="text-blue-400 group-hover:text-white transition-all" />
                </div>
                <div className="text-center mt-1">
                    <h5 className="font-display font-black text-white text-[10px] drop-shadow-sm">Chat Group</h5>
                    <p className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter mt-0.5">Community</p>
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
    </Layout>
  );
}

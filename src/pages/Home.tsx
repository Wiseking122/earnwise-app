import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, limit, getDocs, doc, updateDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types';
import { PLANS } from '../constants/plans';
import { safeStorage } from '../lib/storage';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronDown
} from 'lucide-react';

import { DailyCheckIn } from '../components/DailyCheckIn';
import { CpxWidget } from '../components/CpxWidget';
import TeleAd from '../components/TeleAd';
import { ACHIEVEMENTS } from '../data/achievements';
import Confetti from '../components/Confetti';

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [featuredTasks, setFeaturedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpNumber, setLevelUpNumber] = useState<number | null>(null);

  const globalActivities = [
    { id: '1', title: 'New Member', message: 'Tunde just joined from Lagos', time: '2m' },
    { id: '2', title: 'Payout', message: 'Sarah withdrew ₦5,000 via Paystack', time: '5m' },
    { id: '3', title: 'Task Completed', message: 'Musa earned ₦150 on Instagram task', time: '12m' }
  ];

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
  }, [profile?.uid]);

  return (
    <Layout>
      <div className="w-full relative z-50 px-5 pt-4">
         <TeleAd />
      </div>
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-14 h-14 bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl p-0.5 shadow-premium"
            >
                <div className="w-full h-full bg-white rounded-[0.9rem] flex items-center justify-center font-black text-blue-600 text-2xl border border-white">
                  {profile?.displayName?.[0] || 'U'}
                </div>
            </motion.div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5">Account Overview</p>
              <h1 className="font-display font-black text-slate-900 text-2xl leading-none">
                Hi, {profile?.displayName?.split(' ')[0] || 'Earner'}
              </h1>
            </div>
          </div>
          
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="relative">
                <Flame size={18} className="text-orange-500 fill-orange-500" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-orange-400 blur-md opacity-20"
                />
            </div>
            <span className="font-black text-slate-900 text-sm tracking-tight">{profile?.streak || 0} Streak</span>
          </motion.div>
        </div>

        {/* Main Bento Area */}
        <div className="grid grid-cols-6 gap-4">
          {/* Main Balance Card */}
          <div className="col-span-6 bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 group-hover:scale-110 to-transparent transition-all duration-700 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-20 -mb-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)' }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-6 sm:gap-8">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] truncate">Available Balance</p>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-white mb-1 break-all select-all">
                    ₦{(profile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate">Global Payout Enabled</p>
                </div>
                <div className="flex gap-2 sm:gap-3 shrink-0">
                  <Link to="/deposit" className="w-11 h-11 sm:w-14 sm:h-14 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-95 group/icon">
                    <Zap size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  </Link>
                  <Link to="/withdrawal" className="w-11 h-11 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-blue-900/40">
                    <Wallet size={20} className="text-white" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 backdrop-blur-md">
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 truncate">Task Earnings</p>
                  <h3 className="text-lg sm:text-xl font-display font-black text-white truncate">
                    ₦{(profile?.taskEarnings || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 backdrop-blur-md">
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 truncate">Referral Rewards</p>
                  <h3 className="text-lg sm:text-xl font-display font-black text-white truncate">
                    ₦{(profile?.referralEarnings || 0).toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* XP Progress Card */}
          <div className="col-span-6 md:col-span-3 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Level Progression</h4>
              <button
                onClick={() => { setLevelUpNumber(profile?.level || 1); setShowLevelUpModal(true); }}
                className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1 active:scale-95 border-none outline-none select-none"
                title="Review level milestones and celebrate"
              >
                <Sparkles size={10} className="animate-pulse" /> Celebrate Level {profile?.level || 1}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase">Now</p>
                <p className="text-2xl font-display font-black text-slate-900 leading-none">{profile?.level || 1}</p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-linear-to-r from-blue-600 to-indigo-600 rounded-full relative"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{currentXp.toLocaleString()} XP</span>
                  <span>{nextLevelXp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="col-span-6 md:col-span-3 grid grid-cols-2 gap-3">
            <Link to="/lucky-spin" className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all active:scale-95">
              <Dices className="text-emerald-500" size={24} />
              <div>
                <h5 className="text-sm font-black text-emerald-900 leading-tight">Lucky Spin</h5>
                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Win ₦500</p>
              </div>
            </Link>
            <Link to="/vault" className="bg-purple-50 border border-purple-100 rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all active:scale-95">
              <Lock className="text-purple-500" size={24} />
              <div>
                <h5 className="text-sm font-black text-purple-900 leading-tight">Stake Vault</h5>
                <p className="text-[9px] text-purple-600 font-bold uppercase tracking-widest">5% Bonus</p>
              </div>
            </Link>
          </div>

          {/* Plan Status Banner */}
          <div className="col-span-6">
            {profile?.plan !== 'free' ? (
              <div className="bg-linear-to-r from-amber-400 to-orange-500 p-6 rounded-[2rem] text-white flex items-center justify-between shadow-lg shadow-orange-100 border border-orange-400/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <Crown size={24} className="fill-white" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-lg leading-tight uppercase tracking-tighter">{profile?.plan} Plan Active</h4>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Multiplier: {multiplier}x Reward Boost</p>
                  </div>
                </div>
                <Link to="/upgrade" className="bg-white text-orange-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-transform hover:bg-orange-50">
                  Upgrade
                </Link>
              </div>
            ) : (
              <Link to="/upgrade" className="bg-blue-600 p-6 rounded-[2rem] text-white flex items-center justify-between shadow-lg shadow-blue-100 border border-blue-500 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Zap size={24} className="fill-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-lg leading-tight">Activate High-Yield Plan</h4>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Boost your earnings by 5.0x</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </Link>
            )}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/lucky-spin" className="dark-glass-card p-6 rounded-[2rem] text-white group relative overflow-hidden active:scale-[0.98] transition-all">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/20 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Play size={20} className="fill-white" />
                </div>
                <div>
                  <h4 className="font-display font-black text-lg">Daily Spin</h4>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Rewards Reset in 4h</p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link to="/outline" className="bg-white border border-slate-100 p-6 rounded-[2rem] group relative overflow-hidden active:scale-[0.98] transition-all shadow-sm">
            <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-slate-900">Earning Guide</h4>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Master EarnWise</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Featured Opportunities Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tighter">Premium Jobs</h3>
            </div>
            <Link to="/tasks" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
              View All Tasks
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              [1, 2].map(i => <div key={`skeleton-home-${i}`} className="h-32 bg-slate-100 rounded-[2.5rem] animate-pulse" />)
            ) : (
              featuredTasks.map((task, index) => (
                <Link 
                  key={task.id || index} 
                  to={`/tasks/${task.id}`}
                  className="group bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all active:scale-[0.98] relative overflow-hidden"
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                        <Target size={24} className="group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {task.type.replace('_', ' ')}
                            </span>
                        </div>
                        <h4 className="font-display font-black text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors uppercase italic">{task.title}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 font-display font-black text-2xl tracking-tighter">₦{(task.reward * multiplier).toFixed(0)}</p>
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
        <section className="bg-slate-950 rounded-[3rem] p-8 sm:p-10 text-white space-y-8 overflow-hidden relative shadow-2xl">
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

            <div className="space-y-4 relative z-10">
                {globalActivities.map((item, i) => (
                    <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-blue-500/50 transition-colors">
                                <div className="w-full h-full bg-linear-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center">
                                    <TrendingUp size={20} className="text-blue-500 opacity-50" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-black text-white">{item.title}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.message}</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase italic">
                            {item.time || 'Recently'}
                        </span>
                    </motion.div>
                ))}
            </div>
            
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full -mr-40 -mb-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)' }} />
        </section>

        {/* Community Links */}
        <div className="grid grid-cols-3 gap-3">
            <a href="https://t.me/Earnwise01" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-[2rem] hover:shadow-lg transition-all group">
                <div className="w-10 h-10 bg-[#0088cc]/5 rounded-xl flex items-center justify-center group-hover:bg-[#0088cc] transition-colors duration-500">
                    <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" className="w-5 h-5 group-hover:brightness-0 group-hover:invert transition-all" alt="Telegram" />
                </div>
                <div className="text-center">
                    <h5 className="font-display font-black text-slate-900 text-[10px]">Channel</h5>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Updates</p>
                </div>
            </a>
            <a href="https://t.me/earnwise0" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-white border border-blue-100 rounded-[2rem] hover:shadow-lg transition-all group shadow-sm ring-1 ring-blue-50">
                <div className="w-10 h-10 bg-[#0088cc]/5 rounded-xl flex items-center justify-center group-hover:bg-[#0088cc] transition-colors duration-500">
                    <Users size={20} className="text-[#0088cc] group-hover:text-white transition-all" />
                </div>
                <div className="text-center">
                    <h5 className="font-display font-black text-slate-900 text-[10px]">Chat Group</h5>
                    <p className="text-[8px] text-blue-500 font-bold uppercase tracking-tighter mt-0.5">Community</p>
                </div>
            </a>
            <a href="https://chat.whatsapp.com/FvzXNEVSAUxLL06YOoLSWo" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-[2rem] hover:shadow-lg transition-all group">
                <div className="w-10 h-10 bg-[#25D366]/5 rounded-xl flex items-center justify-center group-hover:bg-[#25D366] transition-colors duration-500">
                    <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" className="w-5 h-5 group-hover:brightness-0 group-hover:invert transition-all" alt="WhatsApp" />
                </div>
                <div className="text-center">
                    <h5 className="font-display font-black text-slate-900 text-[10px]">WhatsApp</h5>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">VIP Alerts</p>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
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
    </Layout>
  );
}

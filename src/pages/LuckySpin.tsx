import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dices, 
  Play, 
  Trophy, 
  Zap, 
  ShieldCheck, 
  Eye,
  AlertCircle,
  Coins,
  History,
  Timer,
  Gift,
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDocs, query, where, limit, orderBy, arrayUnion } from 'firebase/firestore';
import { PLANS } from '../constants/plans';
import { playRewardSound } from './sounds';
import Confetti from '../components/Confetti';
import VideoAd from '../components/VideoAd';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';

type SpinResult = {
  id: number;
  label: string;
  value: number;
  color: string;
};

const WHEEL_RESULTS: SpinResult[] = [
  { id: 0, label: '₦2', value: 2, color: 'bg-slate-900' },
  { id: 1, label: '₦5', value: 5, color: 'bg-indigo-600' },
  { id: 2, label: '₦1', value: 1, color: 'bg-emerald-500' },
  { id: 3, label: '₦10', value: 10, color: 'bg-amber-500' },
  { id: 4, label: '₦5', value: 5, color: 'bg-rose-500' },
  { id: 5, label: '₦20', value: 20, color: 'bg-purple-600' },
  { id: 6, label: '₦5', value: 5, color: 'bg-sky-500' },
  { id: 7, label: '₦10', value: 10, color: 'bg-yellow-400' },
];

export default function LuckySpin() {
  const { user, profile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'global'>('global');
  const [showRestriction, setShowRestriction] = useState(false);

  // Verification timer states (resilient to browser throttling in background tabs)
  const [verificationTimeLeft, setVerificationTimeLeft] = useState(15);
  const [startTime, setStartTime] = useState<number | null>(null);

  const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
  const planDetails = PLANS.find(p => p.id === (isAdmin ? 'golden' : (profile?.plan || 'free')));
  const multiplier = planDetails?.multiplier || 1.0;

  const userHasSpunToday = () => {
    if (history.length === 0) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return history.some((item: any) => {
      const date = item.submittedAt?.toMillis 
        ? new Date(item.submittedAt.toMillis()).toISOString().split('T')[0]
        : item.submittedAt?.seconds
          ? new Date(item.submittedAt.seconds * 1000).toISOString().split('T')[0]
          : item.submittedAt 
            ? new Date(item.submittedAt).toISOString().split('T')[0]
            : '';
      return date === todayStr;
    });
  };

  const hasSpunToday = userHasSpunToday();

  const hasWatchedAdToday = () => {
    if (!profile?.completedAds) return false;
    const today = new Date().toISOString().split('T')[0];
    return profile.completedAds.some((ad: any) => 
      ad.id === 'lucky_spin_ad' && ad.timestamp.startsWith(today)
    );
  };

  const mustWatchAd = !hasSpunToday && !hasWatchedAdToday();

  useEffect(() => {
    fetchHistory();
    fetchGlobalHistory();
  }, [user]);

  // Handle active verification timer (checking against real-world timestamp)
  useEffect(() => {
    if (!adLoading || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setVerificationTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [adLoading, startTime]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'completions'),
        where('userId', '==', user.uid),
        where('isSpin', '==', true),
        limit(15)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = a.submittedAt?.toMillis?.() || 0;
        const timeB = b.submittedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setHistory(docs.slice(0, 5));
    } catch (err) {
      console.error("Error fetching spin history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchGlobalHistory = async () => {
    try {
      const q = query(
        collection(db, 'completions'),
        where('isSpin', '==', true),
        limit(20)
      );
      const snap = await getDocs(q);
      
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = a.submittedAt?.toMillis?.() || 0;
        const timeB = b.submittedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setGlobalHistory(docs.slice(0, 10));
    } catch (err) {
      console.error("Error fetching global history:", err);
    }
  };

  const handleWatchAd = () => {
    if (!profile) return;
    if (profile.plan === 'free' && !isAdmin) {
      setShowRestriction(true);
      return;
    }
    if (adLoading) return;
    
    // Open required ad link
    window.open('https://sturgeonvelocity.com/gmwga3b9?key=2031dcef33edfdd4a6b69f69af6183ab', '_blank', 'noopener,noreferrer');

    setVerificationTimeLeft(15);
    setStartTime(Date.now());
    setAdLoading(true);
  };

  const handleAdFinished = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        completedAds: arrayUnion({
          id: 'lucky_spin_ad',
          timestamp: new Date().toISOString(),
          reward: 0
        })
      });
      setAdLoading(false);
      setStartTime(null);
    } catch (err) {
      console.error("Error recording ad completion:", err);
      setAdLoading(false);
      setStartTime(null);
    }
  };

  const spin = async () => {
    if (!user || spinning || mustWatchAd) return;
    if (profile?.plan === 'free' && !isAdmin) {
      setShowRestriction(true);
      return;
    }

    setSpinning(true);
    setResult(null);
    
    const spinCount = 5 + Math.floor(Math.random() * 5); // 5-10 full spins
    const randomIndex = Math.floor(Math.random() * WHEEL_RESULTS.length);
    const segmentAngle = 360 / WHEEL_RESULTS.length;
    
    // Correct rotation math: Ensure the chosen segment aligns with the pointer at the top (0 degrees).
    // The current segments are rendered clockwise, so we need to rotate negative degrees relative to segment index to bring it to top.
    const extraAngle = (spinCount * 360) - (randomIndex * segmentAngle);
    
    setRotation(prev => prev + extraAngle);

    // Wait for animation
    setTimeout(async () => {
      const actualResult = WHEEL_RESULTS[randomIndex];
      let finalReward = actualResult.value * multiplier;
      
      // Enforce hard cap of 20 NGN
      if (finalReward > 20) {
        finalReward = 20;
      }
      
      setResult({ ...actualResult, value: finalReward / multiplier }); // Store adjusted value for display if needed
      setSpinning(false);

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(finalReward),
          withdrawableBalance: increment(finalReward),
          taskBalance: increment(finalReward),
          taskEarnings: increment(finalReward),
          xp: increment(25)
        });

        await addDoc(collection(db, 'completions'), {
          userId: user.uid,
          taskId: 'lucky_spin_reward',
          status: 'approved',
          rewardEarned: finalReward,
          isSpin: true,
          label: actualResult.label,
          submittedAt: serverTimestamp(),
        });
        
        playRewardSound();
        fetchHistory();
      } catch (err) {
        console.error("Error recording spin result:", err);
      }
    }, 4000);
  };

  return (
    <Layout>
      {result && <Confetti />}
      <div className="p-5 pb-24 space-y-8 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-500/20 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-3xl flex items-center justify-center mx-auto">
            <Dices size={32} className="text-blue-400 drop-shadow-md" />
          </div>
          <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-md">Lucky Spin & Win</h2>
          <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest">Ad-Powered Rewards</p>
        </div>

        {/* Spin Wheel Area */}
        <div className="relative flex flex-col items-center">
          {/* Legend/Multiplier */}
          <div className="absolute -top-4 right-0 z-20">
             <div className="bg-slate-900/80 backdrop-blur-3xl px-3 py-1.5 rounded-2xl border border-blue-500/30 shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex items-center gap-2">
                <Zap size={14} className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                <span className="text-[10px] font-black text-white">x{multiplier.toFixed(1)} Bonus</span>
             </div>
          </div>

          <div className="w-72 h-72 rounded-full border-8 border-slate-900 bg-slate-950 relative shadow-[0_0_50px_rgba(59,130,246,0.2)] overflow-hidden">
             {/* The Pointer */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-30">
                <div className="w-6 h-8 bg-blue-500 rounded-b-full shadow-[0_0_15px_rgba(59,130,246,0.8)] border-x-4 border-b-4 border-slate-900 flex items-center justify-center">
                    <div className="w-1 h-3 bg-white rounded-full animate-pulse" />
                </div>
             </div>

             <motion.div 
               animate={{ rotate: rotation }}
               transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
               className="w-full h-full relative"
             >
                {WHEEL_RESULTS.map((res, i) => (
                    <div 
                        key={res.id}
                        className={`absolute top-0 left-1/2 w-[50%] h-[50%] origin-bottom-left flex items-center justify-end pr-8 text-white font-black text-xs border border-white/5 border-b-0 border-l-0 ${res.color}`}
                        style={{ 
                          transform: `rotate(${i * (360 / WHEEL_RESULTS.length)}deg) skewY(${-(90 - (360 / WHEEL_RESULTS.length))}deg)`,
                          transformOrigin: '0% 100%'
                        }}
                    >
                        <div className="relative z-10 skewY(45deg)" style={{ transform: `skewY(${90 - (360 / WHEEL_RESULTS.length)}deg) rotate(${(360 / WHEEL_RESULTS.length)/2}deg)` }}>
                           <span className="inline-block translate-x-4 translate-y-8 font-display drop-shadow-md">{res.label}</span>
                        </div>
                    </div>
                ))}
             </motion.div>

             <div className="absolute inset-0 m-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] z-20 border-4 border-blue-500/50">
                <Play size={16} className={`text-blue-400 ${spinning ? 'animate-spin' : ''}`} />
             </div>
          </div>

          <div className="mt-12 w-full space-y-4">
            <AnimatePresence mode="wait">
              {adLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                        Sponsor Ad Verification
                      </span>
                      <h3 className="font-display font-black text-xl text-white uppercase italic tracking-tight mt-3">
                        Verifying Sponsor Visit
                      </h3>
                      <p className="text-slate-400 text-xs">
                        Please stay on the opened partner page for 15 seconds to authenticate your visit & claim reward.
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center py-6 w-full space-y-4">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="42" 
                            className="stroke-white/5 fill-none" 
                            strokeWidth="6" 
                          />
                          <motion.circle 
                            cx="50" 
                            cy="50" 
                            r="42" 
                            className="stroke-blue-500 fill-none" 
                            strokeWidth="6" 
                            strokeDasharray="263"
                            animate={{ strokeDashoffset: (1 - verificationTimeLeft / 15) * 263 }}
                            transition={{ duration: 0.3 }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                          {verificationTimeLeft > 0 ? (
                            <>
                              <span className="font-mono text-4xl font-black text-white tracking-widest">
                                {verificationTimeLeft}s
                              </span>
                              <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">
                                WAITING
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={36} className="text-emerald-400 animate-bounce" />
                              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                                COMPLETE
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {verificationTimeLeft > 0 ? (
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              window.open('https://sturgeonvelocity.com/gmwga3b9?key=2031dcef33edfdd4a6b69f69af6183ab', '_blank', 'noopener,noreferrer');
                            }}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all text-center border border-white/10 flex items-center justify-center gap-2"
                          >
                            <ExternalLink size={14} />
                            Ad closed? Click to open again
                          </button>
                          
                          <button
                            onClick={() => {
                              if (window.confirm("Cancelling now will forfeit your spin. Are you sure?")) {
                                setAdLoading(false);
                                setStartTime(null);
                              }
                            }}
                            className="w-full py-3 text-slate-500 hover:text-slate-400 font-bold text-xs uppercase tracking-wider transition-all text-center"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleAdFinished}
                          className="w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center"
                        >
                          Verify Visit & Spin!
                        </button>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {hasSpunToday ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/50 text-white rounded-[2rem] p-10 text-center space-y-4 border border-white/5"
                >
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                     <Timer size={32} className="text-blue-400 opacity-50" />
                  </div>
                  <h3 className="font-black text-xl">Daily Limit Reached</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">You've used your daily spin!</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">Come back in 24 hours for another chance to win big rewards.</p>
                </motion.div>
              ) : mustWatchAd && !adLoading ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-slate-900 text-white rounded-[2rem] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                  <div className="relative z-10 space-y-2">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <Gift size={24} className="text-blue-400" />
                    </div>
                    <h3 className="font-black text-xl">Unlock Your Spin</h3>
                    <p className="text-xs text-slate-400 font-medium">Click the button below to enable your lucky spin!</p>
                  </div>

                  {/* Telegram Ad SDK Placement */}
                  <div className="relative z-20 min-h-[50px] flex justify-center">
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700 font-mono">
                        Secure Ad Gateway Active
                     </div>
                  </div>

                   <div className="grid grid-cols-1 gap-3 relative z-10">
                    <button
                      onClick={handleWatchAd}
                      disabled={adLoading}
                      className="w-full bg-blue-600 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:bg-blue-300"
                    >
                      {adLoading ? (
                        <div className="flex items-center gap-3">
                           <Loader2 className="w-4 h-4 animate-spin text-white" />
                           <span>Loading Ad Experience...</span>
                        </div>
                      ) : (
                        <>
                          <Eye size={16} />
                          Unlock Spin with Ad
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={spin}
                  disabled={spinning}
                  className="w-full bg-indigo-600 h-20 rounded-[2rem] text-white font-black text-xl flex items-center justify-center gap-4 shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
                >
                  {spinning ? (
                    'SPINNING...'
                  ) : (
                    <>
                      <Zap size={24} className="fill-white" />
                      SPIN NOW
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
            
            {result && !spinning && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center"
              >
                <div className="flex justify-center gap-1 mb-2">
                    <Trophy className="text-emerald-500" size={24} />
                    <Trophy className="text-emerald-500 scale-125" size={24} />
                    <Trophy className="text-emerald-500" size={24} />
                </div>
                <h4 className="font-black text-emerald-900 text-lg">CONGRATULATIONS!</h4>
                <p className="text-emerald-700 font-bold">You won <span className="text-xl">₦{(result.value * multiplier).toFixed(2)}</span></p>
                <div className="inline-block mt-4 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Added to Balance
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveTab('global')}
                    className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'global' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                  >
                    Global Winners
                  </button>
                  <button 
                    onClick={() => setActiveTab('my')}
                    className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'my' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                  >
                    My Spins
                  </button>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Live</span>
                </div>
            </div>

            <div className="space-y-3">
                {loadingHistory ? (
                    <div className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
                ) : (activeTab === 'my' ? history : globalHistory).length > 0 ? (
                    (activeTab === 'my' ? history : globalHistory).map((h, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={h.id || `spin-${i}`} 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                        >
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
                                   {activeTab === 'global' ? (
                                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${h.userId || i}`} alt="Winner" />
                                   ) : (
                                      <Coins size={18} className="text-amber-500" />
                                   )}
                               </div>
                               <div>
                                   <p className="text-[11px] font-black text-slate-900">
                                      {activeTab === 'global' ? `Lucky Winner Won ${h.label}` : `Won ${h.label}`}
                                   </p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                      {h.submittedAt?.toDate()?.toLocaleTimeString() || 'Just now'}
                                   </p>
                               </div>
                           </div>
                           <div className="text-right">
                              <span className="text-emerald-600 font-black text-sm block">+₦{h.rewardEarned?.toFixed(2)}</span>
                              {h.rewardEarned > (h.value || 0) && (
                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">x{multiplier} Plan Boost</span>
                              )}
                           </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <History size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No activity recorded yet</p>
                    </div>
                )}
            </div>
        </div>

        {/* Rule Info */}
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] flex gap-4">
            <AlertCircle size={24} className="text-blue-500 shrink-0" />
            <div className="space-y-1">
                <h4 className="font-black text-blue-900 text-sm">How it works</h4>
                <p className="text-[10px] text-blue-800 leading-relaxed">
                    To maintain the rewards pool, we require a quick ad verification before every spin. 
                    This keeps the platform free and ensures high payouts! <strong>Pro Plan</strong> users earn double rewards on every spin.
                </p>
            </div>
        </div>
      </div>
      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="participate in lucky spins" 
      />
    </Layout>
  );
}

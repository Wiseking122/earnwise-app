import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Lock, 
  Flame, 
  Coins, 
  Trophy, 
  HelpCircle,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';
import { doc, updateDoc, increment, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Confetti from './Confetti';
import { PlanRestrictionModal } from './PlanRestrictionModal';

// Daily Rewards configuration mapping to 7-day cycle
const DAILY_REWARDS = [
  { day: 1, amount: 15, xp: 20, description: "Day 1 Bonus", link: "https://sturgeonvelocity.com/a7gbcdbyy?key=80bf12cfa4ca2c7c22e598ee09d258ef" },
  { day: 2, amount: 18, xp: 25, description: "Day 2 Boost", link: "https://sturgeonvelocity.com/r6jntjqds?key=c7121e9cf3f96b845f5b4a48335dd597" },
  { day: 3, amount: 22, xp: 30, description: "Day 3 Boost", link: "https://sturgeonvelocity.com/nz179ju7h7?key=2aca4e3ac4bc450e62b1f2a48187f63b" },
  { day: 4, amount: 28, xp: 40, description: "Day 4 Multiplier", link: "https://sturgeonvelocity.com/bxfwi3acv?key=986aa010f2e136ba08a30e17ce8c5da9" },
  { day: 5, amount: 36, xp: 50, description: "Day 5 Mega Bonus", link: "https://sturgeonvelocity.com/q46trwhb54?key=6ca2957902753234c562c9b2e2a0fe75" },
  { day: 6, amount: 46, xp: 60, description: "Day 6 Ultra Reward", link: "https://sturgeonvelocity.com/g5zbtjxs6?key=b81682a90b1562b13c9a6b8876242bae" },
  { day: 7, amount: 75, xp: 120, description: "Day 7 Legendary Chest", isChest: true, link: "https://sturgeonvelocity.com/zjumjgafze?key=c8dfead0d37ec817bad231d47b2ef669" }
];

export const DailyCheckIn: React.FC = () => {
  const { profile } = useAuth();
  const [showReward, setShowReward] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'rewards'>('grid');
  const [showRestriction, setShowRestriction] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    const lastCheckIn = profile.lastCheckIn?.toDate?.() || profile.lastCheckIn;
    if (!lastCheckIn) {
      setCanCheckIn(true);
      setLastCheckInTime(null);
      return;
    }

    const lastDate = new Date(lastCheckIn);
    setLastCheckInTime(lastDate);
    const now = new Date();
    
    // Check if the last check-in occurred on the same calendar day
    const isSameDay = lastDate.getDate() === now.getDate() && 
                      lastDate.getMonth() === now.getMonth() && 
                      lastDate.getFullYear() === now.getFullYear();
    
    setCanCheckIn(!isSameDay);
  }, [profile]);

  // Derived Values
  const rawStreak = profile?.streak || 0;
  // Map streak to current 7-day cycle index (0 to 6)
  const cycleIndex = rawStreak > 0 ? (rawStreak - 1) % 7 : 0;
  // Current Day in our 7-day UI cycle (1 to 7)
  const cycleDayNumber = cycleIndex + 1;

  // The active claim reward for today's check-in
  const currentReward = DAILY_REWARDS[cycleIndex] || DAILY_REWARDS[0];

  const handleCheckIn = async () => {
    if (!profile) return;
    if (profile.plan === 'free' && profile.role !== 'admin') {
      setShowRestriction(true);
      return;
    }
    if (!canCheckIn || loading) return;
    
    // Open current day's link in a new tab
    if (currentReward.link) {
      window.open(currentReward.link, '_blank', 'noopener,noreferrer');
    }

    setLoading(true);
    const rewardAmount = currentReward.amount;
    const xpAmount = currentReward.xp;

    try {
      // 1. Transactionally update user profile document
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        wiseCoins: increment(rewardAmount), // Credited directly to wise coin balance
        xp: increment(xpAmount),
        lastCheckIn: serverTimestamp(),
      });

      // 2. Transactionally update wise_coin_wallets document
      const walletRef = doc(db, 'wise_coin_wallets', profile.uid);
      await setDoc(walletRef, {
        userId: profile.uid,
        balance: increment(rewardAmount),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 3. Add an audit log entry in the user's wise_coin_transactions collection
      const wcTransRef = doc(collection(db, 'wise_coin_transactions'));
      await setDoc(wcTransRef, {
        userId: profile.uid,
        amount: rewardAmount,
        action: 'credit',
        reason: `Consecutive Day ${cycleDayNumber} Check-In Bonus`,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      setShowReward(true);
      setCanCheckIn(false);
    } catch (err) {
      console.error("Check-in failed:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}/dailyCheckIn`);
    } finally {
      setLoading(false);
    }
  };

  // Human friendly formatting for check-in time countdown
  const timeUntilNextCheckIn = () => {
    if (!lastCheckInTime) return "Now";
    const now = new Date();
    const nextClaimDate = new Date(lastCheckInTime);
    nextClaimDate.setHours(0, 0, 0, 0);
    nextClaimDate.setDate(nextClaimDate.getDate() + 1); // Next calendar day midnight
    
    const diffMs = nextClaimDate.getTime() - now.getTime();
    if (diffMs <= 0) return "Ready Now";
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950 p-[1.2px] rounded-xl sm:rounded-2xl border border-slate-900 shadow-xl relative overflow-hidden group"
      >
        {/* Glow effect on the borders */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 rounded-xl sm:rounded-2xl pointer-events-none" />
        
        <div className="bg-[#020617] rounded-[11px] sm:rounded-[15px] p-2.5 sm:p-4 space-y-2.5 sm:space-y-3.5 relative z-10">
          
          {/* Header section with streak badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-md relative shrink-0">
                <Flame size={14} className="text-white animate-pulse" />
                {canCheckIn && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 border border-slate-950 rounded-full animate-ping" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <h4 className="font-extrabold text-xs sm:text-sm text-white tracking-tight">Earning Streak</h4>
                  <button 
                    onClick={() => setShowRuleModal(true)}
                    className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    title="Streak Rules"
                  >
                    <Info size={11} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-amber-400 font-extrabold text-[8px] sm:text-[9.5px] flex items-center gap-0.5 bg-amber-400/10 px-1 py-0.5 rounded-full shrink-0">
                    {rawStreak} Days Streak
                  </span>
                  <p className="text-slate-400 text-[7px] sm:text-[8.5px] uppercase font-bold tracking-wider">
                    {canCheckIn ? "Claim Daily Reward" : `Next Claim in ${timeUntilNextCheckIn()}`}
                  </p>
                </div>
              </div>
            </div>
          
            {/* Quick stats / Mode Toggles */}
            <div className="flex items-center bg-slate-900/60 p-0.5 rounded-md border border-white/5 w-fit self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('grid')}
                className={`px-1.5 py-0.5 sm:px-2 py-0.5 text-[7px] sm:text-[8.5px] font-black uppercase tracking-wider rounded transition-all ${
                  activeTab === 'grid' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7-Day Grid
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`px-1.5 py-0.5 sm:px-2 py-0.5 text-[7px] sm:text-[8.5px] font-black uppercase tracking-wider rounded transition-all ${
                  activeTab === 'rewards' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tiers Info
              </button>
            </div>
          </div>

          {/* Subtitle description */}
          <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed max-w-xl">
            Maximize your daily allowance! Completing consecutive claims scales your base payout. If you miss a day, your streak reverts to Day 1.
          </p>

          {/* Tab 1: Grid Visualization */}
          {activeTab === 'grid' && (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-1.5">
              {DAILY_REWARDS.map((item) => {
                // Determine claim state relative to cycle indexes
                const isClaimed = canCheckIn ? item.day < cycleDayNumber : item.day <= cycleDayNumber;
                const isToday = canCheckIn && item.day === cycleDayNumber;
                const isLocked = item.day > cycleDayNumber;

                return (
                  <motion.div
                    key={item.day}
                    whileHover={!isLocked ? { scale: 1.02 } : {}}
                    onClick={() => {
                      if (!isLocked && item.link) {
                        window.open(item.link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className={`relative p-1 sm:p-2 rounded-lg border transition-all flex flex-col items-center text-center justify-between min-h-[58px] sm:min-h-[72px] ${
                      !isLocked ? 'cursor-pointer' : ''
                    } ${
                      isToday 
                        ? 'bg-amber-500/10 border-amber-400 shadow shadow-amber-400/5 ring-1 ring-amber-400' 
                        : isClaimed 
                          ? 'bg-slate-900/40 border-emerald-500/30 opacity-75' 
                          : 'bg-slate-900/20 border-slate-900 opacity-50'
                    }`}
                  >
                    {/* Top indicator icons */}
                    <div className="absolute top-0.5 right-0.5">
                      {isClaimed ? (
                        <CheckCircle2 size={8} className="text-emerald-400" />
                      ) : isLocked ? (
                        <Lock size={6} className="text-slate-600" />
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>

                    {/* Day identifier */}
                    <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-wider ${
                      isToday ? 'text-amber-400' : isClaimed ? 'text-emerald-400/80' : 'text-slate-500'
                    }`}>
                      Day {item.day}
                    </span>

                    {/* Day Main Reward Graphic */}
                    <div className="py-0.5">
                      {item.isChest ? (
                        <div className="relative group/chest">
                          <Trophy 
                            size={12} 
                            className={`mx-auto ${isToday ? 'text-amber-400 animate-bounce' : isClaimed ? 'text-emerald-400' : 'text-slate-600'}`} 
                          />
                        </div>
                      ) : (
                        <Coins 
                          size={10} 
                          className={`mx-auto ${isToday ? 'text-yellow-400 animate-pulse' : isClaimed ? 'text-emerald-500' : 'text-slate-600'}`} 
                        />
                      )}
                    </div>

                    {/* Value Badge label */}
                    <div className="space-y-0.5">
                      <span className={`text-[8.5px] sm:text-[10px] font-black block leading-none ${
                        isToday ? 'text-white' : isClaimed ? 'text-slate-400' : 'text-slate-400'
                      }`}>
                        {item.amount} WC
                      </span>
                      <span className="text-[6.5px] sm:text-[7.5px] font-bold text-slate-500 block leading-none">
                        +{item.xp} XP
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Detailed rewards multiplier benefits */}
          {activeTab === 'rewards' && (
            <div className="bg-slate-900/40 rounded-lg border border-slate-800 p-2 sm:p-3 space-y-1.5">
              <h5 className="font-extrabold text-[8.5px] sm:text-[10px] text-white uppercase tracking-wider flex items-center gap-1">
                <Trophy size={10} className="text-amber-400" /> High Loyalty Booster Multipliers
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-1 rounded bg-slate-950 border border-white/5">
                    <span className="text-slate-400 font-medium">Standard Daily Base</span>
                    <span className="text-white font-black">15 WC / 20 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded bg-slate-950 border border-white/5">
                    <span className="text-slate-400 font-medium">Peak High Yield (Day 6)</span>
                    <span className="text-amber-400 font-black">46 WC / 60 XP</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-1 rounded bg-slate-950 border border-amber-400/20">
                    <span className="text-amber-400 font-extrabold">Day 7 Grand Reward</span>
                    <span className="text-yellow-300 font-black">75 WC + 120 XP 👑</span>
                  </div>
                  <p className="text-[8px] text-slate-500 font-medium italic pl-1 leading-normal">
                    * The absolute cycle restarts automatically immediately upon Day 7 claim execution. Or breaks instantly if you miss any daily check-in sequence slot.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reward Status Progress Strip */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500">
              <span>7-Day Progress Goal</span>
              <span className="text-amber-400">{Math.round((cycleDayNumber / 7) * 100)}% Complete</span>
            </div>
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(cycleDayNumber / 7) * 100}%` }}
                className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 rounded-full"
              />
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-0.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={12} className="text-slate-500 shrink-0" />
              <div className="text-left">
                <p className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Last Check-In Time</p>
                <p className="text-[9px] sm:text-xs font-bold text-slate-300 italic">
                  {lastCheckInTime ? lastCheckInTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Never Claimed"}
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={!canCheckIn || loading}
              className={`w-full sm:w-auto px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg font-black text-[9.5px] sm:text-[11px] uppercase tracking-wider active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 group/btn cursor-pointer ${
                canCheckIn 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-md shadow-orange-500/10 active:scale-98" 
                  : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : canCheckIn ? (
                <>
                  Claim Day {cycleDayNumber} Reward (+{currentReward.amount} WC)
                  <ArrowRight size={11} className="group-hover/btn:translate-x-1 transition-transform" />
                </>
              ) : (
                "Today's Reward Secured ✓"
              )}
            </button>
          </div>

        </div>
      </motion.div>

      {/* Success Reward Celebration Backdrop Modal */}
      <AnimatePresence>
        {showReward && (
          <div className="fixed inset-0 z-[2002] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80">
            {/* Inject live celebratory particles inside the modal bounds container */}
            <Confetti />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#020617] border border-slate-800 rounded-[3rem] p-8 max-w-sm w-full text-center space-y-6 relative overflow-hidden"
            >
              {/* Decorative radial gradients */}
              <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-b from-amber-500/10 to-transparent -z-10" />
              
              <div className="w-22 h-22 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 relative">
                <Sparkles size={40} className="text-slate-950 animate-pulse" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-2 border border-white/40 rounded-2xl border-dashed"
                />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-black text-white tracking-tight">Claim Succeeded!</h3>
                <p className="text-slate-400 text-xs">
                  Your Day {cycleDayNumber} reward has been securely added to your WiseCoin wallet:
                </p>
                <div className="text-2xl font-black text-amber-400 py-1">
                  +{currentReward.amount} WC
                </div>
              </div>

              {/* Bonus logs visual audit trail block */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">Added Coins</p>
                  <p className="font-extrabold text-white text-sm">{currentReward.amount} WC</p>
                </div>
                <div className="w-px h-8 bg-slate-850" />
                <div className="flex flex-col items-center">
                  <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">Growth Exp</p>
                  <p className="font-extrabold text-blue-400 text-sm">+{currentReward.xp} XP</p>
                </div>
                <div className="w-px h-8 bg-slate-850" />
                <div className="flex flex-col items-center">
                  <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">Active Streak</p>
                  <p className="font-extrabold text-amber-400 text-sm">{rawStreak} Days</p>
                </div>
              </div>

              {/* Next Day teaser motivator box */}
              {cycleIndex < 6 && (
                <div className="bg-slate-900/30 p-3 rounded-xl border border-white/5 text-[10px] text-slate-400 font-medium leading-relaxed">
                  🔥 Keep up your streak to claim <span className="text-white font-extrabold">{DAILY_REWARDS[cycleIndex + 1]?.amount} WC</span> on Day {(cycleIndex + 2)}!
                </div>
              )}

              <button
                onClick={() => setShowReward(false)}
                className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl hover:bg-slate-100"
              >
                Let me Earn more!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily streak Rules explanations Modal */}
      <AnimatePresence>
        {showRuleModal && (
          <div className="fixed inset-0 z-[2002] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#020617] border border-slate-850 rounded-[3rem] p-7 max-w-sm w-full space-y-5 relative"
            >
              <button 
                onClick={() => setShowRuleModal(false)}
                className="absolute top-5 right-5 p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" /> Streak Rewards Policy
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Increase retention, maximize payouts</p>
              </div>

              <div className="space-y-3.5 text-slate-300 text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-1">
                <div className="flex gap-2.5">
                  <div className="font-extrabold text-amber-400">01.</div>
                  <p>Check in every <span className="text-white font-bold">24 calendar hours</span> (same day slots) to keep your streak count alive.</p>
                </div>
                <div className="flex gap-2.5">
                  <div className="font-extrabold text-amber-400">02.</div>
                  <p>Failing to open and check in before the active day ends breaks the consecutive sequence. Your streak automatically reverts back to Day 1.</p>
                </div>
                <div className="flex gap-2.5">
                  <div className="font-extrabold text-amber-400">03.</div>
                  <p>XP values awarded during daily claims help upgrade your account tier rank, multiplying other system payouts (CPA Offers, Follow actions, and Video play ads).</p>
                </div>
                <div className="flex gap-2.5">
                  <div className="font-extrabold text-amber-400">04.</div>
                  <p>Bonus payouts are distributed immediately to high-security cleared <span className="text-emerald-400 font-bold">withdrawable balance</span> ledger books.</p>
                </div>
              </div>

              <button
                onClick={() => setShowRuleModal(false)}
                className="w-full bg-slate-900 border border-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                I understand the rules
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="claim daily check-in rewards" 
      />
    </>
  );
};

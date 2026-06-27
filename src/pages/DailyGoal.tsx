import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, Minus, Plus, Sparkles, Trophy, ArrowRight } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export const DailyGoal: React.FC = () => {
  const { user, profile } = useAuth();
  
  const [completionsToday, setCompletionsToday] = useState<number>(0);
  const [dailyTarget, setDailyTarget] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Load user's target parameter from Firestore profile, or fallback to localStorage, or default to 5
  useEffect(() => {
    if (!user) return;
    
    // Check if Firestore profile contains dailyTaskGoal
    if (profile && (profile as any).dailyTaskGoal !== undefined) {
      setDailyTarget((profile as any).dailyTaskGoal);
    } else {
      const savedTarget = localStorage.getItem(`earnwise_daily_goal_target_${user.uid}`);
      if (savedTarget) {
        const num = parseInt(savedTarget, 10);
        if (!isNaN(num) && num > 0) {
          setDailyTarget(num);
        }
      }
    }
  }, [user, profile]);

  // Real-time listener for user's completions today
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'completions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

        let count = 0;
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const submittedAt = data.submittedAt;
          
          if (!submittedAt) return;
          
          // Parse Firestore timestamp safely
          let date: Date | null = null;
          if (typeof submittedAt.toDate === 'function') {
            date = submittedAt.toDate();
          } else if (submittedAt.seconds) {
            date = new Date(submittedAt.seconds * 1000);
          } else {
            date = new Date(submittedAt);
          }

          if (date) {
            const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (dateStr === todayStr) {
              count++;
            }
          }
        });

        setCompletionsToday(count);
      } catch (err) {
        console.error("Error processing completions for daily goal:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Firestore completions error in DailyGoal:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Track if they recently hit their target to display a mini burst or local notification celebration
  useEffect(() => {
    if (completionsToday > 0 && completionsToday >= dailyTarget) {
      const lastCelebratedStr = localStorage.getItem(`earnwise_goal_celebrated_${user?.uid}_${new Date().toDateString()}`);
      if (!lastCelebratedStr) {
        setShowCelebration(true);
        localStorage.setItem(`earnwise_goal_celebrated_${user?.uid}_${new Date().toDateString()}`, 'true');
      }
    } else {
      setShowCelebration(false);
    }
  }, [completionsToday, dailyTarget, user?.uid]);

  const handleAdjustTarget = async (delta: number) => {
    if (!user) return;
    const newTarget = Math.max(1, Math.min(25, dailyTarget + delta));
    setDailyTarget(newTarget);
    
    // Save in local storage
    localStorage.setItem(`earnwise_daily_goal_target_${user.uid}`, newTarget.toString());
    
    // Save under the user doc (with fallback update)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyTaskGoal: newTarget
      });
    } catch (e) {
      console.warn("Failed to write dailyTaskGoal to Firestore (using localStorage fallback):", e);
    }
  };

  const handleSetTargetDirect = async (val: number) => {
    if (!user) return;
    setDailyTarget(val);
    
    // Save in local storage
    localStorage.setItem(`earnwise_daily_goal_target_${user.uid}`, val.toString());
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyTaskGoal: val
      });
    } catch (e) {
      console.warn("Failed to write dailyTaskGoal to Firestore (using localStorage fallback):", e);
    }
  };

  if (!user) return null;

  const percentage = Math.min((completionsToday / dailyTarget) * 100, 100);
  const isCompleted = completionsToday >= dailyTarget;

  return (
    <div id="daily-goals-container" className="w-full">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-sm relative overflow-hidden"
      >
        {/* Glow effect on 100% completion */}
        {isCompleted && (
          <div className="absolute inset-0 bg-linear-to-tr from-emerald-500/5 via-teal-500/5 to-transparent pointer-events-none animate-pulse-slow" />
        )}
        
        <div className="relative z-10 space-y-3">
          {/* Header section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                isCompleted 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-50' 
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {isCompleted ? <Trophy size={14} /> : <Target size={14} />}
              </div>
              <div>
                <h4 className="font-display font-black text-slate-800 text-[11px] sm:text-sm tracking-tight leading-none mb-0.5">Your Daily Goal</h4>
                <p className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                  Focus on high-yield tasks
                </p>
              </div>
            </div>

            {/* Target interactive toggles */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl">
              <button 
                onClick={() => handleAdjustTarget(-1)}
                disabled={dailyTarget <= 1}
                className="w-5 h-5 sm:w-7 sm:h-7 bg-white rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-100 hover:border-slate-200 text-slate-600 active:scale-90 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                title="Decrease Daily Target"
              >
                <Minus size={9} strokeWidth={3} />
              </button>
              <span className="text-[10px] sm:text-xs font-black text-slate-800 px-1.5 sm:px-2 min-w-[14px] sm:min-w-[20px] text-center select-none">
                {dailyTarget}
              </span>
              <button 
                onClick={() => handleAdjustTarget(1)}
                disabled={dailyTarget >= 25}
                className="w-5 h-5 sm:w-7 sm:h-7 bg-white rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-100 hover:border-slate-200 text-slate-600 active:scale-90 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                title="Increase Daily Target"
              >
                <Plus size={9} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Central progress visualizer */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className={`font-display font-black text-xl sm:text-3xl leading-none tracking-tight ${
                  isCompleted ? 'text-emerald-600' : 'text-slate-900'
                }`}>
                  {completionsToday}
                </span>
                <span className="text-slate-400 font-bold text-xs sm:text-lg select-none">
                  / {dailyTarget}
                </span>
                <span className={`text-[7px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-block ml-1 ${
                  isCompleted 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-slate-50 text-slate-400'
                }`}>
                  Completed
                </span>
              </div>
              
              <div className="text-right">
                <span className={`text-[10px] sm:text-xs font-black tracking-tighter ${
                  isCompleted ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="h-2.5 sm:h-3.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden relative p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className={`h-full rounded-full relative ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-md shadow-emerald-200/50' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
              >
                {/* Gloss stripe shine on completed */}
                {isCompleted && (
                  <motion.div 
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute top-0 bottom-0 left-0 w-1/3 bg-white/20 skew-x-12"
                  />
                )}
              </motion.div>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-wider mr-1 select-none">Presets:</span>
            {[3, 5, 8, 10, 15].map((preset) => (
              <button
                key={preset}
                onClick={() => handleSetTargetDirect(preset)}
                className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full cursor-pointer border transition-all active:scale-95 ${
                  dailyTarget === preset
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Helper encouraging messages & badges */}
          <div className="pt-2 border-t border-slate-100 min-h-[28px] flex items-center justify-between text-[10px] sm:text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              {isCompleted ? (
                <>
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span>Congrats! Goal reached. Extra tasks yield more.</span>
                </>
              ) : (
                <>
                  <Sparkles size={10} className="text-orange-400 animate-pulse shrink-0" />
                  <span>Complete {dailyTarget - completionsToday} more to reach target!</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sweet popup mini-celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed bottom-6 right-6 z-[100] max-w-sm bg-slate-900 border border-white/10 text-white rounded-3xl p-5 shadow-2xl flex items-center gap-4 cursor-pointer"
            onClick={() => setShowCelebration(false)}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg transform -rotate-3 shrink-0">
              <Trophy size={20} className="fill-white/10" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">Goal Completed! 🎉</p>
              <h5 className="font-display font-black text-sm">Target Complete!</h5>
              <p className="text-[10px] text-slate-400 font-bold leading-snug">
                You've hit your daily goal of {dailyTarget} task completions! Keep going to scale.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

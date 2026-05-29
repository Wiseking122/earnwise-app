import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Calendar, CheckCircle2, Sparkles, X } from 'lucide-react';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export const DailyCheckIn: React.FC = () => {
  const { profile } = useAuth();
  const [showReward, setShowReward] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    const lastCheckIn = profile.lastCheckIn?.toDate?.() || profile.lastCheckIn;
    if (!lastCheckIn) {
      setCanCheckIn(true);
      return;
    }

    const lastDate = new Date(lastCheckIn);
    const now = new Date();
    
    const isSameDay = lastDate.getDate() === now.getDate() && 
                      lastDate.getMonth() === now.getMonth() && 
                      lastDate.getFullYear() === now.getFullYear();
    
    setCanCheckIn(!isSameDay);
  }, [profile]);

  const handleCheckIn = async () => {
    if (!profile || !canCheckIn || loading) return;
    
    setLoading(true);
    const reward = 50; // ₦50 daily reward
    
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(reward),
        taskEarnings: increment(reward),
        xp: increment(25),
        lastCheckIn: serverTimestamp(),
        streak: increment(1)
      });
      
      setShowReward(true);
      setCanCheckIn(false);
    } catch (err) {
      console.error("Check-in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none -mr-16 -mt-16" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%)' }} />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Calendar size={24} className={canCheckIn ? "animate-pulse" : ""} />
            </div>
            <div>
              <h4 className="font-black text-lg">Daily Reward</h4>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none">
                {canCheckIn ? "Ready to collect today's bonus" : "Come back tomorrow for more"}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn || loading}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
              canCheckIn 
                ? "bg-white text-indigo-600 hover:bg-slate-50" 
                : "bg-white/10 text-white/50 cursor-not-allowed border border-white/10"
            }`}
          >
            {loading ? "..." : canCheckIn ? "Claim ₦50" : "Claimed"}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showReward && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-[3rem] p-8 max-w-xs w-full text-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-white -z-10" />
              
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-200 relative">
                <Sparkles size={40} className="text-white" />
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="absolute inset-0 border-2 border-white/30 rounded-3xl border-dashed"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Success!</h3>
                <p className="text-slate-500 text-sm font-medium">
                  You've successfully claimed your daily reward and earned <span className="text-emerald-600 font-bold">₦50.00</span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Bonus</p>
                    <p className="font-black text-slate-900">+₦50</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-200" />
                <div className="flex flex-col items-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Exp</p>
                    <p className="font-black text-blue-600">+25 XP</p>
                </div>
              </div>

              <button
                onClick={() => setShowReward(false)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

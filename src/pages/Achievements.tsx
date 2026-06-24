import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { ACHIEVEMENTS, Achievement } from '../data/achievements';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  CheckCircle2, 
  Lock, 
  Zap, 
  Gift, 
  Sparkles,
  ChevronRight,
  Star,
  Award
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Achievements() {
  const { profile } = useAuth();
  const [claiming, setClaiming] = useState<string | null>(null);

  const handleClaim = async (ach: Achievement) => {
    if (!profile || claiming) return;
    
    setClaiming(ach.id);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(ach.rewardCash),
        xp: increment(ach.rewardXp),
        achievements: arrayUnion(ach.id),
        bonusEarnings: increment(ach.rewardCash)
      });
      alert(`Claimed ₦${ach.rewardCash} and ${ach.rewardXp} XP!`);
    } catch (err) {
      console.error(err);
      alert("Failed to claim achievement");
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Layout>
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto">
        <header className="space-y-1">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Milestone Central</p>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Achievement Badges</h2>
        </header>

        {/* Level Stats */}
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-900 rounded-xl sm:rounded-[2rem] flex items-center justify-center text-white shadow-xl rotate-3 shrink-0">
                    <span className="text-sm sm:text-2xl font-black">Lvl {profile?.level || 1}</span>
                </div>
                <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">Rank Progress</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest truncate">
                        {profile?.achievements?.length || 0} of {ACHIEVEMENTS.length} Badges
                    </p>
                </div>
            </div>
            <Award size={24} className="text-amber-400 shrink-0" />
        </div>

        {/* List */}
        <div className="space-y-3 sm:space-y-4">
            {ACHIEVEMENTS.map((ach) => {
                const isMet = ach.condition(profile || {});
                const isClaimed = profile?.achievements?.includes(ach.id);
                
                return (
                    <motion.div 
                        key={ach.id}
                        layout
                        className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border transition-all ${
                            isClaimed 
                                ? "bg-slate-50 border-slate-100 opacity-60" 
                                : isMet 
                                    ? "bg-white border-emerald-200 shadow-lg shadow-emerald-50" 
                                    : "bg-white border-slate-200 opacity-80"
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                                <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                                    isClaimed 
                                        ? "bg-slate-200 text-slate-400" 
                                        : isMet 
                                            ? "bg-emerald-500 text-white animate-pulse" 
                                            : "bg-slate-100 text-slate-300"
                                }`}>
                                    <ach.icon size={20} className="sm:w-7 sm:h-7" />
                                </div>
                                
                                <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-black text-slate-900 text-xs sm:text-sm leading-tight truncate">{ach.title}</h4>
                                        {isClaimed && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight line-clamp-2 sm:line-clamp-none">{ach.description}</p>
                                    
                                    <div className="flex gap-1.5 pt-1 flex-wrap">
                                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                                            <Zap size={8} className="text-blue-500 fill-blue-500 sm:w-2.5 sm:h-2.5" />
                                            <span className="text-[7.5px] sm:text-[8px] font-black uppercase text-slate-500">+{ach.rewardXp} XP</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                                            <Gift size={8} className="text-emerald-500 sm:w-2.5 sm:h-2.5" />
                                            <span className="text-[7.5px] sm:text-[8px] font-black uppercase text-slate-500">+₦{ach.rewardCash}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0 ml-1">
                                {isClaimed ? (
                                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Claimed</span>
                                ) : isMet ? (
                                    <button
                                        onClick={() => handleClaim(ach)}
                                        disabled={claiming === ach.id}
                                        className="bg-slate-900 text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-200"
                                    >
                                        {claiming === ach.id ? "..." : "Claim"}
                                    </button>
                                ) : (
                                    <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg sm:rounded-xl text-slate-300">
                                        <Lock size={14} className="sm:w-4 sm:h-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
      </div>
    </Layout>
  );
}

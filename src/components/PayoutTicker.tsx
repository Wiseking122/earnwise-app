import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Timer } from 'lucide-react';

export default function PayoutTicker() {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: any;

    const unsub = onSnapshot(doc(db, 'system_settings', 'payouts'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.payoutStartDate && !data.taskOverrideOpen && !data.referralOverrideOpen && !data.payoutsForceClosed) {
          const startDate = new Date(data.payoutStartDate).getTime();
          
          const updateCountdown = () => {
            const now = Date.now();
            const diffMs = startDate - now;
            
            // Check if within 2 hours
            if (diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000) {
              const minutes = Math.floor(diffMs / (1000 * 60));
              const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
              setCountdown(`${minutes}m ${seconds}s`);
            } else {
              setCountdown(null);
            }
          };

          updateCountdown(); // Run immediately
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(updateCountdown, 1000);

        } else {
          setCountdown(null);
          if (intervalId) clearInterval(intervalId);
        }
      }
    });

    return () => {
      unsub();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <AnimatePresence>
      {countdown && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -20 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -20 }}
          className="mb-6"
        >
           <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 border border-blue-400 p-3 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(37,99,235,0.4)] relative overflow-hidden group/ticker bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]">
             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/ticker:opacity-100 transition-opacity" />
             <div className="flex items-center gap-3 relative z-10">
               <div className="w-8 h-8 bg-white/20 rounded-xl flex flex-col items-center justify-center animate-pulse shadow-inner border border-white/30">
                 <Timer size={18} className="text-white" />
               </div>
               <div>
                 <p className="text-[9px] font-black uppercase text-blue-200 tracking-[0.2em] leading-none mb-0.5">Portal Activation</p>
                 <h4 className="text-sm font-black text-white italic tracking-tighter drop-shadow-sm">Gateway opens soon</h4>
               </div>
             </div>
             <div className="bg-slate-900/40 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 shadow-inner relative z-10 flex items-center gap-2">
                 <Clock size={12} className="text-blue-300 animate-spin" style={{ animationDuration: '4s' }} />
                 <span className="text-white font-mono font-black text-sm tracking-widest">{countdown}</span>
             </div>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

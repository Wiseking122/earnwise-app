import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Crown, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
}

export const PlanRestrictionModal: React.FC<PlanRestrictionModalProps> = ({ 
  isOpen, 
  onClose,
  actionName = "perform this action"
}) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80">
          {/* Backdrop click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-[#020617] border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 max-w-sm w-full text-center space-y-6 relative overflow-hidden z-10 text-white shadow-2xl"
          >
            {/* Elegant Glow Accents */}
            <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-b from-blue-500/10 to-transparent -z-10" />
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none -mr-12 -mt-12 opacity-30" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Lock Icon Emblem */}
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-orange-500/10 relative">
              <Lock size={28} className="text-slate-950 animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute inset-1.5 border border-white/30 rounded-xl border-dashed"
              />
            </div>

            {/* Typography / Copy */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <Sparkles size={10} className="text-amber-400" />
                <span className="text-[8px] font-black uppercase tracking-wider text-amber-400">Upgrade Required</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight uppercase italic text-white leading-tight">
                Plan Activation <span className="text-blue-500">Required</span>
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                You are currently on the <span className="text-white font-black">Free Tier</span>. To <span className="text-amber-400 font-extrabold">{actionName}</span>, you must activate a high-yield membership plan.
              </p>
            </div>

            {/* Value Highlights */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2 text-left">
              <div className="flex items-center gap-2.5 text-slate-300">
                <CheckCircle2 size={12} className="text-blue-500 shrink-0" />
                <span className="text-[11px] font-semibold">Up to 10x Multiplier on ALL Tasks</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <CheckCircle2 size={12} className="text-blue-500 shrink-0" />
                <span className="text-[11px] font-semibold">Zero-Wait Instant Bank Withdrawals</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <CheckCircle2 size={12} className="text-blue-500 shrink-0" />
                <span className="text-[11px] font-semibold">Unlock Elite Strategies & Passive Yield</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  navigate('/upgrade');
                }}
                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white py-4 rounded-2xl font-display font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <Crown size={14} className="fill-white" />
                <span>Activate Earnings Plan</span>
                <ArrowRight size={12} />
              </button>
              
              <button
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white py-3.5 rounded-2xl font-display font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

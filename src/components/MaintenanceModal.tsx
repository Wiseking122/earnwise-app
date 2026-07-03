import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Construction, X, Info, Sparkles } from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Design Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -ml-16 -mb-16" />
            
            <div className="p-8 sm:p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-linear-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-8 relative group">
                <Construction size={40} className="text-white group-hover:rotate-12 transition-transform duration-500" />
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-4 border-slate-900"
                >
                  <Sparkles size={10} className="text-white" />
                </motion.div>
              </div>

              <div className="space-y-4 mb-10">
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase italic tracking-tighter">
                  System Upgrade
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px w-8 bg-white/10" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Network Maintenance</span>
                  <div className="h-px w-8 bg-white/10" />
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-3xl p-6 border border-white/5 relative mb-8">
                <Info size={16} className="text-blue-500 absolute -top-2 -left-2 bg-slate-900 rounded-full p-0.5" />
                <p className="text-slate-300 text-sm sm:text-base font-bold leading-relaxed tracking-tight">
                  {message}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-5 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase italic tracking-tighter text-lg"
              >
                Understood, Thanks!
              </button>
              
              <p className="mt-6 text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                System optimization in progress
              </p>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

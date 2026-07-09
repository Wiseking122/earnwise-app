import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LogOut, Mail, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuspendedScreen() {
  const { profile, logout } = useAuth();
  const reason = profile?.securityMetrics?.suspensionReason || 'Flagged for anomalous automated activity or violating our Terms of Service';

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative gradient backgrounds to match Earnwise premium theme */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Glow lines in background */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-[#090D1A]/80 border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(239,68,68,0.1)] backdrop-blur-xl relative"
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 rounded-t-3xl" />

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Animated Warning Emblem */}
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 4,
              ease: "easeInOut"
            }}
            className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <ShieldAlert size={36} className="animate-pulse" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase italic tracking-tight flex items-center justify-center gap-2">
              Access Restricted
            </h2>
            <p className="text-red-400 font-black text-[10px] uppercase tracking-widest">
              Account Suspended
            </p>
          </div>

          <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-slate-300 text-xs leading-relaxed space-y-4 text-left">
            <p>
              Your Earnwise account has been suspended for violating our platform safety agreements and system policies.
            </p>
            
            <div className="border-t border-white/5 pt-3 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                <AlertTriangle size={10} className="text-amber-500" />
                Suspension Reason
              </span>
              <p className="text-slate-200 font-mono text-[11px] bg-red-950/20 border border-red-900/20 px-2.5 py-2 rounded-lg italic">
                "{reason}"
              </p>
            </div>
          </div>

          {/* Support block */}
          <div className="w-full text-slate-400 text-xs text-center space-y-3">
            <p>
              If you believe this restriction is a mistake or wish to appeal this decision, please reach out to our compliance helpdesk:
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-bold text-xs">
              <Mail size={14} />
              <span>earnwise29@gmail.com</span>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="w-full mt-2 py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
          >
            <LogOut size={14} />
            Sign Out / Switch Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}

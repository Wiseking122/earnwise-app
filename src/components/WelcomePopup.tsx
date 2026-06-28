import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PartyPopper, Sparkles, Rocket, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { safeStorage } from '../lib/storage';

export default function WelcomePopup() {
  const { user, profile } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user && profile) {
      const hasSeenWelcome = safeStorage.getItem(`welcome_seen_${user.uid}`);
      
      // If user joined in the last 2 minutes, show the welcome popup
      const isNewUser = profile.createdAt && 
        (Date.now() - (profile.createdAt.seconds * 1000) < 120000);

      if (!hasSeenWelcome && isNewUser) {
        // Show after a short delay
        const timer = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile]);

  const handleClose = () => {
    if (user) {
      safeStorage.setItem(`welcome_seen_${user.uid}`, 'true');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden"
        >
          {/* Header Image/Background */}
          <div className="h-32 bg-blue-600 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-400/30 rounded-full blur-3xl" />
             <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl" />
             
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/30">
                  <PartyPopper size={40} className="text-white" />
                </div>
             </div>
          </div>

          <div className="p-8 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2 font-display">
              Welcome to the Earnwise Family!
            </h2>
            <p className="text-slate-500 font-medium mb-8">
              You've just joined Nigeria's #1 digital task network. Let's get you started on your journey to financial freedom.
            </p>

            <div className="grid grid-cols-1 gap-4 mb-8">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Rocket size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Automated Tasks</h4>
                  <p className="text-xs text-slate-500">New assignments are posted daily. Follow, like, and share to earn instantly.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Real Cash Payouts</h4>
                  <p className="text-xs text-slate-500">Withdraw your earnings directly to your bank account via Paystack.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-purple-50 border border-purple-100 text-left">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Referral Commissions</h4>
                  <p className="text-xs text-slate-500">Invite friends and earn a percentage of their lifelong task rewards.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleClose}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
              >
                Let's Start Earning
                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
              </button>
              
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Powered by Wise AI • Earnwise Strategy
              </p>
            </div>
          </div>

          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

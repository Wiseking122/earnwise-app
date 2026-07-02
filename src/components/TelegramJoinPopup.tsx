import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Users, Bell } from 'lucide-react';
import { safeStorage } from '../lib/storage';
import { useAuth } from '../context/AuthContext';

export const TelegramJoinPopup = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const hasSeen = safeStorage.getItem(`hasSeenTelegramPopup_${user.uid}`);
    if (hasSeen) return;

    // To prevent overlapping with the WelcomePopup for brand-new users:
    const hasSeenWelcome = safeStorage.getItem(`welcome_seen_${user.uid}`);
    const isNewUser = profile?.createdAt && 
      (Date.now() - (profile.createdAt.seconds * 1000) < 120000);

    if (isNewUser && !hasSeenWelcome) {
      // Welcome popup has priority. Wait until they close it and see it.
      return;
    }

    // Show after a short delay so the dashboard can render beautifully
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, profile]);

  const closePopup = () => {
    setIsOpen(false);
    if (user) {
      safeStorage.setItem(`hasSeenTelegramPopup_${user.uid}`, 'true');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Elegant Background Accents */}
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none" />

            <button
              onClick={closePopup}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="text-center pt-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm animate-bounce">
                <Send size={28} className="translate-x-[-2px] translate-y-[1px]" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 mb-2">
                Official Community
              </span>

              <h2 className="text-2xl font-black text-slate-900 mb-2 font-display">
                Join our Telegram Group
              </h2>
              <p className="text-slate-500 font-medium text-sm mb-6 max-w-xs mx-auto">
                Connect with <span className="text-blue-600 font-bold">10,000+ active partners</span> in Nigeria. Share payout proofs, get top tips, and receive automatic updates!
              </p>

              <div className="space-y-3 mb-4">
                {/* Primary Button: Chat Group */}
                <a
                  href="https://t.me/Earnwise01"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closePopup}
                  className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 text-sm"
                >
                  <Users size={16} />
                  Join Earnwise Chat Group
                </a>

                {/* Secondary Button: Channel Updates */}
                <a
                  href="https://t.me/earnwise0"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closePopup}
                  className="w-full bg-slate-100 text-slate-700 py-3.5 px-4 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm border border-slate-200"
                >
                  <Bell size={16} className="text-slate-500" />
                  Subscribe to Announcement Channel
                </a>
              </div>

              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                ★ SECURING DIGITAL WEALTH DAILY ★
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

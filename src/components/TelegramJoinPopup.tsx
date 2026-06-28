import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';
import { safeStorage } from '../lib/storage';

export const TelegramJoinPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = safeStorage.getItem('hasSeenTelegramPopup');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    safeStorage.setItem('hasSeenTelegramPopup', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
          >
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Join Our Telegram Group</h2>
              <p className="text-slate-600 mb-6">Stay updated and get exclusive rewards by joining our official Telegram group.</p>
              <a
                href="https://t.me/earnwise0"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closePopup}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors block text-center"
              >
                Join Now
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

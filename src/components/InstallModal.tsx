import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, X, Share, PlusSquare, Download } from 'lucide-react';

export default function InstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if already standalone
    const standalone = (window.matchMedia('(display-mode: standalone)').matches) || ((window.navigator as any).standalone === true);
    setIsStandalone(standalone);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    if (ios && !standalone) {
        // Simple check: show after 5 seconds for iOS to let app load
        const timer = setTimeout(() => setShowModal(true), 5000);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearTimeout(timer);
        };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
        // Just inform the user
        return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Earnwise: Install outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowModal(false);
  };

  if (!showModal || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 border border-blue-500/30 p-6 rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden"
        >
          <button 
            onClick={() => setShowModal(false)} 
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-lg mb-6">
              <Download className="text-white" size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2">Install Earnwise</h2>
            <p className="text-slate-400 text-sm mb-8">
              {isIOS 
                ? "Experience native app speed. Tap the Share button below and select 'Add to Home Screen'."
                : "Install EarnWise for a faster, smoother, and more rewarding experience."}
            </p>

            {isIOS ? (
              <div className="flex flex-col gap-4 text-left w-full bg-slate-950 p-4 rounded-2xl text-xs text-slate-300">
                <div className="flex items-center gap-3">
                    <Share size={18} className="text-blue-500"/>
                    <span>Tap the <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-center gap-3">
                    <PlusSquare size={18} className="text-blue-500"/>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
              </div>
            ) : (
                <button
                    onClick={handleInstall}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <Download size={20} />
                    INSTALL NOW
                </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

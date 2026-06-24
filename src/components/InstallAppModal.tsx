import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function InstallAppModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPrompt || null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const [hasPromptedInSession, setHasPromptedInSession] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      console.log('beforeinstallprompt fired in modal');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check in case it fired before mount and we missed the initial state grab
    if (!deferredPrompt && (window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    // If we have a prompt available, OR we are on an iOS device, let's show the prompt
    const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isDebug = new URLSearchParams(window.location.search).get('test_pwa') === 'true';
    
    const hasDismissed = localStorage.getItem('earnwise_pwa_dismissed') === 'true';
    
    // We show if user logged in AND not dismissed AND hasn't prompted yet
    // AND (we have prompt OR is iOS OR is debug)
    if (user && !hasDismissed && !hasPromptedInSession && (deferredPrompt || isIos || isDebug)) {
      if (isStandalone && !isDebug) return;

      const timer = setTimeout(() => {
        setShowModal(true);
        setHasPromptedInSession(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, user, hasPromptedInSession]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      
      setShowModal(false);

      if (outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
        localStorage.setItem('earnwise_pwa_dismissed', 'true');
      }
    } else {
      // Fallback for iOS or simulated debug.
      // We just show the iOS instructions instead.
      setShowIosInstructions(true);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem('earnwise_pwa_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showModal && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="pointer-events-auto w-full max-w-sm md:max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative"
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex gap-5 items-start">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex-shrink-0 flex items-center justify-center p-2.5 shadow-lg shadow-blue-500/20">
                  <img src="/icon-192.png" alt="Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div className="flex-1 space-y-1 pt-1">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Get the Earnwise App</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed pr-6">
                    {showIosInstructions 
                      ? "Tap the Share button in your browser, then tap 'Add to Home Screen' to install."
                      : "Install our ultra-fast platform on your home screen for instant payouts and task tracking"
                    }
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {showIosInstructions ? "Close" : "Maybe Later"}
                </button>
                {!showIosInstructions && (
                  <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wide shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Download size={14} className="animate-bounce" />
                    Install Now
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

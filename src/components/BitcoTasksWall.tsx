import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Coins, ChevronRight, Loader2, Award, Flame, RefreshCw } from 'lucide-react';

interface BitcoTasksWallProps {
  userId: string;
}

export const BitcoTasksWall: React.FC<BitcoTasksWallProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [retryKey, setRetryKey] = useState<number>(0);

  // Dynamically inject the user ID into the BitcoTasks offerwall URL
  const bitcoTasksUrl = `https://bitcotasks.com/offerwall/uzhfbdeylh0ox87saqkk3h0t77daxq/${encodeURIComponent(userId)}`;

  const handleRetry = () => {
    setIframeLoading(true);
    setRetryKey(prev => prev + 1);
  };

  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
    }
  }, [isOpen]);

  return (
    <>
      {/* Dashboard Card for BitcoTasks */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full relative overflow-hidden group flex items-center p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm text-left transition-all hover:shadow-md hover:border-amber-200"
        id="bitcotasks-card-btn"
      >
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg relative overflow-hidden">
          <Coins className="w-6 h-6 relative z-10 animate-pulse" />
          <div className="absolute inset-0 bg-white/20" />
        </div>
        
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-slate-900 leading-tight">🔥 BitcoTasks Surveys</h3>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 text-[8px] font-black uppercase tracking-tighter">High Yield</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">Earn massive Wise Coins with fast, high-paying surveys & offers</p>
        </div>

        <div className="ml-2 p-2 bg-slate-50 rounded-full group-hover:bg-amber-50 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500" />
        </div>

        {/* Background Decorative Element */}
        <div className="absolute top-1 right-8 opacity-10 group-hover:opacity-30 transition-opacity">
          <Flame className="w-12 h-12 text-amber-500 rotate-12" />
        </div>
      </motion.button>

      {/* Fullscreen Iframe Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md p-4 md:p-8"
            id="bitcotasks-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-display font-bold text-lg leading-none">BitcoTasks Offerwall</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Premium Rewards Portal</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Manual Reload/Retry Button */}
                <button
                  onClick={handleRetry}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="Reload Offerwall"
                  id="bitcotasks-retry-btn"
                >
                  <RefreshCw className={`w-5 h-5 ${iframeLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  aria-label="Close Wall"
                  id="bitcotasks-close-btn"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10 text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Connecting to BitcoTasks...</p>
                  <button 
                    onClick={handleRetry}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Force Reload
                  </button>
                </div>
              )}
              
              <iframe
                key={retryKey}
                src={bitcoTasksUrl}
                style={{ width: '100%', height: '100%' }}
                scrolling="yes"
                frameBorder="0"
                className="w-full h-full border-none"
                title="BitcoTasks Offerwall"
                allow="geolocation"
                onLoad={() => setIframeLoading(false)}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2">
              <div className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>UID: {userId?.substring(0, 8)}... • Secure Integration</span>
              </div>
              <button 
                onClick={handleRetry}
                className="flex items-center gap-1 hover:text-white transition-colors uppercase tracking-wider"
              >
                <RefreshCw className="w-3 h-3" /> Retry Loading
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

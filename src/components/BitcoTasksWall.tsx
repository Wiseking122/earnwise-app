import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Coins, ChevronRight, Flame } from 'lucide-react';

interface BitcoTasksWallProps {
  userId: string;
}

export const BitcoTasksWall: React.FC<BitcoTasksWallProps> = ({ userId }) => {
  // Dynamically inject the user ID into the BitcoTasks offerwall URL
  const bitcoTasksUrl = `https://bitcotasks.com/offerwall/uzhfbdeylh0ox87saqkk3h0t77daxq/${encodeURIComponent(userId)}`;

  const handleOpenNewTab = () => {
    console.log(`[BitcoTasks] Launching offerwall in new tab for user: ${userId}`);
    window.open(bitcoTasksUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleOpenNewTab}
      className="w-full relative overflow-hidden group flex items-center p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm text-left transition-all hover:shadow-md hover:border-amber-200"
      id="bitcotasks-card-btn"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg relative overflow-hidden animate-pulse">
        <Coins className="w-6 h-6 relative z-10" />
        <div className="absolute inset-0 bg-white/20" />
      </div>
      
      <div className="ml-4 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-slate-900 leading-tight">🔥 BitcoTasks Surveys</h3>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 text-[8px] font-black uppercase tracking-tighter">High Yield</span>
        </div>
        <p className="text-slate-500 text-xs mt-1">Earn massive Wise Coins with fast, high-paying surveys & offers</p>
      </div>

      <div className="ml-2 p-2 bg-slate-50 rounded-full group-hover:bg-amber-50 transition-colors flex items-center gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">Open Tab</span>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500" />
      </div>

      {/* Background Decorative Element */}
      <div className="absolute top-1 right-8 opacity-10 group-hover:opacity-30 transition-opacity">
        <Flame className="w-12 h-12 text-amber-500 rotate-12" />
      </div>
    </motion.button>
  );
};



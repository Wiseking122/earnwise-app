import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Trophy, Gamepad2, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WallConfig {
  id: 'offerwall' | 'surveywall';
  title: string;
  subtitle: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

export const WannadsWalls: React.FC = () => {
  const { profile } = useAuth();
  const [activeWall, setActiveWall] = useState<WallConfig | null>(null);

  const walls: WallConfig[] = [
    {
      id: 'surveywall',
      title: '💎 Premium Survey Hub',
      subtitle: 'High-paying academic & market research surveys',
      url: `https://earn.wannads.com/surveywall?apiKey=6a441f7e5952f548984724&userId=${profile?.uid || 'guest'}`,
      icon: <Trophy className="w-6 h-6" />,
      color: 'from-blue-600 to-indigo-600'
    },
    {
      id: 'offerwall',
      title: '🎮 Micro-Task & Game Arena',
      subtitle: 'Earn by playing games and testing new apps',
      url: `https://earn.wannads.com/wall?apiKey=6a441f7e5952f548984724&userId=${profile?.uid || 'guest'}`,
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'from-purple-600 to-pink-600'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-slate-900 uppercase italic tracking-tight">Wannads Rewards</h2>
            <p className="text-slate-500 text-xs font-medium">Premium global offerwall partners</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
        {walls.map((wall) => (
          <motion.button
            key={wall.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveWall(wall)}
            className="relative overflow-hidden group flex items-center p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm text-left transition-all hover:shadow-md hover:border-orange-200"
          >
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${wall.color} text-white shadow-lg`}>
              {wall.icon}
            </div>
            
            <div className="ml-4 flex-1">
              <h3 className="font-display font-bold text-slate-900 leading-tight">{wall.title}</h3>
              <p className="text-slate-500 text-xs mt-1 line-clamp-1">{wall.subtitle}</p>
            </div>

            <div className="ml-2 p-2 bg-slate-50 rounded-full group-hover:bg-orange-50 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500" />
            </div>

            {/* Decorative element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:bg-orange-50 transition-colors -z-10" />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {activeWall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-sm p-4 md:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${activeWall.color} text-white shadow-lg`}>
                  {activeWall.icon}
                </div>
                <div>
                  <h3 className="text-white font-display font-bold text-lg leading-none">{activeWall.title}</h3>
                  <p className="text-slate-400 text-xs mt-1">Powered by Wannads Global</p>
                </div>
              </div>

              <button
                onClick={() => setActiveWall(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative">
              <iframe
                src={activeWall.url}
                className="w-full h-full border-none"
                title={activeWall.title}
                allow="geolocation"
                scrolling="yes"
                frameBorder="0"
                style={{ width: '100%', height: '100%', border: 0, padding: 0, margin: 0 }}
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <ExternalLink className="w-3 h-3" />
              Secure encrypted session • UID: {profile?.uid?.substring(0, 8)}...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

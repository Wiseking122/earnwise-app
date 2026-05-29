import React from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export default function LoadingScreen() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-8 p-6">
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.9, 1, 0.9],
          rotateY: [0, 10, 0, -10, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <Logo size={160} className="relative z-10" />
      </motion.div>
      
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">Earnwise</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] translate-x-1">Secure Load</p>
        </div>
        
        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-blue-600 to-transparent"
          />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Earnwise Elite</p>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}

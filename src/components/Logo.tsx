import React from 'react';
import { motion } from 'motion/react';

export const Logo = ({ size = 48, className = "" }: { size?: number, className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <motion.g
        animate={{ 
          y: [0, -4, 0],
          rotate: [0, 1, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        {/* Background Glow */}
        <circle cx="60" cy="60" r="50" fill="url(#logo-gradient)" fillOpacity="0.15" />
        
        {/* Main W Path */}
        <path 
          d="M20 40 L40 90 L60 60 L80 90 L100 30" 
          stroke="url(#logo-gradient)" 
          strokeWidth="14" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#shadow)"
        />
        
        {/* Arrow Head */}
        <path 
          d="M90 35 L100 30 L105 40" 
          stroke="url(#logo-gradient)" 
          strokeWidth="14" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Gold Coin at top */}
        <motion.g
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx="100" cy="30" r="14" fill="#F59E0B" stroke="white" strokeWidth="2" />
          <text x="95" y="35" fill="white" fontSize="12" fontWeight="900" fontFamily="Inter, sans-serif">₦</text>
        </motion.g>
      </motion.g>
    </svg>
  );
};

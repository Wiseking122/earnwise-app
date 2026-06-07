import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  fractionDigits?: number;
}

export default function AnimatedNumber({ value, fractionDigits = 0 }: AnimatedNumberProps) {
  const count = useMotionValue(0);
  
  const output = useTransform(count, (latest) => {
    return latest.toLocaleString(undefined, { 
      minimumFractionDigits: fractionDigits, 
      maximumFractionDigits: fractionDigits 
    });
  });

  useEffect(() => {
    const controls = animate(count, value, { 
      duration: 1.5, 
      ease: "easeOut" 
    });
    
    return controls.stop;
  }, [value, count]);

  return <motion.span>{output}</motion.span>;
}

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface WithdrawalTimelineProps {
  status: string; // The status from WithdrawalRequest
}

const stages = ['Submitted', 'Bank Validation', 'Transfer in Progress', 'Cleared'];

export default function WithdrawalTimeline({ status }: WithdrawalTimelineProps) {
  // Map status to current stage index
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'submitted': return 0;
      case 'bank_validation': return 1;
      case 'transferring': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(status);

  return (
    <div className="w-full mt-4 space-y-2">
      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
        {stages.map((stage, index) => (
          <span key={stage} className={index <= currentIndex ? 'text-blue-600' : ''}>
            {stage}
          </span>
        ))}
      </div>
      <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
        />
        {/* Animated glow */}
        {currentIndex < stages.length - 1 && (
           <motion.div 
            className="absolute top-0 h-full bg-blue-400 blur-sm"
            initial={{ left: 0 }}
            animate={{ left: `${(currentIndex / (stages.length - 1)) * 100}%` }}
           />
        )}
      </div>
    </div>
  );
}

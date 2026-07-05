import React, { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import VastVideoPlayer from './VastVideoPlayer';

export const VAST_ADS = [
  'https://vast.vstserv.com/vast?spot_id=2022826',
  'https://vast.vstserv.com/vast?spot_id=2022825',
  'https://vast.vstserv.com/vast?spot_id=2022824',
  'https://vast.vstserv.com/vast?spot_id=2022829',
  'https://butterygrandmother.com/dmmCFyz.dtGkNnv/ZZGiU-/Pemm/9juwZKUclEkiPmTOcFxZOGTQY/wwNMTvMytQNMzXE/5JNRj/Ag1YNkwu',
];

interface VideoAdProps {
  onAdEnded: () => void;
  onAdStarted?: () => void;
  rewardAmount?: number;
  vastUrl?: string;
}

export default function VideoAd({ onAdEnded, onAdStarted, rewardAmount, vastUrl }: VideoAdProps) {
  const [countdown, setCountdown] = useState(30);
  const [adUrl] = useState(() => vastUrl || VAST_ADS[Math.floor(Math.random() * VAST_ADS.length)]);

  useEffect(() => {
    onAdStarted?.();
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <VastVideoPlayer vastUrl={adUrl} onAdEnded={onAdEnded} />

        <div className="absolute top-4 left-4 z-20">
          <div className="bg-black/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
             <Clock size={16} className="text-white" />
             <span className="text-white font-black text-sm tracking-tight">{countdown}s</span>
          </div>
        </div>

        {countdown <= 0 && (
          <button 
            onClick={onAdEnded}
            className="absolute top-4 right-4 z-20 bg-white text-slate-950 w-10 h-10 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

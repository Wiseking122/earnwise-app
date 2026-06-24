import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, Info, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { playRewardSound } from './sounds';
import VastVideoPlayer from '../components/VastVideoPlayer';

export const VAST_ADS = [
  'https://vast.vstserv.com/vast?spot_id=2022826',
  'https://vast.vstserv.com/vast?spot_id=2022825',
  'https://vast.vstserv.com/vast?spot_id=2022824',
  'https://vast.vstserv.com/vast?spot_id=2022829',
];

export default function VideoPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  
  const videoParam = searchParams.get('video') || 'standard';
  const rewardParam = searchParams.get('reward');
  
  const rewardVal = rewardParam ? parseFloat(rewardParam) : (videoParam === 'premium' ? 45.00 : 35.00);
  const videoSrc = videoParam === 'premium' 
    ? "https://www.w3schools.com/html/movie.mp4"
    : "https://www.w3schools.com/html/mov_bbb.mp4";
    
  const adId = videoParam === 'premium' ? 'video_2' : 'video_1';
  const videoTitle = videoParam === 'premium' ? 'Premium Insight Ad' : 'Standard Reward Video';

  const containerRef = useRef<HTMLDivElement>(null);
  const [rewarded, setRewarded] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerStarted, setTimerStarted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [vastAd, setVastAd] = useState<string>('');

  useEffect(() => {
     setVastAd(VAST_ADS[Math.floor(Math.random() * VAST_ADS.length)]);
  }, []);

  useEffect(() => {
    if (!timerStarted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted, timeLeft]);

  useEffect(() => {
    // Auto-credit as soon as they have watched for 30 seconds
    if (timerStarted && timeLeft === 0 && !rewarded) {
      creditReward();
    }
  }, [timeLeft, timerStarted, rewarded]);

  useEffect(() => {
    // Explicitly set standard lowercase 'class' attribute to be safe and ensure ad-network scan detection
    if (containerRef.current) {
      containerRef.current.classList.add('video-ad-container');
    }
  }, []);

  const creditReward = async () => {
    if (rewarded) return;
    if (!user) {
      setStatusMsg("Please log in to claim your reward.");
      return;
    }

    // Checking rate limiting on completion
    if (profile?.role !== 'admin' && profile?.completedAds) {
      const today = new Date().toISOString().split('T')[0];
      const alreadyCompleted = profile.completedAds.some((ad: any) => 
        ad.id === adId && ad.timestamp.startsWith(today)
      );
      if (alreadyCompleted) {
        setStatusMsg("You have already earned from this ad today!");
        return;
      }
    }
    
    setRewarded(true);
    setStatusMsg("Verifying view...");
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(rewardVal),
        totalEarnings: increment(rewardVal),
        completedAds: arrayUnion({
          id: adId,
          timestamp: new Date().toISOString(),
          reward: rewardVal
        })
      });
      
      playRewardSound();
      setStatusMsg(`Success! +₦${rewardVal.toFixed(2)} added to your wallet.`);
    } catch (err) {
      console.error('Error crediting reward on video end:', err);
      setStatusMsg("Failed to credit reward. Please try again.");
      setRewarded(false);
    }
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    if (timeLeft > 0) {
      setStatusMsg(`Video completed. Please stay on page for another ${timeLeft}s to claim your reward.`);
    } else {
      creditReward();
    }
  };

  return (
    <Layout>
      <div className="p-5 pb-24 max-w-4xl mx-auto space-y-8 relative">
        <div className="premium-blur" />
        
        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all active:scale-90"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <div className="text-right">
            <h1 className="font-display font-black text-2xl text-white uppercase italic tracking-tighter">Premium Player</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Earnwise Streaming Node</p>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-3xl text-center font-black text-xs uppercase tracking-widest shadow-2xl border ${
              statusMsg.includes('Success') 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-blue-600 text-white border-blue-500'
            }`}
          >
            {statusMsg}
          </motion.div>
        )}

        {/* Video Player Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 group"
        >
          <div className="relative aspect-video bg-slate-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center group">
            {/* The Video Element */}
            {vastAd && (
              <VastVideoPlayer 
                vastUrl={vastAd} 
                onAdEnded={() => setVastAd('')} 
              />
            )}
            <div 
              ref={containerRef}
              className={`video-ad-container w-full h-full ${vastAd ? 'hidden' : ''}`}
            >
              <video 
                id="earnwise-player"
                className="w-full h-full object-cover"
                poster="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1200"
                src={videoSrc}
                controls
                muted
                playsInline
                onPlay={() => {
                  if (!timerStarted) {
                    setTimerStarted(true);
                    setStatusMsg("Ad timer started. Keep watching for 30s to claim your reward.");
                  }
                }}
                onEnded={handleVideoEnded}
              >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Glass Overlay (Simplified) */}
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>

          {/* Ad Status Marker */}
          <div className="mt-4 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Viewing in Standard Definition</p>
          </div>
        </motion.div>

        {/* Video Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
           <div className="md:col-span-2 bg-white/5 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Play size={20} className="fill-white" />
                 </div>
                 <h2 className="font-display font-black text-white text-xl uppercase italic tracking-tight">Watching: {videoTitle}</h2>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                 Stay updated with the latest trends in digital wealth. Watch at least 30 seconds to unlock your next reward tier.
              </p>
           </div>
           
           <div className={`backdrop-blur-3xl p-8 rounded-[2.5rem] border flex flex-col items-center justify-center text-center space-y-3 transition-colors ${
             rewarded 
               ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
               : timerStarted && timeLeft > 0
               ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
               : 'bg-white/5 border-white/10 text-white'
           }`}>
              <ShieldCheck size={32} className={rewarded ? "text-emerald-400" : timerStarted && timeLeft > 0 ? "text-amber-500" : "text-slate-400"} />
              <div>
                 <p className={`text-[10px] font-black uppercase tracking-widest ${rewarded ? 'text-emerald-400' : timerStarted && timeLeft > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                   {rewarded ? 'CREDITED' : timerStarted ? `WAIT ${timeLeft}S` : 'PLAY VIDEO'}
                 </p>
                 <h3 className="font-display font-black text-2xl tracking-tighter mt-1">₦{rewardVal.toFixed(2)}</h3>
              </div>
           </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center gap-2 justify-center py-6 px-8 bg-slate-900/50 rounded-3xl border border-white/5 relative z-10">
           <Info size={16} className="text-slate-500" />
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Ensure stable connection for real-time credit verification.</p>
        </div>
      </div>
    </Layout>
  );
}

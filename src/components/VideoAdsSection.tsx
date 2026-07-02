import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import { getOrGenerateDeviceFingerprint } from '../lib/security';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Clock, Coins, Tv, CheckCircle, X, Sparkles, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    fluidPlayer: any;
  }
}

interface VideoTask {
  id: string;
  title: string;
  reward: number; // in Points
  duration: string;
  seconds: number;
  subtitle: string;
}

const VIDEO_TASKS: VideoTask[] = [
  {
    id: 'video-1',
    title: 'Premium Video Ad #1',
    reward: 50,
    duration: '30 Sec',
    seconds: 30,
    subtitle: 'High-yield sponsor video campaign'
  },
  {
    id: 'video-2',
    title: 'Golden Partner Video',
    reward: 80,
    duration: '45 Sec',
    seconds: 45,
    subtitle: 'Earnwise VIP premium rewards'
  },
  {
    id: 'video-3',
    title: 'TikTok Page Promoter',
    reward: 30,
    duration: '15 Sec',
    seconds: 15,
    subtitle: 'Creator trending viral video boost'
  },
  {
    id: 'video-4',
    title: 'Global High-Yield Ad',
    reward: 100,
    duration: '60 Sec',
    seconds: 60,
    subtitle: 'Exclusive worldwide network offer'
  }
];

export default function VideoAdsSection() {
  const { user } = useAuth();
  const [pointsToday, setPointsToday] = useState<number>(() => {
    const saved = localStorage.getItem('earnwise_video_points_today');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [activeAd, setActiveAd] = useState<VideoTask | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('earnwise_video_points_today', pointsToday.toString());
  }, [pointsToday]);

  const rewardUser = async (userId: string | number, taskId: string) => {
    console.log(`[REWARD] Crediting user ${userId} for task ${taskId}`);
    try {
      const deviceFingerprint = getOrGenerateDeviceFingerprint();
      // Placeholder fetch request to secure backend endpoint
      const response = await fetch(getApiUrl('/api/rewards/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId, type: 'video_ad', deviceFingerprint }),
      });
      const data = await response.json();
      console.log('[REWARD_RESPONSE]', data);
    } catch (err) {
      console.error('[REWARD_ERROR]', err);
    }
  };

  const handleStartWatching = (ad: VideoTask) => {
    setActiveAd(ad);
    setShowOverlay(true);
    setShowSuccess(false);
  };

  useEffect(() => {
    if (showOverlay && activeAd && videoRef.current && window.fluidPlayer) {
      const userId = user?.uid || 'guest_user';
      const vastBaseUrl = 'https://runative-syndicate.com/do2/a76028f599d54130a11dff96118b3b3f/vast?';
      const dynamicVastUrl = `${vastBaseUrl}&subid=${userId}`;

      // Initialize Fluid Player
      try {
        playerInstance.current = window.fluidPlayer(videoRef.current, {
          layoutControls: {
            fillToContainer: true,
            primaryColor: '#3b82f6',
            autoPlay: true,
            mute: false,
            allowTheatre: false,
            playPauseAnimation: true,
            playbackRateControl: false,
            allowDownload: false,
            logo: {
              imageUrl: null,
              position: 'top left',
              clickUrl: null,
              opacity: 1
            },
            controlBar: {
              autoHide: true,
              autoHideTimeout: 3,
              animated: true
            }
          },
          vastOptions: {
            adList: [
              {
                roll: 'preRoll',
                vastTag: dynamicVastUrl
              }
            ],
            adFinishedCallback: () => {
              console.log('[VAST] Ad Completed');
              rewardUser(userId, activeAd.id);
              setPointsToday(prev => prev + activeAd.reward);
              setShowOverlay(false);
              setShowSuccess(true);
            },
            adErrorCallback: (error: any) => {
              console.error('[VAST] Ad Error:', error);
              setShowOverlay(false);
            }
          }
        });
      } catch (err) {
        console.error('[FLUID_PLAYER_INIT_ERROR]', err);
        setShowOverlay(false);
      }
    }

    return () => {
      // Cleanup player reference if component unmounts or overlay closes
      if (playerInstance.current) {
        // Some versions of fluid player might have destroy, but 
        // to be safe we just null it as the library is not perfectly modular
        playerInstance.current = null;
      }
    };
  }, [showOverlay, activeAd, user]);

  const handleClosePlayer = () => {
    setShowOverlay(false);
    setActiveAd(null);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setActiveAd(null);
  };

  return (
    <div className="space-y-6 relative z-10">
      {/* Top Points Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-slate-950 text-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-900 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)' }} />
        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-400 animate-spin-slow" />
              WATCH & MULTIPLY
            </span>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-tight">
              Video Points Earned Today
            </h2>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-display font-black tracking-tighter text-white">
                +{pointsToday.toLocaleString()} <span className="text-sm font-black text-blue-400">PTS</span>
              </p>
            </div>
          </div>
          <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Tv size={24} className="animate-pulse" />
          </div>
        </div>
      </motion.div>

      {/* Video Tasks List */}
      <div className="space-y-4">
        {VIDEO_TASKS.map((ad) => (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden bg-white border border-slate-100 p-5 rounded-[2.2rem] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white border border-slate-900 transition-transform group-hover:scale-105 duration-300">
                <Play size={20} className="fill-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                  {ad.subtitle}
                </span>
                <h4 className="font-display font-black text-slate-900 text-base uppercase leading-tight italic">
                  {ad.title}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                    <Clock size={10} />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{ad.duration}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">
                    <Coins size={10} />
                    <span className="text-[8px] font-black uppercase tracking-tighter">+{ad.reward} Points</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartWatching(ad)}
              className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-display font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all"
            >
              <Play size={14} className="fill-white" />
              Watch Now
            </button>
          </motion.div>
        ))}
      </div>

      {/* Bottom Guideline Note */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        ⚠️ Make sure to watch the entire video to secure your points reward.
      </div>

      {/* Real VAST Video Player Overlay */}
      <AnimatePresence>
        {showOverlay && activeAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950"
          >
            <div className="relative w-full h-full flex flex-col bg-slate-950">
              {/* Header */}
              <div className="p-6 flex justify-between items-center bg-slate-900 border-b border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] block">
                    SPONSOR AD CONTENT
                  </span>
                  <h3 className="text-white font-display font-black text-lg uppercase tracking-tight italic">
                    {activeAd.title}
                  </h3>
                </div>
                <button
                  onClick={handleClosePlayer}
                  className="w-10 h-10 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition border border-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Player Area */}
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative">
                  <video 
                    ref={videoRef}
                    id="vast_video_player"
                    playsInline
                    className="w-full h-full"
                  >
                    <source src="" type="video/mp4" />
                  </video>
                  
                  {/* Overlay loading message */}
                  {!playerInstance.current && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6 space-y-4">
                       <Loader2 size={40} className="text-blue-500 animate-spin" />
                       <div className="space-y-1">
                         <p className="text-xs font-display font-black text-white uppercase tracking-widest">Initialising Secure Ad Stream</p>
                         <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">Contacting Runative Network...</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Warning */}
              <div className="p-8 text-center bg-slate-900/50">
                <div className="max-w-xs mx-auto space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Do Not Close Player</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                    Points will only be credited after the advertisement finishes processing completely.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUCCESS MODAL TRIGGER */}
      <AnimatePresence>
        {showSuccess && activeAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' }} />
              
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xl relative">
                <CheckCircle size={40} />
                <motion.div
                   animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="absolute inset-0 bg-emerald-500 rounded-3xl -z-10"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-display font-black text-2xl uppercase tracking-tighter italic">
                  Points Secured!
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Congratulations! You've successfully completed the video task and earned <strong className="text-emerald-400">+{activeAd.reward} PTS</strong>.
                </p>
              </div>

              <button
                onClick={handleCloseSuccess}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.95] text-white font-display font-black text-sm uppercase tracking-widest py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all"
              >
                Claim Rewards
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

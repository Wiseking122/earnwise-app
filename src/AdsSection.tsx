import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  ExternalLink, 
  Zap, 
  Globe, 
  TrendingUp, 
  Timer,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { useAuth } from './context/AuthContext';
import { playRewardSound } from './pages/sounds';
import VideoAd from './components/VideoAd';
import VastVideoPlayer from './components/VastVideoPlayer';
import { MONETAG_LINKS, getMonetagLink } from './lib/adManager';

export const VAST_ADS = [
  'https://vast.vstserv.com/vast?spot_id=2022826',
  'https://vast.vstserv.com/vast?spot_id=2022825',
  'https://vast.vstserv.com/vast?spot_id=2022824',
  'https://vast.vstserv.com/vast?spot_id=2022829',
];

// Ads Config Block

interface AdTask {
  id: string;
  name: string;
  provider: string;
  reward: number;
  type: 'video' | 'click';
  color: string;
  icon: any;
  link?: string;
}

interface AdsSectionProps {
  onBack: () => void;
}

export default function AdsSection({ onBack }: AdsSectionProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rewardMsg, setRewardMsg] = useState<string | null>(null);
  const [activeTimerTask, setActiveTimerTask] = useState<AdTask | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(30);
  const [vastAd, setVastAd] = useState<string>('');

  useEffect(() => {
    if (activeTimerTask) {
       setVastAd(VAST_ADS[Math.floor(Math.random() * VAST_ADS.length)]);
    }
  }, [activeTimerTask]);

  useEffect(() => {
    if (!activeTimerTask || timerSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setTimerSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimerTask, timerSecondsLeft]);

  useEffect(() => {
    if (activeTimerTask && timerSecondsLeft === 0) {
      handleReward(activeTimerTask.id, activeTimerTask.reward);
      setActiveTimerTask(null);
    }
  }, [timerSecondsLeft, activeTimerTask]);

  const isAdCompletedToday = (adId: string) => {
    if (profile?.role === 'admin') return false;
    if (!profile?.completedAds) return false;
    const today = new Date().toISOString().split('T')[0];
    return profile.completedAds.some((ad: any) => 
      ad.id === adId && ad.timestamp.startsWith(today)
    );
  };
  const handleReward = async (adId: string, amount: number) => {
    if (!user) return;
    setLoading(true);
    try {
       const userRef = doc(db, 'users', user.uid);
       await updateDoc(userRef, {
         balance: increment(amount),
         totalEarnings: increment(amount),
         completedAds: arrayUnion({
           id: adId,
           timestamp: new Date().toISOString(),
           reward: amount
         })
       });
       
       playRewardSound();
       setRewardMsg(`Success! +₦${amount.toFixed(2)} added to your wallet.`);
       setTimeout(() => setRewardMsg(null), 3500);
    } catch (error) {
       console.error('Reward error:', error);
    } finally {
       setLoading(false);
    }
  };

  const monetagTasks: AdTask[] = MONETAG_LINKS.map((link, idx) => ({
    id: link.id,
    name: `Premium Sponsor Ad Stream - Channel ${idx + 1}`,
    provider: 'Monetag Smart',
    reward: 25.00,
    type: 'click',
    color: 'bg-indigo-600',
    icon: ExternalLink,
    link: link.url
  }));

  const adTasks: AdTask[] = [
    {
      id: 'video_1',
      name: 'Understanding Ads Center',
      provider: 'Earnwise',
      reward: 35.00,
      type: 'video',
      color: 'bg-blue-600',
      icon: Play,
      link: '/player'
    },
    {
      id: 'video_2',
      name: 'Premium Insight Ad',
      provider: 'Earnwise',
      reward: 45.00,
      type: 'video',
      color: 'bg-indigo-600',
      icon: Play,
      link: '/player'
    },
    {
      id: 'click_1',
      name: 'Quick Verification Task',
      provider: 'Earnwise',
      reward: 20.00,
      type: 'click',
      color: 'bg-emerald-600',
      icon: ExternalLink,
      link: '#'
    },
    ...monetagTasks
  ];

  const handleTaskClick = (task: AdTask) => {
    if (isAdCompletedToday(task.id)) {
      setRewardMsg("You've already earned from this ad today!");
      setTimeout(() => setRewardMsg(null), 3000);
      return;
    }

    if (task.type === 'video') {
      const videoType = task.id === 'video_2' ? 'premium' : 'standard';
      navigate(`/player?video=${videoType}&reward=${task.reward}`);
    } else if (task.link && task.link !== '#') {
      window.open(task.link, '_blank', 'noopener,noreferrer');
      setActiveTimerTask(task);
      setTimerSecondsLeft(30);
    } else if (task.type === 'click') {
      setActiveTimerTask(task);
      setTimerSecondsLeft(30);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 bg-slate-950 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-blue-600 via-indigo-600 to-blue-600" />
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <div>
            <h3 className="font-display font-black text-2xl text-white uppercase italic tracking-tighter">Ads Center</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Safe & Verified Earnings</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rewardMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-600 text-white p-4 rounded-3xl text-center font-black text-xs uppercase tracking-widest shadow-2xl border border-emerald-500"
          >
            {rewardMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTimerTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              
              <div className="space-y-2">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                  Partner Ad Verification
                </span>
                <h3 className="font-display font-black text-xl text-white uppercase italic tracking-tight mt-3">
                  {activeTimerTask.name}
                </h3>
                <p className="text-slate-400 text-xs">
                  Please stay on the opened partner page for 30 seconds to authenticate your visit & claim reward.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-6">
                {vastAd && (
                  <VastVideoPlayer vastUrl={vastAd} onAdEnded={() => {}} />
                )}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      className="stroke-white/5 fill-none" 
                      strokeWidth="6" 
                    />
                    <motion.circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      className="stroke-blue-500 fill-none" 
                      strokeWidth="6" 
                      strokeDasharray="263"
                      animate={{ strokeDashoffset: (1 - timerSecondsLeft / 30) * 263 }}
                      transition={{ duration: 0.3 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                    <span className="font-mono text-4xl font-black text-white tracking-widest">
                      {timerSecondsLeft}s
                    </span>
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">
                      WAITING
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Incoming Reward</span>
                  <span className="text-sm font-display font-black text-white">₦{activeTimerTask.reward.toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (window.confirm("Cancelling now will forfeit your reward payout. Are you sure?")) {
                        setActiveTimerTask(null);
                      }
                    }}
                    className="flex-1 py-4 bg-white/5 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all text-center border border-white/10"
                  >
                    Cancel visit
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {adTasks.map((task, index) => {
          const completedToday = isAdCompletedToday(task.id);
          return (
            <motion.button
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleTaskClick(task)}
              disabled={loading || completedToday}
              className={`group w-full border p-5 rounded-[2rem] flex items-center justify-between transition-all active:scale-[0.98] relative overflow-hidden ${
                completedToday 
                  ? 'bg-slate-50 border-slate-200 opacity-60 grayscale cursor-not-allowed' 
                  : 'bg-white border-slate-100 hover:shadow-2xl hover:border-blue-200'
              }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-14 h-14 ${task.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-12`}>
                  <task.icon size={26} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.provider}</span>
                     <div className="w-1 h-1 bg-slate-300 rounded-full" />
                     <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{task.type}</span>
                  </div>
                  <h4 className="font-display font-black text-slate-900 text-lg uppercase italic leading-none">{task.name}</h4>
                </div>
              </div>
              
              <div className="text-right relative z-10">
                <p className="text-xl font-display font-black text-slate-900 tracking-tighter">
                  {completedToday ? 'DONE' : `₦${task.reward.toFixed(2)}`}
                </p>
                <div className="flex items-center gap-1 justify-end mt-1">
                   <Timer size={10} className="text-slate-400" />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter italic">
                     {completedToday ? 'Come back tomorrow' : '30s Ad Visit'}
                   </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

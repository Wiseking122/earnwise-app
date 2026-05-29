import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Eye, 
  ExternalLink, 
  Zap, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle,
  Dices,
  ChevronRight,
  Globe,
  ArrowRight
} from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useAuth } from './context/AuthContext';
import { PLANS } from './constants/plans';
import VideoAd from './components/VideoAd';
import TeleAd from './components/TeleAd';
import { playRewardSound } from './pages/sounds';

interface AdTask {
  id: string;
  name: string;
  provider: string;
  reward: number;
  type: 'video' | 'click' | 'banner';
  color: string;
  icon: any;
  action?: () => void;
  component?: (onEnd: () => void) => React.ReactNode;
}

interface AdsSectionProps {
  onBack?: () => void;
}

export default function AdsSection({ onBack }: AdsSectionProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeAdComponent, setActiveAdComponent] = useState<React.ReactNode | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!user || !profile) {
    return (
      <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Syncing Ad Networks...</p>
      </div>
    );
  }

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;

  useEffect(() => {
    // Adsterra Native & Background scripts
    const scriptSources = [
      'https://sturgeonvelocity.com/4c/33/ed/4c33eddc2cb704b37792c4bfab987c90.js',
      'https://sturgeonvelocity.com/33/48/25/3348250d86b6abbfaf84fe1749b80c39.js'
    ];

    const activeScripts: HTMLScriptElement[] = [];

    scriptSources.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      document.body.appendChild(s);
      activeScripts.push(s);
    });

    return () => {
      activeScripts.forEach(s => {
        if (s && s.parentNode) s.parentNode.removeChild(s);
      });
    };
  }, []);

  const handleReward = async (taskId: string, reward: number) => {
    if (!user || countdown !== null) return;
    setLoading(taskId);
    setCountdown(10); // 10 second mandatory wait
    setMessage(null);

    try {
      // Simulate ad watching time (sync with visible countdown)
      await new Promise(resolve => setTimeout(resolve, 10000));

      const finalReward = reward * multiplier;

      // Update balance instantly
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(finalReward),
        taskEarnings: increment(finalReward),
        xp: increment(10)
      });

      await addDoc(collection(db, 'completions'), {
        userId: user.uid,
        taskId: `ad_${taskId}`,
        status: 'approved',
        rewardEarned: finalReward,
        submittedAt: serverTimestamp(),
        isAdNetwork: true,
        network: taskId
      });

      playRewardSound();
      setMessage({ type: 'success', text: `Ad Reward of ₦${finalReward.toFixed(2)} added to your balance!` });
    } catch (err) {
      console.error("Ad reward error:", err);
      setMessage({ type: 'error', text: "Failed to record reward. Please try again." });
    } finally {
      setLoading(null);
    }
  };

  const adTasks: AdTask[] = [
    {
      id: 'adsterra_5812183',
      name: 'Premium Display Task #1',
      provider: 'Adsterra',
      reward: 25.00,
      type: 'click',
      color: 'bg-indigo-600',
      icon: ExternalLink,
      action: () => {
        window.open('https://sturgeonvelocity.com/k6gecqay8?key=b7391c7ce99e38aecb8a4e4a642558a1', '_blank');
        handleReward('adsterra_5812183', 25.00);
      }
    },
    {
      id: 'adsterra_29476705',
      name: 'High-Yield Bonus #1',
      provider: 'Adsterra',
      reward: 15.50,
      type: 'click',
      color: 'bg-emerald-600',
      icon: Zap,
      action: () => {
        window.open('https://sturgeonvelocity.com/k6gecqay8?key=b7391c7ce99e38aecb8a4e4a642558a1', '_blank');
        handleReward('adsterra_29476705', 15.50);
      }
    },
    {
      id: 'adsterra_29476706',
      name: 'High-Yield Bonus #2',
      provider: 'Adsterra',
      reward: 15.50,
      type: 'click',
      color: 'bg-blue-600',
      icon: Zap,
      action: () => {
        window.open('https://sturgeonvelocity.com/k6gecqay8?key=b7391c7ce99e38aecb8a4e4a642558a1', '_blank');
        handleReward('adsterra_29476706', 15.50);
      }
    },
    {
      id: 'adsterra_29476707',
      name: 'Elite Rewards Tier #3',
      provider: 'Adsterra',
      reward: 45.00,
      type: 'video',
      color: 'bg-purple-600',
      icon: Play,
      action: () => {
        window.open('https://sturgeonvelocity.com/k6gecqay8?key=b7391c7ce99e38aecb8a4e4a642558a1', '_blank');
        handleReward('adsterra_29476707', 45.00);
      }
    },
    {
      id: 'montage_11070990',
      name: 'Social Boost Alpha',
      provider: 'Montage',
      reward: 35.00,
      type: 'click',
      color: 'bg-rose-600',
      icon: ExternalLink,
      action: () => {
        window.open('https://omg10.com/4/11070990', '_blank');
        handleReward('montage_11070990', 35.00);
      }
    },
    {
      id: 'montage_11070991',
      name: 'Montage Premium #1',
      provider: 'Montage',
      reward: 40.00,
      type: 'video',
      color: 'bg-pink-600',
      icon: Play,
      action: () => {
        window.open('https://omg10.com/4/11070991', '_blank');
        handleReward('montage_11070991', 40.00);
      }
    },
    {
      id: 'montage_11070998',
      name: 'Global Reach Beta',
      provider: 'Montage',
      reward: 30.00,
      type: 'click',
      color: 'bg-orange-600',
      icon: Globe,
      action: () => {
        window.open('https://omg10.com/4/11070998', '_blank');
        handleReward('montage_11070998', 30.00);
      }
    },
    {
      id: 'montage_11071002',
      name: 'Elite Earning Node',
      provider: 'Montage',
      reward: 50.00,
      type: 'video',
      color: 'bg-red-600',
      icon: Zap,
      action: () => {
        window.open('https://omg10.com/4/11071002', '_blank');
        handleReward('montage_11071002', 50.00);
      }
    },
    {
      id: 'tele_ad_banner',
      name: 'Telegram Special Offer',
      provider: 'TeleAds',
      reward: 10.00,
      type: 'click',
      color: 'bg-sky-500',
      icon: Globe,
      action: () => {
        handleReward('tele_ad_banner', 10.00);
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => {                
            if (activeAdComponent) {
                setActiveAdComponent(null);
            } else if (onBack) {
                onBack();
            } else {
                window.history.back();
            }
          }}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
        >
          <ArrowRight className="rotate-180 text-slate-600 group-hover:-translate-x-1 transition-transform" size={20} />
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Ads Center</h3>
      </div>

      {activeAdComponent && (
          <div className="bg-black p-4 rounded-3xl">
              {activeAdComponent}
          </div>
      )}
      
      {!activeAdComponent && (
        <>
          {/* Featured Lucky Spin */}
      <Link to="/lucky-spin" className="block bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-200 border border-white/5 group relative overflow-hidden active:scale-95 transition-all">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:rotate-12 transition-transform">
               <Dices size={28} className="text-white animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-lg tracking-tight">Daily Lucky Spin</h4>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Watch ad to unlock spin</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-white text-slate-900 rounded-full flex items-center justify-center">
             <ChevronRight size={20} />
          </div>
        </div>
      </Link>

      {/* Network Banners */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-emerald-500" />
          <h3 className="font-black text-slate-900 tracking-tight text-sm uppercase">Live Ad Network Tasks</h3>
        </div>
        
        <p className="text-xs text-slate-500 font-medium mb-6">
          Watch ads from our global partners and earn instant credits. 
          Rewards are multiplied by your current plan bonus!
        </p>

        <div className="grid gap-3">
          {adTasks.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Active Tasks Available</p>
              <p className="text-slate-300 text-[10px] mt-1 italic">Check back soon for new high-paying sponsor tasks</p>
            </div>
          ) : (
            adTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                   if (task.component) {
                     setActiveAdComponent(task.component(() => {
                       setActiveAdComponent(null);
                       handleReward(task.id, task.reward);
                     }));
                   } else if (task.action) {
                     task.action();
                   }
                }}
                disabled={loading !== null}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                  loading === task.id ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${task.color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
                    <task.icon size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-slate-900 text-sm">{task.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.provider}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-blue-600 font-black text-sm">₦{(task.reward * multiplier).toFixed(2)}</p>
                  <div className="flex items-center gap-1 justify-end">
                     {loading === task.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-blue-600">{countdown}s</span>
                          <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                     ) : (
                        <span className="text-[8px] font-black text-slate-300 uppercase">Start Task</span>
                     )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p className="text-xs font-bold">{message.text}</p>
        </motion.div>
      )}

      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
        <Play size={20} className="text-amber-500 shrink-0" />
        <p className="text-[10px] text-amber-700 font-medium">
          <strong>Tip:</strong> Ads tasks are unlimited! You can keep watching and earning as long as sponsors have inventory. Make sure to stay on the ad page for at least 3 seconds.
        </p>
      </div>
      </>
      )}
    </div>
  );
}

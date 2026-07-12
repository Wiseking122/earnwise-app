import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useCpxSurveys, CpxSurvey } from '../hooks/useCpxSurveys';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Zap, 
  RefreshCcw,
  AlertCircle,
  ExternalLink,
  Camera,
  Info,
  Crown,
  ChevronLeft
} from 'lucide-react';
import { PLANS } from '../constants/plans';
import { getApiUrl } from '../lib/config';

export default function Surveys() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { stats, refresh } = useCpxSurveys();
  const [opening, setOpening] = useState(false);

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;

  const openCpx = async () => {
    if (!user || opening) return;
    try {
      setOpening(true);
      const queryParams = new URLSearchParams({
        user_id: user.uid,
        username: profile?.username || '',
        email: user.email || ''
      });
      const response = await fetch(getApiUrl(`/api/cpx/signed-url?${queryParams.toString()}`));
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to open CPX:', err);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Layout title="Premium Surveys">
      <div className="p-3 sm:p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Hero Section */}
        <div className="text-center space-y-6 py-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-blue-600/20 rounded-[2rem] border border-blue-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(37,99,235,0.2)]"
          >
            <Zap size={40} className="text-blue-400 fill-blue-400" />
          </motion.div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-black text-white italic tracking-tight uppercase">Research Hub</h2>
            <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">
              Earn WiseCoins by completing research surveys. Available surveys depend on your profile and location.
            </p>
          </div>
        </div>

        {/* Main Action Card */}
        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="relative z-10 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stats.available_surveys > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-sm font-display font-black text-white italic">
                    {stats.loading ? 'Syncing...' : (stats.available_surveys > 0 ? 'Surveys Ready' : 'Searching...')}
                  </span>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Multiplier</p>
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-sm font-display font-black text-amber-400 italic">
                    {multiplier}x Active
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={openCpx}
                disabled={opening}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-[0.98]"
              >
                {opening ? (
                  <RefreshCcw size={20} className="animate-spin" />
                ) : (
                  <>
                    <ExternalLink size={20} />
                    Start Surveys
                  </>
                )}
              </button>

              {stats.available_surveys === 0 && !stats.loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl"
                >
                  <AlertCircle size={14} className="text-orange-500" />
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-tight">
                    No surveys available right now. Please check again later.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => navigate('/submit-survey')}
            className="group bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 p-5 rounded-2xl transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                <Camera size={24} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-display font-black text-white uppercase italic tracking-tight">Manual Proof</h4>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Upload completion screenshot</p>
              </div>
            </div>
            <div className="text-slate-600 group-hover:text-white transition-colors">
              <ChevronLeft size={20} className="rotate-180" />
            </div>
          </button>

          <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                Important: Make sure to provide honest answers during surveys. Inconsistent profiles may result in fewer available opportunities. Most surveys credit within 15 minutes.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={refresh}
          disabled={stats.loading}
          className="flex items-center gap-2 mx-auto text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCcw size={12} className={stats.loading ? 'animate-spin' : ''} />
          Refresh Availability
        </button>
      </div>
    </Layout>
  );
}

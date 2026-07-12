import React from 'react';
import { useCpxSurveys } from '../hooks/useCpxSurveys';
import { useAuth } from '../context/AuthContext';
import { PLANS } from '../constants/plans';
import { motion } from 'motion/react';
import { ClipboardCheck, Zap, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const CpxDashboardCard: React.FC = () => {
  const { profile } = useAuth();
  const { stats } = useCpxSurveys();

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;

  if (stats.loading && stats.available_surveys === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 animate-pulse shadow-sm h-48" />
    );
  }

  // If no surveys available, we could hide or show a generic message
  // But usually there are always some or we want to encourage users to check
  
  return (
    <Link to="/surveys" className="block group">
      <motion.div 
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl transition-all"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">New Surveys Live</span>
              </div>
              <h3 className="text-2xl font-display font-black text-white italic tracking-tight uppercase">Research Hub</h3>
            </div>
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
              <ClipboardCheck size={24} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                <Clock size={12} />
                <span className="text-[8px] font-bold uppercase tracking-widest">Avg Time</span>
              </div>
              <p className="text-lg font-display font-black text-white italic">{stats.avg_loi || 12} MINS</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                <TrendingUp size={12} />
                <span className="text-[8px] font-bold uppercase tracking-widest">Earn up to</span>
              </div>
              <p className="text-lg font-display font-black text-emerald-400 italic">{(stats.max_payout * multiplier).toLocaleString()} WC</p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center">
                    <Zap size={10} className="text-orange-500 fill-orange-500" />
                  </div>
                ))}
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {stats.available_surveys}+ Opportunities
              </span>
            </div>
            
            <div className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
              Start Earning <ChevronRight size={14} className="stroke-[3px]" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default CpxDashboardCard;

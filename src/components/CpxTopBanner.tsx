import React, { useState, useEffect } from 'react';
import { useCpxSurveys } from '../hooks/useCpxSurveys';
import { useAuth } from '../context/AuthContext';
import { PLANS } from '../constants/plans';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { safeStorage } from '../lib/storage';
import { getApiUrl } from '../lib/config';

const CpxTopBanner: React.FC = () => {
  const { user, profile } = useAuth();
  const { stats } = useCpxSurveys();
  const [isVisible, setIsVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const location = useLocation();

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;

  useEffect(() => {
    if (!user || !profile || stats.loading) return;

    // Show banner only if there are surveys and user hasn't dismissed it in this session
    const hasDismissed = safeStorage.getItem(`dismissed_cpx_banner_${user.uid}`);
    
    // Also don't show on the surveys page itself
    const isNotOnSurveyPage = location.pathname !== '/surveys';

    if (stats.available_surveys > 0 && !hasDismissed && isNotOnSurveyPage) {
      // Small delay for entrance
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [stats.available_surveys, stats.loading, user, profile, location.pathname]);

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    if (user) {
      safeStorage.setItem(`dismissed_cpx_banner_${user.uid}`, 'true');
    }
  };

  const openCpx = async (e: React.MouseEvent) => {
    e.preventDefault();
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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-blue-600 relative overflow-hidden"
        >
          <div onClick={openCpx} className="block px-4 py-2.5 sm:py-3 cursor-pointer">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-white animate-bounce" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight leading-none mb-1">
                    New High-Paying Surveys!
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-blue-100 uppercase tracking-widest truncate">
                    Earn up to ₦{(stats.max_payout * multiplier).toLocaleString()} today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1 bg-white/15 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/10">
                  Start Now <ChevronRight size={12} />
                </div>
                <button 
                  onClick={dismiss}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CpxTopBanner;

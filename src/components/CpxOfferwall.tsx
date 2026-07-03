import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { ShieldCheck, Info } from 'lucide-react';

interface CpxOfferwallProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

export const CpxOfferwall: React.FC<CpxOfferwallProps> = ({ userId, userName, userEmail }) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    
    async function fetchSignedUrl() {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          user_id: userId,
          username: userName || '',
          email: userEmail || ''
        });
        
        const response = await fetch(getApiUrl(`/api/cpx/signed-url?${queryParams.toString()}`));
        if (!response.ok) {
          throw new Error('Failed to fetch signed URL');
        }
        const data = await response.json();
        if (active && data.url) {
          setSignedUrl(data.url);
        }
      } catch (err) {
        console.error("Error loading CPX signed URL:", err);
        // Fallback to unsigned URL if backend has issues or config is blank
        const appId = '33341';
        const fallbackUrl = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${userId}&username=${encodeURIComponent(userName || '')}&email=${encodeURIComponent(userEmail || '')}&subid_1=&subid_2=`;
        if (active) {
          setSignedUrl(fallbackUrl);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (userId) {
      fetchSignedUrl();
    }
    
    return () => {
      active = false;
    };
  }, [userId, userName, userEmail]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-950 p-4 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-slate-900 shadow-2xl relative overflow-hidden group min-h-[500px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        
        <div className="relative z-10 text-center space-y-6 pt-6 sm:pt-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 backdrop-blur-3xl rounded-xl sm:rounded-[2rem] border border-white/10 flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-700">
               <ShieldCheck size={28} className="text-orange-500 fill-orange-500/20 sm:w-8 sm:h-8" />
            </div>
            
            <div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-white uppercase italic tracking-tighter">Premium Global Surveys</h3>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">
                Unlock high-paying international research tasks. Up to ₦100 per completion.
              </p>
            </div>

            {loading ? (
              <div className="mt-8 rounded-3xl overflow-hidden min-h-[400px] flex flex-col items-center justify-center py-20 space-y-4">
                <div className="flex gap-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                   ))}
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Synchronizing Earning Tunnels...</p>
              </div>
            ) : signedUrl ? (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-left space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <Info size={14} className="shrink-0" />
                    <span>Survey Instruction & Reward Policy</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-medium">
                    You MUST stay on the page and completely finish the survey until the final thank-you/success screen. Do not close the window, click back, or navigate away early, otherwise the partner network will not report your completion, and you will receive <span className="text-amber-400 font-bold">₦0 rewards</span>. Double check your answers for honesty to qualify for continuous high-paying payouts.
                  </p>
                </div>

                <div className="py-12 px-6 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <ShieldCheck className="text-blue-500" size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-white font-black text-xl uppercase tracking-tight">Earning Portal Ready</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">Click the button below to launch the survey environment in a new tab.</p>
                  </div>
                  
                  <button 
                    onClick={() => window.open(signedUrl, '_blank')}
                    className="w-full sm:w-auto px-12 py-5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl shadow-[0_20px_50px_rgba(234,88,12,0.3)] transition-all active:scale-[0.98] uppercase italic tracking-tighter text-lg"
                  >
                    Launch Survey Portal
                  </button>
                  
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                    Secure Verified Connection
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12">
                <p className="text-rose-500 text-xs sm:text-sm font-black uppercase tracking-widest">Failed to load survey offerwall. Please refresh.</p>
              </div>
            )}

            <div className="flex items-center gap-2 justify-center py-3 px-4 sm:py-4 sm:px-6 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
               <Info size={12} className="text-slate-500 shrink-0" />
               <p className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-left sm:text-center">Partner research provided by CPX Research Network</p>
            </div>
        </div>
      </div>
    </div>
  );
};

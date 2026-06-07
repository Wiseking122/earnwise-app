import React, { useEffect } from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface CpxOfferwallProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

export const CpxOfferwall: React.FC<CpxOfferwallProps> = ({ userId, userName, userEmail }) => {
  useEffect(() => {
    if (document.getElementById('cpx-script')) return;

    const script = document.createElement('script');
    script.id = 'cpx-script';
    script.src = 'https://wasabi-cpx.s3.eu-central-1.amazonaws.com/sdk.js';
    script.defer = true;
    
    (window as any).config = {
      appId: 21696,
      extUserId: userId,
      email: userEmail,
      username: userName,
      onSurveysAvailable: (count: number) => {
        window.dispatchEvent(new CustomEvent('cpx-surveys-available', { detail: { count } }));
      }
    };

    document.body.appendChild(script);

    return () => {};
  }, [userId, userName, userEmail]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-950 p-8 rounded-[3rem] border border-slate-900 shadow-2xl relative overflow-hidden group min-h-[500px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        
        <div className="relative z-10 text-center space-y-6 pt-12">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/10 flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-700">
               <ShieldCheck size={32} className="text-orange-500 fill-orange-500/20" />
            </div>
            
            <div>
              <h3 className="font-display font-black text-3xl text-white uppercase italic tracking-tighter">Premium Global Surveys</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">
                Unlock high-paying international research tasks. Up to ₦2,500 per completion.
              </p>
            </div>

            <div id="cpx-research-wall" className="mt-8 rounded-3xl overflow-hidden min-h-[400px]">
               <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="flex gap-2">
                     {[1,2,3].map(i => (
                       <div key={i} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                     ))}
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Synchronizing Earning Tunnels...</p>
               </div>
            </div>

            <div className="flex items-center gap-2 justify-center py-4 px-6 bg-white/5 rounded-2xl border border-white/10">
               <Info size={14} className="text-slate-500" />
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Partner research provided by CPX Research Network</p>
            </div>
        </div>
      </div>
    </div>
  );
};

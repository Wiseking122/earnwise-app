import React from 'react';
import { ExternalLink, CheckCircle, TrendingUp, ShieldCheck, HelpCircle } from 'lucide-react';

interface AoycoOfferwallProps {
  userId: string;
}

export const AoycoOfferwall: React.FC<AoycoOfferwallProps> = ({ userId }) => {
  const handleLaunch = () => {
    if (!userId) return;
    const cleanUserId = userId.trim();
    const url = `https://aoyco.in/offerwall/vgAcytKC1yRiJVryQmcP3Ww8aMJ4AIlP/${encodeURIComponent(cleanUserId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!userId) {
    return (
      <div className="bg-slate-900/50 border border-red-500/20 rounded-[2rem] p-8 text-center">
        <h3 className="text-lg font-bold text-white">Authentication Required</h3>
        <p className="text-slate-400 text-sm">Please log in to your account to open premium tasks.</p>
      </div>
    );
  }

  return (
    <div 
      onClick={handleLaunch}
      className="group relative w-full overflow-hidden rounded-[2.5rem] border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl transition-all duration-300 hover:border-emerald-400 hover:shadow-emerald-950/20 hover:shadow-2xl cursor-pointer"
    >
      {/* Decorative Glow Effects */}
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/20" />
      <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-emerald-500/5 blur-3xl" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 transition-transform duration-500 group-hover:scale-110">
            <TrendingUp size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Premium Partner
              </span>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
                10x Multiplier
              </span>
            </div>
            <h3 className="mt-1 font-display text-2xl font-black italic tracking-tight text-white uppercase sm:text-3xl">
              AOYCO High-Yield Tasks
            </h3>
          </div>
        </div>

        <div>
          <button 
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-display text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:bg-emerald-400 hover:shadow-emerald-500/35 group-hover:translate-x-1"
          >
            Launch Wall
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Instructions & Guidelines */}
      <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-800/60">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle size={16} />
            <span className="text-xs font-black uppercase tracking-wider">1. Select an Offer</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Click to launch the AOYCO offerwall, browse hundreds of high-paying micro-jobs, app installs, and surveys.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-800/60">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <ShieldCheck size={16} />
            <span className="text-xs font-black uppercase tracking-wider">2. Complete & Verify</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Follow guidelines carefully, pass verification checks, and complete the tasks fully to unlock rewards.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-800/60">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <HelpCircle size={16} />
            <span className="text-xs font-black uppercase tracking-wider">3. Submit Proof</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Take a screenshot of completed actions and submit them below inside the "Submit Survey / Offer Proof" portal!
          </p>
        </div>
      </div>

      {/* Warning/Tips strip */}
      <div className="relative z-10 mt-5 flex items-center gap-2 rounded-xl bg-slate-900/40 border border-slate-800/50 px-4 py-2.5 text-[11px] text-slate-400">
        <span className="font-bold text-amber-500">💡 Important Tip:</span>
        <span>AdBlockers or VPNs can cause verification failures or "Session expired" issues. Please disable them before starting.</span>
      </div>
    </div>
  );
};

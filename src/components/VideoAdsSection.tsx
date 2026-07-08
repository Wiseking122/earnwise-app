import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, Loader2, ExternalLink, Flame, Layers, AlertCircle } from 'lucide-react';

interface VideoAdsSectionProps {
  userId?: string;
}

export default function VideoAdsSection({ userId = '' }: VideoAdsSectionProps) {
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  useEffect(() => {
    console.log(`[QuartzFiles] Initializing Offer Locker for User ID: "${userId}"`);
    
    // Set the global lock flag to false as required by the script
    const win = window as any;
    win.lck = false;

    // Create the script element with the specific user ID tracking
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://quartzfiles.com/script_include.php?id=1903903&tracking_id=${encodeURIComponent(userId)}`;
    script.async = true;
    script.id = 'quartz-locker-script';
    
    script.onload = () => {
      console.log("[QuartzFiles] Offer Locker script loaded successfully. win.lck status:", win.lck);
      setScriptLoaded(true);
    };

    script.onerror = (err) => {
      console.error("[QuartzFiles] Failed to load Offer Locker script (possibly blocked by Adblocker):", err);
    };

    document.body.appendChild(script);

    // Timeout check to verify if the locker was blocked / lck is still false (Standard Adblock detection)
    const checkTimeout = setTimeout(() => {
      if (!win.lck) {
        console.warn("[QuartzFiles] Adblock or script block detected! (win.lck is false)");
        setIsBlocked(true);

        // Safeguard to prevent locking developers out of local development or the AI Studio preview environment
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
        const isAiStudio = window.location.hostname.includes('run.app') || window.location.hostname.includes('aistudio');

        if (!isLocalhost && !isAiStudio) {
          console.log("[QuartzFiles] Redirecting to helper page...");
          try {
            win.top.location = 'https://quartzfiles.com/help/ablk.php?lkt=4';
          } catch (e) {
            win.location.href = 'https://quartzfiles.com/help/ablk.php?lkt=4';
          }
        } else {
          console.log("[QuartzFiles] Redirection bypassed on Development/AI Studio host to allow seamless developer testing.");
        }
      } else {
        console.log("[QuartzFiles] Verification succeeded: win.lck is true.");
      }
    }, 2500);

    return () => {
      console.log("[QuartzFiles] Cleaning up Offer Locker script and timeout.");
      clearTimeout(checkTimeout);
      const existingScript = document.getElementById('quartz-locker-script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [userId]);

  const handleLaunchLocker = () => {
    console.log("[QuartzFiles] Opening direct standalone offer wall...");
    const url = `/api/quartz-offerwall?userId=${encodeURIComponent(userId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 relative z-10" id="offerwall-section">
      {/* Top Banner Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-slate-950 text-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-900 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)' }} />
        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400 animate-pulse" />
              PREMIUM SPONSOR
            </span>
            <h2 className="text-xl font-display font-black uppercase tracking-tight italic">
              Premium Offer Wall
            </h2>
            <p className="text-slate-400 text-xs">
              Complete quick surveys, app downloads, and interactive tasks to unlock premium rewards.
            </p>
          </div>
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Layers size={24} className="animate-pulse" />
          </div>
        </div>
      </motion.div>

      {/* Main Empty Interactive Area with Script Locker Display */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 text-center shadow-sm relative overflow-hidden"
      >
        {/* Background decorative pattern */}
        <div className="absolute -top-10 -left-10 opacity-5">
          <Flame className="w-32 h-32 text-amber-500 rotate-12" />
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* Visual Status Indicator */}
          <div className="flex items-center justify-center gap-2 mx-auto px-4 py-1.5 bg-slate-100 rounded-full w-fit border border-slate-200">
            {scriptLoaded ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Locker System Active</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Connecting Securely...</span>
              </>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-black text-2xl text-slate-900 uppercase italic tracking-tight">
              Premium Offer Locker
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Our advanced premium offers locker matches high-paying campaign tasks to your region. Complete any simple task to unlock and receive instant wallet coins.
            </p>
          </div>

          {/* AdBlock Detected Banner */}
          {isBlocked && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs text-left flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-800 mb-0.5">⚠️ AdBlocker Detected</span>
                Our security verification system noticed that scripts are being blocked. Please disable AdBlocker to view offers correctly and ensure reward tracking works.
              </div>
            </div>
          )}

          {/* Action button to trigger/re-launch locker */}
          <div className="pt-2">
            <button
              onClick={handleLaunchLocker}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-display font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <ExternalLink className="w-4 h-4" />
              Access Offer Wall
            </button>
          </div>
        </div>
      </motion.div>

      {/* Security Guidance Note */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex gap-3 text-left">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[10px] text-slate-700 block uppercase tracking-wider">🔒 Auto-Credit Protection</span>
          <p className="text-[9px] text-slate-500 uppercase tracking-wide leading-relaxed mt-0.5">
            Do not refresh the browser or disconnect your internet during offer completion. Our verified postback script is encrypted and automatically synchronizes with your wallet balance once completed.
          </p>
        </div>
      </div>
    </div>
  );
}

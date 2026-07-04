import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, ShieldCheck, ChevronRight, Loader2, Award } from 'lucide-react';

interface CpxOfferwallProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

export const CpxOfferwall: React.FC<CpxOfferwallProps> = ({ userId, userName, userEmail }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

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

    fetchSignedUrl();
    
    return () => {
      active = false;
    };
  }, [isOpen, userId, userName, userEmail]);

  return (
    <>
      {/* Dashboard Card matching other Offerwalls */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full relative overflow-hidden group flex items-center p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm text-left transition-all hover:shadow-md hover:border-orange-200"
      >
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg relative overflow-hidden">
          <ShieldCheck className="w-6 h-6 relative z-10" />
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
        
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-slate-900 leading-tight">⭐ CPX Premium Surveys</h3>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-tighter">High Yield</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">Unlock international research tasks • High payouts</p>
        </div>

        <div className="ml-2 p-2 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
        </div>

        {/* Background Decorative Element */}
        <div className="absolute top-1 right-8 opacity-10 group-hover:opacity-30 transition-opacity">
          <Award className="w-12 h-12 text-blue-500 rotate-12" />
        </div>
      </motion.button>

      {/* Fullscreen Iframe Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md p-4 md:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-display font-bold text-lg leading-none">CPX Research Surveys</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verified Global Connection</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                aria-label="Close Wall"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Connecting to Research Hub...</p>
                </div>
              ) : signedUrl ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-none"
                  title="CPX Research Survey Wall"
                  allow="geolocation"
                />
              ) : (
                <div className="p-6 text-center">
                  <p className="text-rose-500 font-bold">Failed to load surveys. Please try again.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <ExternalLink className="w-3 h-3" />
              UID: {userId?.substring(0, 8)}... • Encrypted Secure Tunnel
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Rocket, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';

export const RapidoReachWall: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [wallUrl, setWallUrl] = useState<string>('');
  const [finalUid, setFinalUid] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !profile?.uid) return;

    let active = true;
    async function loadSignedUrl() {
      try {
        setLoading(true);
        const url = getApiUrl(`/api/rapidoreach/signed-url?user_id=${encodeURIComponent(profile.uid)}`);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch signed RapidoReach URL');
        }
        const data = await res.json();
        if (active) {
          setWallUrl(data.url);
          setFinalUid(data.uid);
        }
      } catch (err) {
        console.error("Error loading signed RapidoReach URL:", err);
        // Fallback to unsigned structure in case of server failure
        const appId = 'iG8MJfAgkZI';
        const fallbackUrl = `https://www.rapidoreach.com/ofw/?userid=${profile.uid}&userId=${profile.uid}`;
        if (active) {
          setWallUrl(fallbackUrl);
          setFinalUid(profile.uid);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSignedUrl();

    return () => {
      active = false;
    };
  }, [isOpen, profile?.uid]);

  return (
    <>
      {/* Dashboard Card */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full relative overflow-hidden group flex items-center p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm text-left transition-all hover:shadow-md hover:border-orange-200"
      >
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg relative overflow-hidden">
          <Rocket className="w-6 h-6 relative z-10" />
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
        
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-slate-900 leading-tight">🚀 RapidoReach High-Yield</h3>
            <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[8px] font-black uppercase tracking-tighter">Hot</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">Instant survey matching • Premium rewards</p>
        </div>

        <div className="ml-2 p-2 bg-slate-50 rounded-full group-hover:bg-orange-50 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500" />
        </div>

        {/* Background Sparkles */}
        <div className="absolute top-1 right-8 opacity-10 group-hover:opacity-30 transition-opacity">
          <Zap className="w-12 h-12 text-orange-500 rotate-12" />
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
                <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
                  <Rocket className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-display font-bold text-lg leading-none">RapidoReach Surveys</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Secure Premium Connection</p>
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
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Generating Secure Survey Signature...</p>
                </div>
              ) : (
                <iframe
                  src={wallUrl}
                  className="w-full h-full border-none"
                  title="RapidoReach Survey Wall"
                  allow="geolocation"
                />
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <ExternalLink className="w-3 h-3" />
              UID: {finalUid || profile?.uid || 'GUEST_SESSION'} • Data encrypted via SSL
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

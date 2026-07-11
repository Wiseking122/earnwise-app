import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../lib/config';

interface CpxOfferwallProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

export const CpxOfferwall: React.FC<CpxOfferwallProps> = ({ userId, userName, userEmail }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          user_id: userId,
          username: userName || '',
          email: userEmail || '',
        });

        const res = await fetch(getApiUrl(`/api/cpx/signed-url?${queryParams.toString()}`));
        if (!res.ok) {
          throw new Error('Failed to generate secure survey path.');
        }

        const data = await res.json();
        if (isMounted) {
          if (data.url) {
            setUrl(data.url);
          } else {
            throw new Error('Survey wall link was not generated.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred while loading surveys.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [userId, userName, userEmail]);

  if (!userId) {
    return (
      <div className="bg-slate-900/50 border border-red-500/20 rounded-[2rem] p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <h3 className="text-lg font-bold text-white">Authentication Required</h3>
        <p className="text-slate-400 text-sm">Please log in to your account to view surveys.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
      {/* Aesthetic Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.7)]" />
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Global Survey Partner</span>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">CPX Research Surveys</h4>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black rounded-full uppercase tracking-wider">
            HIGH PAYING
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative min-h-[600px] w-full bg-[#1e293b]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
            <h3 className="text-lg font-bold text-white">Generating Secure Session</h3>
            <p className="text-slate-400 text-sm max-w-xs text-center mt-1">
              Connecting to CPX Survey Router. Please wait...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 z-20 text-center">
            <AlertCircle className="text-red-500 mb-2 animate-bounce" size={40} />
            <h3 className="text-lg font-bold text-white">Connection Interrupted</h3>
            <p className="text-red-400/80 text-sm max-w-md mt-1">{error}</p>
          </div>
        )}

        {url && (
          <iframe
            title="CPX Research surveys"
            src={url}
            className="w-full h-[600px] border-none bg-slate-900 relative z-10 block"
            allow="geolocation"
            style={{ display: 'block', width: '100%', height: '600px', border: 'none' }}
          />
        )}
      </div>
    </div>
  );
};

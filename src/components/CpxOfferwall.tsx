import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

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
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cpx/signed-url?user_id=${userId}&username=${userName || ''}&email=${userEmail || ''}`);
        if (!response.ok) throw new Error('Failed to load survey configuration');
        const data = await response.json();
        setUrl(data.url);
      } catch (err: any) {
        console.error('CPX URL load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSignedUrl();
    }
  }, [userId, userName, userEmail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2.5rem] border border-slate-100 min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-slate-500 font-bold">Loading exclusive surveys...</p>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-[2.5rem] border border-red-100">
        <p className="text-red-500 font-bold">Failed to load surveys.</p>
        <p className="text-red-400 text-xs mt-2">Please try again later or contact support.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-display font-black text-slate-800 text-sm">CPX Research Surveys</h3>
        <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">High Payout</span>
      </div>
      <iframe 
        src={url}
        width="100%" 
        height="800px" 
        className="w-full border-0"
        title="CPX Research Surveys"
      />
    </div>
  );
};

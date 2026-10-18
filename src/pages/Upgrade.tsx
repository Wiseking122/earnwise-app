import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (!params.has('tab')) {
      params.set('tab', 'upgrade');
    }
    navigate(`/profile?${params.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-3" />
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
        Redirecting to Profile Upgrade...
      </p>
    </div>
  );
}

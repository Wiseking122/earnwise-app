import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export function CpxSurveyWall() {
  const { user, profile } = useAuth();
  const [appId, setAppId] = useState<number | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRes = await fetch('/api/config/public');
        const configData = await configRes.json();
        setAppId(parseInt(configData.cpxAppId) || 33341);
      } catch (err) {
        setAppId(33341);
      }
    };
    fetchConfig();
  }, []);

  if (!user || !appId) return <div className="text-center p-8">Loading Surveys...</div>;

  const email = user.email || '';
  const username = profile?.username || 'User';
  const ext_user_id = user.uid;
  const url = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${ext_user_id}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`;

  return (
    <div className="space-y-6">
      <iframe 
        src={url} 
        className="w-full h-[800px] rounded-[2rem] border-0"
        title="CPX Research Survey Wall"
      />
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 text-center space-y-4">
        <p className="text-sm font-bold text-slate-300">Completed a survey and didn't receive your reward?</p>
        <Link 
          to="/submit-proof?offerId=cpx_survey&title=CPX+Research+Survey&payout=0" 
          className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl transition-all"
        >
          Submit Survey Proof
        </Link>
      </div>
    </div>
  );
}

import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../lib/config';

export interface CpxSurvey {
  id: string;
  payout_usd: number;
  payout_local: number;
  loi: number; // length of interview in minutes
  stars: number;
  category: string;
}

export interface CpxStats {
  available_surveys: number;
  max_payout: number;
  avg_loi: number;
  loading: boolean;
  error: string | null;
}

const CPX_APP_ID = '33341';

export function useCpxSurveys() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<CpxStats>({
    available_surveys: 0,
    max_payout: 0,
    avg_loi: 0,
    loading: true,
    error: null,
  });
  const [surveys, setSurveys] = useState<CpxSurvey[]>([]);

  const fetchSurveys = useCallback(async () => {
    if (!user || !profile) return;

    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      // Use our server-side proxy to bypass CORS and handle hashing
      const url = getApiUrl(`/api/cpx/surveys?user_id=${user.uid}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.status === 'success') {
        const cpxSurveys: CpxSurvey[] = Array.isArray(data.surveys) ? data.surveys.map((s: any) => ({
          id: String(s.id || s.survey_id),
          payout_usd: parseFloat(s.payout_usd || 0),
          payout_local: parseFloat(s.payout_local) || 0,
          loi: parseInt(s.loi || 0),
          stars: parseInt(s.stars || 0),
          category: s.category || 'General'
        })) : [];

        setSurveys(cpxSurveys);
        
        setStats({
          available_surveys: data.available_surveys ?? cpxSurveys.length,
          max_payout: data.max_payout ?? (cpxSurveys.length > 0 ? Math.max(...cpxSurveys.map(s => s.payout_local)) : 0),
          avg_loi: data.avg_loi ?? (cpxSurveys.length > 0 ? Math.round(cpxSurveys.reduce((acc, s) => acc + s.loi, 0) / cpxSurveys.length) : 0),
          loading: false,
          error: null,
        });
      } else if (data && data.status === 'error') {
        setStats({
          available_surveys: 0,
          max_payout: 0,
          avg_loi: 0,
          loading: false,
          error: data.message || 'Survey network is busy',
        });
      } else {
        setStats({
          available_surveys: 0,
          max_payout: 0,
          avg_loi: 0,
          loading: false,
          error: null,
        });
      }
    } catch (err: any) {
      console.error('[CPX-API] Error:', err);
      setStats(prev => ({ ...prev, loading: false, error: 'Connecting to survey network...' }));
    }
  }, [user, profile]);

  useEffect(() => {
    fetchSurveys();
    // Poll every 5 minutes to keep stats fresh, or every 30 seconds if there's an error
    const pollTime = stats.error ? 30 * 1000 : 5 * 60 * 1000;
    const interval = setInterval(fetchSurveys, pollTime);
    return () => clearInterval(interval);
  }, [fetchSurveys, stats.error]);

  return { surveys, stats, refresh: fetchSurveys };
}

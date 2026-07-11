import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, AlertCircle, Smartphone, Globe, RefreshCw, CheckCircle, ExternalLink, ShieldCheck, Clock, Lock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { PLANS } from '../constants/plans';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';

interface OGAdsOffer {
  id: string;
  title: string;
  description: string;
  adcopy: string;
  payout: number;
  imageUrl: string;
  link: string;
  countries: string[];
  devices: string[];
  category: string;
}

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '').trim();
};

export default function Offers() {
  const { user, profile } = useAuth();
  const [offers, setOffers] = useState<OGAdsOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<OGAdsOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'iphone' | 'ipad' | 'android'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [submittedOfferIds, setSubmittedOfferIds] = useState<Set<string>>(new Set());
  const [clickedOffers, setClickedOffers] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('clicked_offers') || '{}');
    } catch {
      return {};
    }
  });

  // WiseCoin Conversion Rate state (configurable via platform settings)
  const [ogadsConversionRate, setOgadsConversionRate] = useState<number>(1000);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'platform'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.ogadsConversionRate !== undefined) {
          setOgadsConversionRate(Number(data.ogadsConversionRate));
        }
      }
    });
    return () => unsub();
  }, []);

  const [isRenewalRequired, setIsRenewalRequired] = useState(true);
  const [showRestriction, setShowRestriction] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'payouts'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isRenewalRequired !== undefined) {
          setIsRenewalRequired(!!data.isRenewalRequired);
        }
      }
    });
    return () => unsub();
  }, []);

  const isPlanExpired = useMemo(() => {
    if (!profile?.planEndDate || profile?.plan === 'free' || profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com') return false;
    const end = profile.planEndDate.toDate ? profile.planEndDate.toDate() : new Date(profile.planEndDate);
    return new Date() > end;
  }, [profile?.planEndDate, profile?.plan, profile?.role, user?.email]);

  const isUserFree = useMemo(() => {
    const baseFree = profile?.plan === 'free' && profile?.role !== 'admin' && user?.email !== 'wiseking7890@gmail.com';
    if (baseFree) return true;
    if (isRenewalRequired && isPlanExpired) return true;
    return false;
  }, [profile?.plan, profile?.role, user?.email, isRenewalRequired, isPlanExpired]);

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;
  
  // Real-time listener for current user's submissions to update locks immediately
  useEffect(() => {
    if (!user?.uid) {
      setSubmittedOfferIds(new Set());
      return;
    }

    const now = new Date();
    // WAT is UTC+1. Get current WAT milliseconds
    const watMs = now.getTime() + (1 * 60 * 60 * 1000);
    const watDate = new Date(watMs);
    const watYear = watDate.getUTCFullYear();
    const watMonthNum = watDate.getUTCMonth();
    const watDayNum = watDate.getUTCDate();
    const currentCompletedDateStr = `${watYear}-${String(watMonthNum + 1).padStart(2, '0')}-${String(watDayNum).padStart(2, '0')}`;
    const watMidnightInUTC = Date.UTC(watYear, watMonthNum, watDayNum, 0, 0, 0, 0);
    const startOfDayTime = watMidnightInUTC - (1 * 60 * 60 * 1000);

    // 1. Instantly read from localStorage for true zero-latency local fallback
    const initialIds = new Set<string>();
    try {
      const localCompletedKey = `completed_offers_${user.uid}`;
      const localCompletedObj = JSON.parse(localStorage.getItem(localCompletedKey) || '{}');
      Object.entries(localCompletedObj).forEach(([id, val]) => {
        const normalizedId = String(id).trim().toLowerCase();
        if (typeof val === 'string' && val.includes('-') && val.length < 11) {
          // It's the old YYYY-MM-DD format
          if (val === currentCompletedDateStr) {
            initialIds.add(normalizedId);
          }
        } else {
          // It's the new ISO string or epoch
          const unlockTime = new Date(val as string).getTime();
          if (Date.now() < unlockTime) {
            initialIds.add(normalizedId);
          }
        }
      });
    } catch (e) {
      console.error("Local storage initialization error", e);
    }
    setSubmittedOfferIds(initialIds);

    // 2. Establish standard Firestore real-time updates and merge them
    const q = query(
      collection(db, 'offer_submissions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set<string>(initialIds);

      snapshot.forEach((doc) => {
        const data = doc.data();
        let isToday = false;

        const unlockField = data.unlockAt || data.unlock_at;
        if (unlockField) {
          let unlockDate: Date | null = null;
          if (typeof unlockField.toDate === 'function') {
            unlockDate = unlockField.toDate();
          } else if (unlockField.seconds !== undefined) {
            unlockDate = new Date(unlockField.seconds * 1000);
          } else if (unlockField._seconds !== undefined) {
            unlockDate = new Date(unlockField._seconds * 1000);
          } else {
            unlockDate = new Date(unlockField);
          }
          if (unlockDate && !isNaN(unlockDate.getTime())) {
            const isLockedByTime = unlockDate.getTime() > Date.now();
            const isTodayByDate = data.completed_date === currentCompletedDateStr;
            isToday = isLockedByTime || isTodayByDate;
          }
        } else if (data.completed_date) {
          isToday = data.completed_date === currentCompletedDateStr;
        } else {
          let submittedDate: Date | null = null;
          const subField = data.submittedAt || data.submitted_at;
          if (subField) {
            if (typeof subField.toDate === 'function') {
              submittedDate = subField.toDate();
            } else if (subField.seconds !== undefined) {
              submittedDate = new Date(subField.seconds * 1000);
            } else if (subField._seconds !== undefined) {
              submittedDate = new Date(subField._seconds * 1000);
            } else {
              submittedDate = new Date(subField);
            }
          }
          if (submittedDate && !isNaN(submittedDate.getTime()) && submittedDate.getTime() >= startOfDayTime) {
            isToday = true;
          }
        }

        const oid = data.offerId || data.offer_id;
        if (isToday && oid) {
          ids.add(String(oid).trim().toLowerCase());
        }
      });

      setSubmittedOfferIds(ids);
    }, (err) => {
      console.error("Realtime submissions listener error", err);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const fetchOffersAndSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch OGAds Offers
      const queryParams = new URLSearchParams();
      if (deviceFilter !== 'all') {
        queryParams.append('device', deviceFilter);
      }
      if (countryFilter) {
        queryParams.append('country', countryFilter);
      }

      const res = await fetch(getApiUrl(`/api/offers?${queryParams.toString()}`));
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP Error ${res.status}`);
      }

      setOffers(data.offers || []);
    } catch (err: any) {
      console.error('Error fetching offers:', err);
      setError(err.message || 'Failed to load offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersAndSubmissions();
  }, [deviceFilter, countryFilter]);

  useEffect(() => {
    let result = [...offers];
    if (searchQuery) {
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredOffers(result);
  }, [offers, searchQuery]);

  return (
    <Layout title="Premium Offers">
      <div className="p-3 sm:p-5 pb-24 space-y-5 sm:space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/15 text-xs font-black uppercase tracking-widest">
            <Sparkles size={12} className="animate-pulse" />
            Earn WiseCoins (WC)
          </div>
          <h2 className="text-3xl font-display font-black text-white uppercase italic tracking-tight">
            Premium Task Wall
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Complete tasks once per day and earn WiseCoins.
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-[2rem] p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search premium offers..."
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-3 pl-11 pr-5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              Filter by Device
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['all', 'iphone', 'ipad', 'android'] as const).map((device) => (
                <button
                  key={device}
                  onClick={() => setDeviceFilter(device)}
                  className={`py-2 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all border ${
                    deviceFilter === device
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-950/40 text-slate-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  {device === 'all' ? 'All' : device}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={`skeleton-${i}`} className="h-32 bg-slate-900/40 border border-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl text-center space-y-3">
              <AlertCircle size={32} className="mx-auto text-red-500" />
              <p className="text-sm font-bold uppercase tracking-wide">{error}</p>
              <button onClick={fetchOffersAndSubmissions} className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-600 transition">
                <RefreshCw size={14} /> Retry Loading
              </button>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="bg-slate-900/20 border border-white/5 rounded-[3rem] text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-slate-900/50 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                <Smartphone size={28} className="text-slate-500" />
              </div>
              <h3 className="font-display font-black text-white text-xl uppercase tracking-tight italic">No Compatible Offers</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider max-w-sm mx-auto">Check back shortly for fresh matches.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredOffers.map((offer) => {
                let wcPayout = Math.round(offer.payout * ogadsConversionRate * multiplier);
                if (offer.payout > 0 && wcPayout === 0) {
                  wcPayout = 1;
                }
                const isSubmittedToday = submittedOfferIds.has(String(offer.id).trim().toLowerCase());

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-slate-900/40 border border-white/5 rounded-3xl p-5 transition-all duration-300 space-y-4 group ${isSubmittedToday ? 'opacity-75 grayscale-[0.5]' : 'hover:bg-slate-900/60 hover:border-blue-500/20'}`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-950 border border-white/5 relative">
                        <img
                          src={offer.imageUrl}
                          alt={offer.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80';
                          }}
                        />
                        {isSubmittedToday && (
                          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                            <CheckCircle className="text-emerald-500" size={32} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1 pt-1 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display font-black text-white text-lg leading-tight uppercase italic group-hover:text-blue-400 transition-colors truncate">
                            {offer.title}
                          </h4>
                          {isSubmittedToday && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                              Submitted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                          <Globe size={10} />
                          {offer.countries.length > 0 ? offer.countries.join(', ') : 'Global'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Description:</p>
                        <p className="text-slate-300 text-xs leading-relaxed">{stripHtml(offer.description) || "No description available."}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">What you need to do:</p>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {stripHtml(offer.adcopy) || stripHtml(offer.description) || "Please click Earn Now to view the advertiser's requirements."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Reward:</p>
                        {isUserFree ? (
                          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20 w-fit">
                            <Lock size={10} className="stroke-[3px]" />
                            <span className="text-[9px] font-black uppercase tracking-tight">LOCKED</span>
                          </div>
                        ) : (
                          <p className="font-display font-black text-white text-lg tracking-tight italic">
                            {wcPayout} WC
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Device:</p>
                        <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">{offer.devices.join(' / ')}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      {isUserFree ? (
                        <button
                          onClick={() => setShowRestriction(true)}
                          className="w-full bg-slate-950/60 hover:bg-slate-950/80 border border-amber-500/15 hover:border-amber-500/30 text-amber-400 py-3 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition justify-center"
                        >
                          <Lock size={12} /> Unlock Offer Wall
                        </button>
                      ) : isSubmittedToday ? (
                        <div className="bg-slate-950/60 py-3.5 rounded-xl flex flex-col items-center justify-center flex-1 border border-white/5 cursor-not-allowed text-center w-full">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                            Completed Today ✓
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            Available again tomorrow.
                          </span>
                        </div>
                      ) : (
                        <>
                          <a
                            href={offer.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              const updated = { ...clickedOffers, [offer.id]: true };
                              setClickedOffers(updated);
                              localStorage.setItem('clicked_offers', JSON.stringify(updated));
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition shadow-lg shadow-blue-600/15 justify-center flex-1"
                          >
                            Earn Now <ExternalLink size={12} />
                          </a>
                          {clickedOffers[offer.id] && (
                            <Link
                              to={`/submit-proof?offerId=${offer.id}&title=${encodeURIComponent(offer.title)}&payout=${wcPayout}`}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition shadow-lg shadow-amber-500/15 justify-center animate-bounce"
                            >
                              Submit Proof
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Manual Verification Required
            </h5>
            <p className="text-slate-500 text-[9px] leading-relaxed">
              EarnWise rewards are paid in WiseCoins (WC) after manual proof approval. Each offer can be completed once per 24 hours. Duplicate submissions will be rejected.
            </p>
          </div>
        </div>
      </div>

      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="start or complete tasks" 
      />
    </Layout>
  );
}

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, AlertCircle, Smartphone, Globe, RefreshCw, CheckCircle, ExternalLink, ShieldCheck, Clock, Lock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { PLANS } from '../constants/plans';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';

interface CPAGripOffer {
  offer_id?: string | number;
  campaign_id?: string | number;
  title: string;
  description: string;
  payout: string | number;
  offerlink?: string;
  tracking_url?: string;
  category?: string;
  accepted_countries?: string;
  countries?: string;
  mobile?: string;
  offerphoto?: string;
  offer_photo?: string;
}

interface ParsedOffer {
  id: string;
  title: string;
  description: string;
  payout: number;
  imageUrl: string;
  link: string;
  countries: string[];
  devices: string[];
  category: string;
  network: 'ogads' | 'cpagrip';
}

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '').trim();
};

export default function Offers() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const networkParam = searchParams.get('network');
  
  const [offers, setOffers] = useState<ParsedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRenewalRequired, setIsRenewalRequired] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');

  useEffect(() => {
    if (networkParam === 'ogads' || networkParam === 'cpagrip') {
      setNetworkFilter(networkParam);
    } else {
      setNetworkFilter('all');
    }
  }, [networkParam]);

  const [clickedOffers, setClickedOffers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('clicked_offers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [submittedOfferIds, setSubmittedOfferIds] = useState<Set<string>>(new Set());

  // Pagination & Infinite Scroll
  const [visibleCount, setVisibleCount] = useState(15);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Conversion rate
  const [cpaConversionRate, setCpaConversionRate] = useState<number>(1000);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'platform'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.ogadsConversionRate !== undefined) {
          setCpaConversionRate(Number(data.ogadsConversionRate));
        } else if (data.cpaConversionRate !== undefined) {
          setCpaConversionRate(Number(data.cpaConversionRate));
        }
      }
    });
    return () => unsub();
  }, []);

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

  useEffect(() => {
    async function fetchSubmittedOffers() {
      if (!user?.uid) return;
      try {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        
        const q = query(
          collection(db, 'offer_submissions'),
          where('userId', '==', user.uid),
          where('submittedAt', '>=', Timestamp.fromDate(midnight))
        );
        const snap = await getDocs(q);
        const submitted = new Set<string>();
        snap.forEach(doc => {
          const data = doc.data();
          if (data.offerId) {
            submitted.add(String(data.offerId).trim().toLowerCase());
          }
        });
        setSubmittedOfferIds(submitted);
      } catch (err) {
        console.error("Failed to fetch submitted offers", err);
      }
    }
    fetchSubmittedOffers();
  }, [user?.uid]);

  const loadOffers = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [ogadsRes, cpaRes] = await Promise.allSettled([
        fetch(getApiUrl(`/api/offers?tracking_id=${user.uid}`)),
        fetch(getApiUrl(`/api/cpagrip/offers?tracking_id=${user.uid}`))
      ]);

      let parsedOffers: ParsedOffer[] = [];

      if (ogadsRes.status === 'fulfilled' && ogadsRes.value.ok) {
        const data = await ogadsRes.value.json();
        const rawOffers = data.offers || [];
        const parsed = rawOffers.map((o: any) => ({
          id: String(o.id || Math.random()),
          title: o.title || 'Premium Offer',
          description: o.description || o.adcopy || '',
          payout: parseFloat(String(o.payout || '0')) || 0,
          imageUrl: o.picture || o.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=256&auto=format&fit=crop',
          link: o.link || '#',
          countries: Array.isArray(o.countries) ? o.countries : (typeof o.countries === 'string' ? o.countries.split(',').map((c: string) => c.trim()) : []),
          devices: Array.isArray(o.devices) ? o.devices : (typeof o.devices === 'string' ? o.devices.split(',').map((d: string) => d.trim().toLowerCase()) : []),
          category: o.category || 'General',
          network: 'ogads' as const
        }));
        parsedOffers = [...parsedOffers, ...parsed];
      }

      if (cpaRes.status === 'fulfilled' && cpaRes.value.ok) {
        const data = await cpaRes.value.json();
        const rawOffers: CPAGripOffer[] = data.offers || [];
        const parsed: ParsedOffer[] = rawOffers.map((o) => {
          const offerId = o.offer_id || o.campaign_id || String(Math.random());
          const countriesStr = o.accepted_countries || o.countries || '';
          const devicesList = o.mobile 
            ? o.mobile.split(',').map(d => d.trim().toLowerCase()) 
            : ['mobile', 'desktop'];
          return {
            id: String(offerId),
            title: o.title || 'Premium Offer',
            description: o.description || '',
            payout: parseFloat(String(o.payout || '0')) || 0,
            imageUrl: o.offerphoto || o.offer_photo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=256&auto=format&fit=crop',
            link: o.offerlink || o.tracking_url || '#',
            countries: countriesStr ? countriesStr.split(',').map(c => c.trim()) : [],
            devices: devicesList,
            category: o.category || 'General',
            network: 'cpagrip' as const
          };
        });
        parsedOffers = [...parsedOffers, ...parsed];
      }

      if (parsedOffers.length === 0) {
        throw new Error('No offers available at the moment.');
      }

      // Sort by highest payout
      parsedOffers.sort((a, b) => b.payout - a.payout);

      setOffers(parsedOffers);
    } catch (err: any) {
      console.error(err);
      setError('Unable to securely connect to the offer providers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [user]);

  // Derived filters
  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    offers.forEach(o => o.countries.forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [offers]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    offers.forEach(o => set.add(o.category));
    return Array.from(set).sort();
  }, [offers]);

  const filteredOffers = useMemo(() => {
    return offers.filter(offer => {
      // Search
      const term = searchQuery.toLowerCase();
      if (term && !offer.title.toLowerCase().includes(term) && !offer.description.toLowerCase().includes(term)) {
        return false;
      }
      
      // Device
      if (deviceFilter !== 'all') {
        const devices = offer.devices.join(' ').toLowerCase();
        if (!devices.includes(deviceFilter)) return false;
      }

      // Country
      if (countryFilter !== 'all') {
        if (!offer.countries.includes(countryFilter)) return false;
      }

      // Category
      if (categoryFilter !== 'all') {
        if (offer.category !== categoryFilter) return false;
      }

      // Network
      if (networkFilter !== 'all') {
        if (offer.network !== networkFilter) return false;
      }

      return true;
    });
  }, [offers, searchQuery, deviceFilter, countryFilter, categoryFilter, networkFilter]);

  const displayedOffers = useMemo(() => filteredOffers.slice(0, visibleCount), [filteredOffers, visibleCount]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && visibleCount < filteredOffers.length) {
        setVisibleCount((prev) => prev + 15);
      }
    },
    [visibleCount, filteredOffers.length]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [handleObserver]);

  // Check plan expiration
  const isPlanExpired = useMemo(() => {
    if (!profile?.planEndDate || profile?.plan === 'free' || profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com') return false;
    const end = (profile.planEndDate as any).toDate ? (profile.planEndDate as any).toDate() : new Date(profile.planEndDate as any);
    return new Date() > end && isRenewalRequired;
  }, [profile, user, isRenewalRequired]);

  const planData = useMemo(() => {
    if (!profile?.plan) return PLANS[0];
    return PLANS.find(p => p.id === profile.plan) || PLANS[0];
  }, [profile?.plan]);
  
  // Use a sensible default multiplier if planData doesn't have an explicit adMultiplier, fallback to multiplier
  const multiplier = planData ? ((planData as any).adMultiplier || planData.multiplier || 1) : 1;

  return (
    <Layout title="Premium Offers">
      <div className="max-w-4xl mx-auto space-y-6 pb-24 relative">

        {/* Header / Banner */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 to-slate-950 p-6 md:p-8 border border-blue-500/20 shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                <Sparkles size={20} className="text-blue-400" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-display">
                Premium Offers
              </h1>
            </div>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
              Complete high-yield premium tasks. Ensure you follow all advertiser instructions carefully. Rewards are credited after proof verification.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-5 shadow-xl space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                Filter by Device
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'ios', 'android'] as const).map((device) => (
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

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                Network Feed
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'ogads', 'cpagrip'] as const).map((net) => (
                  <button
                    key={net}
                    onClick={() => setNetworkFilter(net)}
                    className={`py-2 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all border ${
                      networkFilter === net
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-950/40 text-slate-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {net === 'all' ? 'All' : net === 'ogads' ? 'OGAds' : 'CPAgrip'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                Country
              </label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">ALL COUNTRIES</option>
                {uniqueCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">ALL CATEGORIES</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 h-40"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-red-400 mb-2">Feed Error</h3>
            <p className="text-slate-400 text-sm">{error}</p>
            <button onClick={loadOffers} className="mt-4 flex items-center gap-2 mx-auto bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : displayedOffers.length === 0 ? (
          <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-12 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Offers Found</h3>
            <p className="text-slate-400 text-sm font-medium">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOffers.map(offer => {
              let wcPayout = Math.round(offer.payout * cpaConversionRate * multiplier);
              if (offer.payout > 0 && wcPayout === 0) wcPayout = 1;
              const isSubmittedToday = submittedOfferIds.has(String(offer.id).trim().toLowerCase());

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={offer.id} 
                  className={`bg-slate-900/60 backdrop-blur-sm border rounded-[2rem] overflow-hidden transition-all ${
                    isSubmittedToday ? 'border-emerald-500/20 opacity-75' : 'border-white/5 hover:border-blue-500/30'
                  }`}
                >
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                    
                    {/* Thumbnail */}
                    <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center p-2 relative group">
                      <img 
                        src={offer.imageUrl} 
                        alt={offer.title} 
                        className="w-full h-full object-contain rounded-xl"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-black text-white truncate font-display tracking-tight">
                          {stripHtml(offer.title)}
                        </h3>
                        {isSubmittedToday && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle size={10} /> Pending
                          </span>
                        )}
                      </div>
                      
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed font-medium mb-3">
                        {stripHtml(offer.description) || "Complete advertiser requirements to earn."}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {offer.devices.length > 0 && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Smartphone size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{offer.devices.join(', ')}</span>
                          </div>
                        )}
                        {offer.countries.length > 0 && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Globe size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{offer.countries.slice(0, 3).join(', ')}{offer.countries.length > 3 && '...'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">~2-5 Mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="w-full sm:w-auto shrink-0 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 bg-slate-950/50 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Reward</div>
                        <div className="text-lg font-black text-amber-400 font-display flex items-center gap-1">
                          +{wcPayout.toLocaleString()} <span className="text-xs">WC</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        {isPlanExpired ? (
                          <button
                            disabled
                            className="bg-slate-800 text-slate-500 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 justify-center cursor-not-allowed"
                          >
                            <Lock size={12} /> Unlock
                          </button>
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
                              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition justify-center ${
                                clickedOffers[offer.id] 
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                              }`}
                            >
                              {clickedOffers[offer.id] ? 'Continue Offer' : 'Start Offer'} <ExternalLink size={12} />
                            </a>
                            
                            {clickedOffers[offer.id] && !isSubmittedToday && (
                              <Link
                                to={`/submit-proof?offerId=${offer.id}&title=${encodeURIComponent(offer.title)}&payout=${wcPayout}`}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition shadow-lg shadow-amber-500/15 justify-center"
                              >
                                Submit Proof
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            <div ref={observerTarget} className="h-10"></div>
          </div>
        )}

        <div className="text-center mt-12 pb-8">
          <p className="text-slate-500 text-xs font-medium max-w-lg mx-auto leading-relaxed">
            EarnWise rewards are paid in WiseCoins (WC) after manual proof approval. Each offer can be completed once per 24 hours.
          </p>
        </div>

      </div>

      {isPlanExpired && (
        <PlanRestrictionModal 
          isOpen={isPlanExpired} 
          onClose={() => {}} 
          actionName="Premium Offers"
        />
      )}
    </Layout>
  );
}

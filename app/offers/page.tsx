'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Smartphone, 
  Monitor, 
  Layers, 
  RotateCw, 
  AlertCircle, 
  Sparkles,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import OfferCard, { NormalizedOffer } from '../../components/OfferCard';

export default function OffersPage() {
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering states
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'android' | 'ios' | 'desktop'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [metaInfo, setMetaInfo] = useState<{ detectedIp?: string; detectedCountry?: string } | null>(null);

  // Fetch offers from our API route
  const loadOffers = async (countryOverride?: string, deviceOverride?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (countryOverride) queryParams.append('country', countryOverride);
      if (deviceOverride && deviceOverride !== 'all') queryParams.append('device', deviceOverride);

      const res = await fetch(`/api/offers?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load campaigns (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setOffers(data.offers || []);
        if (data.meta) {
          setMetaInfo({
            detectedIp: data.meta.detectedIp,
            detectedCountry: data.meta.detectedCountry,
          });
          if (!countryFilter && data.meta.detectedCountry && data.meta.detectedCountry !== 'unknown') {
            setCountryFilter(data.meta.detectedCountry);
          }
        }
      } else {
        throw new Error(data.error || 'Server reported unsuccessful campaign retrieval.');
      }
    } catch (err: any) {
      console.error('[OFFERS_PAGE_FETCH_ERROR]:', err);
      setError(err.message || 'An unexpected error occurred while fetching live offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  // Handle manual filter applies
  const handleRefresh = () => {
    loadOffers(countryFilter, deviceFilter);
  };

  // Filter offers on client side based on search and selected local device filter
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      offer.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDevice = 
      deviceFilter === 'all' || 
      offer.devices.some(d => d.includes(deviceFilter));

    return matchesSearch && matchesDevice;
  });

  return (
    <div className="min-h-screen bg-[#030712] text-white relative overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Premium ambient decorative elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative">
        {/* Header Layout */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
              <Sparkles size={12} className="animate-pulse" />
              Direct Rewards Core
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white leading-none">
              High-Paying <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">OGAds Offers</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Earn real Naira by completing surveys, downloading mobile apps, and trying out games. Real-time verification, powered by official OGAds.
            </p>
          </div>

          {/* Connected Metadata panel */}
          {metaInfo && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Targeting Country</span>
                <span className="font-bold text-white uppercase">{metaInfo.detectedCountry || 'Global'}</span>
              </div>
              <div className="w-px h-8 bg-slate-800 hidden sm:block" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Your Client IP</span>
                <span className="font-mono text-slate-300">{metaInfo.detectedIp || '127.0.0.1'}</span>
              </div>
              <div className="w-px h-8 bg-slate-800 hidden sm:block" />
              <button 
                onClick={handleRefresh}
                className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Refresh campaigns list"
              >
                <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Toolbar Panel */}
        <div className="bg-[#090D1A]/80 border border-slate-800/80 rounded-3xl p-4 sm:p-6 mb-8 backdrop-blur-xl flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="relative md:col-span-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search offer titles, requirements..."
                className="w-full pl-11 pr-4 py-3 bg-black/40 border border-slate-800 hover:border-slate-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white rounded-2xl text-sm transition-all focus:outline-none"
              />
            </div>

            {/* Device Filter Badges */}
            <div className="md:col-span-4 flex items-center gap-1.5 bg-black/30 border border-slate-800/60 p-1.5 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setDeviceFilter('all')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  deviceFilter === 'all' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers size={14} />
                <span>All</span>
              </button>
              <button
                onClick={() => setDeviceFilter('android')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  deviceFilter === 'android' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone size={14} />
                <span>Android</span>
              </button>
              <button
                onClick={() => setDeviceFilter('ios')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  deviceFilter === 'ios' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone size={14} />
                <span>iOS</span>
              </button>
              <button
                onClick={() => setDeviceFilter('desktop')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  deviceFilter === 'desktop' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Monitor size={14} />
                <span>Desktop</span>
              </button>
            </div>

            {/* Country Input Override */}
            <div className="relative md:col-span-3 flex gap-2">
              <input
                type="text"
                maxLength={2}
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
                placeholder="Country (ISO, e.g. US, NG)"
                className="w-full px-4 py-3 bg-black/40 border border-slate-800 hover:border-slate-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white rounded-2xl text-sm transition-all focus:outline-none text-center font-bold uppercase tracking-wider placeholder:normal-case placeholder:font-normal"
              />
              <button
                onClick={() => loadOffers(countryFilter, deviceFilter)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-2xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Content Stages */}
        {loading ? (
          // Skeleton loader
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="bg-[#090D1A]/40 border border-slate-800/60 rounded-3xl p-5 space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-800 rounded-md w-20" />
                  <div className="h-4 bg-slate-800 rounded-md w-12" />
                </div>
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-800 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-800 rounded-md w-full" />
                    <div className="h-3 bg-slate-800 rounded-md w-5/6" />
                  </div>
                </div>
                <div className="h-px bg-slate-800/60" />
                <div className="flex justify-between items-center pt-2">
                  <div className="space-y-1">
                    <div className="h-2 bg-slate-800 rounded-md w-10" />
                    <div className="h-4 bg-slate-800 rounded-md w-16" />
                  </div>
                  <div className="h-10 bg-slate-800 rounded-xl w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="bg-red-950/10 border border-red-900/30 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-lg">System Sync Error</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                {error}
              </p>
            </div>
            <button
              onClick={() => loadOffers(countryFilter, deviceFilter)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredOffers.length === 0 ? (
          // Empty State
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-center text-slate-500 mx-auto">
              <TrendingDown size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-lg">No Live Campaigns Available</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                No offers match your selected device or country region filters right now. Try expanding your search queries or choosing another device.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setDeviceFilter('all');
                setCountryFilter('');
                loadOffers('', 'all');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          // Display Offers Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}

        {/* Informative Platform Note */}
        <div className="mt-16 bg-[#090D1A]/50 border border-slate-800/60 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-4 max-w-4xl mx-auto">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800 flex-shrink-0">
            <HelpCircle size={18} className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Campaign Completion Guidelines</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              To guarantee reward processing, make sure your adblocker is disabled. You must be a first-time user of the target app/survey, and you must complete all setup milestones as described in the campaign details. Rewards are credited automatically within 10-30 minutes of verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

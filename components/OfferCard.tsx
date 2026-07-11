import React from 'react';
import { Smartphone, Monitor, Globe, ArrowUpRight, ShieldCheck, Tag } from 'lucide-react';

export interface NormalizedOffer {
  id: string;
  title: string;
  description: string;
  payout: number;
  imageUrl: string;
  link: string;
  countries: string[];
  devices: string[];
  category: string;
}

interface OfferCardProps {
  offer: NormalizedOffer;
}

export default function OfferCard({ offer }: OfferCardProps) {
  // Determine device badges
  const isAndroid = offer.devices.some(d => d.includes('android'));
  const isIos = offer.devices.some(d => d.includes('ios') || d.includes('iphone') || d.includes('ipad'));
  const isDesktop = offer.devices.some(d => d.includes('desktop') || d.includes('windows') || d.includes('mac'));

  return (
    <div 
      id={`offer-card-${offer.id}`}
      className="group relative bg-[#090D1A]/80 border border-slate-800 hover:border-emerald-500/30 rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_15px_30px_rgba(16,185,129,0.06)] overflow-hidden backdrop-blur-md"
    >
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/0 group-hover:from-emerald-500/2 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

      <div>
        {/* Header Metadata Section */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-400 px-2.5 py-1 rounded-full uppercase tracking-widest">
            <Tag size={10} className="text-emerald-500" />
            {offer.category}
          </span>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/5">
            <Globe size={12} className="text-blue-400" />
            <span className="uppercase text-[10px] tracking-wider">
              {offer.countries.length > 3 
                ? `${offer.countries.slice(0, 3).join(', ')} +${offer.countries.length - 3}`
                : offer.countries.join(', ') || 'Global'}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex gap-4">
          {/* Offer Thumbnail Image */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={offer.imageUrl} 
              alt={offer.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          {/* Texts info */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">
              {offer.title}
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
              {offer.description}
            </p>
          </div>
        </div>

        {/* Device compatibility indicators */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/60">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
            Compatible:
          </span>
          <div className="flex items-center gap-1.5">
            {isAndroid && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/10 font-bold">
                <Smartphone size={10} /> Android
              </span>
            )}
            {isIos && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/10 font-bold">
                <Smartphone size={10} /> iOS
              </span>
            )}
            {isDesktop && (
              <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/10 font-bold">
                <Monitor size={10} /> Desktop
              </span>
            )}
            {!isAndroid && !isIos && !isDesktop && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 font-bold">
                <Globe size={10} /> Universal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Section - Payout & CTA */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 block leading-none mb-1">
            Task Payout
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-emerald-400 tracking-tight">
              ₦{(offer.payout * 1500).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              (${offer.payout.toFixed(2)})
            </span>
          </div>
        </div>

        <a 
          href={offer.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300 active:scale-95 shadow-lg shadow-emerald-950/20"
        >
          <span>Start Offer</span>
          <ArrowUpRight size={13} />
        </a>
      </div>
    </div>
  );
}

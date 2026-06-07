import React from 'react';
import { Search } from 'lucide-react';

interface CpxWidgetProps {
  userId: string;
}

export const CpxWidget: React.FC<CpxWidgetProps> = ({ userId }) => {
  return (
    <div 
      className="flex items-center gap-4 bg-black/20 hover:bg-black/30 transition-all rounded-full px-4 py-2 border border-white/5 cursor-pointer backdrop-blur-md"
      onClick={() => {
        const btn = document.querySelector('[data-category="survey"]') as HTMLButtonElement;
        if (btn) btn.click();
      }}
    >
      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg">
        <Search size={12} className="fill-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">Global Surveys</span>
        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter mt-1">Multipliers Active</span>
      </div>
      <div className="ml-2 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
         <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
         <span className="text-[8px] font-black text-white">LIVE</span>
      </div>
    </div>
  );
};

import React from 'react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { 
  Zap, 
  Info
} from 'lucide-react';

export default function Surveys() {
  return (
    <Layout title="Premium Surveys">
      <div className="p-3 sm:p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Hero Section */}
        <div className="text-center space-y-6 py-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-emerald-600/20 rounded-[2rem] border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            <Zap size={40} className="text-emerald-400 fill-emerald-400" />
          </motion.div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-black text-white italic tracking-tight uppercase">Survey Wall</h2>
            <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">
              Complete high-paying research surveys to earn WiseCoins instantly.
            </p>
          </div>
        </div>

        {/* Wall Entry Section */}
        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-4 sm:p-6 relative overflow-hidden shadow-2xl min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="relative z-10">
            {/* The CPX Survey Wall will be injected here */}
            <div id="cpx-wall-embedded" className="w-full min-h-[500px]">
              <div className="flex flex-col items-center justify-center pt-20 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initialising Survey Wall...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
              Important: Most surveys credit within 15 minutes. Inconsistent answers may lead to disqualification.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}


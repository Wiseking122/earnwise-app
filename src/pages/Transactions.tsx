import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction } from '../types';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Filter,
  History,
  TrendingDown,
  TrendingUp,
  Search
} from 'lucide-react';
import AnimatedNumber from '../components/AnimatedNumber';

export default function Transactions() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earning' | 'withdrawal' | 'referral' | 'staking' | 'bonus'>('all');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'transactions'), 
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      
      // Sort locally
      docs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || 0;
        const timeB = (b.createdAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    return () => unsub();
  }, [profile]);

  const filteredTransactions = transactions.filter(t => filter === 'all' || t.type === filter);

  return (
    <Layout>
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto">
        <header className="space-y-1">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Financial Insights</p>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Transaction History</h2>
        </header>

        {/* Balance Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none -mr-16 -mt-16" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }} />
            <div className="relative z-10 flex items-center justify-between">
                <div>
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Wisecoin Wallet</p>
                   <h3 className="text-3xl font-black tracking-tight"><AnimatedNumber value={profile?.balance || 0} /> WC</h3>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Wallet size={24} className="text-white" />
                </div>
            </div>
            
            <div className="mt-8 flex gap-4">
                <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span className="text-[9px] font-black uppercase text-slate-400">Wisecoin Income</span>
                    </div>
                    <p className="font-black text-sm text-emerald-400"><AnimatedNumber value={profile?.taskEarnings || 0} /> WC</p>
                </div>
                <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown size={14} className="text-orange-400" />
                        <span className="text-[9px] font-black uppercase text-slate-400">Withdrawals</span>
                    </div>
                    <p className="font-black text-sm text-orange-400">{(profile?.withdrawableBalance === 0 ? 0 : 0).toLocaleString()} WC</p>
                </div>
            </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['all', 'earning', 'withdrawal', 'referral', 'staking', 'bonus'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                filter === t 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
             [1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />)
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((t) => (
              <motion.div 
                layout
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    t.type === 'withdrawal' || t.type === 'staking'
                      ? "bg-orange-50 text-orange-600 group-hover:bg-orange-100" 
                      : t.type === 'referral'
                        ? "bg-purple-50 text-purple-600 group-hover:bg-purple-100"
                        : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                  }`}>
                    {t.type === 'withdrawal' || t.type === 'staking' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{t.description}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {t.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'} • {t.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg tracking-tighter ${
                    t.type === 'withdrawal' || t.type === 'staking' ? "text-slate-900" : "text-emerald-600"
                  }`}>
                    {t.type === 'withdrawal' || t.type === 'staking' ? '-' : '+'}{t.amount.toLocaleString()} WC
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                     <div className={`w-1 h-1 rounded-full ${t.type === 'withdrawal' ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                     <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Settled</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <History size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">No history found</p>
                <p className="text-xs text-slate-400">Transactions you make will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

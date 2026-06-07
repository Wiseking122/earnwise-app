import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  increment, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { VaultEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Info,
  ChevronRight,
  AlertTriangle,
  Zap,
  Sparkles
} from 'lucide-react';
import AnimatedNumber from '../components/AnimatedNumber';

export default function Vault() {
  const { user, profile } = useAuth();
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'vault_entries'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultEntry));
      // Sort: Locked first, then by unlocksAt desc
      docs.sort((a, b) => {
        if (a.status === 'locked' && b.status !== 'locked') return -1;
        if (a.status !== 'locked' && b.status === 'locked') return 1;
        return (b.unlocksAt?.toMillis?.() || 0) - (a.unlocksAt?.toMillis?.() || 0);
      });
      setVaultEntries(docs);
      setHistoryLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vault_entries');
      setHistoryLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleStake = async () => {
    if (!profile || !user || !stakeAmount || isNaN(Number(stakeAmount))) return;
    const amount = Number(stakeAmount);
    
    if (amount <= 0) return;
    if (amount > profile.withdrawableBalance) {
      alert("Insufficient withdrawable balance");
      return;
    }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        
        if (!userSnap.exists()) throw new Error("User not found");
        const userData = userSnap.data();
        
        if (userData.withdrawableBalance < amount) throw new Error("Insufficient balance");

        const bonus = amount * 0.05; // 5% bonus
        const payoutAmount = amount + bonus;
        const unlocksAt = new Date();
        unlocksAt.setDate(unlocksAt.getDate() + 7); // 7 days lock

        const entryRef = doc(collection(db, 'vault_entries'));
        transaction.set(entryRef, {
          userId: user.uid,
          amount,
          bonus,
          payoutAmount,
          status: 'locked',
          lockedAt: serverTimestamp(),
          unlocksAt: unlocksAt,
        });

        transaction.update(userRef, {
          withdrawableBalance: increment(-amount),
          vaultBalance: increment(amount),
        });

        // Add transaction log
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: user.uid,
          amount,
          type: 'staking',
          description: `Locked ₦${amount.toLocaleString()} in Vault`,
          createdAt: serverTimestamp()
        });
      });

      setStakeAmount('');
      alert("Funds locked in Vault for 7 days!");
    } catch (err) {
      console.error(err);
      alert("Failed to stake funds");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (entry: VaultEntry) => {
    if (!user || entry.status !== 'locked') return;
    
    const now = new Date();
    const unlockTime = entry.unlocksAt?.toDate?.() || entry.unlocksAt;
    if (now < unlockTime) {
      alert("This vault is still locked!");
      return;
    }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const entryRef = doc(db, 'vault_entries', entry.id);

        transaction.update(userRef, {
          balance: increment(entry.bonus),
          withdrawableBalance: increment(entry.payoutAmount),
          vaultBalance: increment(-entry.amount),
          bonusEarnings: increment(entry.bonus)
        });

        transaction.update(entryRef, {
          status: 'unlocked',
          claimedAt: serverTimestamp()
        });

        // Add transaction log for bonus
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: user.uid,
          amount: entry.payoutAmount,
          type: 'bonus',
          description: `UNLOCKED: Vault profit + capital from ₦${entry.amount}`,
          createdAt: serverTimestamp()
        });
      });

      alert("Vault profit claimed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to claim vault earnings");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (unlocksAt: any) => {
    const target = unlocksAt?.toDate?.() || unlocksAt;
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "Ready to unlock";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h left`;
  };

  return (
    <Layout>
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto">
        <header className="space-y-1">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Passive Growth Engine</p>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Secure Capital Vault</h2>
        </header>

        {/* Hero Card */}
        <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }} />
            
            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Current Locked Funds</p>
                        <h3 className="text-4xl font-black tracking-tight">
                            ₦<AnimatedNumber value={profile?.vaultBalance || 0} />
                        </h3>
                    </div>
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-2xl border border-white/10">
                        <ShieldCheck size={28} className="text-emerald-400" />
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <TrendingUp size={16} className="text-emerald-400" />
                    </div>
                    <p className="text-xs font-bold">5% Fixed Weekly Yield <span className="text-emerald-400 font-black ml-1">PAID INSTANTLY</span></p>
                </div>
            </div>
        </div>

        {/* Stake Form */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount to Lock</label>
               <span className="text-[9px] font-black text-slate-400">Bal: ₦{(profile?.withdrawableBalance || 0).toLocaleString()}</span>
            </div>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</div>
                <input 
                    type="number" 
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-10 pr-20 font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button 
                   onClick={() => setStakeAmount(profile?.withdrawableBalance.toString() || '0')}
                   className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight hover:bg-slate-300 transition-colors"
                >
                    Max
                </button>
            </div>
            
            {stakeAmount && !isNaN(Number(stakeAmount)) && Number(stakeAmount) > 0 && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3"
                >
                    <Sparkles size={18} className="text-emerald-600" />
                    <div>
                        <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest leading-none mb-1">Expected Return</p>
                        <p className="text-sm font-black text-emerald-900">Total: ₦{(Number(stakeAmount) * 1.05).toLocaleString()} <span className="text-emerald-600">(+₦{(Number(stakeAmount) * 0.05).toLocaleString()})</span></p>
                    </div>
                </motion.div>
            )}

            <button
                onClick={handleStake}
                disabled={loading || !stakeAmount || Number(stakeAmount) <= 0}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl disabled:opacity-50"
            >
                {loading ? "Initializing..." : (
                    <>
                        <Lock size={18} />
                        Lock in Vault
                    </>
                )}
            </button>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
             <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
             <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                Locked funds cannot be withdrawn or moved until the 7-day period expires. Ensure you do not need these funds for immediate liquidation.
             </p>
          </div>
        </div>

        {/* History / Active Locks */}
        <section className="space-y-4">
            <h3 className="font-black text-lg px-1 flex items-center gap-2">
                <Clock size={20} className="text-slate-400" />
                Active & Terminated Vaults
            </h3>

            <div className="space-y-4">
                {historyLoading ? (
                    [1,2].map(i => <div key={i} className="h-32 bg-slate-50 rounded-[2rem] animate-pulse" />)
                ) : vaultEntries.length > 0 ? (
                    vaultEntries.map((entry) => {
                        const isUnlocked = entry.status === 'unlocked' || new Date() >= (entry.unlocksAt?.toDate?.() || entry.unlocksAt);
                        return (
                            <motion.div 
                                key={entry.id}
                                layout
                                className={`p-6 rounded-[2rem] border transition-all ${
                                    entry.status === 'unlocked' 
                                        ? "bg-slate-50 border-slate-100 opacity-60" 
                                        : "bg-white border-slate-200 shadow-sm"
                                }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-slate-900">₦{entry.payoutAmount.toLocaleString()}</p>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                entry.status === 'locked' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            }`}>
                                                {entry.status}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                                            Capital: ₦{entry.amount.toLocaleString()} • Profit: ₦{entry.bonus.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        entry.status === 'unlocked' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                    }`}>
                                        {entry.status === 'unlocked' ? <CheckCircle size={20} /> : <Clock size={20} />}
                                    </div>
                                </div>

                                <div className="h-[1px] bg-slate-100 my-4" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Info size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                            {getTimeRemaining(entry.unlocksAt)}
                                        </span>
                                    </div>
                                    
                                    {entry.status === 'locked' && (
                                        <button
                                            onClick={() => handleClaim(entry)}
                                            disabled={loading || new Date() < (entry.unlocksAt?.toDate?.() || entry.unlocksAt)}
                                            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                new Date() >= (entry.unlocksAt?.toDate?.() || entry.unlocksAt)
                                                    ? "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
                                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            }`}
                                        >
                                            {new Date() >= (entry.unlocksAt?.toDate?.() || entry.unlocksAt) ? "Claim Reward" : "Wait for Unlock"}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center space-y-4 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <Info size={32} className="text-slate-300" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase">Vault Empty</p>
                            <p className="text-xs text-slate-400">Lock your funds to start earning passive bonuses.</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
      </div>
    </Layout>
  );
}

function CheckCircle({ size, className = "" }: { size: number, className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

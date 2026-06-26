import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Transaction, TaskCompletion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  History, 
  Clock, 
  CheckCircle, 
  XCircle,
  PlusCircle,
  MinusCircle,
  DollarSign,
  Dices,
  ArrowRight,
  Wallet as WalletIcon
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import DepositTab from '../components/DepositTab';
import { CpxWidget } from '../components/CpxWidget';
import { CpxOfferwall } from '../components/CpxOfferwall';
import AnimatedNumber from '../components/AnimatedNumber';
import TransactionReceipt from '../components/TransactionReceipt';

export default function Earnings() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'pending' | 'deposit'>('history');
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [isSubmittingDiagnostic, setIsSubmittingDiagnostic] = useState(false);

  const depositSuccess = searchParams.get('deposit_success') === 'true';
  const depositAmount = searchParams.get('amount');
  const receiptId = searchParams.get('receipt');

  useEffect(() => {
    if (receiptId && transactions.length > 0) {
      const t = transactions.find(tx => tx.id === receiptId);
      if (t && t.type === 'withdrawal' && t.receiptDetails) {
        setSelectedReceipt({
          id: t.id,
          amount: t.amount,
          fee: t.receiptDetails.fee || 0,
          netPayout: t.receiptDetails.netPayout || t.amount,
          processedAt: t.createdAt?.toDate() || new Date(),
          bankName: t.receiptDetails.bankName,
          accountName: t.receiptDetails.accountName
        });
        // Clear the URL param to prevent re-triggering
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('receipt');
          return newParams;
        });
      }
    }
  }, [receiptId, transactions, setSearchParams]);

  useEffect(() => {
    if (!user) return;

    const qTrans = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid)
    );
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      // Sort locally by createdAt desc
      docs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || 0;
        const timeB = (b.createdAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setTransactions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const qComp = query(
      collection(db, 'completions'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubComp = onSnapshot(qComp, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskCompletion));
      // Sort locally by submittedAt descending
      docs.sort((a, b) => {
        const timeA = (a.submittedAt as any)?.toMillis?.() || 0;
        const timeB = (b.submittedAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setCompletions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'completions');
      setLoading(false);
    });

    return () => {
      unsubTrans();
      unsubComp();
    };
  }, [user]);

  return (
    <Layout title="Vault & Wallet">
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Deposit Success Alert Banner */}
        <AnimatePresence>
          {depositSuccess && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-emerald-500 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl space-y-4"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)' }} />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle size={28} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-display font-black uppercase italic tracking-tight text-white">Deposit Cleared</h3>
                  <p className="text-xs text-emerald-100 font-bold leading-relaxed">
                    ₦{Number(depositAmount || 0).toLocaleString()} has been added successfully to your withdrawable balance. Your global ledger has been updated!
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2 relative z-10">
                <button
                  onClick={() => setSearchParams({})}
                  className="bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  Verify Balance
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Diagnostic & Wallet Recovery Panel */}
        {(profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com') && (
          <div className="bg-slate-900 border-2 border-amber-500/30 rounded-[2.5rem] p-6 text-white space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)' }} />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-base font-display font-black uppercase italic tracking-tight text-amber-400">Diagnostic Console</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Self-Healing Wallet Management</p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Task Balance</p>
                <p className="text-sm font-bold text-white">₦{profile?.taskBalance || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Withdrawable</p>
                <p className="text-sm font-bold text-white">₦{profile?.withdrawableBalance || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Global Net</p>
                <p className="text-sm font-bold text-white">₦{profile?.balance || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Referral Balance</p>
                <p className="text-sm font-bold text-white">₦{profile?.referralBalance || 0}</p>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Enter Adjustment Amount (₦)"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs w-full text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isSubmittingDiagnostic}
                  onClick={async () => {
                    if (!adjustAmount || isNaN(Number(adjustAmount))) {
                      alert("Please enter a valid amount");
                      return;
                    }
                    const val = Number(adjustAmount);
                    setIsSubmittingDiagnostic(true);
                    try {
                      const userRef = doc(db, 'users', user.uid);
                      const transRef = doc(collection(db, 'transactions'));
                      
                      const batch = writeBatch(db);
                      batch.update(userRef, {
                        taskBalance: increment(val),
                        balance: increment(val),
                        withdrawableBalance: increment(val),
                        taskEarnings: increment(val),
                        totalEarnings: increment(val),
                        updatedAt: serverTimestamp()
                      });

                      batch.set(transRef, {
                        userId: user.uid,
                        amount: val,
                        type: 'earning',
                        status: 'completed',
                        description: `Diagnostic Task Wallet Adjustment`,
                        createdAt: serverTimestamp()
                      });

                      await batch.commit();
                      alert(`Successfully credited ₦${val.toLocaleString()} to your Task Wallet!`);
                      setAdjustAmount('');
                    } catch (err: any) {
                      alert("Adjustment failed: " + err.message);
                    } finally {
                      setIsSubmittingDiagnostic(false);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-[9px] tracking-widest py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <PlusCircle size={14} /> Credit Task
                </button>

                <button
                  disabled={isSubmittingDiagnostic}
                  onClick={async () => {
                    if (!adjustAmount || isNaN(Number(adjustAmount))) {
                      alert("Please enter a valid amount");
                      return;
                    }
                    const val = Number(adjustAmount);
                    setIsSubmittingDiagnostic(true);
                    try {
                      const userRef = doc(db, 'users', user.uid);
                      const transRef = doc(collection(db, 'transactions'));
                      
                      const batch = writeBatch(db);
                      batch.update(userRef, {
                        referralBalance: increment(val),
                        balance: increment(val),
                        withdrawableBalance: increment(val),
                        referralEarnings: increment(val),
                        totalEarnings: increment(val),
                        updatedAt: serverTimestamp()
                      });

                      batch.set(transRef, {
                        userId: user.uid,
                        amount: val,
                        type: 'referral',
                        status: 'completed',
                        description: `Diagnostic Referral Wallet Adjustment`,
                        createdAt: serverTimestamp()
                      });

                      await batch.commit();
                      alert(`Successfully credited ₦${val.toLocaleString()} to your Referral Wallet!`);
                      setAdjustAmount('');
                    } catch (err: any) {
                      alert("Adjustment failed: " + err.message);
                    } finally {
                      setIsSubmittingDiagnostic(false);
                    }
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[9px] tracking-widest py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <PlusCircle size={14} /> Credit Referral
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isSubmittingDiagnostic}
                  onClick={async () => {
                    setIsSubmittingDiagnostic(true);
                    try {
                      const val = 2500;
                      const userRef = doc(db, 'users', user.uid);
                      const transRef = doc(collection(db, 'transactions'));
                      const completionRef = doc(collection(db, 'completions'));

                      const batch = writeBatch(db);
                      batch.update(userRef, {
                        taskBalance: increment(val),
                        balance: increment(val),
                        withdrawableBalance: increment(val),
                        taskEarnings: increment(val),
                        totalEarnings: increment(val),
                        tasksCompleted: increment(1),
                        updatedAt: serverTimestamp()
                      });

                      batch.set(completionRef, {
                        userId: user.uid,
                        taskId: "diagnostic_test_task",
                        status: 'approved',
                        rewardEarned: val,
                        submittedAt: serverTimestamp(),
                        createdAt: serverTimestamp()
                      });

                      batch.set(transRef, {
                        userId: user.uid,
                        amount: val,
                        type: 'earning',
                        status: 'completed',
                        description: `Verified Task: Diagnostic Proof Simulation`,
                        createdAt: serverTimestamp()
                      });

                      await batch.commit();
                      alert("Successfully simulated earning completion of ₦2,500.00!");
                    } catch (err: any) {
                      alert("Simulation failed: " + err.message);
                    } finally {
                      setIsSubmittingDiagnostic(false);
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[9px] tracking-widest py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md col-span-2"
                >
                  <CheckCircle size={14} /> Simulate ₦2,500 Task Earn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lucky Spin Premium Banner */}
        <Link 
          to="/lucky-spin" 
          className="block bg-slate-950 rounded-[2.5rem] p-6 text-white shadow-2xl group relative overflow-hidden active:scale-95 transition-all border border-white/5"
        >
           <div className="absolute inset-0 bg-linear-to-br from-blue-600/30 via-transparent to-purple-600/30 opacity-50" />
           <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:rotate-[15deg] group-hover:scale-110 transition-all duration-500 border border-white/10">
                    <Dices size={28} className="text-white drop-shadow-2xl" />
                 </div>
                 <div>
                    <h4 className="font-display font-black text-lg uppercase tracking-tight italic">Fortune Wheel</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">Win up to ₦50,000 Daily</p>
                 </div>
              </div>
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:translate-x-1 transition-transform">
                 <ArrowRight size={20} />
              </div>
           </div>
        </Link>

        {/* Portfolio Summary Card */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)' }} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Available</p>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter drop-shadow-md">₦<AnimatedNumber value={profile?.withdrawableBalance || 0} /></h2>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest italic">Live Capital</p>
            </div>
          </div>
          
          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)' }} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Total Assets</p>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter drop-shadow-md">₦<AnimatedNumber value={profile?.balance || 0} /></h2>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest italic">Global Net</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-900/40 rounded-3xl p-6 border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Task Wallet</p>
              <h4 className="text-xl font-display font-black text-white italic">₦{(profile?.taskBalance || 0).toLocaleString()}</h4>
           </div>
           <div className="bg-slate-900/40 rounded-3xl p-6 border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Referral Wallet</p>
              <h4 className="text-xl font-display font-black text-white italic">₦{(profile?.referralBalance || 0).toLocaleString()}</h4>
           </div>
        </div>

        {/* Premium Tab Selection */}
        <div className="flex bg-slate-900/60 backdrop-blur-3xl p-1.5 rounded-[2rem] border border-white/5 relative shadow-inner">
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-500 relative z-10 ${
              activeTab === 'history' ? 'bg-blue-600 border border-blue-500/50 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <History size={16} /> Ledger
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-500 relative z-10 ${
              activeTab === 'pending' ? 'bg-blue-600 border border-blue-500/50 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Clock size={16} /> Pending
          </button>
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-500 relative z-10 ${
              activeTab === 'deposit' ? 'bg-blue-600 border border-blue-500/50 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <WalletIcon size={16} /> Deposit
          </button>
        </div>

        {/* Dynamic Activity Feed */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'history' ? (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {transactions.length > 0 ? (
                  transactions.map((t, index) => (
                    <div 
                      key={t.id || index} 
                      onClick={() => {
                        if (t.type === 'withdrawal' && t.receiptDetails) {
                          setSelectedReceipt({
                            id: t.id,
                            amount: t.amount,
                            fee: t.receiptDetails.fee || 0,
                            netPayout: t.receiptDetails.netPayout || t.amount,
                            processedAt: t.createdAt?.toDate() || new Date(),
                            bankName: t.receiptDetails.bankName,
                            accountName: t.receiptDetails.accountName
                          });
                        }
                      }}
                      className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between hover:shadow-xl transition-all group overflow-hidden relative ${t.type === 'withdrawal' && t.receiptDetails ? 'cursor-pointer hover:border-blue-200' : ''}`}
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-center gap-5 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                          t.type === 'earning' || t.type === 'referral' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {t.type === 'earning' || t.type === 'referral' ? <PlusCircle size={24} /> : <MinusCircle size={24} />}
                        </div>
                        <div>
                          <h4 className="font-display font-black text-slate-900 text-sm uppercase tracking-tight italic">{t.description}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {t.createdAt?.toDate().toLocaleDateString('en-GB')} • {t.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="relative z-10">
                        <p className={`text-xl font-display font-black tracking-tighter ${
                          t.type === 'earning' || t.type === 'referral' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'earning' || t.type === 'referral' ? '+' : '-'}₦{t.amount.toFixed(0)}
                        </p>
                        {t.type === 'withdrawal' && t.receiptDetails && (
                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 mt-1 text-right">View Receipt</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">No Ledger Records Found</p>
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'pending' ? (
              <motion.div 
                key="pending"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {completions.length > 0 ? (
                  completions.map((c, index) => (
                    <div key={c.id || index} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between hover:border-amber-200 transition-all group overflow-hidden relative">
                       <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center animate-pulse">
                          <Clock size={24} />
                        </div>
                        <div>
                          <h4 className="font-display font-black text-slate-900 text-sm uppercase tracking-tight italic">Review in Process</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            NETWORK VERIFICATION • {c.submittedAt?.toDate().toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xl font-display font-black text-amber-500 tracking-tighter italic">+₦{c.rewardEarned.toFixed(0)}</p>
                        </div>
                        {(profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com') && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (window.confirm("Approve your own submission and credit your wallets instantly?")) {
                                try {
                                  const batch = writeBatch(db);
                                  const compRef = doc(db, 'completions', c.id);
                                  const userRef = doc(db, 'users', user.uid);
                                  const transRef = doc(collection(db, 'transactions'));
                                  
                                  batch.update(compRef, {
                                    status: 'approved',
                                    verifiedAt: serverTimestamp()
                                  });
                                  
                                  batch.update(userRef, {
                                    balance: increment(c.rewardEarned),
                                    withdrawableBalance: increment(c.rewardEarned),
                                    taskBalance: increment(c.rewardEarned),
                                    taskEarnings: increment(c.rewardEarned),
                                    updatedAt: serverTimestamp()
                                  });
                                  
                                  batch.set(transRef, {
                                    userId: user.uid,
                                    amount: c.rewardEarned,
                                    type: 'earning',
                                    status: 'completed',
                                    description: `Auto-Approved Completion`,
                                    createdAt: serverTimestamp()
                                  });
                                  
                                  await batch.commit();
                                  alert("Wallet credited successfully! Your balance will reflect this immediately.");
                                } catch (err: any) {
                                  alert("Failed to auto-approve: " + err.message);
                                }
                              }
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[9px] tracking-widest px-3 py-2 rounded-full shadow-md active:scale-95 transition-all shrink-0"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">All assets verified</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="deposit"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <DepositTab />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {selectedReceipt && (
          <TransactionReceipt 
            receipt={selectedReceipt} 
            onClose={() => setSelectedReceipt(null)} 
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

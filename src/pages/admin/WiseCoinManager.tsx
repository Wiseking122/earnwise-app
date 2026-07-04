import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../../components/Layout';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc,
  serverTimestamp,
  increment,
  limit,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { Search, Loader2, Wallet, TrendingUp, TrendingDown, RefreshCcw, History, User, Coins, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { WiseCoinTransaction, WiseCoinWallet } from '../../types/wise_coin';

const WiseCoinManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userWallet, setUserWallet] = useState<WiseCoinWallet | null>(null);
  const [transactions, setTransactions] = useState<WiseCoinTransaction[]>([]);
  
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const searchUser = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSelectedUser(null);
    setUserWallet(null);
    setTransactions([]);

    try {
      // Search by email first
      const q = query(collection(db, 'users'), where('email', '==', searchTerm.trim().toLowerCase()), limit(1));
      let snap = await getDocs(q);
      
      // If not found, search by username
      if (snap.empty) {
        const q2 = query(collection(db, 'users'), where('username', '==', searchTerm.trim().toLowerCase()), limit(1));
        snap = await getDocs(q2);
      }

      if (!snap.empty) {
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setSelectedUser(userData);
        fetchWallet(userData.id);
        fetchTransactions(userData.id);
      } else {
        alert('User not found');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const fetchWallet = (userId: string) => {
    onSnapshot(doc(db, 'wise_coin_wallets', userId), (snap) => {
      if (snap.exists()) {
        setUserWallet({ userId: snap.id, ...snap.data() } as WiseCoinWallet);
      } else {
        setUserWallet({ userId, balance: 0, updatedAt: null });
      }
    });
  };

  const fetchTransactions = (userId: string) => {
    const q = query(
      collection(db, 'wise_coin_transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WiseCoinTransaction));
      setTransactions(docs);
    });
  };

  const handleAction = async (action: 'credit' | 'deduction' | 'conversion') => {
    if (!selectedUser || !amount || !reason.trim()) {
      alert('Please fill all fields');
      return;
    }

    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;

    setProcessing(true);
    try {
      const actualAmount = action === 'deduction' || action === 'conversion' ? -val : val;
      
      // 1. Update Wallet
      const walletRef = doc(db, 'wise_coin_wallets', selectedUser.id);
      const walletSnap = await getDocs(query(collection(db, 'wise_coin_wallets'), where('userId', '==', selectedUser.id)));
      
      if (!walletSnap.empty) {
        await updateDoc(walletRef, {
          balance: increment(actualAmount),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(walletRef, {
          userId: selectedUser.id,
          balance: actualAmount,
          updatedAt: serverTimestamp()
        });
      }

      // 2. Log Transaction
      await addDoc(collection(db, 'wise_coin_transactions'), {
        userId: selectedUser.id,
        amount: val,
        action,
        reason: reason.trim(),
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // 3. If conversion, update Naira balance
      if (action === 'conversion') {
        const nairaAmount = val * 1; // Assuming 1 WC = 1 Naira for now or custom rate
        await updateDoc(doc(db, 'users', selectedUser.id), {
          balance: increment(nairaAmount),
          withdrawableBalance: increment(nairaAmount),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'coin_conversions'), {
          userId: selectedUser.id,
          wiseCoins: val,
          nairaAmount,
          createdAt: serverTimestamp()
        });

        // Log to main transactions too
        await addDoc(collection(db, 'transactions'), {
          userId: selectedUser.id,
          amount: nairaAmount,
          type: 'earning',
          description: `Wise Coin Conversion: ${val} WC to ₦${nairaAmount}`,
          createdAt: serverTimestamp()
        });
      }

      // 4. Send Notification
      const titles = {
        credit: '🪙 Wise Coins Credited!',
        deduction: '⚠️ Wise Coins Deducted',
        conversion: '🔄 Coins Converted to Naira'
      };
      
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUser.id,
        title: titles[action],
        message: action === 'conversion' 
          ? `You converted ${val} WC to ₦${val * 1}. Your balance has been updated.`
          : `Admin has ${action === 'credit' ? 'added' : 'removed'} ${val} WC to your account. Reason: ${reason}`,
        type: action === 'credit' ? 'reward' : 'alert',
        createdAt: serverTimestamp(),
        readBy: []
      });

      alert('Operation successful!');
      setShowCreditModal(false);
      setShowDeductModal(false);
      setShowConvertModal(false);
      setReason('');
    } catch (err: any) {
      console.error('Operation error:', err);
      alert('Operation failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout title="Wise Coin Manager" showBack>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-black text-white uppercase italic tracking-tight">Wise Coin Manager</h2>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Search users and manage WC balances</p>
          </div>
        </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            placeholder="Search by email or username..."
            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-blue-500/50 outline-none transition-all font-medium"
          />
        </div>
        <button
          onClick={searchUser}
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {selectedUser ? (
          <motion.div
            key={selectedUser.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* User Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-[2rem] border-2 border-white/5 flex items-center justify-center text-blue-500 shadow-2xl relative overflow-hidden">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-display font-black text-white uppercase italic tracking-tight">{selectedUser.displayName || selectedUser.username}</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{selectedUser.email}</p>
                  </div>

                  <div className="w-full pt-4 border-t border-white/5 space-y-3">
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <Coins size={16} className="text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">WC Balance</span>
                      </div>
                      <span className="text-lg font-display font-black text-amber-500">{userWallet?.balance || 0}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">NGN Balance</span>
                      </div>
                      <span className="text-lg font-display font-black text-emerald-500">₦{selectedUser.balance?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setShowCreditModal(true)}
                  className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-500/20 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/10"
                >
                  <TrendingUp size={16} />
                  Credit Wise Coins
                </button>
                <button
                  onClick={() => setShowDeductModal(true)}
                  className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-red-900/10"
                >
                  <TrendingDown size={16} />
                  Deduct Wise Coins
                </button>
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/20"
                >
                  <ArrowRightLeft size={16} />
                  Manual NGN Conversion
                </button>
              </div>
            </div>

            {/* Transaction History Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3 px-2">
                <History size={18} className="text-slate-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Transaction Ledger</h3>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden min-h-[400px]">
                {transactions.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                            tx.action === 'credit' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                            tx.action === 'deduction' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                            'bg-blue-500/10 border-blue-500/20 text-blue-500'
                          }`}>
                            {tx.action === 'credit' ? <TrendingUp size={18} /> : 
                             tx.action === 'deduction' ? <TrendingDown size={18} /> : 
                             <RefreshCcw size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{tx.reason}</p>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                              {tx.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-display font-black ${
                            tx.action === 'credit' ? 'text-emerald-400' :
                            tx.action === 'deduction' ? 'text-red-400' :
                            'text-blue-400'
                          }`}>
                            {tx.action === 'credit' ? '+' : '-'}{tx.amount} WC
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-slate-700">
                    <History size={48} className="mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No transactions logged</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-32 bg-slate-900/30 border border-white/5 rounded-[4rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent)]" />
            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner relative z-10">
              <User size={40} className="text-slate-800" />
            </div>
            <h3 className="font-display font-black text-white text-3xl uppercase tracking-tighter italic relative z-10">Select an Asset</h3>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-2 relative z-10">Search by email/username to manage balances</p>
          </div>
        )}
      </AnimatePresence>

      {/* Action Modals (Simplified) */}
      <AnimatePresence>
        {(showCreditModal || showDeductModal || showConvertModal) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => { setShowCreditModal(false); setShowDeductModal(false); setShowConvertModal(false); }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm relative z-10">
              <h3 className="text-2xl font-display font-black text-white mb-2 uppercase italic tracking-tight">
                {showCreditModal ? 'Credit WC' : showDeductModal ? 'Deduct WC' : 'WC Conversion'}
              </h3>
              <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest font-black">Admin Override Terminal</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Wise Coin Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-display font-black text-white focus:border-blue-500/50 outline-none transition-all"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs uppercase tracking-widest">WC</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Official Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-4 text-sm font-medium text-white focus:border-blue-500/50 outline-none transition-all resize-none"
                    placeholder="Enter administrative reason..."
                    rows={3}
                  />
                </div>

                {showConvertModal && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-4">
                    <div className="text-blue-500 mt-0.5">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Financial Impact</p>
                      <p className="text-[10px] text-blue-400/80 font-bold uppercase mt-1 leading-relaxed">
                        This will remove WC and instantly add NGN to the user's available balance (Rate: 1 WC = 1 NGN).
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowCreditModal(false); setShowDeductModal(false); setShowConvertModal(false); }} className="flex-1 py-4 bg-white/5 text-slate-500 font-black rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                  <button 
                    onClick={() => handleAction(showCreditModal ? 'credit' : showDeductModal ? 'deduction' : 'conversion')}
                    disabled={processing}
                    className={`flex-2 py-4 font-black rounded-xl transition-all shadow-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 ${
                      showCreditModal ? 'bg-emerald-500 text-white shadow-emerald-900/20' :
                      showDeductModal ? 'bg-red-500 text-white shadow-red-900/20' :
                      'bg-blue-600 text-white shadow-blue-900/20'
                    }`}
                  >
                    {processing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Execution'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </Layout>
  );
};

export default WiseCoinManager;

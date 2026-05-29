import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { WithdrawalRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  CreditCard, 
  User, 
  Wallet,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  History,
  Clock,
  ArrowDownLeft,
  X,
  Zap,
  ArrowUpRight,
  Loader2,
  Search
} from 'lucide-react';
import DepositTab from '../components/DepositTab';

export default function Withdrawal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'withdraw' | 'deposit'>('withdraw');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState(profile?.bankDetails?.bankName || '');
  const [bankCode, setBankCode] = useState(profile?.bankDetails?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(profile?.bankDetails?.accountNumber || '');
  const [accountName, setAccountName] = useState(profile?.bankDetails?.accountName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [banks, setBanks] = useState<{name: string, code: string}[]>([]);

  const [resolvingName, setResolvingName] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [isOpenBankDropdown, setIsOpenBankDropdown] = useState(false);

  // Auto-resolve account name when both bankCode and a 10-digit account number are provided
  useEffect(() => {
    const cleanNum = accountNumber.replace(/\D/g, '');
    if (cleanNum.length === 10 && bankCode) {
      let isCurrent = true;
      const rDelay = setTimeout(async () => {
        if (!isCurrent) return;
        setResolvingName(true);
        setResolveFeedback('');
        try {
          const response = await axios.get('/api/paystack/resolve', {
            params: { accountNumber: cleanNum, bankCode }
          });
          if (!isCurrent) return;
          if (response.data && response.data.data && response.data.data.account_name) {
            setAccountName(response.data.data.account_name);
            setResolveFeedback('Verified Account Owner');
          } else {
            setAccountName('');
            setResolveFeedback('Could not resolve account name');
          }
        } catch (err: any) {
          if (!isCurrent) return;
          const backendErr = err.response?.data?.error;
          console.warn("Account name resolution resulted in mismatch (expected for wrong inputs):", backendErr || err.message);
          setAccountName('');
          if (backendErr && (backendErr.includes('resolve') || backendErr.includes('validation') || backendErr.includes('check'))) {
            setResolveFeedback('Verification mismatch: Check number/bank');
          } else {
            setResolveFeedback(backendErr || 'Verification failed');
          }
        } finally {
          if (isCurrent) {
            setResolvingName(false);
          }
        }
      }, 400); // 400ms debounce to avoid spam while typing
      return () => {
        isCurrent = false;
        clearTimeout(rDelay);
      };
    } else {
      setResolveFeedback('');
    }
  }, [accountNumber, bankCode]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setWithdrawals(docs.sort((a,b) => {
        const timeA = (a.requestedAt as any)?.toMillis?.() || 0;
        const timeB = (b.requestedAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }));
      setLoadingHistory(false);
    });

    return () => unsub();
  }, [profile]);

  useEffect(() => {
    async function fetchBanks() {
      try {
        const response = await axios.get('/api/paystack/banks');
        if (response.data.status) {
          setBanks(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch banks", err);
      }
    }
    fetchBanks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 1000) {
      setError('Minimum withdrawal is ₦1,000.00');
      return;
    }
    if (withdrawAmount > (profile.withdrawableBalance || 0)) {
      setError('Insufficient balance');
      return;
    }

    if (!bankCode) {
      setError('Please select a bank');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update user bank details for future use
      await updateDoc(doc(db, 'users', profile.uid), {
        bankDetails: { bankName, bankCode, accountNumber, accountName }
      });

      // 2. Call automated withdrawal API
      const response = await axios.post('/api/paystack/withdraw', {
        userId: profile.uid,
        amount: withdrawAmount,
        bankDetails: { bankName, bankCode, accountNumber, accountName }
      });

      if (response.data.status === "success") {
        setSuccess(true);
        setTimeout(() => navigate('/earnings'), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Automated withdrawal failed. Please check your bank details.");
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <Layout title="Wallet Protocol" showBack>
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200">
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-4 px-6 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'withdraw' 
                ? 'bg-slate-950 text-white shadow-xl' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight size={16} />
            Withdraw
          </button>
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-4 px-6 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'deposit' 
                ? 'bg-slate-950 text-white shadow-xl' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft size={16} />
            Deposit
          </button>
        </div>

        {activeTab === 'withdraw' ? (
          <>
            {/* Available Balance Header */}
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600/20" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Grade Balance</p>
                    <h3 className="text-5xl font-display font-black tracking-tighter italic">
                      ₦{(profile?.withdrawableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-12 transition-transform">
                    <Wallet size={28} className="text-blue-500" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Payout protocol active via Paystack Node</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Transfer Quantum</h3>
                <div className="relative group">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 font-display font-black text-3xl text-slate-400 group-focus-within:text-blue-600 transition-colors">₦</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    required
                    min="1000"
                    step="0.01"
                    className="w-full bg-white border border-slate-100 rounded-[2.5rem] py-8 pl-18 pr-8 text-3xl font-display font-black focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Ledger Information</h3>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Target Bank</label>
                    <div className="relative">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpenBankDropdown(!isOpenBankDropdown);
                          setBankSearch('');
                        }}
                        className="w-full text-left bg-slate-50 border border-transparent rounded-2xl py-5 pl-14 pr-12 text-xs font-black uppercase tracking-tight hover:bg-slate-100/80 active:scale-[0.99] transition-all flex items-center justify-between relative"
                      >
                        <Building2 className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${isOpenBankDropdown ? 'text-blue-600' : 'text-slate-400'}`} size={20} />
                        <span className={bankCode ? 'text-slate-900 font-black' : 'text-slate-500 font-bold normal-case'}>
                          {bankName || 'Select Protocol Bank'}
                        </span>
                        <ChevronDown className={`text-slate-400 transition-transform duration-200 ${isOpenBankDropdown ? 'rotate-180 text-blue-600' : ''}`} size={18} />
                      </button>

                      <AnimatePresence>
                        {isOpenBankDropdown && (
                          <>
                            {/* Backdrop overlay to close when clicking outside */}
                            <div 
                              className="fixed inset-0 z-40 bg-transparent" 
                              onClick={() => {
                                setIsOpenBankDropdown(false);
                                setBankSearch('');
                              }} 
                            />
                            
                            {/* Dropdown panel */}
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden z-50 max-h-80 flex flex-col"
                            >
                              {/* Search Bar Input */}
                              <div className="p-4 border-b border-slate-100 relative flex items-center bg-slate-50/50">
                                <Search className="absolute left-8 text-slate-400" size={16} />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Search bank name..."
                                  className="w-full bg-white border border-slate-100 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                  value={bankSearch}
                                  onChange={(e) => setBankSearch(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setIsOpenBankDropdown(false);
                                      setBankSearch('');
                                    }
                                  }}
                                />
                              </div>

                              {/* Banks list */}
                              <div className="overflow-y-auto max-h-56 no-scrollbar p-2 space-y-1">
                                {filteredBanks.length > 0 ? (
                                  filteredBanks.map((bank, index) => {
                                    const isSelected = bank.code === bankCode;
                                    return (
                                      <button
                                        key={`${bank.code}-${index}`}
                                        type="button"
                                        onClick={() => {
                                          setBankCode(bank.code);
                                          setBankName(bank.name);
                                          setIsOpenBankDropdown(false);
                                          setBankSearch('');
                                        }}
                                        className={`w-full text-left px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center justify-between ${
                                          isSelected 
                                            ? 'bg-blue-50/80 text-blue-700 font-extrabold' 
                                            : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                                        }`}
                                      >
                                        <span className="truncate">{bank.name}</span>
                                        {isSelected && (
                                          <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-6 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                    No protocol bank found
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Account Coordinate</label>
                    <div className="relative group">
                      <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      <input 
                        type="text" 
                        placeholder="Enter 10-digit account number"
                        required
                        className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-14 pr-6 text-xs font-black tracking-tight focus:ring-2 focus:ring-blue-500 transition-all"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex justify-between items-center ml-4 mr-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Identity</label>
                      {resolvingName && (
                        <span className="text-[9px] text-blue-500 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Resolving Name
                        </span>
                      )}
                      {!resolvingName && resolveFeedback && (
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          resolveFeedback.includes('Verified') ? 'text-emerald-500' : 'text-amber-500'
                        }`}>
                          {resolveFeedback.includes('Verified') ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {resolveFeedback}
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                      <input 
                        type="text" 
                        placeholder={resolvingName ? "Querying secure gateway..." : "Full name as on bank record"}
                        required
                        className={`w-full bg-slate-50 border-none rounded-2xl py-5 pl-14 pr-6 text-xs font-black tracking-tight focus:ring-2 focus:ring-blue-500 transition-all ${
                          resolvingName ? 'opacity-70 cursor-wait select-none' : ''
                        }`}
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        disabled={resolvingName}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 text-rose-700 shadow-xl"
                >
                  <AlertCircle size={24} />
                  <p className="text-sm font-black uppercase tracking-tight">{error || "Automated withdrawal failed. Check bank details."}</p>
                </motion.div>
              )}

              <button 
                disabled={loading || success}
                className={`w-full py-8 rounded-[2.5rem] font-display font-black text-sm uppercase tracking-[0.2em] italic shadow-2xl transition-all flex items-center justify-center gap-4 group/btn ${
                  success 
                    ? 'bg-emerald-500 text-white shadow-emerald-900/20' 
                    : 'bg-slate-950 text-white hover:bg-blue-600 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : success ? (
                  <>
                    <CheckCircle2 size={24} /> Protocol Finalized
                  </>
                ) : (
                  <>
                    <span>Execute Payout</span>
                    <ArrowUpRight size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform opacity-50" />
                  </>
                )}
              </button>
            </form>

            <div className="bg-blue-50 rounded-[2rem] p-6 flex gap-4 border border-blue-100 italic relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-r from-blue-600/5 to-transparent" />
              <Zap className="text-blue-600 flex-shrink-0 animate-pulse relative z-10" size={24} />
              <div className="relative z-10">
                <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Automated Node Settlement</h4>
                <p className="text-[10px] text-blue-800 leading-relaxed font-bold uppercase tracking-tighter mt-1">Withdrawals are processed via real-time Paystack synchronization. Settlement is usually completed within 280ms of network confirmation.</p>
              </div>
            </div>

            {/* Withdrawal History */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <History size={16} />
                  Historical Protocol Data
                </h3>
              </div>
              
              <div className="space-y-4">
                {loadingHistory ? (
                  [1,2].map(i => <div key={`skeleton-withdraw-${i}`} className="h-24 bg-slate-50 rounded-[2rem] animate-pulse" />)
                ) : withdrawals.length > 0 ? (
                  withdrawals.map((w, index) => (
                    <div key={w.id || index} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-100 transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                          w.status === 'completed' || w.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white' : 
                          w.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white' : 
                          'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white'
                        }`}>
                          {w.status === 'completed' || w.status === 'approved' ? <CheckCircle2 size={24} /> : 
                           w.status === 'rejected' ? <X size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <h4 className="font-display font-black text-slate-900 text-xl italic tracking-tighter">₦{w.amount.toLocaleString()}</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {w.requestedAt?.toDate?.()?.toLocaleDateString() || 'Recently'} • {w.status}
                          </p>
                        </div>
                      </div>
                      <div className="hidden md:block">
                        <ChevronDown className="-rotate-90 text-slate-200" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No active ledger history detected</p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <DepositTab />
        )}
      </div>
    </Layout>
  );
}

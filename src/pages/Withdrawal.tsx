import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc, collection, query, where, limit, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { WithdrawalRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import AnimatedNumber from '../components/AnimatedNumber';
import Confetti from '../components/Confetti';
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
import WithdrawalTimeline from '../components/WithdrawalTimeline';

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
  const [withdrawalType, setWithdrawalType] = useState<'task' | 'referral'>('task');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [banks, setBanks] = useState<{name: string, code: string}[]>([]);

  const [resolvingName, setResolvingName] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [isOpenBankDropdown, setIsOpenBankDropdown] = useState(false);

  const [payoutSettings, setPayoutSettings] = useState<any>(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState('');
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  // Poll system setting payouts variables
  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(doc(db, 'system_settings', 'payouts'), (docSnap) => {
      if (docSnap.exists()) {
        setPayoutSettings(docSnap.data());
      }
    }, (error) => {
      console.warn("Retrying system settings read...", error);
    });
    return () => unsub();
  }, [profile]);

  // Window ticking remains handler
  useEffect(() => {
    const getInterval = () => {
      const now = new Date();

      if (payoutSettings && payoutSettings.payoutsForceClosed) {
        setIsWindowOpen(false);
        setTimeRemainingStr('Admin Kill-Switch Active');
        return;
      }

      const isTaskOverride = !!payoutSettings?.taskOverrideOpen;
      const isReferralOverride = !!payoutSettings?.referralOverrideOpen;
      
      if (withdrawalType === 'task') {
        const is30th = now.getDate() === 30;
        if (isTaskOverride) {
          setIsWindowOpen(true);
          setTimeRemainingStr('🔓 Special Admin Task Withdrawal Window Active!');
        } else if (is30th) {
          setIsWindowOpen(true);
          setTimeRemainingStr('Task Payout Window Active (Ends Midnight)');
        } else {
          setIsWindowOpen(false);
          setTimeRemainingStr('📺 Video Task portal opens monthly on the 30th');
        }
      } else if (withdrawalType === 'referral') {
        const isSaturday = now.getDay() === 6;
        const currentHour = now.getHours();
        const isOpenHours = currentHour >= 8 && currentHour < 18; // 8:00 AM to 6:00 PM
        
        if (isReferralOverride) {
          setIsWindowOpen(true);
          setTimeRemainingStr('🔓 Special Admin Referral Withdrawal Window Active!');
        } else if (isSaturday && isOpenHours) {
          setIsWindowOpen(true);
          setTimeRemainingStr('Referral Payout Window Active (Ends 6:00 PM)');
        } else {
          setIsWindowOpen(false);
          setTimeRemainingStr('🗓️ Referral portal opens Saturdays 8:00 AM – 6:00 PM');
        }
      }
    };

    getInterval();
    const intervalId = setInterval(getInterval, 1000);
    return () => clearInterval(intervalId);
  }, [payoutSettings, withdrawalType]);

  // Help tier calculation limits
  function getPlanWithdrawalCap(plan: string): number {
    switch (plan) {
      case 'elite': return 3000;
      case 'starter': return 6000;
      case 'pro': return 9000;
      case 'bronze': return 15000;
      case 'diamond': return 21000;
      case 'silver': return 30000;
      case 'platinum': return 45000;
      case 'golden': return 75000;
      default: return 0; // Free cannot execute withdrawals
    }
  }

  const getCumulativeWithdrawalsInWindow = () => {
    if (!payoutSettings?.payoutStartDate || !payoutSettings?.payoutEndDate) return 0;
    const start = new Date(payoutSettings.payoutStartDate);
    const end = new Date(payoutSettings.payoutEndDate);
    
    return withdrawals
      .filter(w => {
        if (w.status === 'rejected') return false;
        const reqDate = w.requestedAt ? new Date((w.requestedAt as any).toDate?.() || w.requestedAt) : new Date();
        return reqDate >= start && reqDate <= end;
      })
      .reduce((sum, w) => sum + w.amount, 0);
  };

  // Cumulative pending requests to dodge double-spend attempts
  const getPendingWithdrawalTotal = (type: 'task' | 'referral') => {
    return withdrawals
      .filter(w => w.status === 'pending' && w.withdrawalType === type)
      .reduce((sum, w) => sum + w.amount, 0);
  };

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
          console.warn("Account name resolution resulted in mismatch:", backendErr || err.message);
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
      }, 400);
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
    
    // Guard: Check if window is open
    if (!isWindowOpen) {
      setError("Payout Gateway Closed. Processing windows are strictly scheduled by Administration.");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 1000) {
      setError('Minimum withdrawal is ₦1,000.00');
      return;
    }

    // Check Plan Cap Limit for Window
    const plan = profile.plan || 'free';
    const cap = getPlanWithdrawalCap(plan);
    if (plan === 'free' || cap === 0) {
      setError('Free plans do not have payout capacity. Please upgrade to a verified plan.');
      return;
    }

    const currentWindowRequests = getCumulativeWithdrawalsInWindow();
    if (currentWindowRequests + withdrawAmount > cap) {
      setError(`Payout request exceeds your plan's window limit. Your maximum window capacity is ₦${cap.toLocaleString()}, and you have already requested ₦${currentWindowRequests.toLocaleString()} in this session.`);
      return;
    }

    // Direct Wallet selection checks (taskBalance vs referralBalance)
    const walletBalance = withdrawalType === 'task' 
      ? (profile.taskBalance || 0) 
      : (profile.referralBalance || 0);

    const pendingRequestsTotal = getPendingWithdrawalTotal(withdrawalType);
    const availableFunds = Math.max(0, walletBalance - pendingRequestsTotal);

    if (withdrawAmount > availableFunds) {
      setError(`Insufficient balance. Selected ${withdrawalType === 'task' ? 'Task' : 'Referral'} balance is ₦${walletBalance.toLocaleString()}. After accounting for ₦${pendingRequestsTotal.toLocaleString()} in other pending requests, you can only withdraw up to ₦${availableFunds.toLocaleString()}.`);
      return;
    }

    if (!bankCode) {
      setError('Please select a bank');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Save user bank information for future requests
      await updateDoc(doc(db, 'users', profile.uid), {
        bankDetails: { bankName, bankCode, accountNumber, accountName }
      });

      // 2. Submit new pending manual payout request directly to firestore
      const newWithdrawalRef = doc(collection(db, 'withdrawals'));
      await setDoc(newWithdrawalRef, {
        userId: profile.uid,
        amount: withdrawAmount,
        status: 'pending',
        withdrawalType,
        bankDetails: { bankName, bankCode, accountNumber, accountName },
        requestedAt: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => navigate('/earnings'), 3000);
    } catch (err: any) {
      console.error("Manual withdrawal dispatch failed", err);
      setError(err?.message || "Manual request compilation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const planCap = getPlanWithdrawalCap(profile?.plan || 'free');
  const currentWindowRequestsTotal = getCumulativeWithdrawalsInWindow();

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <Layout title="Wallet Protocol" showBack>
      {success && <Confetti />}
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
            {/* Real-time Status Alert Banner */}
            <div className={`p-6 rounded-[2rem] border transition-all flex items-center gap-4 ${
              isWindowOpen 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${isWindowOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <div className="flex-1 text-left">
                <p className="text-xs font-black uppercase tracking-wider">
                  {isWindowOpen ? "Settlement Window Open" : "Payout Gateway Closed"}
                </p>
                <p className="text-[10px] font-bold uppercase opacity-85 mt-0.5 leading-relaxed">
                  {isWindowOpen ? (
                    timeRemainingStr || "Processing windows are strictly scheduled by Administration."
                  ) : (
                    `🔒 Payout portal is currently closed. Next scheduled window: ${
                      payoutSettings?.payoutStartDate 
                        ? new Date(payoutSettings.payoutStartDate).toLocaleString() 
                        : 'Unscheduled'
                    }`
                  )}
                </p>
              </div>
            </div>

            {/* Available Balance Header */}
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600/20" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      {withdrawalType === 'task' ? 'Task Wallet Balance' : 'Referral Wallet Balance'}
                    </p>
                    <h3 className="text-5xl font-display font-black tracking-tighter italic">
                      ₦<AnimatedNumber value={withdrawalType === 'task' ? (profile?.taskBalance || 0) : (profile?.referralBalance || 0)} fractionDigits={2} />
                    </h3>
                  </div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-12 transition-transform">
                    <Wallet size={28} className="text-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider text-left">Task Balance</p>
                    <p className="text-sm font-black text-slate-200 text-left">₦{(profile?.taskBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider text-left">Referral Balance</p>
                    <p className="text-sm font-black text-slate-200 text-left">₦{(profile?.referralBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-white/5">
                  <span>Current Cap: ₦{planCap.toLocaleString()} ({profile?.plan || 'free'} tier)</span>
                  <span>Session Requested: ₦{currentWindowRequestsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Withdrawal Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!isWindowOpen}
                onClick={() => setWithdrawalType('task')}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden disabled:opacity-50 ${
                  withdrawalType === 'task' 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xl scale-[1.02]' 
                    : 'bg-white border-slate-100 text-slate-900 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <Zap size={16} className={withdrawalType === 'task' ? 'text-blue-200' : 'text-blue-600'} />
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${withdrawalType === 'task' ? 'bg-white/20' : 'bg-blue-50'}`}>
                    <span className={`w-1 h-1 rounded-full ${isWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${withdrawalType === 'task' ? 'text-white' : 'text-blue-600'}`}>
                      Task
                    </span>
                  </div>
                </div>
                <div className="relative z-10 text-left">
                  <span className="text-xs font-black uppercase tracking-tighter block">Task Payout</span>
                  <span className={`text-[8px] font-bold uppercase opacity-80 mt-0.5 block ${withdrawalType === 'task' ? 'text-blue-100' : 'text-slate-400'}`}>Schedule Enabled</span>
                </div>
                {withdrawalType === 'task' && <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />}
              </button>

              <button
                type="button"
                disabled={!isWindowOpen}
                onClick={() => setWithdrawalType('referral')}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden disabled:opacity-50 ${
                  withdrawalType === 'referral' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-[1.02]' 
                    : 'bg-white border-slate-100 text-slate-900 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <User size={16} className={withdrawalType === 'referral' ? 'text-emerald-200' : 'text-emerald-600'} />
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${withdrawalType === 'referral' ? 'bg-white/20' : 'bg-emerald-50'}`}>
                    <span className={`w-1 h-1 rounded-full ${isWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${withdrawalType === 'referral' ? 'text-white' : 'text-emerald-600'}`}>
                      Referral
                    </span>
                  </div>
                </div>
                <div className="relative z-10 text-left">
                  <span className="text-xs font-black uppercase tracking-tighter block">Referral Payout</span>
                  <span className={`text-[8px] font-bold uppercase opacity-80 mt-0.5 block ${withdrawalType === 'referral' ? 'text-emerald-100' : 'text-slate-400'}`}>Schedule Enabled</span>
                </div>
                {withdrawalType === 'referral' && <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Transfer Quantum</h3>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-display font-black text-xl text-slate-400 group-focus-within:text-blue-600 transition-colors">₦</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    required
                    min="1000"
                    step="0.01"
                    disabled={!isWindowOpen}
                    className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-2xl font-display font-black focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                {parseFloat(amount) >= 1000 && (
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider px-4">
                    A 5% processing fee applies. You will receive: ₦{(parseFloat(amount) * 0.95).toLocaleString(undefined, { minimumFractionDigits: 2 })} (Fee: ₦{(parseFloat(amount) * 0.05).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </p>
                )}
              </div>

              <div className="space-y-4 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Ledger Information</h3>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Target Bank</label>
                    <div className="relative">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        disabled={!isWindowOpen}
                        onClick={() => {
                          setIsOpenBankDropdown(!isOpenBankDropdown);
                          setBankSearch('');
                        }}
                        className="w-full text-left bg-slate-50 border border-transparent rounded-xl py-3 pl-11 pr-8 text-xs font-black uppercase tracking-tight hover:bg-slate-100/80 active:scale-[0.99] transition-all flex items-center justify-between relative disabled:opacity-50"
                      >
                        <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isOpenBankDropdown ? 'text-blue-600' : 'text-slate-400'}`} size={16} />
                        <span className={bankCode ? 'text-slate-900 font-black' : 'text-slate-500 font-bold normal-case'}>
                          {bankName || 'Select Protocol Bank'}
                        </span>
                        <ChevronDown className={`text-slate-400 transition-transform duration-200 ${isOpenBankDropdown ? 'rotate-180 text-blue-600' : ''}`} size={16} />
                      </button>

                      <AnimatePresence>
                        {isOpenBankDropdown && (
                          <motion.div
                            key="bank-dropdown-portal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-[500] max-h-80 flex flex-col"
                          >
                            {/* Backdrop overlay inside the motion div for better coordination */}
                            <div 
                              className="fixed inset-0 -z-1 bg-black/5" 
                              onClick={() => {
                                setIsOpenBankDropdown(false);
                                setBankSearch('');
                              }} 
                            />
                            
                            {/* Search Bar Input */}
                            <div className="p-3 border-b border-slate-100 relative flex items-center bg-slate-50/50 z-10">
                              <Search className="absolute left-6 text-slate-400" size={14} />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search bank name..."
                                className="w-full bg-white border border-slate-100 rounded-xl py-2 pl-9 pr-4 text-xs font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                              />
                            </div>

                            {/* Banks list */}
                            <div className="overflow-y-auto max-h-56 no-scrollbar p-2 space-y-1 z-10">
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
                                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center justify-between ${
                                        isSelected 
                                          ? 'bg-blue-50/80 text-blue-700 font-extrabold' 
                                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                                      }`}
                                    >
                                      <span className="truncate">{bank.name}</span>
                                      {isSelected && (
                                        <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="text-center py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                  No protocol bank found
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Account Coordinate</label>
                    <div className="relative group">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder="Enter 10-digit account number"
                        required
                        disabled={!isWindowOpen}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl py-3 pl-11 pr-4 text-xs font-black tracking-tight focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-950 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex justify-between items-center ml-4 mr-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Identity</label>
                      {resolvingName && (
                        <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Resolving Name
                        </span>
                      )}
                      {!resolvingName && resolveFeedback && (
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          resolveFeedback.includes('Verified') ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {resolveFeedback.includes('Verified') ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {resolveFeedback}
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder={resolvingName ? "Querying secure gateway..." : "Full name as on bank record"}
                        required
                        disabled={!isWindowOpen || resolvingName}
                        className={`w-full bg-slate-50 border-none rounded-xl py-3 pl-11 pr-4 text-xs font-black tracking-tight focus:ring-2 focus:ring-blue-500 transition-all text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed ${
                          resolvingName ? 'opacity-70 cursor-wait select-none' : ''
                        }`}
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700 shadow-md"
                >
                  <AlertCircle size={20} />
                  <p className="text-xs font-black uppercase tracking-tight">{error || "Automated withdrawal failed. Check bank details."}</p>
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={loading || success || !isWindowOpen}
                className={`w-full py-4 rounded-2xl font-display font-black text-xs uppercase tracking-[0.2em] italic shadow-2xl transition-all flex items-center justify-center gap-3 group/btn ${
                  success 
                    ? 'bg-emerald-500 text-white shadow-emerald-900/20' 
                    : !isWindowOpen
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-900/10'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : success ? (
                  <>
                    <CheckCircle2 size={16} /> Protocol Finalized
                  </>
                ) : !isWindowOpen ? (
                  <>
                    <span>🔒 Closed: Gateway Locked</span>
                  </>
                ) : (
                  <>
                    <span>🟢 Active: Withdraw Now</span>
                    <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform opacity-50" />
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
                          <WithdrawalTimeline status={w.status || 'submitted'} />
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

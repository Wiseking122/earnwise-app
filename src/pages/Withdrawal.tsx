import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc, collection, query, where, limit, onSnapshot, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
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
import { getApiUrl } from '../lib/config';
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

  const [isSavingBank, setIsSavingBank] = useState(false);

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
      
      let customScheduleStr = '';
      const isCustomScheduleActive = (() => {
        if (!payoutSettings?.payoutStartDate || !payoutSettings?.payoutEndDate) return false;
        const start = new Date(payoutSettings.payoutStartDate);
        const end = new Date(payoutSettings.payoutEndDate);
        if (now >= start && now <= end) {
          const hoursLeft = Math.max(0, Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60)));
          customScheduleStr = `Scheduled Window Active (${hoursLeft}h left)`;
          return true;
        }
        return false;
      })();
      
      if (withdrawalType === 'task') {
        const is30th = now.getDate() === 30;
        if (isTaskOverride) {
          setIsWindowOpen(true);
          setTimeRemainingStr('🔓 Special Admin Task Withdrawal Window Active!');
        } else if (isCustomScheduleActive) {
          setIsWindowOpen(true);
          setTimeRemainingStr('📅 ' + customScheduleStr);
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
        } else if (isCustomScheduleActive) {
          setIsWindowOpen(true);
          setTimeRemainingStr('📅 ' + customScheduleStr);
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
      default: return 0; // Free cannot execute withdrawals unless they are an admin
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
      .filter(w => w.status === 'pending' && w.withdrawalType === type && !(w as any).deductedAtRequest)
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
          const res = await fetch(getApiUrl(`/api/paystack/resolve?accountNumber=${cleanNum}&bankCode=${bankCode}`));
          const data = await res.json();
          
          if (!isCurrent) return;
          if (data && data.data && data.data.account_name) {
            setAccountName(data.data.account_name);
            setResolveFeedback('Verified Account Owner');
          } else {
            setAccountName('');
            setResolveFeedback('Could not resolve account name');
          }
        } catch (err: any) {
          if (!isCurrent) return;
          console.warn("Account name resolution resulted in mismatch:", err.message);
          setAccountName('');
          setResolveFeedback('Verification failed');
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
    let retryCount = 0;
    const maxRetries = 3;

    async function fetchBanks() {
      try {
        const banksUrl = getApiUrl('/api/paystack/banks');
        console.log(`[PAYMENT] Attempting to fetch banks from: ${banksUrl}`);
        const res = await fetch(banksUrl);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.status && data.data) {
          setBanks(data.data);
          console.log(`[PAYMENT] Successfully loaded ${data.data.length} banks.`);
        } else {
          throw new Error(data.message || 'Malformed bank data received');
        }
      } catch (err: any) {
        console.error(`[PAYMENT] Bank fetch attempt ${retryCount + 1} failed:`, err.message);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchBanks, 1500 * retryCount); // Exponential backoff
        } else {
          console.error("[PAYMENT] Max retries reached for bank fetching.");
        }
      }
    }
    fetchBanks();
  }, []);

  const handleSaveBankDetails = async () => {
    if (!profile) return;
    if (!bankCode || !accountNumber || !accountName) {
      setError('Please fill in all bank details to save');
      return;
    }
    setIsSavingBank(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        bankDetails: { bankName, bankCode, accountNumber, accountName }
      });
      setResolveFeedback('Bank details updated securely');
    } catch (err: any) {
      console.error("Failed to save bank details", err);
      setError("Failed to save bank details");
    } finally {
      setIsSavingBank(false);
    }
  };

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
    const isAdmin = profile.role === 'admin';
    const cap = isAdmin ? 1000000000 : getPlanWithdrawalCap(plan);
    
    if (!isAdmin && (plan === 'free' || cap === 0)) {
      setError('Free plans do not have payout capacity. Please upgrade to a verified plan.');
      return;
    }

    const currentWindowRequests = getCumulativeWithdrawalsInWindow();
    if (!isAdmin && (currentWindowRequests + withdrawAmount > cap)) {
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
      // Submit manual payout request & deduct balance atomically via a transaction
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', profile.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("Your user profile was not found.");
        }

        const userData = userSnap.data();
        const freshWalletBalance = withdrawalType === 'task' 
          ? (userData.taskBalance || 0) 
          : (userData.referralBalance || 0);

        // Calculate available funds taking legacy (undeducted) pending ones into account
        const freshPendingTotal = withdrawals
          .filter(w => w.status === 'pending' && w.withdrawalType === withdrawalType && !(w as any).deductedAtRequest)
          .reduce((sum, w) => sum + w.amount, 0);
        
        const freshAvailable = Math.max(0, freshWalletBalance - freshPendingTotal);

        if (withdrawAmount > freshAvailable) {
          throw new Error(`Insufficient funds. Your fresh available balance is ₦${freshAvailable.toLocaleString()}.`);
        }

        // Deduct balances immediately
        const walletField = withdrawalType === 'task' ? 'taskBalance' : 'referralBalance';
        const updatedWalletBalance = freshWalletBalance - withdrawAmount;
        const updatedWithdrawableBalance = Math.max(0, (userData.withdrawableBalance || 0) - withdrawAmount);
        const updatedTotalBalance = Math.max(0, (userData.balance || 0) - withdrawAmount);

        // Update user balances and bankDetails
        transaction.update(userRef, {
          bankDetails: { bankName, bankCode, accountNumber, accountName },
          [walletField]: updatedWalletBalance,
          withdrawableBalance: updatedWithdrawableBalance,
          balance: updatedTotalBalance
        });

        // Set the pending withdrawal document
        const newWithdrawalRef = doc(collection(db, 'withdrawals'));
        transaction.set(newWithdrawalRef, {
          userId: profile.uid,
          amount: withdrawAmount,
          status: 'pending',
          withdrawalType,
          bankDetails: { bankName, bankCode, accountNumber, accountName },
          requestedAt: serverTimestamp(),
          deductedAtRequest: true
        });
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

  const isAdminUser = profile?.role === 'admin';
  const planCap = isAdminUser ? 1000000000 : getPlanWithdrawalCap(profile?.plan || 'free');
  const currentWindowRequestsTotal = getCumulativeWithdrawalsInWindow();

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <Layout title="Wallet Protocol" showBack>
      {success && <Confetti />}
      <div className="p-3.5 sm:p-5 pb-24 space-y-4 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2 px-3 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'withdraw' 
                ? 'bg-slate-950 text-white shadow-xl' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight size={14} />
            Withdraw
          </button>
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 px-3 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'deposit' 
                ? 'bg-slate-950 text-white shadow-xl' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft size={14} />
            Deposit
          </button>
        </div>

        {activeTab === 'withdraw' ? (
          <>
            {/* Real-time Status Alert Banner */}
            <div className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
              isWindowOpen 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWindowOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">
                  {isWindowOpen ? "Settlement Window Open" : "Payout Gateway Closed"}
                </p>
                <p className="text-[9px] font-bold uppercase opacity-85 mt-0.5 leading-normal">
                  {isWindowOpen ? (
                    timeRemainingStr || "Processing windows are strictly scheduled by Administration."
                  ) : (
                    `🔒 Closed. Next: ${
                      payoutSettings?.payoutStartDate 
                        ? new Date(payoutSettings.payoutStartDate).toLocaleDateString() 
                        : 'Unscheduled'
                    }`
                  )}
                </p>
              </div>
            </div>

            {/* Available Balance Header */}
            <div className="bg-slate-950 rounded-xl p-4 sm:p-6 text-white relative overflow-hidden shadow-xl group border border-white/5">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600/20" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
              
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0 flex-1 text-left">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] truncate">
                      {withdrawalType === 'task' ? 'Task Wallet Balance' : 'Referral Wallet Balance'}
                    </p>
                    <h3 className="text-2xl sm:text-4xl font-display font-black tracking-tighter italic truncate">
                      ₦<AnimatedNumber value={withdrawalType === 'task' ? (profile?.taskBalance || 0) : (profile?.referralBalance || 0)} fractionDigits={2} />
                    </h3>
                  </div>
                  <div className="w-9 h-9 sm:w-12 sm:h-12 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-12 transition-transform shrink-0">
                    <Wallet size={16} className="text-blue-500 sm:w-6 sm:h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider text-left">Task Balance</p>
                    <p className="text-xs sm:text-sm font-black text-slate-200 text-left">₦{(profile?.taskBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider text-left">Referral Balance</p>
                    <p className="text-xs sm:text-sm font-black text-slate-200 text-left">₦{(profile?.referralBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-white/5">
                  <span>Current Cap: {isAdminUser ? "Unlimited (Admin Bypass)" : `₦${planCap.toLocaleString()} (${profile?.plan || 'free'} tier)`}</span>
                  <span>Session Requested: ₦{currentWindowRequestsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Withdrawal Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWithdrawalType('task')}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                  withdrawalType === 'task' 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-[1.01]' 
                    : 'bg-white border-slate-100 text-slate-900 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <Zap size={14} className={withdrawalType === 'task' ? 'text-blue-200' : 'text-blue-600'} />
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${withdrawalType === 'task' ? 'bg-white/20' : 'bg-blue-50'}`}>
                    <span className={`w-1 h-1 rounded-full ${isWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${withdrawalType === 'task' ? 'text-white' : 'text-blue-600'}`}>
                      Task
                    </span>
                  </div>
                </div>
                <div className="relative z-10 text-left">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-tighter block">Task Payout</span>
                  <span className={`text-[8px] font-bold uppercase opacity-85 mt-0.5 block ${withdrawalType === 'task' ? 'text-blue-100' : 'text-slate-400'}`}>Schedule Enabled</span>
                </div>
                {withdrawalType === 'task' && <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />}
              </button>

              <button
                type="button"
                onClick={() => setWithdrawalType('referral')}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                  withdrawalType === 'referral' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg scale-[1.01]' 
                    : 'bg-white border-slate-100 text-slate-900 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <User size={14} className={withdrawalType === 'referral' ? 'text-emerald-200' : 'text-emerald-600'} />
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${withdrawalType === 'referral' ? 'bg-white/20' : 'bg-emerald-50'}`}>
                    <span className={`w-1 h-1 rounded-full ${isWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${withdrawalType === 'referral' ? 'text-white' : 'text-emerald-600'}`}>
                      Referral
                    </span>
                  </div>
                </div>
                <div className="relative z-10 text-left">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-tighter block">Referral Payout</span>
                  <span className={`text-[8px] font-bold uppercase opacity-85 mt-0.5 block ${withdrawalType === 'referral' ? 'text-emerald-100' : 'text-slate-400'}`}>Schedule Enabled</span>
                </div>
                {withdrawalType === 'referral' && <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Transfer Quantum</h3>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-black text-lg text-slate-400 group-focus-within:text-blue-600 transition-colors">₦</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    required
                    min="1000"
                    step="0.01"
                    className="w-full bg-white border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xl sm:text-2xl font-display font-black focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                {parseFloat(amount) >= 1000 && (
                  <p className={`text-[9px] font-black uppercase tracking-wider px-4 ${withdrawalType === 'task' ? 'text-blue-600' : 'text-emerald-600'}`}>
                    {withdrawalType === 'task' ? (
                      `A 5% processing fee applies. You receive: ₦${(parseFloat(amount) * 0.95).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                      `Referral withdrawals are 100% free of charge! You receive: ₦${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ledger Information</h3>
                  <button
                    type="button"
                    onClick={handleSaveBankDetails}
                    disabled={isSavingBank || !bankCode || !accountNumber || !accountName || resolvingName}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {isSavingBank ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
                <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-100 shadow-sm space-y-3">
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Target Bank</label>
                    <div className="relative">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpenBankDropdown(!isOpenBankDropdown);
                          setBankSearch('');
                        }}
                        className="w-full text-left bg-slate-50 border border-transparent rounded-lg py-2.5 pl-10 pr-8 text-xs font-black uppercase tracking-tight hover:bg-slate-100/80 active:scale-[0.99] transition-all flex items-center justify-between relative disabled:opacity-50"
                      >
                        <Building2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${isOpenBankDropdown ? 'text-blue-600' : 'text-slate-400'}`} size={14} />
                        <span className={bankCode ? 'text-slate-900 font-black' : 'text-slate-500 font-bold normal-case'}>
                          {bankName || 'Select Protocol Bank'}
                        </span>
                        <ChevronDown className={`text-slate-400 transition-transform duration-200 ${isOpenBankDropdown ? 'rotate-180 text-blue-600' : ''}`} size={14} />
                      </button>

                      <AnimatePresence>
                        {isOpenBankDropdown && (
                          <motion.div
                            key="bank-dropdown-portal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-[500] max-h-80 flex flex-col"
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
                            <div className="p-2 border-b border-slate-100 relative flex items-center bg-slate-50/50 z-10">
                              <Search className="absolute left-5 text-slate-400" size={12} />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search bank name..."
                                className="w-full bg-white border border-slate-100 rounded-lg py-1.5 pl-8 pr-4 text-xs font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                              />
                            </div>

                            {/* Banks list */}
                            <div className="overflow-y-auto max-h-56 no-scrollbar p-1.5 space-y-1 z-10">
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
                                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center justify-between ${
                                        isSelected 
                                          ? 'bg-blue-50/80 text-blue-700 font-extrabold' 
                                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                                      }`}
                                    >
                                      <span className="truncate">{bank.name}</span>
                                      {isSelected && (
                                        <CheckCircle2 size={12} className="text-blue-600 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="text-center py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                  No bank found
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Account Coordinate</label>
                    <div className="relative group">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={14} />
                      <input 
                        type="text" 
                        placeholder="Enter 10-digit account number"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs font-black tracking-tight focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-950 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 flex flex-col">
                    <div className="flex justify-between items-center ml-4 mr-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Identity</label>
                      {resolvingName && (
                        <span className="text-[8px] text-blue-600 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Resolving Name
                        </span>
                      )}
                      {!resolvingName && resolveFeedback && (
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          resolveFeedback.includes('Verified') ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {resolveFeedback.includes('Verified') ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {resolveFeedback}
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={14} />
                      <input 
                        type="text" 
                        placeholder={resolvingName ? "Querying secure gateway..." : "Full name as on bank record"}
                        required
                        disabled={resolvingName}
                        className={`w-full bg-slate-50 border-none rounded-lg py-2.5 pl-10 pr-4 text-xs font-black tracking-tight focus:ring-2 focus:ring-blue-500 transition-all text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-2.5 text-rose-700 shadow-sm"
                >
                  <AlertCircle size={16} />
                  <p className="text-xs font-black uppercase tracking-tight">{error || "Automated withdrawal failed."}</p>
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={loading || success || !isWindowOpen}
                className={`w-full py-2.5 sm:py-3 rounded-lg font-display font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] italic shadow-lg transition-all flex items-center justify-center gap-2.5 group/btn ${
                  success 
                    ? 'bg-emerald-500 text-white shadow-emerald-900/20' 
                    : !isWindowOpen
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : success ? (
                  <>
                    <CheckCircle2 size={14} /> Protocol Finalized
                  </>
                ) : !isWindowOpen ? (
                  <>
                    <span>🔒 Closed: Gateway Locked</span>
                  </>
                ) : (
                  <>
                    <span>🟢 Active: Withdraw Now</span>
                    <ArrowUpRight size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform opacity-50" />
                  </>
                )}
              </button>
            </form>

            <div className="bg-blue-50 rounded-xl p-3 flex gap-3 border border-blue-100 italic relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-r from-blue-600/5 to-transparent" />
              <Zap className="text-blue-600 flex-shrink-0 animate-pulse relative z-10" size={16} />
              <div className="relative z-10 text-left">
                <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Automated Node Settlement</h4>
                <p className="text-[9px] text-blue-800 leading-normal font-bold uppercase tracking-tighter mt-1">Withdrawals are processed via real-time Paystack synchronization. Settlement is usually completed within 280ms of network confirmation.</p>
              </div>
            </div>

            {/* Withdrawal History */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <History size={12} />
                  Historical Protocol Data
                </h3>
              </div>
              
              <div className="space-y-2.5">
                {loadingHistory ? (
                  [1,2].map(i => <div key={`skeleton-withdraw-${i}`} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)
                ) : withdrawals.length > 0 ? (
                  withdrawals.map((w, index) => (
                    <div key={w.id || index} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-100 transition-colors group gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center border transition-colors shrink-0 ${
                          w.status === 'completed' || w.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white' : 
                          w.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white' : 
                          'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white'
                        }`}>
                          {w.status === 'completed' || w.status === 'approved' ? <CheckCircle2 size={16} /> : 
                           w.status === 'rejected' ? <X size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-display font-black text-slate-900 text-sm sm:text-base italic tracking-tighter">₦{w.amount.toLocaleString()}</h4>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                            {w.requestedAt?.toDate?.()?.toLocaleDateString() || 'Recently'} • {w.status}
                          </p>
                          <WithdrawalTimeline status={w.status || 'submitted'} />
                        </div>
                      </div>
                      <div className="hidden md:block shrink-0">
                        <ChevronDown className="-rotate-90 text-slate-200" size={14} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
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

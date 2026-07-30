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
  Search,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ShieldCheck,
  Activity,
  DollarSign
} from 'lucide-react';
import { getApiUrl } from '../lib/config';
import DepositTab from '../components/DepositTab';
import WithdrawalTimeline from '../components/WithdrawalTimeline';
import { PayoutReceipt } from '../components/PayoutReceipt';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

import { PLANS } from '../constants/plans';

export default function Withdrawal() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'exchange' | 'deposit'>('exchange');
  const [exchangeSubTab, setExchangeSubTab] = useState<'convert' | 'withdraw' | 'history'>('convert');
  
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Conversion state
  const [coinsToConvert, setCoinsToConvert] = useState('');
  const [wiseCoinBalance, setWiseCoinBalance] = useState(0);

  // Bank Withdrawal State
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState(profile?.bankDetails?.bankName || '');
  const [bankCode, setBankCode] = useState(profile?.bankDetails?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(profile?.bankDetails?.accountNumber || '');
  const [accountName, setAccountName] = useState(profile?.bankDetails?.accountName || '');
  const [loading, setLoading] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<'task' | 'referral'>('task');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] = useState<any>(null);
  const [banks, setBanks] = useState<{name: string, code: string}[]>([]);

  const [resolvingName, setResolvingName] = useState(false);
  const [resolveFeedback, setResolveFeedback] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [isOpenBankDropdown, setIsOpenBankDropdown] = useState(false);

  const [payoutSettings, setPayoutSettings] = useState<any>(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState('');
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  const [isSavingBank, setIsSavingBank] = useState(false);

  // Exchange and Rate Settings (Real-time Firestore updates)
  const [exchangeSettings, setExchangeSettings] = useState<any>({
    exchangeRate: 10.00,
    exchangeStatus: 'open',
    lastUpdated: new Date(),
    marketTrend: 'up',
    dailyChange: '+2.4%',
    weeklyChange: '-1.1%',
    exchangeVolume: 1245000,
    marketStatus: 'Stable',
    previousRate: 10.00,
    rateHistory: [
      { day: 'Mon', rate: 9.80 },
      { day: 'Tue', rate: 9.90 },
      { day: 'Wed', rate: 9.85 },
      { day: 'Thu', rate: 10.10 },
      { day: 'Fri', rate: 10.05 },
      { day: 'Sat', rate: 9.95 },
      { day: 'Sun', rate: 10.00 }
    ]
  });

  // Fetch live exchange settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'wise_coin_exchange'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setExchangeSettings({
          ...data,
          lastUpdated: data.lastUpdated?.toDate?.() || new Date(data.lastUpdated) || new Date(),
          rateHistory: data.rateHistory || [
            { day: 'Mon', rate: (data.exchangeRate * 0.98) },
            { day: 'Tue', rate: (data.exchangeRate * 0.99) },
            { day: 'Wed', rate: (data.exchangeRate * 0.985) },
            { day: 'Thu', rate: (data.exchangeRate * 1.01) },
            { day: 'Fri', rate: (data.exchangeRate * 1.005) },
            { day: 'Sat', rate: (data.exchangeRate * 0.995) },
            { day: 'Sun', rate: data.exchangeRate }
          ]
        });
      }
    }, (err) => {
      console.warn("Could not load exchange settings:", err);
    });
    return () => unsub();
  }, []);

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

  // Listen to User WiseCoin balance
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(doc(db, 'wise_coin_wallets', profile.uid), (snap) => {
      if (snap.exists()) {
        setWiseCoinBalance(snap.data().balance || 0);
      } else {
        setWiseCoinBalance(0);
      }
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
        const isUnlimitedPlan = profile?.plan === 'platinum' || profile?.plan === 'golden';
        if (isTaskOverride || isUnlimitedPlan) {
          setIsWindowOpen(true);
          setTimeRemainingStr(isUnlimitedPlan ? '🔓 Unlimited Premium Task Portal Active!' : '🔓 Special Admin Task Withdrawal Window Active!');
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
      case 'platinum': return 99999999;
      case 'golden': return 99999999;
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

  const getPendingWithdrawalTotal = (type: 'task' | 'referral') => {
    return withdrawals
      .filter(w => w.status === 'pending' && w.withdrawalType === type && !(w as any).deductedAtRequest)
      .reduce((sum, w) => sum + w.amount, 0);
  };

  // Auto-resolve account name
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
          console.warn("Account name resolution failed:", err.message);
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

  // Fetch conversions and withdrawals history
  useEffect(() => {
    if (!profile?.uid) return;
    
    // Withdrawals Listener
    const qW = query(
      collection(db, 'withdrawals'),
      where('userId', '==', profile.uid)
    );
    const unsubW = onSnapshot(qW, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setWithdrawals(docs.sort((a,b) => {
        const timeA = (a.requestedAt as any)?.toMillis?.() || 0;
        const timeB = (b.requestedAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }));
      setLoadingHistory(false);
    });

    // Conversions Listener
    const qC = query(
      collection(db, 'coin_conversions'),
      where('userId', '==', profile.uid)
    );
    const unsubC = onSnapshot(qC, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setConversions(docs.sort((a,b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || 0;
        const timeB = (b.createdAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }));
    });

    return () => {
      unsubW();
      unsubC();
    };
  }, [profile]);

  // Fetch banks from paystack
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    async function fetchBanks() {
      try {
        const banksUrl = getApiUrl('/api/paystack/banks');
        const res = await fetch(banksUrl);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.status && data.data) {
          setBanks(data.data);
        } else {
          throw new Error(data.message || 'Malformed bank data received');
        }
      } catch (err: any) {
        console.error(`[PAYMENT] Bank fetch attempt ${retryCount + 1} failed:`, err.message);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchBanks, 1500 * retryCount);
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

  // Convert WiseCoins to Naira
  const handleConvertCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (exchangeSettings.exchangeStatus !== 'open') {
      setError("WiseCoin Exchange is currently closed by Administration.");
      return;
    }

    const wcAmount = parseInt(coinsToConvert);
    if (isNaN(wcAmount) || wcAmount < 100) {
      setError('Minimum conversion is 100 WC.');
      return;
    }

    if (wcAmount > wiseCoinBalance) {
      setError(`Insufficient WiseCoin balance. Available: ${wiseCoinBalance.toLocaleString()} WC`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const grossNaira = (wcAmount / 100) * exchangeSettings.exchangeRate;
      const fee = grossNaira * 0.02; // 2% fee
      const netNaira = grossNaira - fee;

      await runTransaction(db, async (transaction) => {
        // Fetch current user details
        const userRef = doc(db, 'users', profile.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User profile not found.");
        const userData = userSnap.data();

        // Fetch current wallet details
        const walletRef = doc(db, 'wise_coin_wallets', profile.uid);
        const walletSnap = await transaction.get(walletRef);
        const currentWcBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;

        if (wcAmount > currentWcBalance) {
          throw new Error("Insufficient WiseCoins in your wallet.");
        }

        // Subtract WiseCoins from wallet
        transaction.set(walletRef, {
          userId: profile.uid,
          balance: currentWcBalance - wcAmount,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Credit Naira to user's wallet balances (add to taskBalance, balance, withdrawableBalance)
        const updatedTaskBalance = (userData.taskBalance || 0) + netNaira;
        const updatedWithdrawableBalance = (userData.withdrawableBalance || 0) + netNaira;
        const updatedTotalBalance = (userData.balance || 0) + netNaira;

        transaction.update(userRef, {
          taskBalance: updatedTaskBalance,
          withdrawableBalance: updatedWithdrawableBalance,
          balance: updatedTotalBalance,
          updatedAt: serverTimestamp()
        });

        // Create transaction logs
        const newWcTxRef = doc(collection(db, 'wise_coin_transactions'));
        transaction.set(newWcTxRef, {
          userId: profile.uid,
          amount: wcAmount,
          action: 'conversion',
          reason: `WiseCoin Exchange: Converted ${wcAmount.toLocaleString()} WC to ₦${netNaira.toLocaleString()}`,
          status: 'completed',
          createdAt: serverTimestamp()
        });

        const newConversionRef = doc(collection(db, 'coin_conversions'));
        transaction.set(newConversionRef, {
          userId: profile.uid,
          wiseCoins: wcAmount,
          nairaAmount: netNaira,
          createdAt: serverTimestamp()
        });

        const newTxRef = doc(collection(db, 'transactions'));
        transaction.set(newTxRef, {
          userId: profile.uid,
          amount: netNaira,
          type: 'earning',
          description: `Converted ${wcAmount.toLocaleString()} WC`,
          createdAt: serverTimestamp(),
          status: 'completed'
        });

        const newNotifRef = doc(collection(db, 'notifications'));
        transaction.set(newNotifRef, {
          userId: profile.uid,
          title: '🔄 Wise Coins Exchanged!',
          message: `Successfully converted ${wcAmount.toLocaleString()} WC to ₦${netNaira.toLocaleString()} (Gross: ₦${grossNaira.toLocaleString()}, Fee 2%: ₦${fee.toLocaleString()}).`,
          type: 'reward',
          priority: 'high',
          category: 'reward',
          status: 'sent',
          createdAt: serverTimestamp(),
          readBy: []
        });
      });

      setSuccess(true);
      setCoinsToConvert('');
      setLastWithdrawal({
        amount: grossNaira,
        netAmount: netNaira,
        fee: fee,
        bankName: 'WiseCoin Exchange',
        accountNumber: 'INTERNAL',
        accountName: profile.displayName || profile.username || 'User',
        withdrawalType: 'task',
        date: new Date().toISOString()
      });
      setShowReceipt(true);
    } catch (err: any) {
      console.error("Conversion failed", err);
      setError(err?.message || "Exchange conversion request compilation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Withdraw Naira to Bank
  const handleBankWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Guard: Check if window is open
    if (!isWindowOpen) {
      setError("Payout Gateway Closed. Processing windows are strictly scheduled by Administration.");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const planId = profile.plan || 'free';
    const planDetails = PLANS.find(p => p.id === planId);
    const minWithdrawal = planDetails?.minWithdrawal || 1000;

    if (isNaN(withdrawAmount) || withdrawAmount < minWithdrawal) {
      setError(`You have not yet reached the minimum withdrawal amount for your activated plan. Continue completing tasks and offers until you reach the required amount before requesting a withdrawal.`);
      return;
    }

    // Check Plan Cap Limit for Window
    const plan = profile.plan || 'free';
    const isAdmin = profile.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
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
      setAmount('');
      setLastWithdrawal({
        amount: withdrawAmount,
        netAmount: withdrawAmount * (withdrawalType === 'referral' ? 1 : 0.90),
        fee: withdrawAmount * (withdrawalType === 'referral' ? 0 : 0.10),
        bankName,
        accountNumber,
        accountName,
        withdrawalType,
        date: new Date().toISOString()
      });
      setShowReceipt(true);
    } catch (err: any) {
      console.error("Manual withdrawal dispatch failed", err);
      setError(err?.message || "Manual request compilation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isAdminUser = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
  const planCap = isAdminUser ? 1000000000 : getPlanWithdrawalCap(profile?.plan || 'free');
  const currentWindowRequestsTotal = getCumulativeWithdrawalsInWindow();

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  // Computed live conversion calculations
  const parsedCoins = parseInt(coinsToConvert) || 0;
  const computedGrossNaira = (parsedCoins / 100) * exchangeSettings.exchangeRate;
  const computedFee = computedGrossNaira * 0.02;
  const computedNetNaira = Math.max(0, computedGrossNaira - computedFee);

  return (
    <Layout title="WiseCoin Exchange" showBack>
      {success && <Confetti />}
      <PayoutReceipt 
        isOpen={showReceipt} 
        onClose={() => {
          setShowReceipt(false);
          setSuccess(false);
          setError('');
          navigate('/earnings');
        }} 
        data={lastWithdrawal} 
      />
      <div className="p-3 sm:p-5 pb-24 space-y-4 max-w-2xl mx-auto relative text-left">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Global Navigation Tabs (Exchange Panel vs Deposits) */}
        <div className="flex bg-[#0D1527]/90 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
          <button 
            onClick={() => setActiveTab('exchange')}
            className={`flex-1 py-3 px-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'exchange' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft size={14} />
            Exchange Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-3 px-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              activeTab === 'deposit' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft size={14} />
            Deposit Funds
          </button>
        </div>

        {activeTab === 'exchange' ? (
          <>
            {/* Real-time WiseCoin Rate and Status Banner */}
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Live Rate Feeder</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase italic tracking-tight">
                    WiseCoin Exchange
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">
                      <span className="text-amber-500 font-extrabold">100 WC</span>
                      <span className="text-slate-500">=</span>
                      <span className="text-emerald-400 font-black">₦{exchangeSettings.exchangeRate.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      {exchangeSettings.exchangeStatus === 'open' ? (
                        <span className="text-emerald-500 font-black flex items-center gap-1">
                          🟢 Exchange Open
                        </span>
                      ) : (
                        <span className="text-rose-500 font-black flex items-center gap-1">
                          🔴 Exchange Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left md:text-right space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Last Synced Timestamp</p>
                  <p className="text-xs font-mono font-bold text-slate-300">
                    {exchangeSettings.lastUpdated instanceof Date 
                      ? exchangeSettings.lastUpdated.toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : new Date(exchangeSettings.lastUpdated).toLocaleTimeString()
                    }
                  </p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                    Synced with Blockchain Nodes
                  </p>
                </div>
              </div>

              {/* Interactive 7-Day Line Chart using Recharts */}
              <div className="mt-5 h-44 w-full bg-black/20 rounded-2xl border border-white/5 p-2 overflow-hidden flex flex-col justify-end">
                <div className="flex justify-between items-center px-2 mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  <span>Rate Movement (7D Interval)</span>
                  <span className="text-blue-400">Stable Node</span>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={exchangeSettings.rateHistory}>
                    <defs>
                      <linearGradient id="rateColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      stroke="#475569" 
                      fontSize={8} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={['dataMin - 0.5', 'dataMax + 0.5']} 
                      hide 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                      labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'black' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#rateColor)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Market Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/5">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Today's Vol</span>
                  <span className="text-xs font-mono font-black text-slate-200">
                    {exchangeSettings.exchangeVolume.toLocaleString()} WC
                  </span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Daily Change</span>
                  <span className={`text-xs font-black flex items-center gap-0.5 ${
                    exchangeSettings.marketTrend === 'up' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {exchangeSettings.marketTrend === 'up' ? '▲' : '▼'} {exchangeSettings.dailyChange}
                  </span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Weekly Change</span>
                  <span className="text-xs font-black text-rose-400">
                    {exchangeSettings.weeklyChange}
                  </span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Market Status</span>
                  <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                    <Activity size={10} className="animate-pulse" /> {exchangeSettings.marketStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Balances Board */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between h-24">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Available WC</span>
                  <Coins size={14} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xl font-display font-black text-amber-500 italic">
                    <AnimatedNumber value={wiseCoinBalance} fractionDigits={0} />
                  </h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Coins ready for convert</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between h-24">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Task Wisecoin Balance</span>
                  <Wallet size={14} className="text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xl font-display font-black text-emerald-400 italic">
                    <AnimatedNumber value={profile?.taskBalance || 0} fractionDigits={0} /> <span className="text-xs">WC</span>
                  </h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Cleared Wisecoin holdings</p>
                </div>
              </div>
            </div>

            {/* Terminal Tab Switcher (Convert WC vs Withdraw Naira to Bank vs Ledger History) */}
            <div className="flex border-b border-white/10 pt-1">
              <button 
                onClick={() => setExchangeSubTab('convert')}
                className={`flex-1 pb-3 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider relative transition-colors ${
                  exchangeSubTab === 'convert' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🔄 Convert WC
                {exchangeSubTab === 'convert' && (
                  <motion.div layoutId="terminal-bar" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />
                )}
              </button>
              <button 
                onClick={() => setExchangeSubTab('withdraw')}
                className={`flex-1 pb-3 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider relative transition-colors ${
                  exchangeSubTab === 'withdraw' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                💸 Bank Transfer
                {exchangeSubTab === 'withdraw' && (
                  <motion.div layoutId="terminal-bar" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />
                )}
              </button>
              <button 
                onClick={() => setExchangeSubTab('history')}
                className={`flex-1 pb-3 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider relative transition-colors ${
                  exchangeSubTab === 'history' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ⏳ Ledger History
                {exchangeSubTab === 'history' && (
                  <motion.div layoutId="terminal-bar" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />
                )}
              </button>
            </div>

            {/* Display correct sub-view */}
            {exchangeSubTab === 'convert' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 backdrop-blur-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Convert WiseCoins</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Exchanging WiseCoins into withdrawable Naira instantly</p>
                  </div>
                  <Coins className="text-amber-500 animate-bounce" size={20} />
                </div>

                <form onSubmit={handleConvertCoins} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enter WiseCoins to convert</label>
                      <button
                        type="button"
                        onClick={() => setCoinsToConvert(String(wiseCoinBalance))}
                        className="text-[9px] font-black text-blue-500 uppercase tracking-wider hover:text-blue-400"
                      >
                        Convert Max ({wiseCoinBalance.toLocaleString()} WC)
                      </button>
                    </div>
                    <div className="relative group">
                      <input 
                        type="number" 
                        placeholder="Min 100 WC"
                        required
                        min="100"
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 font-mono font-black text-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-white placeholder:text-slate-600 disabled:opacity-50"
                        value={coinsToConvert}
                        onChange={(e) => setCoinsToConvert(e.target.value)}
                        disabled={exchangeSettings.exchangeStatus !== 'open'}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs text-slate-500 font-mono">WC</span>
                    </div>
                  </div>

                  {/* Pricing breakdown summary */}
                  {parsedCoins >= 100 && (
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-400 font-bold">
                        <span>Exchanged Naira Value</span>
                        <span className="text-white font-mono font-black">₦{computedGrossNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 font-bold">
                        <span>Blockchain Exchange Fee (2%)</span>
                        <span className="text-rose-400 font-mono font-black">-₦{computedFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="border-t border-white/5 pt-2 flex justify-between items-center text-slate-200 font-black">
                        <span className="uppercase tracking-wider text-[10px]">Net Credits Received</span>
                        <span className="text-emerald-400 font-mono text-sm font-black">₦{computedNetNaira.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2.5 text-rose-400">
                      <AlertCircle size={16} />
                      <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || exchangeSettings.exchangeStatus !== 'open' || parsedCoins < 100 || parsedCoins > wiseCoinBalance}
                    className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-blue-900/20 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : exchangeSettings.exchangeStatus !== 'open' ? (
                      '🔴 Exchange Closed'
                    ) : parsedCoins > wiseCoinBalance ? (
                      '⚠️ Insufficient Coins'
                    ) : (
                      <>
                        <span>Convert to Naira</span>
                        <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                <div className="bg-blue-500/5 rounded-xl p-3 flex gap-3 border border-blue-500/10 italic">
                  <Zap className="text-blue-500 flex-shrink-0 animate-pulse" size={16} />
                  <div className="text-left text-[9px] leading-relaxed text-blue-300 font-bold uppercase tracking-tight">
                    WiseCoins are minted automatically via blockchain activities. Swapping to NGN takes less than 300ms on confirmation.
                  </div>
                </div>
              </motion.div>
            )}

            {exchangeSubTab === 'withdraw' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 backdrop-blur-xl space-y-4"
              >
                {/* Gateway Window Status Indicator */}
                <div className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isWindowOpen 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWindowOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">
                      {isWindowOpen ? "Settlement Window Open" : "Payout Gateway Closed"}
                    </p>
                    <p className="text-[8px] font-bold uppercase opacity-85 mt-0.5 leading-normal">
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

                {/* Wallet Balance Summary for Bank Withdrawal */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs font-black">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-500">Task Wallet Balance</span>
                    <h3 className="text-lg text-emerald-400">₦{(profile?.taskBalance || 0).toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-500">Referral Wallet Balance</span>
                    <h3 className="text-lg text-emerald-400">₦{(profile?.referralBalance || 0).toLocaleString()}</h3>
                  </div>
                </div>

                {/* Dual Wallet Payout Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawalType('task')}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden text-left ${
                      withdrawalType === 'task' 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-[1.01]' 
                        : 'bg-[#0D1527] border-white/5 text-slate-300 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Zap size={12} className={withdrawalType === 'task' ? 'text-blue-200' : 'text-blue-500'} />
                      <span className="text-[7px] font-black uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded">Task</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase block">Task Payout</span>
                      <span className="text-[7.5px] font-bold uppercase text-slate-300 block">10% Platform Fee</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawalType('referral')}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden text-left ${
                      withdrawalType === 'referral' 
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg scale-[1.01]' 
                        : 'bg-[#0D1527] border-white/5 text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <User size={12} className={withdrawalType === 'referral' ? 'text-emerald-200' : 'text-emerald-500'} />
                      <span className="text-[7px] font-black uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded">Ref</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase block">Referral Payout</span>
                      <span className="text-[7.5px] font-bold uppercase text-slate-300 block">0% Processing Fee</span>
                    </div>
                  </button>
                </div>

                {/* NGN Withdrawal Form */}
                <form onSubmit={handleBankWithdrawal} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Withdrawal Amount in Wisecoin</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-black text-[10px] text-slate-400">WC</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        required
                        min="1000"
                        step="0.01"
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono font-black text-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-white placeholder:text-slate-600"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    {parseFloat(amount) >= 1000 && (
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1 pl-1">
                        {withdrawalType === 'task' ? (
                          `A 10% processing fee applies. You receive: ${(parseFloat(amount) * 0.90).toLocaleString(undefined, { minimumFractionDigits: 0 })} WC`
                        ) : (
                          `Referral withdrawals are 100% free of charge! You receive: ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 0 })} WC`
                        )}
                      </p>
                    )}
                  </div>

                  {/* Ledger Bank Information */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bank Ledger Coordination</h3>
                      <button
                        type="button"
                        onClick={handleSaveBankDetails}
                        disabled={isSavingBank || !bankCode || !accountNumber || !accountName || resolvingName}
                        className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 disabled:opacity-50"
                      >
                        {isSavingBank ? 'Saving...' : 'Save Bank Details'}
                      </button>
                    </div>

                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3">
                      <div className="space-y-1 relative">
                        <label className="text-[8.5px] font-black text-slate-500 uppercase ml-1 tracking-widest">Target Protocol Bank</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpenBankDropdown(!isOpenBankDropdown);
                              setBankSearch('');
                            }}
                            className="w-full text-left bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-8 text-xs font-black uppercase tracking-tight hover:bg-black/60 transition-all flex items-center justify-between relative"
                          >
                            <Building2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 ${isOpenBankDropdown ? 'text-blue-500' : ''}`} size={14} />
                            <span className={bankCode ? 'text-white font-black' : 'text-slate-500 font-bold normal-case'}>
                              {bankName || 'Select Protocol Bank'}
                            </span>
                            <ChevronDown className={`text-slate-500 transition-transform duration-200 ${isOpenBankDropdown ? 'rotate-180 text-blue-500' : ''}`} size={14} />
                          </button>

                          <AnimatePresence>
                            {isOpenBankDropdown && (
                              <motion.div
                                key="bank-dropdown-portal-dark"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[500] max-h-80 flex flex-col"
                              >
                                <div 
                                  className="fixed inset-0 -z-1 bg-black/40" 
                                  onClick={() => {
                                    setIsOpenBankDropdown(false);
                                    setBankSearch('');
                                  }} 
                                />
                                
                                <div className="p-2 border-b border-white/5 relative flex items-center bg-black/20 z-10">
                                  <Search className="absolute left-5 text-slate-500" size={12} />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search bank name..."
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-1.5 pl-8 pr-4 text-xs font-black text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
                                    value={bankSearch}
                                    onChange={(e) => setBankSearch(e.target.value)}
                                  />
                                </div>

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
                                              ? 'bg-blue-500/20 text-blue-400 font-extrabold' 
                                              : 'text-slate-300 hover:bg-white/5 active:bg-white/10'
                                          }`}
                                        >
                                          <span className="truncate">{bank.name}</span>
                                          {isSelected && (
                                            <CheckCircle2 size={12} className="text-blue-500 flex-shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">
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
                        <label className="text-[8.5px] font-black text-slate-500 uppercase ml-1 tracking-widest">Account Number</label>
                        <div className="relative group">
                          <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                          <input 
                            type="text" 
                            placeholder="Enter 10-digit account number"
                            required
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs font-black tracking-tight text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Account Holder Name</label>
                          {resolvingName && (
                            <span className="text-[8px] text-blue-400 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              <Loader2 size={10} className="animate-spin" /> Resolving Name
                            </span>
                          )}
                          {!resolvingName && resolveFeedback && (
                            <span className={`text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                              resolveFeedback.includes('Verified') ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {resolveFeedback.includes('Verified') ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {resolveFeedback}
                            </span>
                          )}
                        </div>
                        <div className="relative group">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                          <input 
                            type="text" 
                            placeholder={resolvingName ? "Querying secure gateway..." : "Full name as on bank record"}
                            required
                            disabled={resolvingName}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs font-black tracking-tight text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2.5 text-rose-400">
                      <AlertCircle size={16} />
                      <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || success || !isWindowOpen}
                    className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-emerald-900/20 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : success ? (
                      '🟢 Protocol Finalized'
                    ) : !isWindowOpen ? (
                      '🔒 Gateway Closed'
                    ) : (
                      <>
                        <span>Withdraw Naira to Bank</span>
                        <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {exchangeSubTab === 'history' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 px-1">
                  <History size={16} className="text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction & Conversion Ledger</h3>
                </div>

                <div className="space-y-2.5 max-h-[450px] overflow-y-auto no-scrollbar">
                  {loadingHistory ? (
                    [1,2].map(i => <div key={`sk-${i}`} className="h-16 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)
                  ) : (withdrawals.length > 0 || conversions.length > 0) ? (
                    <>
                      {/* Interleave or list conversions & withdrawals */}
                      {conversions.map((conv, index) => (
                        <div key={`conv-${conv.id || index}`} className="bg-slate-900/50 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-sm flex items-center justify-between group gap-3 text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-blue-500/10 text-blue-400 border-blue-500/20">
                              <ArrowRightLeft size={16} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-display font-black text-white text-sm sm:text-base italic tracking-tighter">₦{conv.nairaAmount.toLocaleString()}</h4>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                                Exchanged {conv.wiseCoins.toLocaleString()} WC • Swap Completed
                              </p>
                              <p className="text-[7.5px] text-slate-500 font-bold uppercase mt-0.5">
                                {conv.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/10">Swapped</span>
                        </div>
                      ))}

                      {withdrawals.map((w, index) => (
                        <div key={`w-${w.id || index}`} className="bg-slate-900/50 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-sm flex items-center justify-between group gap-3 text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0 ${
                              w.status === 'completed' || w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              w.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {w.status === 'completed' || w.status === 'approved' ? <CheckCircle2 size={16} /> : 
                               w.status === 'rejected' ? <X size={16} /> : <Clock size={16} />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-display font-black text-white text-sm sm:text-base italic tracking-tighter">₦{w.amount.toLocaleString()}</h4>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                                Bank Transfer ({w.bankDetails?.bankName}) • {w.status}
                              </p>
                              <p className="text-[7.5px] text-slate-500 font-bold uppercase mt-0.5">
                                {w.requestedAt?.toDate?.()?.toLocaleString() || 'Recently'}
                              </p>
                              <WithdrawalTimeline status={w.status || 'submitted'} />
                            </div>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                            w.status === 'completed' || w.status === 'approved' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/10' :
                            w.status === 'rejected' ? 'text-rose-400 bg-rose-400/10 border-rose-400/10' :
                            'text-amber-400 bg-amber-400/10 border-amber-400/10'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="bg-slate-900/30 rounded-2xl p-8 text-center border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic">No active ledger history detected</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <DepositTab />
        )}
      </div>
    </Layout>
  );
}

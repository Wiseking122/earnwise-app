import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../../components/Layout';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
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
import { 
  Search, 
  Loader2, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCcw, 
  History, 
  User, 
  Coins, 
  ArrowRightLeft, 
  ShieldAlert, 
  Activity, 
  Download, 
  CheckCircle2, 
  XCircle, 
  ToggleLeft, 
  ToggleRight, 
  Calendar,
  AlertCircle,
  Clock,
  ExternalLink,
  Sliders,
  DollarSign,
  Briefcase,
  HelpCircle,
  TrendingUp as TrendUpIcon,
  Filter
} from 'lucide-react';
import { WiseCoinTransaction, WiseCoinWallet } from '../../types/wise_coin';

const WiseCoinManager = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'ledger' | 'users'>('settings');

  // Global Exchange Settings State
  const [exchangeSettings, setExchangeSettings] = useState<any>({
    exchangeRate: 10.00,
    exchangeStatus: 'open',
    dailyChange: '+2.4%',
    weeklyChange: '-1.1%',
    exchangeVolume: 1245000,
    marketStatus: 'Stable',
    lastUpdated: new Date()
  });

  // Form Inputs for Settings Editing
  const [rateInput, setRateInput] = useState('10.00');
  const [statusInput, setStatusInput] = useState('open');
  const [dailyChangeInput, setDailyChangeInput] = useState('+2.4%');
  const [weeklyChangeInput, setWeeklyChangeInput] = useState('-1.1%');
  const [volumeInput, setVolumeInput] = useState('1245000');
  const [marketStatusInput, setMarketStatusInput] = useState('Stable');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Conversion history and user profiles cache
  const [conversions, setConversions] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Individual User Override States (Original functionality)
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userWallet, setUserWallet] = useState<WiseCoinWallet | null>(null);
  const [userTransactions, setUserTransactions] = useState<WiseCoinTransaction[]>([]);
  
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const [overrideAmount, setOverrideAmount] = useState('100');
  const [overrideReason, setOverrideReason] = useState('');
  const [processingOverride, setProcessingOverride] = useState(false);

  // Fetch live exchange settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'wise_coin_exchange'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const settings = {
          ...data,
          lastUpdated: data.lastUpdated?.toDate?.() || new Date(data.lastUpdated) || new Date()
        };
        setExchangeSettings(settings);
        
        // Pre-populate input states on first load/subscription update
        setRateInput(String(data.exchangeRate || 10.00));
        setStatusInput(data.exchangeStatus || 'open');
        setDailyChangeInput(data.dailyChange || '+2.4%');
        setWeeklyChangeInput(data.weeklyChange || '-1.1%');
        setVolumeInput(String(data.exchangeVolume || 1245000));
        setMarketStatusInput(data.marketStatus || 'Stable');
      }
    }, (err) => {
      console.warn("Could not subscribe to exchange settings:", err);
    });
    return () => unsub();
  }, []);

  // Subscribe to recent conversions list
  useEffect(() => {
    const q = query(
      collection(db, 'coin_conversions'),
      orderBy('createdAt', 'desc'),
      limit(250)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversions(docs);
      setLoadingLedger(false);
    }, (error) => {
      console.error("Failed to fetch conversions list:", error);
      setLoadingLedger(false);
    });
    return () => unsub();
  }, []);

  // Fetch missing user profile data for ledger row items dynamically
  useEffect(() => {
    const missingUids = Array.from(new Set(
      conversions
        .map(c => c.userId)
        .filter(uid => uid && !usersMap[uid])
    ));
    
    if (missingUids.length === 0) return;
    
    const fetchUsers = async () => {
      const updates: Record<string, any> = {};
      await Promise.all(missingUids.map(async (uid) => {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            updates[uid] = { uid, ...userSnap.data() };
          } else {
            updates[uid] = { uid, displayName: 'Unknown User', email: 'unknown@earnwise.com', referralCode: 'N/A' };
          }
        } catch (e) {
          console.error("Error fetching user profile:", uid, e);
        }
      }));
      if (Object.keys(updates).length > 0) {
        setUsersMap(prev => ({ ...prev, ...updates }));
      }
    };
    
    fetchUsers();
  }, [conversions, usersMap]);

  // Derived Analytics Values
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayConversions = conversions.filter(c => {
    if (!c.createdAt) return false;
    const date = c.createdAt.toDate?.() || new Date(c.createdAt);
    return date >= todayStart;
  });

  const totalWcConvertedToday = todayConversions.reduce((sum, c) => sum + (c.wiseCoins || 0), 0);
  const totalNairaPaidToday = todayConversions.reduce((sum, c) => sum + (c.nairaAmount || 0), 0);

  // Search single user override balances
  const searchUser = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSelectedUser(null);
    setUserWallet(null);
    setUserTransactions([]);

    try {
      const q = query(collection(db, 'users'), where('email', '==', searchTerm.trim().toLowerCase()), limit(1));
      let snap = await getDocs(q);
      
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
        alert('User profile matching that search key was not found.');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Search fail occurred.');
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
      limit(25)
    );
    onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WiseCoinTransaction));
      setUserTransactions(docs);
    });
  };

  // Perform Manual overrides (Original actions)
  const handleOverrideAction = async (action: 'credit' | 'deduction' | 'conversion') => {
    if (!selectedUser || !overrideAmount || !overrideReason.trim()) {
      alert('Please populate all override fields');
      return;
    }

    const val = parseInt(overrideAmount);
    if (isNaN(val) || val <= 0) return;

    setProcessingOverride(true);
    try {
      const actualAmount = action === 'deduction' || action === 'conversion' ? -val : val;
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

      // Record transaction log
      await addDoc(collection(db, 'wise_coin_transactions'), {
        userId: selectedUser.id,
        amount: val,
        action,
        reason: overrideReason.trim(),
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // If manual conversion, add equivalent Naira
      if (action === 'conversion') {
        const rateFactor = (exchangeSettings.exchangeRate || 10.00) / 100;
        const nairaAmount = val * rateFactor;
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

        await addDoc(collection(db, 'transactions'), {
          userId: selectedUser.id,
          amount: nairaAmount,
          type: 'earning',
          description: `Wise Coin Conversion: ${val.toLocaleString()} WC to ₦${nairaAmount.toLocaleString()}`,
          createdAt: serverTimestamp()
        });
      }

      // Fire notification
      const titles = {
        credit: '🪙 Wise Coins Credited!',
        deduction: '⚠️ Wise Coins Deducted',
        conversion: '🔄 Coins Converted to Naira'
      };
      
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUser.id,
        title: titles[action],
        message: action === 'conversion' 
          ? `You converted ${val.toLocaleString()} WC to ₦${(val * ((exchangeSettings.exchangeRate || 10.00) / 100)).toLocaleString()}. Your balance has been updated.`
          : `Admin has ${action === 'credit' ? 'added' : 'removed'} ${val.toLocaleString()} WC to your account. Reason: ${overrideReason}`,
        type: action === 'credit' ? 'reward' : 'alert',
        createdAt: serverTimestamp(),
        readBy: []
      });

      alert('Override action compiled successfully!');
      setShowCreditModal(false);
      setShowDeductModal(false);
      setShowConvertModal(false);
      setOverrideReason('');
    } catch (err: any) {
      console.error('Override action error:', err);
      alert('Override process failed: ' + err.message);
    } finally {
      setProcessingOverride(false);
    }
  };

  // Submit Rate & Status & Market variables to Firestore
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUpdatingSettings(true);
    try {
      const settingsRef = doc(db, 'system_settings', 'wise_coin_exchange');
      await setDoc(settingsRef, {
        exchangeRate: parseFloat(rateInput) || 10.00,
        exchangeStatus: statusInput,
        dailyChange: dailyChangeInput,
        weeklyChange: weeklyChangeInput,
        exchangeVolume: parseInt(volumeInput) || 1245000,
        marketStatus: marketStatusInput,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      alert('Global WiseCoin settings updated and deployed successfully!');
    } catch (err: any) {
      console.error('Failed to save exchange settings:', err);
      alert('Error updating configuration: ' + err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleQuickStatus = async (status: 'open' | 'closed') => {
    try {
      const settingsRef = doc(db, 'system_settings', 'wise_coin_exchange');
      await setDoc(settingsRef, {
        exchangeStatus: status,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      setStatusInput(status);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleQuickRate = async (rate: number) => {
    try {
      const settingsRef = doc(db, 'system_settings', 'wise_coin_exchange');
      await setDoc(settingsRef, {
        exchangeRate: rate,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      setRateInput(String(rate));
    } catch (err: any) {
      alert('Failed to update rate: ' + err.message);
    }
  };

  // Simulate market fluctuation dynamic action
  const handleRefreshMarket = async () => {
    setUpdatingSettings(true);
    try {
      const currentVol = parseInt(volumeInput) || 1245000;
      const volFluctuate = Math.floor((Math.random() - 0.2) * 24000); // positive skew fluctuation
      const nextVol = Math.max(100000, currentVol + volFluctuate);
      
      const changeVal = (2.0 + Math.random() * 3.5).toFixed(1);
      const nextDailyChange = `+${changeVal}%`;
      const nextTrend = Math.random() > 0.25 ? 'up' : 'down';

      const settingsRef = doc(db, 'system_settings', 'wise_coin_exchange');
      await setDoc(settingsRef, {
        exchangeVolume: nextVol,
        dailyChange: nextDailyChange,
        marketTrend: nextTrend,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      setVolumeInput(String(nextVol));
      setDailyChangeInput(nextDailyChange);
      alert('Market indexes refreshed and re-balanced!');
    } catch (err: any) {
      console.error('Refresh market failed:', err);
      alert('Failed to refresh market indexes');
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Export conversions list to CSV
  const handleExportCSV = () => {
    const headers = ['Reference ID', 'User Name', 'Email', 'User Code', 'WC Converted', 'Exchange Rate Used', 'Naira Paid', 'Date', 'Status'];
    const rows = conversions.map(c => {
      const user = usersMap[c.userId] || {};
      const rateUsed = c.wiseCoins ? ((c.nairaAmount / c.wiseCoins) * 100).toFixed(2) : 'N/A';
      const date = c.createdAt?.toDate?.()?.toLocaleString() || new Date(c.createdAt).toLocaleString();
      return [
        c.id,
        user.displayName || user.username || 'Unknown User',
        user.email || 'unknown@earnwise.com',
        user.referralCode || 'N/A',
        c.wiseCoins,
        `"100 WC = ₦${rateUsed}"`,
        c.nairaAmount,
        `"${date}"`,
        'Completed'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wisecoin_exchange_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter conversions history by Name, Email, ReferralCode, or Reference ID
  const filteredConversions = conversions.filter(c => {
    const user = usersMap[c.userId] || {};
    const term = ledgerSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (user.displayName || '').toLowerCase().includes(term) ||
      (user.username || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term) ||
      (user.referralCode || '').toLowerCase().includes(term) ||
      (c.id || '').toLowerCase().includes(term)
    );
  });

  return (
    <Layout title="Wise Coin Manager" showBack>
      <div className="p-3 sm:p-5 pb-24 space-y-6 max-w-7xl mx-auto relative text-left">
        {/* Header Title section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase italic tracking-tight flex items-center gap-2">
              <Coins className="text-amber-500" size={24} />
              Wise Coin Admin Command
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Configure exchange feeds, view ledger transactions, and adjust override balances</p>
          </div>
          
          {/* Sub-tab Switcher (Settings, Ledger, Overrides) */}
          <div className="flex bg-[#0D1527]/90 p-1 rounded-xl border border-white/5 shadow-2xl self-start md:self-auto">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-3.5 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'settings' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders size={14} />
              Controls & Rates
            </button>
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`py-2 px-3.5 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'ledger' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History size={14} />
              Exchange Ledger
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`py-2 px-3.5 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'users' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User size={14} />
              Balance Overrides
            </button>
          </div>
        </div>

        {/* Dynamic Analytics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Exchange Rate</span>
            <div>
              <p className="text-sm font-mono font-black text-amber-400">100 WC = ₦{exchangeSettings.exchangeRate?.toFixed(2)}</p>
              <span className="text-[7px] text-slate-500 font-bold uppercase block mt-1">Live Feed</span>
            </div>
          </div>
          
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Today's Vol</span>
            <div>
              <p className="text-sm font-mono font-black text-blue-400">{(exchangeSettings.exchangeVolume || 0).toLocaleString()} WC</p>
              <span className="text-[7px] text-slate-500 font-bold uppercase block mt-1">Simulated Market</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Today's Conversions</span>
            <div>
              <p className="text-sm font-mono font-black text-orange-400">{totalWcConvertedToday.toLocaleString()} WC</p>
              <span className="text-[7px] text-slate-500 font-bold uppercase block mt-1">{todayConversions.length} transactions today</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Today's Payouts</span>
            <div>
              <p className="text-sm font-mono font-black text-emerald-400">₦{totalNairaPaidToday.toLocaleString()}</p>
              <span className="text-[7px] text-slate-500 font-bold uppercase block mt-1">Naira value paid</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Exchange Status</span>
            <div>
              <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                exchangeSettings.exchangeStatus === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}>
                {exchangeSettings.exchangeStatus === 'open' ? '🟢 Open' : '🔴 Closed'}
              </span>
              <span className="text-[7px] text-slate-500 font-bold uppercase block mt-1">Gateway gate</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Last Synced</span>
            <div>
              <p className="text-[10px] font-mono font-black text-slate-300">
                {exchangeSettings.lastUpdated instanceof Date 
                  ? exchangeSettings.lastUpdated.toLocaleString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString()
                }
              </p>
              <span className="text-[7px] text-slate-500 font-bold uppercase block mt-1">Firestore sync</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Settings & Admin Controls */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left columns: Settings form fields */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveSettings} className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-6 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 border-b border-white/5 pb-3 flex items-center gap-2">
                  <Sliders size={16} className="text-blue-500" />
                  Configure Rate Feed & Gateway Values
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Exchange Rate input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Exchange Rate (Naira per 100 WC)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest">100 WC = ₦</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="1"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-24 pr-4 font-mono font-bold text-sm text-white focus:outline-none focus:border-blue-500"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Status Toggle selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Exchange Gateway Gate</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 font-semibold text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value)}
                    >
                      <option value="open">🟢 Gateway Open & Trading</option>
                      <option value="closed">🔴 Gateway Closed (Lock Conversions)</option>
                    </select>
                  </div>

                  {/* Daily Change input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Today's Volatility Change (%)</label>
                    <input 
                      type="text" 
                      placeholder="+2.5%"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                      value={dailyChangeInput}
                      onChange={(e) => setDailyChangeInput(e.target.value)}
                    />
                  </div>

                  {/* Weekly Change input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Weekly Performance Change (%)</label>
                    <input 
                      type="text" 
                      placeholder="-1.2%"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                      value={weeklyChangeInput}
                      onChange={(e) => setWeeklyChangeInput(e.target.value)}
                    />
                  </div>

                  {/* Volume input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Daily Global Volume (WC)</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                      value={volumeInput}
                      onChange={(e) => setVolumeInput(e.target.value)}
                    />
                  </div>

                  {/* Market status input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Market Performance Indicator</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 font-semibold text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      value={marketStatusInput}
                      onChange={(e) => setMarketStatusInput(e.target.value)}
                    >
                      <option value="Stable">Stable</option>
                      <option value="Bullish">Bullish (Strong Growth)</option>
                      <option value="Bearish">Bearish (Decline)</option>
                      <option value="Maintenance">Maintenance / Locked</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex items-center justify-end">
                  <button 
                    type="submit"
                    disabled={updatingSettings}
                    className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {updatingSettings ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Update Exchange Rate & Configuration
                  </button>
                </div>
              </form>
            </div>

            {/* Right column: Quick Actions Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-4 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 border-b border-white/5 pb-3 flex items-center gap-2">
                  <Activity size={16} className="text-amber-500" />
                  Quick Feed Adjustments
                </h3>

                <p className="text-[10px] text-slate-500 font-semibold uppercase leading-relaxed">
                  Fast overrides to bypass inputs. Clicking any quick action updates variables in Firestore in real-time.
                </p>

                {/* Gateway Toggles */}
                <div className="space-y-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Gateway Toggle Gates</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleQuickStatus('open')}
                      className="py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs uppercase hover:bg-emerald-500/20 transition-all"
                    >
                      🟢 Open Exchange
                    </button>
                    <button 
                      onClick={() => handleQuickStatus('closed')}
                      className="py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold rounded-xl text-xs uppercase hover:bg-rose-500/20 transition-all"
                    >
                      🔴 Close Exchange
                    </button>
                  </div>
                </div>

                {/* Preset Exchange Rate Feeds */}
                <div className="space-y-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Preset Exchange Rate Feeds</span>
                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    {[5.00, 8.00, 10.00, 12.00, 15.00, 20.00].map((rate) => (
                      <button 
                        key={rate}
                        onClick={() => handleQuickRate(rate)}
                        className={`py-1.5 px-1 bg-black/40 border rounded-lg text-[10px] font-bold text-slate-300 hover:border-blue-500/50 transition-all ${
                          Math.abs((exchangeSettings.exchangeRate || 10.00) - rate) < 0.01 ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-white/5'
                        }`}
                      >
                        ₦{rate.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other utilities */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Utilities</span>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={handleRefreshMarket}
                      className="py-2.5 w-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-xl text-xs uppercase hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCcw size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
                      Reflux & Sync Indices
                    </button>
                    <button 
                      onClick={handleExportCSV}
                      className="py-2.5 w-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold rounded-xl text-xs uppercase hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      Export Conversion Ledger (CSV)
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Conversions Ledger (History) */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            
            {/* Ledger search & export bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50 border border-white/10 p-4 rounded-3xl backdrop-blur-xl">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 pl-10 pr-4 font-semibold text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Search ledger by User, Email, User Code, or Ref ID..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                />
              </div>

              <button 
                onClick={handleExportCSV}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-black text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={14} />
                Export CSV Ledger
              </button>
            </div>

            {/* Table wrapper */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              {loadingLedger ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 size={36} className="text-blue-500 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading ledger feed...</p>
                </div>
              ) : filteredConversions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-black/10 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-4 px-4">User</th>
                        <th className="py-4 px-4">Email / Info</th>
                        <th className="py-4 px-4">User Code</th>
                        <th className="py-4 px-4 text-right">WC Converted</th>
                        <th className="py-4 px-4 text-center">Exchange Rate</th>
                        <th className="py-4 px-4 text-right">Naira Paid</th>
                        <th className="py-4 px-4">Date / Timestamp</th>
                        <th className="py-4 px-4 text-center">Status</th>
                        <th className="py-4 px-4 font-mono text-[8px]">Reference ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-semibold text-slate-300">
                      {filteredConversions.map((conv) => {
                        const user = usersMap[conv.userId] || {};
                        const rateUsed = conv.wiseCoins ? ((conv.nairaAmount / conv.wiseCoins) * 100).toFixed(2) : 'N/A';
                        const date = conv.createdAt?.toDate?.()?.toLocaleString() || new Date(conv.createdAt).toLocaleString();
                        
                        return (
                          <tr key={conv.id} className="hover:bg-white/5 transition-all">
                            <td className="py-3 px-4 font-bold text-white max-w-[150px] truncate">
                              {user.displayName || user.username || 'Unknown User'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[10px]">
                              {user.email || conv.userId}
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-amber-500 font-bold">
                              {user.referralCode || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-white">
                              {conv.wiseCoins?.toLocaleString()} WC
                            </td>
                            <td className="py-3 px-4 text-center text-[10px] font-mono text-slate-400">
                              100 WC = ₦{rateUsed}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-emerald-400">
                              ₦{conv.nairaAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-[10px] text-slate-500">
                              {date}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400">
                                Completed
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[8px] text-slate-600 max-w-[100px] truncate">
                              {conv.id}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                  <History className="text-slate-700 opacity-20" size={48} />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">No conversions catalogued</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Try adjusting your search criteria or lookup value</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: Balance Overrides (Original search & modify panels) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            
            {/* Search panel */}
            <div className="flex gap-2 bg-slate-900/50 border border-white/10 p-4 rounded-3xl backdrop-blur-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                  placeholder="Enter user email or username to inspect..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all font-medium placeholder:text-slate-600"
                />
              </div>
              <button
                onClick={searchUser}
                disabled={searching}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : 'Inspect'}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {selectedUser ? (
                <motion.div
                  key={selectedUser.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* User Profile Overview */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-white/5 flex items-center justify-center text-blue-500 shadow-2xl relative overflow-hidden">
                          {selectedUser.photoURL ? (
                            <img src={selectedUser.photoURL} alt="User avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={32} />
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-display font-black text-white uppercase italic tracking-tight">{selectedUser.displayName || selectedUser.username}</h3>
                          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">{selectedUser.email}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono font-bold text-[9px] rounded uppercase">
                            Code: {selectedUser.referralCode || 'N/A'}
                          </span>
                        </div>

                        <div className="w-full pt-4 border-t border-white/5 space-y-2.5">
                          <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                              <Coins size={14} className="text-amber-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">WC Balance</span>
                            </div>
                            <span className="text-base font-display font-black text-amber-500">{userWallet?.balance?.toLocaleString() || 0}</span>
                          </div>
                          
                          <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                              <Wallet size={14} className="text-emerald-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Task Balance</span>
                            </div>
                            <span className="text-base font-display font-black text-emerald-500">₦{selectedUser.taskBalance?.toLocaleString() || 0}</span>
                          </div>

                          <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                              <Wallet size={14} className="text-blue-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total NGN</span>
                            </div>
                            <span className="text-base font-display font-black text-blue-500">₦{selectedUser.balance?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Panel overrides */}
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setShowCreditModal(true)}
                        className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl flex items-center justify-center gap-2.5 hover:bg-emerald-500/20 transition-all uppercase tracking-widest text-[10px]"
                      >
                        <TrendingUp size={14} />
                        Credit Wise Coins
                      </button>
                      <button
                        onClick={() => setShowDeductModal(true)}
                        className="w-full py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black rounded-2xl flex items-center justify-center gap-2.5 hover:bg-rose-500/20 transition-all uppercase tracking-widest text-[10px]"
                      >
                        <TrendingDown size={14} />
                        Deduct Wise Coins
                      </button>
                      <button
                        onClick={() => setShowConvertModal(true)}
                        className="w-full py-3.5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-2.5 hover:bg-blue-500 transition-all uppercase tracking-widest text-[10px]"
                      >
                        <ArrowRightLeft size={14} />
                        Manual NGN Swap
                      </button>
                    </div>
                  </div>

                  {/* Override ledger */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <History size={16} className="text-slate-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coin Override Ledger (Last 25 entries)</h4>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden min-h-[350px]">
                      {userTransactions.length > 0 ? (
                        <div className="divide-y divide-white/5">
                          {userTransactions.map((tx) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-all text-left">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                  tx.action === 'credit' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  tx.action === 'deduction' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>
                                  {tx.action === 'credit' ? <TrendingUp size={14} /> : 
                                   tx.action === 'deduction' ? <TrendingDown size={14} /> : 
                                   <RefreshCcw size={14} />}
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
                                  tx.action === 'deduction' ? 'text-rose-400' :
                                  'text-blue-400'
                                }`}>
                                  {tx.action === 'credit' ? '+' : '-'}{tx.amount} WC
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-700">
                          <History size={40} className="mb-3 opacity-10" />
                          <p className="text-[9px] font-black uppercase tracking-widest">No overriden transactions found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="py-20 text-center bg-slate-900/30 border border-white/5 rounded-[3rem] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent)]" />
                  <div className="w-16 h-16 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User size={28} className="text-slate-700" />
                  </div>
                  <h4 className="text-base font-display font-black text-white uppercase italic tracking-tight">Lookup User Account</h4>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Execute targeted override operations</p>
                </div>
              )}
            </AnimatePresence>

            {/* Action Overrides Modals */}
            <AnimatePresence>
              {(showCreditModal || showDeductModal || showConvertModal) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                    onClick={() => { setShowCreditModal(false); setShowDeductModal(false); setShowConvertModal(false); }} 
                    className="absolute inset-0 bg-black/85 backdrop-blur-xs" 
                  />
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-[2rem] w-full max-w-sm relative z-10 text-left">
                    <h3 className="text-xl font-display font-black text-white mb-1 uppercase italic tracking-tight">
                      {showCreditModal ? 'Credit WC' : showDeductModal ? 'Deduct WC' : 'Manual WC Conversion'}
                    </h3>
                    <p className="text-slate-500 text-[9px] mb-6 uppercase tracking-widest font-black">Admin Override Terminal</p>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Wise Coin Amount</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={overrideAmount}
                            onChange={(e) => setOverrideAmount(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-xl font-display font-black text-white focus:border-blue-500/50 outline-none transition-all"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs uppercase tracking-widest font-mono">WC</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Official Reason</label>
                        <textarea
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-3 text-xs font-semibold text-white focus:border-blue-500/50 outline-none transition-all resize-none"
                          placeholder="Provide administrative reasons..."
                          rows={3}
                        />
                      </div>

                      {showConvertModal && (
                        <div className="bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl flex items-start gap-3">
                          <ShieldAlert className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                          <div>
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Financial Impact Ledger</p>
                            <p className="text-[9px] text-blue-400/80 font-bold uppercase mt-1 leading-normal">
                              This converts WC at the global rate (100 WC = ₦{exchangeSettings.exchangeRate?.toFixed(2)}) and deposits equivalent Naira instantly to the user's available task wallet.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setShowCreditModal(false); setShowDeductModal(false); setShowConvertModal(false); }} className="flex-1 py-3 bg-white/5 text-slate-400 font-black rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest text-[9px]">Cancel</button>
                        <button 
                          onClick={() => handleOverrideAction(showCreditModal ? 'credit' : showDeductModal ? 'deduction' : 'conversion')}
                          disabled={processingOverride}
                          className={`flex-1 py-3 font-black rounded-xl transition-all shadow-xl uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 ${
                            showCreditModal ? 'bg-emerald-600 text-white shadow-emerald-900/15' :
                            showDeductModal ? 'bg-rose-600 text-white shadow-rose-900/15' :
                            'bg-blue-600 text-white shadow-blue-900/15'
                          }`}
                        >
                          {processingOverride ? <Loader2 size={12} className="animate-spin" /> : 'Confirm Override'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>
    </Layout>
  );
};

export default WiseCoinManager;

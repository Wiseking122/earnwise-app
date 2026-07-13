import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar, 
  DollarSign,
  User as UserIcon,
  SearchX,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  X,
  TrendingUp,
  Globe,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Mail,
  UserCheck,
  UserX
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { user, profile } = useAuth();
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [searchUsers, setSearchUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Filter state: 'all' | 'active' | 'suspended' | 'starter' | 'elite'
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'suspended' | 'starter' | 'elite'>('all');
  
  // Sorting state: 'newest' | 'cleared_desc' | 'pending_desc' | 'referrals_desc'
  const [sortBy, setSortBy] = useState<'newest' | 'cleared_desc' | 'pending_desc' | 'referrals_desc'>('newest');

  // Modal States
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserProfile | null>(null);
  const [selectedUserForSuspension, setSelectedUserForSuspension] = useState<UserProfile | null>(null);

  // Form states for balance adjustment
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustWalletType, setAdjustWalletType] = useState<'task' | 'referral' | 'general'>('task');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  // Poll default 150 most recent users
  useEffect(() => {
    setDbError(null);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(150));
    const unsub = onSnapshot(q, (snap) => {
      setDbUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
      setLoading(false);
    }, (error) => {
      console.error("Failed to load users list:", error);
      setDbError(error.message || String(error));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Proactive exact search querying
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchUsers([]);
      return;
    }
    
    const term = searchQuery.trim().toLowerCase();
    
    // Fetch matching email
    const qEmail = query(collection(db, 'users'), where('email', '==', term));
    const unsubEmail = onSnapshot(qEmail, (snap) => {
      const found = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
      if (found.length > 0) {
        setSearchUsers(prev => {
          const merged = [...found, ...prev];
          return merged.filter((item, index, self) => 
            index === self.findIndex((t) => t.uid === item.uid)
          );
        });
      }
    });

    // Fetch matching referral code
    const qCode = query(collection(db, 'users'), where('referralCode', '==', searchQuery.trim().toUpperCase()));
    const unsubCode = onSnapshot(qCode, (snap) => {
      const found = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
      if (found.length > 0) {
        setSearchUsers(prev => {
          const merged = [...found, ...prev];
          return merged.filter((item, index, self) => 
            index === self.findIndex((t) => t.uid === item.uid)
          );
        });
      }
    });

    return () => {
      unsubEmail();
      unsubCode();
    };
  }, [searchQuery]);

  // Combine database query results and exact search results, eliminating duplicates
  const allUsers = useMemo(() => {
    const combined = [...searchUsers, ...dbUsers];
    return combined.filter((item, index, self) => 
      index === self.findIndex((t) => t.uid === item.uid)
    );
  }, [dbUsers, searchUsers]);

  // Apply Search Queries + Filters + Sorting
  const processedUsers = useMemo(() => {
    // 1. Search Query filter
    let list = allUsers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(u => 
        (u.displayName || '').toLowerCase().includes(q) || 
        (u.email || '').toLowerCase().includes(q) ||
        (u.referralCode || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q)
      );
    }

    // 2. Status/Plan Filter
    if (activeFilter === 'active') {
      list = list.filter(u => !u.securityMetrics?.isSuspended);
    } else if (activeFilter === 'suspended') {
      list = list.filter(u => u.securityMetrics?.isSuspended);
    } else if (activeFilter === 'starter') {
      list = list.filter(u => u.plan === 'starter');
    } else if (activeFilter === 'elite') {
      list = list.filter(u => u.plan === 'elite');
    }

    // 3. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'cleared_desc') {
        return (b.withdrawableBalance || 0) - (a.withdrawableBalance || 0);
      }
      if (sortBy === 'pending_desc') {
        return (b.pendingBalance || 0) - (a.pendingBalance || 0);
      }
      if (sortBy === 'referrals_desc') {
        return (b.totalReferrals || 0) - (a.totalReferrals || 0);
      }
      // Newest as default (fallback)
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [allUsers, searchQuery, activeFilter, sortBy]);

  // Calculate live counters for filter pills
  const counts = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(u => !u.securityMetrics?.isSuspended).length;
    const suspended = allUsers.filter(u => u.securityMetrics?.isSuspended).length;
    const starter = allUsers.filter(u => u.plan === 'starter').length;
    const elite = allUsers.filter(u => u.plan === 'elite').length;
    return { total, active, suspended, starter, elite };
  }, [allUsers]);

  // Helper styles for premium plan badges
  const getPlanBadgeStyles = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-slate-50 text-slate-600 border-slate-200/60';
      case 'starter':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'elite':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
      case 'pro':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'bronze':
        return 'bg-amber-50 text-amber-800 border-amber-200/60';
      case 'silver':
        return 'bg-zinc-100 text-zinc-800 border-zinc-200/60';
      case 'golden':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200/60';
      case 'platinum':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200/60';
      case 'diamond':
        return 'bg-pink-50 text-pink-700 border-pink-200/60';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200/60';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Handle balance adjustments on Firestore
  const handleAdjustBalance = async () => {
    if (!selectedUserForBalance) return;
    if (!adjustAmount || isNaN(Number(adjustAmount))) {
      alert("Please enter a valid amount");
      return;
    }
    const val = Number(adjustAmount);
    setIsSubmittingAdjustment(true);
    try {
      const user = selectedUserForBalance;
      const updateData: any = {};
      
      if (adjustWalletType === 'task') {
        updateData.taskBalance = (user.taskBalance || 0) + val;
        updateData.balance = (user.balance || 0) + val;
        updateData.withdrawableBalance = (user.withdrawableBalance || 0) + val;
      } else if (adjustWalletType === 'referral') {
        updateData.referralBalance = (user.referralBalance || 0) + val;
        updateData.balance = (user.balance || 0) + val;
        updateData.withdrawableBalance = (user.withdrawableBalance || 0) + val;
      } else {
        updateData.balance = (user.balance || 0) + val;
        updateData.withdrawableBalance = (user.withdrawableBalance || 0) + val;
      }

      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
      alert("Balance adjusted successfully!");
      setSelectedUserForBalance(null);
      setAdjustAmount('');
    } catch (err: any) {
      console.error("Balance adjustment failed", err);
      alert("Failed: " + err.message);
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Handle suspension status change
  const handleToggleSuspension = async () => {
    if (!selectedUserForSuspension) return;
    setIsSubmittingSuspension(true);
    try {
      const user = selectedUserForSuspension;
      const isCurrentlySuspended = !!user.securityMetrics?.isSuspended;
      
      await setDoc(doc(db, 'users', user.uid), {
        securityMetrics: {
          isSuspended: !isCurrentlySuspended,
          suspensionReason: isCurrentlySuspended ? '' : 'Flagged for anomalous automated activity'
        }
      }, { merge: true });

      alert(`User ${isCurrentlySuspended ? 'unsuspended' : 'suspended'} successfully!`);
      setSelectedUserForSuspension(null);
    } catch (err: any) {
      console.error("Suspension toggle failed", err);
      alert("Failed to modify suspension status: " + err.message);
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  return (
    <Layout title="User Management" showBack>
      <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-6">
        
        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-red-900 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase tracking-wider text-red-800">Database Access Issue</h3>
                <p className="text-xs font-bold text-red-700/85 mt-1 leading-relaxed">
                  Unable to retrieve the user directory collection.
                </p>
                <div className="mt-4 bg-white/60 backdrop-blur-xs rounded-xl p-3 border border-red-100 font-mono text-[10px] space-y-1 text-red-800">
                  <p><strong>Error:</strong> {dbError}</p>
                  <p><strong>Logged Email:</strong> {user?.email || 'Unknown'}</p>
                  <p><strong>Document Role:</strong> {profile?.role || 'user'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Metric Cards Strip (Stripe Style) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Total Directory</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 sm:mt-2">{counts.total}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Users fetched</p>
          </div>
          
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck size={16} />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Active Users</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight mt-1 sm:mt-2">{counts.active}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Non-suspended</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ShieldAlert size={16} />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Suspended</p>
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight mt-1 sm:mt-2">{counts.suspended}</h3>
            <p className="text-[9px] text-slate-400 mt-1">Restricted</p>
          </div>
        </div>

        {/* Filters and Search Panel */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Top Row: Search and Sort */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by name, email, code or UID..."
                className="w-full bg-slate-50 border border-slate-100/80 rounded-2xl py-3.5 pl-11 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sorting controls */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                <ArrowUpDown size={12} />
                Sort By
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-100/80 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer shadow-xs"
              >
                <option value="newest">Recent Join Date</option>
                <option value="cleared_desc">Cleared Balance (High)</option>
                <option value="pending_desc">Pending Balance (High)</option>
                <option value="referrals_desc">Total Referrals (High)</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Dynamic Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-50 pt-4">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 border shadow-2xs ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
              }`}
            >
              All Users
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{counts.total}</span>
            </button>

            <button
              onClick={() => setActiveFilter('active')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 border shadow-2xs ${
                activeFilter === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
              }`}
            >
              Active
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                activeFilter === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
              }`}>{counts.active}</span>
            </button>

            <button
              onClick={() => setActiveFilter('suspended')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 border shadow-2xs ${
                activeFilter === 'suspended'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
              }`}
            >
              Suspended
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                activeFilter === 'suspended' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'
              }`}>{counts.suspended}</span>
            </button>

            <button
              onClick={() => setActiveFilter('starter')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 border shadow-2xs ${
                activeFilter === 'starter'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
              }`}
            >
              Starter
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                activeFilter === 'starter' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
              }`}>{counts.starter}</span>
            </button>

            <button
              onClick={() => setActiveFilter('elite')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 border shadow-2xs ${
                activeFilter === 'elite'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
              }`}
            >
              Elite
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                activeFilter === 'elite' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>{counts.elite}</span>
            </button>
          </div>
        </div>

        {/* Directory Listing Container */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-white border border-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : processedUsers.length > 0 ? (
          <>
            {/* Desktop Table View (hidden on mobile, optimized dense layout) */}
            <div className="hidden md:block bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100/80 bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">
                      <th className="py-4 pl-6 pr-4">User Details</th>
                      <th className="py-4 px-4">Membership Tier</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4">Referral Network</th>
                      <th className="py-4 px-4 text-right">Balances</th>
                      <th className="py-4 pl-4 pr-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {processedUsers.map((user) => {
                      const isSuspended = !!user.securityMetrics?.isSuspended;
                      return (
                        <tr key={user.uid} className="hover:bg-slate-50/40 transition-colors group">
                          {/* User Column */}
                          <td className="py-3.5 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              {/* Custom Avatar with premium border */}
                              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/40 flex items-center justify-center font-bold text-slate-600 text-xs tracking-wide shrink-0 overflow-hidden shadow-2xs relative">
                                {user.photoURL ? (
                                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  getInitials(user.displayName || 'No Name')
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 text-xs truncate max-w-[180px]">{user.displayName || 'Unnamed User'}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium truncate lowercase max-w-[140px]">{user.email}</span>
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/50 text-slate-500 uppercase tracking-widest shrink-0">
                                    CODE: {user.referralCode || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Membership Plan Badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs ${getPlanBadgeStyles(user.plan || 'free')}`}>
                                {user.plan || 'Free Tier'}
                              </span>
                              {user.role === 'admin' && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 shadow-2xs">
                                  ADMIN ROLE
                                </span>
                              )}
                              {user.role === 'advertiser' && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 shadow-2xs">
                                  ADVERTISER
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Colored Badges for Account Status */}
                          <td className="py-3.5 px-4">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Suspended
                              </span>
                            ) : (user.tasksCompleted && user.tasksCompleted > 0) || user.withdrawableBalance > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 shadow-2xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Pending Review
                              </span>
                            )}
                          </td>

                          {/* Referral network and metadata details */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5 text-slate-600">
                              <div className="flex items-center gap-1 text-[10px] font-bold">
                                <Zap size={11} className="text-amber-500" />
                                <span className="text-slate-700 font-extrabold">{user.totalReferrals || 0}</span>
                                <span className="text-slate-400 font-medium">referrals</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Globe size={10} className="text-slate-300" />
                                IP: {user.securityMetrics?.lastIp || 'N/A'}
                              </p>
                            </div>
                          </td>

                          {/* Aligned cash Balances neatly on the right */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-col items-end">
                              <div className="text-xs font-black text-emerald-600 leading-none flex items-center gap-0.5">
                                ₦{(user.withdrawableBalance || 0).toLocaleString()}
                              </div>
                              <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1 leading-none">Cleared</span>
                              
                              <div className="text-[11px] font-black text-amber-500 leading-none mt-1.5 flex items-center gap-0.5">
                                ₦{(user.pendingBalance || 0).toLocaleString()}
                              </div>
                              <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1 leading-none">Pending</span>
                            </div>
                          </td>

                          {/* Clean Actions column utilizing compact custom buttons */}
                          <td className="py-3.5 pl-4 pr-6 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Adjust balance compact trigger button */}
                              <button
                                onClick={() => setSelectedUserForBalance(user)}
                                title="Adjust Balance"
                                className="w-8.5 h-8.5 rounded-xl border border-slate-100 hover:border-slate-900 bg-white hover:bg-slate-950 text-slate-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs"
                              >
                                <Edit3 size={13} />
                              </button>

                              {/* Flag/Toggle Suspension compact trigger button */}
                              <button
                                onClick={() => setSelectedUserForSuspension(user)}
                                title={isSuspended ? 'Lift Suspension' : 'Flag for Suspension'}
                                className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs ${
                                  isSuspended 
                                    ? 'border-emerald-100 hover:border-emerald-600 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                    : 'border-rose-100 hover:border-rose-600 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white'
                                }`}
                              >
                                {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Responsive Dense View Cards (40% less height, clustered layout) */}
            <div className="block md:hidden space-y-2.5">
              {processedUsers.map((user) => {
                const isSuspended = !!user.securityMetrics?.isSuspended;
                return (
                  <div key={user.uid} className="bg-white border border-slate-100/90 rounded-2xl p-3.5 shadow-2xs relative overflow-hidden">
                    {/* Compact layout clustering info */}
                    <div className="flex items-start justify-between gap-2.5">
                      {/* Left: Avatar & Basic User info */}
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/40 flex items-center justify-center font-black text-slate-600 text-xs tracking-wide shrink-0 overflow-hidden shadow-2xs">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            getInitials(user.displayName || 'No Name')
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-[11px] truncate leading-tight">{user.displayName || 'Unnamed User'}</h4>
                          <p className="text-[10px] text-slate-400 truncate leading-normal mt-0.5 lowercase">{user.email}</p>
                          
                          {/* Combined tag pills block */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="text-[8px] font-black px-1 py-0.5 rounded bg-slate-50 border border-slate-200/50 text-slate-500 uppercase tracking-widest leading-none">
                              {user.referralCode || 'N/A'}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none ${getPlanBadgeStyles(user.plan || 'free')}`}>
                              {user.plan || 'free'}
                            </span>
                            {isSuspended ? (
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 leading-none">
                                Suspended
                              </span>
                            ) : (user.tasksCompleted && user.tasksCompleted > 0) || user.withdrawableBalance > 0 ? (
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 leading-none">
                                Active
                              </span>
                            ) : (
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 leading-none">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Cash Balances neatly aligned */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-emerald-600 leading-none">
                          ₦{(user.withdrawableBalance || 0).toLocaleString()}
                        </div>
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-0.5 block">Cleared</span>
                        
                        <div className="text-[10px] font-black text-amber-500 leading-none mt-1.5">
                          ₦{(user.pendingBalance || 0).toLocaleString()}
                        </div>
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-0.5 block">Pending</span>
                      </div>
                    </div>

                    {/* Bottom row: Compact action buttons & network stats */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2.5">
                      <div className="flex items-center gap-2.5 text-slate-400 text-[10px]">
                        <span className="font-bold text-slate-600 flex items-center gap-0.5 leading-none">
                          <Zap size={10} className="text-amber-500" />
                          {user.totalReferrals || 0} refs
                        </span>
                        <span className="font-medium text-[9px] opacity-75">
                          IP: {user.securityMetrics?.lastIp || 'N/A'}
                        </span>
                      </div>

                      {/* Small compact actions row */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedUserForBalance(user)}
                          className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-900 hover:text-white transition-colors"
                        >
                          Adjust Balance
                        </button>
                        <button
                          onClick={() => setSelectedUserForSuspension(user)}
                          className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-colors ${
                            isSuspended 
                              ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                              : 'bg-rose-50 border border-rose-100 text-rose-600'
                          }`}
                        >
                          {isSuspended ? 'Lift Ban' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xs">
            <SearchX size={44} className="text-slate-300 mx-auto mb-3 animate-bounce" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">No matching directory records</h3>
            <p className="text-slate-400 text-xs mt-1">Adjust search terms or try another directory filter above.</p>
          </div>
        )}

      </div>

      {/* MODAL 1: Center Dialog Overlay for Adjusting Balance (Premium look) */}
      {selectedUserForBalance && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-slate-950 px-6 py-5 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/5">
                  <DollarSign size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ledger Modification</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Adjust User Wallet</h3>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedUserForBalance(null);
                  setAdjustAmount('');
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none">Target Individual</p>
                <h4 className="text-slate-800 font-extrabold text-sm mt-1.5">{selectedUserForBalance.displayName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 text-[10px] lowercase">{selectedUserForBalance.email}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200/50 text-[9px] font-black text-slate-600 uppercase">
                    Code: {selectedUserForBalance.referralCode}
                  </span>
                </div>
              </div>

              {/* Wallet Type Selection Tabs */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Select Target Wallet</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['task', 'referral', 'general'] as const).map((wType) => (
                    <button
                      key={wType}
                      type="button"
                      onClick={() => setAdjustWalletType(wType)}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        adjustWalletType === wType
                          ? 'bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/20'
                          : 'bg-white border-slate-200/60 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {wType === 'task' ? 'Task' : wType === 'referral' ? 'Referral' : 'General'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Balances Summary */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase">Task Bal</p>
                  <p className="text-xs font-black text-slate-700 mt-0.5">₦{(selectedUserForBalance.taskBalance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase">Referral Bal</p>
                  <p className="text-xs font-black text-slate-700 mt-0.5">₦{(selectedUserForBalance.referralBalance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 font-black uppercase">Cleared Bal</p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5">₦{(selectedUserForBalance.withdrawableBalance || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Amount Inputs */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Adjustment Delta Amount (Naira ₦)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Enter positive or negative amount. e.g. 500 or -500"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                    NGN ₦
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  💡 Type a negative sign (e.g., <span className="font-bold text-rose-500">-2500</span>) to debit/deduct funds from the selected wallet.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedUserForBalance(null);
                  setAdjustAmount('');
                }}
                disabled={isSubmittingAdjustment}
                className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustBalance}
                disabled={isSubmittingAdjustment || !adjustAmount}
                className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingAdjustment ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Center Dialog Overlay for Managing Suspension Status */}
      {selectedUserForSuspension && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-slate-950 px-6 py-5 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-rose-400 border border-white/5">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Security Guard</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Account Status Action</h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForSuspension(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none">Target Individual</p>
                <h4 className="text-slate-800 font-extrabold text-sm mt-1.5">{selectedUserForSuspension.displayName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 text-[10px] lowercase">{selectedUserForSuspension.email}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200/50 text-[9px] font-black text-slate-600 uppercase">
                    Code: {selectedUserForSuspension.referralCode}
                  </span>
                </div>
              </div>

              {/* Warning Notice Panel */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedUserForSuspension.securityMetrics?.isSuspended
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                <AlertTriangle className={`shrink-0 mt-0.5 ${
                  selectedUserForSuspension.securityMetrics?.isSuspended ? 'text-emerald-500' : 'text-rose-500'
                }`} size={18} />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide leading-tight">
                    {selectedUserForSuspension.securityMetrics?.isSuspended ? 'Revoke User Suspension' : 'Suspend User Account'}
                  </h4>
                  <p className="text-[11px] leading-relaxed opacity-90 mt-1">
                    {selectedUserForSuspension.securityMetrics?.isSuspended
                      ? 'Reactivating this user will restore full access to task dashboards, withdrawal pipelines, referral networking, and courses instantly.'
                      : 'Suspension will immediately block the user from logging in, requesting payouts, claiming task credits, or accessing any course materials.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedUserForSuspension(null)}
                disabled={isSubmittingSuspension}
                className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspension}
                disabled={isSubmittingSuspension}
                className={`text-white text-[10px] font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedUserForSuspension.securityMetrics?.isSuspended
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/15'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-500/15'
                }`}
              >
                {isSubmittingSuspension ? 'Processing...' : selectedUserForSuspension.securityMetrics?.isSuspended ? 'Restore Account' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

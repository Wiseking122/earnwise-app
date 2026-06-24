import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc, where } from 'firebase/firestore';
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
  Zap
} from 'lucide-react';

export default function AdminUsers() {
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [searchUsers, setSearchUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for inline user management actions
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustWalletType, setAdjustWalletType] = useState<'task' | 'referral' | 'general'>('task');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Poll default 150 most recent users
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(150));
    const unsub = onSnapshot(q, (snap) => {
      setDbUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Proactive exact search querying (to locate old / admin accounts instantly)
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

  // Combine databases and live query results, eliminating duplicates
  const allUsers = React.useMemo(() => {
    const combined = [...searchUsers, ...dbUsers];
    return combined.filter((item, index, self) => 
      index === self.findIndex((t) => t.uid === item.uid)
    );
  }, [dbUsers, searchUsers]);

  const filteredUsers = allUsers.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.referralCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjustBalance = async (user: any) => {
    if (!adjustAmount || isNaN(Number(adjustAmount))) {
      alert("Please enter a valid amount");
      return;
    }
    const val = Number(adjustAmount);
    setIsSubmittingAdjustment(true);
    try {
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

      await setDoc(doc(db, 'users', user.uid || user.id), updateData, { merge: true });
      alert("Balance adjusted successfully!");
      setAdjustingUserId(null);
      setAdjustAmount('');
    } catch (err: any) {
      console.error("Balance adjustment failed", err);
      alert("Failed: " + err.message);
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <Layout title="User Management" showBack>
      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email or code..."
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* User List */}
        <div className="space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user.uid} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{user.displayName}</h4>
                    <p className="text-[10px] text-gray-400 font-medium lowercase mb-1">{user.email}</p>
                    <div className="flex gap-2">
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Code: {user.referralCode}
                      </span>
                      {user.plan && user.plan !== 'free' && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          {user.plan}
                        </span>
                      )}
                      {user.securityMetrics?.isSuspended && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-4">
                      <button 
                        onClick={() => {
                          setBanningUserId(banningUserId === user.uid ? null : user.uid);
                          setAdjustingUserId(null);
                        }}
                        className="text-[8px] font-black uppercase text-red-500 hover:underline"
                      >
                        {user.securityMetrics?.isSuspended ? 'Revoke Suspension...' : 'Flag for Suspension...'}
                      </button>
                      <button 
                        onClick={() => {
                          setAdjustingUserId(adjustingUserId === user.uid ? null : user.uid);
                          setBanningUserId(null);
                          setAdjustAmount('');
                          setAdjustWalletType('task');
                        }}
                        className="text-[8px] font-black uppercase text-blue-500 hover:underline"
                      >
                        Adjust Balance...
                      </button>
                    </div>

                    {/* Ban Confirmation Inline */}
                    {banningUserId === user.uid && (
                      <div className="mt-3 bg-red-50 p-3 rounded-2xl border border-red-100 space-y-2 text-left">
                        <p className="text-[10px] text-red-700 font-bold uppercase">
                          Are you sure you want to {user.securityMetrics?.isSuspended ? 'revoke suspension for' : 'suspend'} this user?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const isSuspended = user.securityMetrics?.isSuspended;
                              try {
                                await setDoc(doc(db, 'users', user.uid || (user as any).id), {
                                  securityMetrics: {
                                    isSuspended: !isSuspended,
                                    suspensionReason: isSuspended ? '' : 'Anomalous activity detected'
                                  }
                                }, { merge: true });
                                setBanningUserId(null);
                              } catch (err: any) {
                                alert("Failed: " + err.message);
                              }
                            }}
                            className="bg-red-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl hover:bg-red-700 transition-colors"
                          >
                            Yes, {user.securityMetrics?.isSuspended ? 'Unban' : 'Ban'}
                          </button>
                          <button
                            onClick={() => setBanningUserId(null)}
                            className="bg-gray-200 text-gray-700 text-[9px] font-black uppercase px-3 py-1.5 rounded-xl hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Adjust Balance Inline Form */}
                    {adjustingUserId === user.uid && (
                      <div className="mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3 text-left w-[240px] sm:w-[280px]">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">
                          Select target wallet:
                        </p>
                        
                        {/* Wallet Selector */}
                        <div className="grid grid-cols-3 gap-1">
                          {(['task', 'referral', 'general'] as const).map((wType) => (
                            <button
                              key={wType}
                              type="button"
                              onClick={() => setAdjustWalletType(wType)}
                              className={`py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-colors ${
                                adjustWalletType === wType
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {wType === 'task' ? 'Task' : wType === 'referral' ? 'Referral' : 'General'}
                            </button>
                          ))}
                        </div>

                        {/* Current Value Preview */}
                        <p className="text-[9px] font-bold text-slate-500">
                          Current Wallet Value: <span className="font-black text-slate-800">
                            ₦{adjustWalletType === 'task' 
                              ? (user.taskBalance || 0).toLocaleString() 
                              : adjustWalletType === 'referral' 
                                ? (user.referralBalance || 0).toLocaleString() 
                                : (user.balance || 0).toLocaleString()
                            }
                          </span>
                        </p>

                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            placeholder="Amount (+/-)"
                            className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                          />
                          <button
                            onClick={() => handleAdjustBalance(user)}
                            disabled={isSubmittingAdjustment || !adjustAmount}
                            className="bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
                          >
                            {isSubmittingAdjustment ? 'Apply...' : 'Apply'}
                          </button>
                          <button
                            onClick={() => {
                              setAdjustingUserId(null);
                              setAdjustAmount('');
                            }}
                            className="bg-gray-200 text-slate-700 text-[9px] font-black uppercase px-2.5 py-2 rounded-xl hover:bg-gray-300 transition-colors flex-shrink-0"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-emerald-600 font-black text-lg leading-none">₦{user.withdrawableBalance?.toLocaleString() || '0'}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Cleared</p>
                  </div>
                  <div>
                    <p className="text-amber-500 font-black text-sm leading-none">₦{user.pendingBalance?.toLocaleString() || '0'}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Pending</p>
                  </div>
                  <div className="flex border-t border-slate-50 pt-3 mt-3 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-slate-400" />
                        <span className="text-[10px] font-black">{user.totalReferrals || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-600">₦{user.referralEarnings?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-gray-300 font-bold flex items-center gap-1">
                      IP: {user.securityMetrics?.lastIp || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="text-center py-20">
              <SearchX size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">No users found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <button 
                      onClick={async () => {
                        const isSuspended = user.securityMetrics?.isSuspended;
                        if (window.confirm(`${isSuspended ? 'Unban' : 'Ban'} user ${user.displayName}?`)) {
                          await updateDoc(doc(db, 'users', user.uid), {
                            'securityMetrics.isSuspended': !isSuspended,
                            'securityMetrics.suspensionReason': isSuspended ? '' : 'Anomalous activity detected'
                          });
                        }
                      }}
                      className="mt-2 text-[8px] font-black uppercase text-red-500 hover:underline mr-4"
                    >
                      {user.securityMetrics?.isSuspended ? 'Revoke Suspension' : 'Flag for Suspension'}
                    </button>
                    <button 
                      onClick={async () => {
                        const amount = window.prompt(`Adjust balance for ${user.displayName} (Total Balance: ₦${user.balance})\nEnter amount (positive to add, negative to subtract):`);
                        if (amount && !isNaN(Number(amount))) {
                           const val = Number(amount);
                           await updateDoc(doc(db, 'users', user.uid), {
                             balance: (user.balance || 0) + val,
                             withdrawableBalance: (user.withdrawableBalance || 0) + val
                           });
                           alert('Balance adjusted successfully!');
                        }
                      }}
                      className="mt-2 text-[8px] font-black uppercase text-blue-500 hover:underline"
                    >
                      Adjust Balance
                    </button>
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

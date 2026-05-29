import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { WithdrawalRequest, Transaction } from '../../types';
import { 
  Clock, 
  CheckCircle2, 
  XSquare, 
  CreditCard,
  Building,
  User,
  AlertCircle,
  TrendingUp,
  History,
  Check,
  X
} from 'lucide-react';

export default function AdminPayments() {
  const [searchParams] = useSearchParams();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'escrow'>((searchParams.get('tab') as any) || 'withdrawals');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'escrow' || tabParam === 'withdrawals') {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    // Withdrawals Listener
    const qW = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const unsubW = onSnapshot(qW, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      docs.sort((a, b) => {
        const timeA = (a.requestedAt as any)?.toMillis?.() || 0;
        const timeB = (b.requestedAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setWithdrawals(docs);
      if (activeTab === 'withdrawals') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    // Escrow Transitions Listener
    const qE = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    const unsubE = onSnapshot(qE, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      docs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || 0;
        const timeB = (b.createdAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setPendingTransactions(docs);
      if (activeTab === 'escrow') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pending_transactions');
    });

    return () => {
      unsubW();
      unsubE();
    };
  }, [activeTab]);

  const handleAction = async (request: WithdrawalRequest, action: 'approved' | 'rejected' | 'completed') => {
    try {
      if (action === 'approved') {
        await runTransaction(db, async (transaction) => {
          const withRef = doc(db, 'withdrawals', request.id);
          const userRef = doc(db, 'users', request.userId);
          
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error("User not found");
          
          const currentWithdrawable = userSnap.data().withdrawableBalance || 0;
          if (currentWithdrawable < request.amount) {
            throw new Error("User has insufficient cleared funds for this withdrawal now");
          }

          transaction.update(withRef, { status: 'approved', processedAt: serverTimestamp() });
          transaction.update(userRef, { withdrawableBalance: currentWithdrawable - request.amount });

          // Transaction log
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            userId: request.userId,
            amount: request.amount,
            type: 'withdrawal',
            status: 'completed',
            description: `Withdrawal request #${request.id.slice(0,6)}`,
            createdAt: serverTimestamp()
          });

          // User Notification
          transaction.set(doc(collection(db, 'notifications')), {
            userId: request.userId,
            title: '✅ Withdrawal Approved!',
            message: `Your withdrawal of ₦${request.amount.toLocaleString()} has been approved and moved to processing.`,
            read: false,
            createdAt: serverTimestamp()
          });
        });
      } else {
        await updateDoc(doc(db, 'withdrawals', request.id), { 
          status: action, 
          processedAt: serverTimestamp() 
        });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${request.id}`);
    }
  };

  const handleEscrowAction = async (trans: Transaction, action: 'release' | 'cancel') => {
    try {
      await runTransaction(db, async (transaction) => {
        const transRef = doc(db, 'transactions', trans.id);
        const userRef = doc(db, 'users', trans.userId);
        
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");
        
        const uData = userSnap.data();
        
        const notifRef = doc(collection(db, 'notifications'));
        const notifTitle = action === 'release' ? '💰 Payment Released!' : '❌ Escrow Cancelled';
        const notifMsg = action === 'release' 
          ? `Your pending reward of ₦${trans.amount.toLocaleString()} has been released to your withdrawable balance.`
          : `Your pending reward of ₦${trans.amount.toLocaleString()} was cancelled after a audit review.`;

        if (action === 'release') {
          transaction.update(userRef, {
            pendingBalance: (uData.pendingBalance || 0) - trans.amount,
            withdrawableBalance: (uData.withdrawableBalance || 0) + trans.amount,
            updatedAt: serverTimestamp()
          });
          transaction.update(transRef, { 
            status: 'completed',
            clearedAt: serverTimestamp()
          });
        } else {
          transaction.update(userRef, {
            pendingBalance: (uData.pendingBalance || 0) - trans.amount,
            balance: (uData.balance || 0) - trans.amount, 
            updatedAt: serverTimestamp()
          });
          transaction.update(transRef, { 
            status: 'rejected',
            cancelledAt: serverTimestamp()
          });
        }

        transaction.set(notifRef, {
          userId: trans.userId,
          title: notifTitle,
          message: notifMsg,
          read: false,
          createdAt: serverTimestamp()
        });
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `escrow/${trans.id}`);
    }
  };

  return (
    <Layout title="Payouts" showBack>
      <div className="p-4 space-y-6">
        {/* Tab Switching */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => { setActiveTab('withdrawals'); setLoading(true); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'withdrawals' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Withdrawals ({withdrawals.length})
          </button>
          <button 
            onClick={() => { setActiveTab('escrow'); setLoading(true); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'escrow' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Pending Funds ({pendingTransactions.length})
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
             [1,2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[2rem] animate-pulse" />)
          ) : activeTab === 'withdrawals' ? (
            withdrawals.length > 0 ? (
              withdrawals.map((req) => (
                <div key={req.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to Pay</p>
                        <h4 className="text-3xl font-black text-blue-600">₦{req.amount.toLocaleString()}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] text-gray-400 font-bold">{req.requestedAt ? new Date((req.requestedAt as any).toDate()).toLocaleString() : 'Recently'}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Building size={16} className="text-gray-400" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Bank Name</p>
                          <p className="font-bold text-gray-700">{req.bankDetails.bankName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard size={16} className="text-gray-400" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Acc Number</p>
                          <p className="font-bold text-gray-700">{req.bankDetails.accountNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <User size={16} className="text-gray-400" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Acc Holder</p>
                          <p className="font-bold text-gray-700">{req.bankDetails.accountName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAction(req, 'approved')}
                        className="flex-1 bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} /> Approve
                      </button>
                      <button 
                        onClick={() => handleAction(req, 'rejected')}
                        className="flex-1 bg-red-50 text-red-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                      >
                        <XSquare size={20} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <AlertCircle size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold">No pending payouts</p>
              </div>
            )
          ) : (
            // Escrow Funds View
            pendingTransactions.length > 0 ? (
              pendingTransactions.map((trans) => (
                <div key={trans.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">User: {trans.userId.slice(0, 8)}...</p>
                      <h4 className="text-lg font-black text-slate-800">{trans.description || 'Pending Reward'}</h4>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">{trans.type}</p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-2xl font-black text-emerald-600">₦{trans.amount.toLocaleString()}</h4>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {trans.createdAt ? new Date((trans.createdAt as any).toDate()).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
                    <Clock size={18} className="text-orange-500" />
                    <div>
                      <p className="text-[10px] font-black text-orange-600 uppercase">Release Schedule</p>
                      <p className="text-xs font-bold text-orange-900">
                        Auto-clears: {(trans as any).availableAt ? new Date(((trans as any).availableAt).toDate()).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleEscrowAction(trans, 'release')}
                      className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      <Check size={20} /> Release
                    </button>
                    <button 
                      onClick={() => handleEscrowAction(trans, 'cancel')}
                      className="flex-1 bg-red-50 text-red-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <X size={20} /> Cancel
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <History size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold">No funds in escrow</p>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}

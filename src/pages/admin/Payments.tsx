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
  setDoc,
  serverTimestamp,
  runTransaction,
  increment,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { getApiUrl } from '../../lib/config';
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
  X,
  Copy,
  Award,
  Trophy
} from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function AdminPayments() {
  const [searchParams] = useSearchParams();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'escrow' | 'leaderboard'>((searchParams.get('tab') as any) || 'withdrawals');
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [payingUserId, setPayingUserId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [withdrawalSubTab, setWithdrawalSubTab] = useState<'referrals' | 'tasks'>('referrals');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [controls, setControls] = useState({
    payoutStartDate: '',
    payoutEndDate: '',
    payoutsForceClosed: false,
    taskOverrideOpen: false,
    referralOverrideOpen: false,
    isRenewalRequired: true
  });

  useEffect(() => {
    const unsubControls = onSnapshot(doc(db, 'system_settings', 'payouts'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setControls({
          payoutStartDate: data.payoutStartDate || '',
          payoutEndDate: data.payoutEndDate || '',
          payoutsForceClosed: !!data.payoutsForceClosed,
          taskOverrideOpen: !!data.taskOverrideOpen,
          referralOverrideOpen: !!data.referralOverrideOpen,
          isRenewalRequired: data.isRenewalRequired !== undefined ? !!data.isRenewalRequired : true
        });
      }
    }, (error) => {
      // Create is fine if fails due to uninitialized
    });
    return () => unsubControls();
  }, []);

  const saveControls = async (updatedValues: Partial<typeof controls>) => {
    try {
      await setDoc(doc(db, 'system_settings', 'payouts'), {
        ...updatedValues,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (updatedValues.taskOverrideOpen || updatedValues.referralOverrideOpen || updatedValues.payoutStartDate) {
         let message = "A new payout window has been scheduled!";
         if (updatedValues.taskOverrideOpen && updatedValues.referralOverrideOpen) {
            message = "A special administrative payout window is now ACTIVE for all wallets!";
         } else if (updatedValues.taskOverrideOpen) {
            message = "A special administrative payout window is now ACTIVE for Task wallets!";
         } else if (updatedValues.referralOverrideOpen) {
            message = "A special administrative payout window is now ACTIVE for Referral wallets!";
         } else if (updatedValues.payoutStartDate) {
            message = `A new payout window has been scheduled for ${new Date(updatedValues.payoutStartDate).toLocaleString()}!`;
         }
         await setDoc(doc(collection(db, 'notifications')), {
            userId: 'all',
            title: "Portal Update",
            message,
            readBy: [],
            createdAt: serverTimestamp()
         });
      }

    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'system_settings/payouts');
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'escrow' || tabParam === 'withdrawals' || tabParam === 'leaderboard') {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    // Users profile mapping listener
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uMap: Record<string, any> = {};
      snap.docs.forEach(doc => {
        uMap[doc.id] = { uid: doc.id, ...doc.data() };
      });
      setUserMap(uMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

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
      unsubUsers();
      unsubW();
      unsubE();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLoadingLeaderboard(true);
      const q = query(
        collection(db, 'users'),
        orderBy('xp', 'desc'),
        limit(10)
      );
      getDocs(q).then((snap) => {
        setTopUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
        setLoadingLeaderboard(false);
        setLoading(false);
      }).catch(err => {
        console.error("Error fetching admin leaderboard top users:", err);
        setLoadingLeaderboard(false);
        setLoading(false);
      });
    }
  }, [activeTab]);

  const handlePayLeaderboardWinner = async (user: any, rank: number, paymentMethod: 'bank_transfer' | 'wallet_credit') => {
    const defaultAmt = rank === 1 ? 15000 : rank === 2 ? 8000 : rank === 3 ? 4000 : 1000;
    const amountStr = customAmounts[user.uid];
    const amount = amountStr !== undefined ? parseFloat(amountStr) : defaultAmt;

    if (isNaN(amount) || amount <= 0) {
      alert("Please specify a valid numeric prize amount.");
      return;
    }

    if (!window.confirm(`Are you sure you want to reward ${user.displayName || 'Anonymous'} (Rank ${rank}) with ₦${amount.toLocaleString()} via ${paymentMethod === 'bank_transfer' ? 'Manual Bank Transfer' : 'Wallet Balance Credit'}?`)) {
      return;
    }

    setPayingUserId(user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User document not found");
        
        const uData = userSnap.data();

        if (paymentMethod === 'wallet_credit') {
          transaction.update(userRef, {
            balance: increment(amount),
            withdrawableBalance: increment(amount),
            bonusEarnings: increment(amount),
            updatedAt: serverTimestamp()
          });
        }

        // Create completed transaction log
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: user.uid,
          amount: amount,
          type: 'bonus',
          status: 'completed',
          description: `🏆 Weekly Leaderboard Rank ${rank} Cash Prize (${paymentMethod === 'bank_transfer' ? 'Paid via Bank' : 'Credited to Wallet'})`,
          createdAt: serverTimestamp(),
          receiptDetails: {
            withdrawalType: 'leaderboard_prize',
            fee: 0,
            netPayout: amount,
            bankName: user.bankDetails?.bankName || 'N/A',
            accountName: user.bankDetails?.accountName || 'N/A',
            accountNumber: user.bankDetails?.accountNumber || 'N/A'
          }
        });

        // Add system notification for user
        const notifRef = doc(collection(db, 'notifications'));
        const titleText = paymentMethod === 'bank_transfer' ? '🏆 Leaderboard Prize Sent!' : '🏆 Leaderboard Prize Credited!';
        const msgText = paymentMethod === 'bank_transfer'
          ? `Congratulations! Your Rank ${rank} weekly leaderboard cash prize of ₦${amount.toLocaleString()} has been sent directly to your bank account!`
          : `Congratulations! Your Rank ${rank} weekly leaderboard cash prize of ₦${amount.toLocaleString()} has been added to your withdrawable wallet balance!`;

        transaction.set(notifRef, {
          userId: user.uid,
          title: titleText,
          message: msgText,
          read: false,
          createdAt: serverTimestamp(),
          actionUrl: '/earnings'
        });
      });

      alert(`Successfully processed Rank ${rank} leaderboard prize for ${user.displayName || 'User'}!`);
      
      // Refresh list
      const q = query(
        collection(db, 'users'),
        orderBy('xp', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      setTopUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    } catch (err: any) {
      console.error(err);
      alert(`Error processing leaderboard prize payment: ${err.message}`);
    } finally {
      setPayingUserId(null);
    }
  };

  const handleAction = async (request: WithdrawalRequest, action: 'approved' | 'rejected' | 'completed') => {
    try {
      const wasDeducted = (request as any).deductedAtRequest || false;

      if (action === 'approved') {
        await runTransaction(db, async (transaction) => {
          const withRef = doc(db, 'withdrawals', request.id);
          const userRef = doc(db, 'users', request.userId);
          
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error("User not found");
          
          const uData = userSnap.data();
          const isReferral = request.withdrawalType === 'referral';
          const walletField = isReferral ? 'referralBalance' : 'taskBalance';
          
          const uWalletBalance = uData[walletField] || 0;
          const currentWithdrawable = uData.withdrawableBalance || 0;

          if (!wasDeducted) {
            // Legacy requests require balance check and deduction on approval
            if (uWalletBalance < request.amount) {
              throw new Error(`Insufficient user ${isReferral ? 'Referral' : 'Task'} balance for approval.`);
            }
            if (currentWithdrawable < request.amount) {
              throw new Error("Insufficient user overall withdrawable balance for approval.");
            }
            transaction.update(userRef, { 
              [walletField]: uWalletBalance - request.amount,
              withdrawableBalance: currentWithdrawable - request.amount,
              balance: (uData.balance || 0) - request.amount
            });
          }

          transaction.update(withRef, { status: 'approved', processedAt: serverTimestamp() });

          // Transaction log
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            userId: request.userId,
            amount: request.amount,
            type: 'withdrawal',
            status: 'completed',
            description: `Withdrawal request #${request.id.slice(0,6)}`,
            createdAt: serverTimestamp(),
            receiptDetails: {
              withdrawalType: request.withdrawalType || (isReferral ? 'referral' : 'task'),
              fee: isReferral ? 0 : request.amount * 0.10,
              netPayout: isReferral ? request.amount : request.amount * 0.90,
              bankName: request.bankDetails?.bankName || '',
              accountName: request.bankDetails?.accountName || '',
              accountNumber: request.bankDetails?.accountNumber || ''
            }
          });

          // User Notification
          transaction.set(doc(collection(db, 'notifications')), {
            userId: request.userId,
            title: '✅ Payout Approved!',
            message: `Your withdrawal of ₦${request.amount.toLocaleString()} has been processed. Click to view your receipt.`,
            read: false,
            createdAt: serverTimestamp(),
            actionUrl: `/earnings?receipt=${transRef.id}`
          });

          // USER INTENT GUARDIAN: Email confirmation message to user upon approval via backend + EmailJS
          try {
            // Trigger server-side Nodemailer email (extremely robust and works without client-side setup)
            fetch(getApiUrl('/api/admin/send-payout-email'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: uData.email,
                name: uData.displayName || `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || "Earner",
                amount: request.amount,
                netPayout: isReferral ? request.amount : request.amount * 0.90,
                fee: isReferral ? 0 : request.amount * 0.10,
                withdrawalId: request.id,
                bankName: request.bankDetails?.bankName,
                accountName: request.bankDetails?.accountName,
                accountNumber: request.bankDetails?.accountNumber
              })
            }).catch(fetchErr => console.warn("Backend payout email fetch error:", fetchErr));

            // Legacy EmailJS delivery fallback
            const emailPublicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY || 'dummy_key';
            const emailServiceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID || 'default_service';
            const emailTemplateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID || 'template_payout_receipt';

            emailjs.send(emailServiceId, emailTemplateId, {
              user_email: uData.email,
              user_name: uData.displayName || "Valued earner",
              amount: request.amount,
              net_payout: isReferral ? request.amount : request.amount * 0.90,
              fee: isReferral ? 0 : request.amount * 0.10,
              withdrawal_id: request.id,
              account_name: request.bankDetails?.accountName,
              bank_name: request.bankDetails?.bankName,
              account_number: request.bankDetails?.accountNumber
            }, emailPublicKey).catch(err => console.warn("EmailJS warning:", err));
          } catch(emailErr) {
            console.warn("Could not dispatch email:", emailErr);
          }
        });
      } else if (action === 'rejected') {
        await runTransaction(db, async (transaction) => {
          const withRef = doc(db, 'withdrawals', request.id);
          const userRef = doc(db, 'users', request.userId);
          
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error("User not found");
          
          const uData = userSnap.data();
          
          if (wasDeducted) {
            // Refund the pre-deducted balance
            const isReferral = request.withdrawalType === 'referral';
            const walletField = isReferral ? 'referralBalance' : 'taskBalance';
            
            transaction.update(userRef, {
              [walletField]: (uData[walletField] || 0) + request.amount,
              withdrawableBalance: (uData.withdrawableBalance || 0) + request.amount,
              balance: (uData.balance || 0) + request.amount
            });
          }

          transaction.update(withRef, { status: 'rejected', processedAt: serverTimestamp() });

          // Send rejection notification
          transaction.set(doc(collection(db, 'notifications')), {
            userId: request.userId,
            title: '❌ Payout Rejected',
            message: `Your withdrawal request of ₦${request.amount.toLocaleString()} was rejected and the funds have been returned to your balance.`,
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
        {/* Payout Control Center Widget */}
        <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 space-y-4">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Clock size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Payout Control Center</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Scheduler & Emergency Shield</p>
              </div>
            </div>
            
            {/* Override Controls */}
            <div className="flex flex-wrap gap-2 justify-between">
              <button
                onClick={() => saveControls({ taskOverrideOpen: !controls.taskOverrideOpen })}
                className={`flex-1 min-w-[120px] px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  controls.taskOverrideOpen 
                    ? 'bg-emerald-600 text-white shadow-md animate-pulse' 
                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                }`}
              >
                {controls.taskOverrideOpen ? '🔓 Task Withdrawals OPEN' : '🔒 Tasks Closed (Click to Open)'}
              </button>
              <button
                onClick={() => saveControls({ referralOverrideOpen: !controls.referralOverrideOpen })}
                className={`flex-1 min-w-[120px] px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  controls.referralOverrideOpen 
                    ? 'bg-emerald-600 text-white shadow-md animate-pulse' 
                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                }`}
              >
                {controls.referralOverrideOpen ? '🔓 Referral Withdrawals OPEN' : '🔒 Referrals Closed (Click to Open)'}
              </button>
              
              {/* Kill Switch Toggle */}
              <button
                onClick={() => saveControls({ payoutsForceClosed: !controls.payoutsForceClosed })}
                className={`flex-1 min-w-[120px] px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  controls.payoutsForceClosed 
                    ? 'bg-rose-600 text-white animate-pulse shadow-md' 
                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                }`}
              >
                {controls.payoutsForceClosed ? '🔴 Shield Active (Click to Shield)' : '🟢 Gateway Open (Click to Shield)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Payout Window Start</label>
              <input
                type="datetime-local"
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                value={controls.payoutStartDate}
                onChange={(e) => saveControls({ payoutStartDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Payout Window End</label>
              <input
                type="datetime-local"
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                value={controls.payoutEndDate}
                onChange={(e) => saveControls({ payoutEndDate: e.target.value })}
              />
            </div>
          </div>

          {/* Cycle Transition & Renewal Controls */}
          <div className="border-t border-slate-800/80 pt-4 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">Cycle Transition & Renewal</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Control 30-day plan expiration checks</p>
              </div>
              <button
                onClick={() => saveControls({ isRenewalRequired: !controls.isRenewalRequired })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  controls.isRenewalRequired 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                }`}
              >
                {controls.isRenewalRequired ? 'Strict Mode: ACTIVE' : 'Safe Mode: ACTIVE'}
              </button>
            </div>

            <div className={`p-3.5 rounded-xl border text-[10px] font-bold leading-relaxed transition-all ${
              controls.isRenewalRequired
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              {controls.isRenewalRequired ? (
                <span>⚠️ <strong>Strict Mode:</strong> 30-Day expiration is active (Use only after payouts are complete).</span>
              ) : (
                <span>🛡️ <strong>Safe Mode:</strong> Users can earn beyond expiration (Useful during payout delays).</span>
              )}
            </div>
          </div>

          <p className="text-[9px] text-slate-400 font-bold leading-relaxed text-left">
            * Gateways are auto-enabled for clients within the specified dates. Activating the <span className="text-red-400 font-black">emergency shield</span> will force-close payouts instantly on all devices regardless of dates. Modifying these settings updates the client applets dynamically in real-time.
          </p>
        </div>

        {/* Tab Switching */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => { setActiveTab('withdrawals'); setLoading(true); }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'withdrawals' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-gray-500'
            }`}
          >
            Withdrawals ({withdrawals.length})
          </button>
          <button 
            onClick={() => { setActiveTab('escrow'); setLoading(true); }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'escrow' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-gray-500'
            }`}
          >
            Escrow ({pendingTransactions.length})
          </button>
          <button 
            onClick={() => { setActiveTab('leaderboard'); setLoading(true); }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'leaderboard' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-gray-500'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
             [1,2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[2rem] animate-pulse" />)
          ) : activeTab === 'withdrawals' ? (
            (() => {
              const referralWithdrawalsList = withdrawals.filter(w => w.withdrawalType === 'referral');
              const taskWithdrawalsList = withdrawals.filter(w => !w.withdrawalType || w.withdrawalType === 'task');
              const visibleWithdrawals = withdrawalSubTab === 'referrals' ? referralWithdrawalsList : taskWithdrawalsList;

              return (
                <div className="space-y-4">
                  {/* Sub-tab switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl gap-2">
                    <button
                      onClick={() => setWithdrawalSubTab('referrals')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        withdrawalSubTab === 'referrals' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-933'
                      }`}
                    >
                      Pending Weekly Referrals ({referralWithdrawalsList.length})
                    </button>
                    <button
                      onClick={() => setWithdrawalSubTab('tasks')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        withdrawalSubTab === 'tasks' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-933'
                      }`}
                    >
                      Pending Monthly Tasks ({taskWithdrawalsList.length})
                    </button>
                  </div>

                  {visibleWithdrawals.length > 0 ? (
                    visibleWithdrawals.map((req) => {
                      const user = userMap[req.userId] || {};
                      const completedTasksCount = user.tasksCompleted || 0;
                      const totalReferralsInvited = user.totalReferrals || 0;
                      const currentTaskBal = user.taskBalance || 0;
                      const currentReferralBal = user.referralBalance || 0;

                      return (
                        <div key={req.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-left">
                          <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested Amount</p>
                                <h4 className="text-2xl font-black text-slate-900">₦{req.amount.toLocaleString()}</h4>
                              </div>
                              <div className="text-right">
                                {req.withdrawalType === 'referral' ? (
                                  <>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Processing Fee</p>
                                    <p className="text-sm font-bold text-emerald-600">Free (0%)</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">10% Fee Deducted</p>
                                    <p className="text-sm font-bold text-red-600">-₦{(req.amount * 0.10).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className={`${req.withdrawalType === 'referral' ? 'bg-emerald-600/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'} rounded-2xl p-4 border`}>
                              <p className={`text-[9px] font-black uppercase tracking-widest ${req.withdrawalType === 'referral' ? 'text-emerald-700' : 'text-emerald-800'}`}>
                                {req.withdrawalType === 'referral' ? "Actual Transfer Payout (100% Net)" : "Actual Transfer Payout (90% Net)"}
                              </p>
                              <h3 className={`text-xl font-black ${req.withdrawalType === 'referral' ? 'text-emerald-700' : 'text-emerald-950'}`}>
                                ₦{(req.withdrawalType === 'referral' ? req.amount : req.amount * 0.90).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </h3>
                            </div>

                            {/* User Audit Stats section */}
                            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Completed Tasks</p>
                                <p className="text-xs font-black text-blue-900">{completedTasksCount} tasks</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Invited Referrals</p>
                                <p className="text-xs font-black text-blue-900">{totalReferralsInvited} users</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Current Task Balance</p>
                                <p className="text-xs font-black text-blue-900">₦{currentTaskBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Current Ref Balance</p>
                                <p className="text-xs font-black text-blue-900">₦{currentReferralBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="col-span-2 border-t border-blue-100/30 pt-2 flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-500 uppercase">Telegram Profile :</span>
                                <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{user.telegramId || 'None Captured'}</span>
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
                                <CreditCard size={16} className="text-gray-400 cursor-pointer" />
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

                            <div className="flex flex-col gap-3">
                              {/* Copy Account Details payload compiler */}
                              <button
                                onClick={() => {
                                  const netPayoutVal = req.withdrawalType === 'referral' ? req.amount : req.amount * 0.90;
                                  const payload = `[${req.bankDetails?.bankName || 'N/A'}] - [${req.bankDetails?.accountNumber || 'N/A'}] - [${req.bankDetails?.accountName || 'N/A'}] - [₦${netPayoutVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}]`;
                                  navigator.clipboard.writeText(payload);
                                  setCopiedId(req.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="w-full py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 shadow-xs"
                              >
                                {copiedId === req.id ? "Payee Details Copied!" : "Copy Account Details"}
                              </button>

                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleAction(req, 'approved')}
                                  className="flex-1 bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                                >
                                  <CheckCircle2 size={20} /> Approve
                                </button>
                                <button 
                                  onClick={() => handleAction(req, 'rejected')}
                                  className="flex-1 bg-red-50 text-red-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                                >
                                  <XSquare size={20} /> Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                      <AlertCircle size={48} className="text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase text-xs tracking-wider">No pending {withdrawalSubTab} payouts</p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : activeTab === 'escrow' ? (
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
          ) : (
            // Leaderboard Prizes View
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-[2.2rem] p-6 text-white text-left space-y-2 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
                    <Trophy size={28} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight uppercase">Leaderboard Cash Prizes</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Verify & Payout Top 3 Earners of the Week
                    </p>
                  </div>
                </div>
              </div>

              {loadingLeaderboard ? (
                [1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-[2rem] animate-pulse" />)
              ) : topUsers.length > 0 ? (
                <div className="space-y-6">
                  {/* Top 3 Focus Cards */}
                  {topUsers.slice(0, 3).map((user, index) => {
                    const rank = index + 1;
                    const standardPrize = rank === 1 ? 15000 : rank === 2 ? 8000 : rank === 3 ? 4000 : 1000;
                    const userPrizeStr = customAmounts[user.uid];
                    const currentPrizeVal = userPrizeStr !== undefined ? parseFloat(userPrizeStr) : standardPrize;

                    const isGold = rank === 1;
                    const isSilver = rank === 2;
                    const isBronze = rank === 3;

                    return (
                      <div 
                        key={user.uid} 
                        className={`bg-white rounded-[2.2rem] border-2 shadow-sm text-left overflow-hidden transition-all duration-300 ${
                          isGold ? 'border-yellow-400 shadow-yellow-50/50' : 
                          isSilver ? 'border-slate-300' : 
                          'border-amber-500/60'
                        }`}
                      >
                        {/* Header Banner */}
                        <div className={`p-4 flex items-center justify-between border-b ${
                          isGold ? 'bg-yellow-50/60 border-yellow-100' : 
                          isSilver ? 'bg-slate-50 border-slate-100' : 
                          'bg-amber-50/40 border-amber-100/60'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                              isGold ? 'bg-yellow-400 text-yellow-950' :
                              isSilver ? 'bg-slate-300 text-slate-800' :
                              'bg-amber-600 text-white'
                            }`}>
                              {rank}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 uppercase tracking-tight">
                                {isGold ? "🏆 Gold Medalist (1st Place)" :
                                 isSilver ? "🥈 Silver Medalist (2nd Place)" :
                                 "🥉 Bronze Medalist (3rd Place)"}
                              </h4>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                Recommended Reward: ₦{standardPrize.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 space-y-5">
                          {/* User Summary info */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-black text-slate-900">{user.displayName || 'Anonymous User'}</h3>
                              <p className="text-xs font-bold text-slate-400">{user.email || 'No email registered'}</p>
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wide mt-1">
                                Telegram ID: {user.telegramId || 'None Captured'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-slate-900">{user.xp?.toLocaleString() || 0}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">XP Points</p>
                            </div>
                          </div>

                          {/* Bank details widget */}
                          {user.bankDetails?.accountNumber ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bank Details</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-sans">Verified</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm pt-1">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">Bank Name</p>
                                  <p className="font-black text-slate-800 text-xs truncate">{user.bankDetails.bankName}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">Account Number</p>
                                  <p className="font-black text-slate-800 text-xs">{user.bankDetails.accountNumber}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">Account Name</p>
                                  <p className="font-black text-slate-800 text-xs truncate">{user.bankDetails.accountName}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const payload = `[${user.bankDetails?.bankName || 'N/A'}] - [${user.bankDetails?.accountNumber || 'N/A'}] - [${user.bankDetails?.accountName || 'N/A'}] - [₦${currentPrizeVal.toLocaleString()}]`;
                                  navigator.clipboard.writeText(payload);
                                  setCopiedUserId(user.uid);
                                  setTimeout(() => setCopiedUserId(null), 2000);
                                }}
                                className="w-full mt-2 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-center gap-1.5"
                              >
                                {copiedUserId === user.uid ? "Payee Bank Info Copied!" : "📋 Copy Payee Bank Info"}
                              </button>
                            </div>
                          ) : (
                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-800 text-xs font-bold leading-relaxed">
                              ⚠️ User has not set bank details on their profile. You can still credit their wallet balance directly below!
                            </div>
                          )}

                          {/* Action Forms */}
                          <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Reward Amount (₦)
                              </label>
                              <input
                                type="number"
                                placeholder={`Enter reward amount (e.g. ${standardPrize})`}
                                value={userPrizeStr !== undefined ? userPrizeStr : standardPrize}
                                onChange={(e) => setCustomAmounts({ ...customAmounts, [user.uid]: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                              {/* Option A: Bank Transfer */}
                              <button
                                onClick={() => handlePayLeaderboardWinner(user, rank, 'bank_transfer')}
                                disabled={payingUserId !== null}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black py-4 px-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md"
                              >
                                {payingUserId === user.uid ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  "💰 Paid via Bank"
                                )}
                              </button>

                              {/* Option B: Wallet Credit */}
                              <button
                                onClick={() => handlePayLeaderboardWinner(user, rank, 'wallet_credit')}
                                disabled={payingUserId !== null}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black py-4 px-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md shadow-blue-100"
                              >
                                {payingUserId === user.uid ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  "💳 Credit to Wallet"
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Consolation Prizes Read Only Section */}
                  {topUsers.length > 3 && (
                    <div className="bg-white rounded-[2.2rem] border border-gray-100 p-6 shadow-sm text-left space-y-4">
                      <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight">Consolation Placements (Positions 4-10)</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Recommended reward is ₦1,000 for top 10 finishers
                        </p>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {topUsers.slice(3, 10).map((user, index) => {
                          const rank = index + 4;
                          return (
                            <div key={user.uid} className="py-3 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs">
                                  {rank}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-800">{user.displayName || 'Anonymous User'}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{user.email || 'No email'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-900 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                  {user.xp?.toLocaleString() || 0} XP
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Trophy size={48} className="text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-wider">No users found on leaderboard</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

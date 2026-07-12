import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../../components/Layout';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  increment,
  runTransaction,
  addDoc
} from 'firebase/firestore';
import { Check, X, Search, Filter, Loader2, ExternalLink, MessageSquare, ShieldCheck, AlertTriangle, Coins, Calendar, User, Info } from 'lucide-react';
import { OfferSubmission } from '../../types';

export default function OfferVerification() {
  const [submissions, setSubmissions] = useState<OfferSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [showApprovalModal, setShowApprovalModal] = useState<OfferSubmission | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState<OfferSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'offer_submissions'),
      where('status', '==', filter)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferSubmission));
      // Sort client-side by submittedAt desc
      docs.sort((a, b) => {
        const timeA = a.submittedAt?.seconds || 0;
        const timeB = b.submittedAt?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching submissions:', error);
      setLoading(false);
    });

    return () => unsub();
  }, [filter]);

  const handleQuickApprove = async (sub: OfferSubmission) => {
    setProcessingId(sub.id);
    try {
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wise_coin_wallets', sub.userId);
        const walletSnap = await transaction.get(walletRef);
        const subRef = doc(db, 'offer_submissions', sub.id);
        const userRef = doc(db, 'users', sub.userId);
        const amount = Number(sub.payout) || 0;

        transaction.update(subRef, {
          status: 'approved',
          reviewedAt: serverTimestamp(),
        });

        transaction.update(userRef, {
          wiseCoins: increment(amount),
          tasksCompleted: increment(1)
        });

        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(amount),
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.set(walletRef, {
            userId: sub.userId,
            balance: amount,
            updatedAt: serverTimestamp(),
          });
        }

        const transRef = doc(collection(db, 'wise_coin_transactions'));
        transaction.set(transRef, {
          userId: sub.userId,
          amount: amount,
          action: 'credit',
          reason: `Offer Approved: ${sub.offerTitle || 'Untitled Offer'}`,
          status: 'completed',
          createdAt: serverTimestamp(),
        });

        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: sub.userId,
          title: '🪙 Wisecoins Awarded!',
          message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was approved! You earned ${sub.payout} Wisecoin.`,
          isRead: false,
          createdAt: serverTimestamp(),
          category: 'reward',
          priority: 'normal',
          status: 'sent'
        });
      });

      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '🪙 Wisecoins Awarded!',
            message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was approved! You earned ${sub.payout} Wisecoin.`,
            targeting: 'specific',
            userId: sub.userId
          })
        });
      } catch (e) {}
    } catch (err: any) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickReject = async (sub: OfferSubmission, reason: string) => {
    setProcessingId(sub.id);
    try {
      await updateDoc(doc(db, 'offer_submissions', sub.id), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, 'notifications'), {
          userId: sub.userId,
          title: '❌ Offer Proof Rejected',
          message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was rejected. Reason: ${reason}`,
          isRead: false,
          createdAt: serverTimestamp(),
          category: 'task',
          priority: 'normal',
          status: 'sent'
        });
        
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '❌ Offer Proof Rejected',
            message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was rejected. Reason: ${reason}`,
            targeting: 'specific',
            userId: sub.userId
          })
        });
      } catch (e) {}
    } catch (err: any) {
      alert('Failed to reject: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async () => {
    if (!showApprovalModal) return;
    const sub = showApprovalModal;
    
    if (!sub.id || !sub.userId) {
      console.error('[OFFER_APPROVE] Invalid submission data:', sub);
      alert('Failed to approve: Submission is missing a valid document ID or User ID.');
      return;
    }

    setProcessingId(sub.id);
    setShowApprovalModal(null);

    console.log('[OFFER_APPROVE] Starting transaction for submission ID:', sub.id, 'User ID:', sub.userId);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. READ PHASE (Must run before any writes)
        const walletRef = doc(db, 'wise_coin_wallets', sub.userId);
        const walletSnap = await transaction.get(walletRef);

        // 2. WRITE PHASE
        // 2.1. Update submission status
        const subRef = doc(db, 'offer_submissions', sub.id);
        transaction.update(subRef, {
          status: 'approved',
          adminNotes: adminNotes.trim(),
          reviewedAt: serverTimestamp(),
        });

        // 2.2. Update User Profile WiseCoins and tasksCompleted
        const amount = Number(sub.payout) || 0;
        const userRef = doc(db, 'users', sub.userId);
        transaction.update(userRef, {
          wiseCoins: increment(amount),
          tasksCompleted: increment(1)
        });

        // Also update separate wallet if it exists (legacy support or if still used)
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(amount),
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.set(walletRef, {
            userId: sub.userId,
            balance: amount,
            updatedAt: serverTimestamp(),
          });
        }

        // 2.3. Create transaction record
        const transRef = doc(collection(db, 'wise_coin_transactions'));
        transaction.set(transRef, {
          userId: sub.userId,
          amount: amount,
          action: 'credit',
          reason: `Offer Approved: ${sub.offerTitle || 'Untitled' || 'Untitled Offer'}`,
          status: 'completed',
          createdAt: serverTimestamp(),
        });

        // 2.4. Create notification
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: sub.userId,
          title: '🪙 Wisecoins Awarded!',
          message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was approved! You earned ${sub.payout} Wisecoin.`,
          isRead: false,
          createdAt: serverTimestamp(),
          category: 'reward',
          priority: 'normal',
          status: 'sent'
        });
      });

      console.log('[OFFER_APPROVE] Transaction succeeded!');

      // Send push notification via backend if endpoint is available
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '🪙 Wisecoins Awarded!',
            message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was approved! You earned ${sub.payout} Wisecoin.`,
            targeting: 'specific',
            userId: sub.userId
          })
        });
      } catch (e) {
        console.warn('Failed to send push notification:', e);
      }

      alert('Offer proof approved and Wisecoins credited successfully!');
      setAdminNotes('');
    } catch (err: any) {
      console.error('Approval error:', err);
      alert('Failed to approve offer submission: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectionModal) return;
    const sub = showRejectionModal;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!sub.id) {
      console.error('[OFFER_REJECT] Invalid submission data:', sub);
      alert('Failed to reject: Submission is missing a valid document ID.');
      return;
    }

    setProcessingId(sub.id);
    setShowRejectionModal(null);

    console.log('[OFFER_REJECT] Rejecting submission ID:', sub.id, 'User:', auth.currentUser?.email);

    try {
      const submissionRef = doc(db, 'offer_submissions', sub.id);
      console.log('[OFFER_REJECT] Doc ref created:', submissionRef.path);
      
      await updateDoc(submissionRef, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes.trim(),
        reviewedAt: serverTimestamp(),
      });
      console.log('[OFFER_REJECT] updateDoc successful');

      // Send rejection notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: sub.userId,
          title: '❌ Offer Proof Rejected',
          message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was rejected. Reason: ${rejectionReason}`,
          isRead: false,
          createdAt: serverTimestamp(),
          category: 'task',
          priority: 'normal',
          status: 'sent'
        });
        
        // Also keep the API call as a fallback
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '❌ Offer Proof Rejected',
            message: `Your proof for offer "${sub.offerTitle || 'Untitled'}" was rejected. Reason: ${rejectionReason}`,
            targeting: 'specific',
            userId: sub.userId
          })
        });
      } catch (e) {
        console.warn('Failed to send push notification:', e);
      }

      alert('Offer proof rejected successfully.');
      setRejectionReason('');
      setAdminNotes('');
    } catch (err: any) {
      console.error('Rejection error:', err);
      alert('Failed to reject submission: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      sub.userName?.toLowerCase().includes(term) ||
      sub.userEmail?.toLowerCase().includes(term) ||
      sub.offerTitle?.toLowerCase().includes(term) ||
      sub.userId?.toLowerCase().includes(term)
    );
  });

  return (
    <Layout title="Offer Verification">
      <div className="p-3 sm:p-5 pb-24 space-y-6 max-w-4xl mx-auto text-slate-100 relative">
        <div className="premium-blur" />

        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] shadow-xl">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/15 text-xs font-black uppercase tracking-widest mb-2">
              <ShieldCheck size={12} />
              Manual Offer Approvals
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase italic tracking-tight">
              Offer Proof Review
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Verify screenshot proofs uploaded by users for premium CPA offers.
            </p>
          </div>
          <div className="bg-slate-950/60 px-5 py-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pending Tasks</span>
            <span className="text-2xl font-display font-black text-amber-400 animate-pulse">{submissions.length}</span>
          </div>
        </div>

        {/* Filter Tabs and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tabs */}
          <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 gap-1">
            {(['pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filter === tab
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search user, email or offer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/5 rounded-2xl py-2.5 pl-11 pr-4 text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white outline-none"
            />
          </div>
        </div>

        {/* submissions list */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading submissons...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-slate-900/20 border border-white/5 rounded-[2.5rem] py-16 text-center space-y-3">
              <ShieldCheck className="mx-auto text-slate-600" size={40} />
              <h3 className="text-lg font-display font-black text-white uppercase italic tracking-tight">
                No Submissions Found
              </h3>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 max-w-xs mx-auto">
                No submissions matching "{filter}" status exist at the moment.
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => (
              <motion.div
                key={sub.id}
                layoutId={sub.id}
                className="bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 rounded-3xl p-5 sm:p-6 transition-all duration-300 space-y-5"
              >
                {/* Meta details */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/5">
                  <div className="space-y-1.5">
                    <span className="bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-blue-500/10">
                      Offer ID: {sub.offerId}
                    </span>
                    <h4 className="text-base font-display font-black text-white uppercase italic tracking-tight">
                      {sub.offerTitle}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-500" /> {sub.userName} ({sub.userEmail})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" /> {sub.submittedAt?.toDate?.()?.toLocaleString() || 'Recently'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-display font-black text-lg tracking-tighter justify-end">
                      <Coins size={16} />
                      {sub.payout.toLocaleString()} WC
                    </div>
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest italic">
                      Expected Reward
                    </span>
                  </div>
                </div>

                {/* Content body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Screenshot thumbnail */}
                  <div className="relative rounded-2xl overflow-hidden border border-white/5 group bg-slate-950/60 max-h-56 flex items-center justify-center p-2">
                    <img 
                      src={sub.screenshotUrl} 
                      alt="Proof screenshot" 
                      className="max-h-48 object-contain rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => setActiveLightboxImage(sub.screenshotUrl)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 transition"
                      >
                        <ExternalLink size={12} /> Expand Image
                      </button>
                    </div>
                  </div>

                  {/* Notes & Actions */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">User's Custom Note</span>
                      <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 min-h-[4.5rem]">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                          {sub.note || 'No note provided by the user.'}
                        </p>
                      </div>
                    </div>

                    {sub.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleQuickApprove(sub)}
                          disabled={processingId !== null}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 disabled:opacity-50 transition-all"
                        >
                          <Check size={14} /> Quick Approve ({sub.payout} WC)
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAdminNotes('');
                              setShowApprovalModal(sub);
                            }}
                            disabled={processingId !== null}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 border border-white/5 disabled:opacity-50 transition-all"
                          >
                            Custom
                          </button>
                          <button
                            onClick={() => {
                              setAdminNotes('');
                              setRejectionReason('');
                              setShowRejectionModal(sub);
                            }}
                            disabled={processingId !== null}
                            className="flex-1 bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600/20 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 disabled:opacity-50 transition-all"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>

                        {/* Quick Rejection Presets */}
                        <div className="grid grid-cols-2 gap-2">
                          {['Invalid Proof', 'Already Used', 'Incomplete', 'Wrong Offer'].map(reason => (
                            <button
                              key={reason}
                              onClick={() => handleQuickReject(sub, reason)}
                              disabled={processingId !== null}
                              className="bg-red-500/5 hover:bg-red-500/10 text-red-500/60 py-1.5 rounded-lg text-[8px] font-black border border-red-500/5 transition-all"
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {sub.status === 'rejected' && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                          <AlertTriangle size={12} /> Rejection Details
                        </span>
                        <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10 text-[11px] text-red-300">
                          <strong>Reason:</strong> {sub.rejectionReason}
                          {sub.adminNotes && (
                            <p className="mt-1"><strong>Admin Notes:</strong> {sub.adminNotes}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {sub.status === 'approved' && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                          <Check size={12} /> Approval Details
                        </span>
                        <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 text-[11px] text-emerald-300">
                          Verified & Credited {sub.payout.toLocaleString()} Wisecoins
                          {sub.adminNotes && (
                            <p className="mt-1"><strong>Admin Notes:</strong> {sub.adminNotes}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {activeLightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLightboxImage(null)}
              className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 cursor-pointer"
            >
              <button className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition">
                <X size={20} />
              </button>
              <img
                src={activeLightboxImage}
                alt="Expanded Proof"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Approval Dialog */}
        <AnimatePresence>
          {showApprovalModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl"
              >
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/15">
                    <Check size={24} />
                  </div>
                  <h3 className="text-xl font-display font-black text-white uppercase italic tracking-tight">
                    Confirm Approval
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    This will credit {showApprovalModal.payout.toLocaleString()} Wisecoins to {showApprovalModal.userName}'s wallet.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    Internal Admin Notes (Optional)
                  </label>
                  <textarea
                    placeholder="E.g., verified username match on campaign logs."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl py-3 px-4 text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white outline-none min-h-[80px] resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowApprovalModal(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Confirm & Credit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejection Dialog */}
        <AnimatePresence>
          {showRejectionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl"
              >
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mx-auto border border-red-500/15">
                    <X size={24} />
                  </div>
                  <h3 className="text-xl font-display font-black text-white uppercase italic tracking-tight">
                    Confirm Rejection
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Reject proof submission for {showRejectionModal.userName}.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                      Reason for Rejection <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="E.g., Screenshot is blurry, fake or is from another offer."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl py-3 px-4 text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                      Internal Admin Notes (Optional)
                    </label>
                    <textarea
                      placeholder="E.g., image matches duplicate file hash block."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl py-3 px-4 text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white outline-none min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRejectionModal(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Confirm Reject
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

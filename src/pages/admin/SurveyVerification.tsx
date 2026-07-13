import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../../components/Layout';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  increment,
  getDoc,
  startAfter,
  limit,
  runTransaction,
  getDocs
} from 'firebase/firestore';
import { Check, X, Search, Filter, Loader2, ExternalLink, MessageSquare, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SurveySubmission } from '../../types/wise_coin';
import { getApiUrl } from '../../lib/config';

import { useAuth } from '../../context/AuthContext';

const SurveyVerification = () => {
  const { user, profile } = useAuth();
  const [dbError, setDbError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [showRewardModal, setShowRewardModal] = useState<SurveySubmission | null>(null);
  const [rewardAmount, setRewardAmount] = useState('50');
  const [showRejectionModal, setShowRejectionModal] = useState<SurveySubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const parseExpectedPayout = (note?: string) => {
    if (!note) return 0;
    const match = note.match(/Expected payout: (\d+) WiseCoins/);
    return match ? parseInt(match[1]) : 0;
  };

  const handleQuickApprove = async (sub: SurveySubmission, amountOverride?: number) => {
    const amount = amountOverride || parseExpectedPayout(sub.note) || 50;
    
    setProcessingId(sub.id);
    try {
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wise_coin_wallets', sub.userId);
        const walletSnap = await transaction.get(walletRef);
        const subRef = doc(db, 'survey_submissions', sub.id);
        
        transaction.update(subRef, {
          status: 'approved',
          rewardAmount: amount,
          reviewedAt: serverTimestamp(),
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
          reason: `Survey Approved: ${sub.surveyTitle || 'Untitled Survey'}`,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });

      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '🪙 Wise Coins Awarded!',
            message: `Your survey proof for "${sub.surveyTitle || 'Untitled'}" was approved! You earned ${amount} WC.`,
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

  const handleQuickReject = async (sub: SurveySubmission, reason: string) => {
    setProcessingId(sub.id);
    try {
      await updateDoc(doc(db, 'survey_submissions', sub.id), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: serverTimestamp(),
      });

      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '❌ Survey Proof Rejected',
            message: `Your survey proof for "${sub.surveyTitle || 'Untitled'}" was rejected. Reason: ${reason}`,
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

  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPageAnchors, setSubmissionsPageAnchors] = useState<any[]>([]);
  const [hasMoreSubmissions, setHasMoreSubmissions] = useState(true);

  // Reset pagination when filter changes
  useEffect(() => {
    setSubmissionsPage(1);
    setSubmissionsPageAnchors([]);
    setHasMoreSubmissions(true);
  }, [filter]);

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      const startTime = performance.now();
      
      try {
        setDbError(null);
        // Load through the server-side API proxy to completely bypass client-side Firestore ISP blocks
        const response = await fetch(getApiUrl(`/api/admin/survey-submissions?adminId=${user?.uid || ''}&status=${filter}`));
        if (!response.ok) {
          throw new Error(`Server returned HTTP status ${response.status}`);
        }
        const docs = await response.json() as SurveySubmission[];

        // Sort descending in memory by submittedAt to keep newest first
        docs.sort((a, b) => {
          const timeA = a.submittedAt?.seconds ? (a.submittedAt.seconds * 1000) : (a.submittedAt ? new Date(a.submittedAt as any).getTime() : 0);
          const timeB = b.submittedAt?.seconds ? (b.submittedAt.seconds * 1000) : (b.submittedAt ? new Date(b.submittedAt as any).getTime() : 0);
          return timeB - timeA;
        });

        setSubmissions(docs);
        setHasMoreSubmissions(false);

        const endTime = performance.now();
        console.log(`[SURVEY_SUBMISSIONS API] Loaded ${docs.length} docs in ${endTime - startTime}ms`);
      } catch (error: any) {
        console.warn("[SURVEY_SUBMISSIONS API] Failed, falling back to direct Firestore...", error);
        
        try {
          const q = query(
            collection(db, 'survey_submissions'),
            where('status', '==', filter),
            limit(150)
          );
          const snap = await getDocs(q);
          let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveySubmission));
          
          docs.sort((a, b) => {
            const timeA = a.submittedAt?.toMillis?.() || (a.submittedAt?.seconds * 1000) || (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
            const timeB = b.submittedAt?.toMillis?.() || (b.submittedAt?.seconds * 1000) || (b.submittedAt ? new Date(b.submittedAt).getTime() : 0);
            return timeB - timeA;
          });

          setSubmissions(docs);
          setHasMoreSubmissions(false);
        } catch (fbError: any) {
          console.error("Firestore fallback failed:", fbError);
          setDbError(fbError?.message || String(fbError));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, [filter, user?.uid]);

  const handleApprove = async () => {
    if (!showRewardModal) return;
    const sub = showRewardModal;
    const amount = parseInt(rewardAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid reward amount');
      return;
    }

    setProcessingId(sub.id);
    setShowRewardModal(null);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. READ PHASE (Must run before any writes)
        const walletRef = doc(db, 'wise_coin_wallets', sub.userId);
        const walletSnap = await transaction.get(walletRef);

        // 2. WRITE PHASE
        // 2.1. Update submission status
        const subRef = doc(db, 'survey_submissions', sub.id);
        transaction.update(subRef, {
          status: 'approved',
          rewardAmount: amount,
          reviewedAt: serverTimestamp(),
        });

        // 2.2. Update Wise Coin Wallet
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
          reason: `Survey Approved: ${sub.surveyTitle || 'Untitled Survey'}`,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });

      // Send REAL push notification (this will create in-app notification doc and trigger real-time FCM)
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '🪙 Wise Coins Awarded!',
            message: `Your survey proof for "${sub.surveyTitle || 'Untitled'}" was approved! You earned ${amount} WC.`,
            targeting: 'specific',
            userId: sub.userId
          })
        });
      } catch (e) {
        console.warn('Failed to send push notification via backend:', e);
      }

      alert('Survey approved and coins credited!');
    } catch (err: any) {
      console.error('Approval error:', err);
      alert('Failed to approve survey: ' + err.message);
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

    setProcessingId(sub.id);
    setShowRejectionModal(null);

    try {
      await updateDoc(doc(db, 'survey_submissions', sub.id), {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: serverTimestamp(),
      });

      // Send REAL push notification (this will create in-app notification doc and trigger real-time FCM)
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: auth.currentUser?.uid,
            title: '❌ Survey Proof Rejected',
            message: `Your survey proof for "${sub.surveyTitle || 'Untitled'}" was rejected. Reason: ${rejectionReason.trim()}`,
            targeting: 'specific',
            userId: sub.userId
          })
        });
      } catch (e) {
        console.warn('Failed to send push notification via backend:', e);
      }

      alert('Survey rejected');
    } catch (err: any) {
      console.error('Rejection error:', err);
      alert('Failed to reject survey: ' + err.message);
    } finally {
      setProcessingId(null);
      setRejectionReason('');
    }
  };

  const filteredSubmissions = submissions.filter(sub => sub.status === filter);
  return (
    <Layout title="Survey Verification" showBack>
      <div className="p-4 space-y-6">
        {dbError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-red-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase tracking-wider text-red-400">Database Access Issue</h3>
                <p className="text-xs font-bold text-red-300 mt-1 leading-relaxed">
                  Unable to retrieve survey submissions collection.
                </p>
                <div className="mt-4 bg-slate-900/50 rounded-xl p-3 border border-white/5 font-mono text-[10px] space-y-1 text-slate-300">
                  <p><strong>Error:</strong> {dbError}</p>
                  <p><strong>Logged Email:</strong> {user?.email || 'Unknown'}</p>
                  <p><strong>Document Role:</strong> {profile?.role || 'user'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-black text-white uppercase italic tracking-tight">Survey Verification</h2>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Review user survey proofs and award Wise Coins</p>
          </div>
          
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
            {(['pending', 'approved', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={40} className="text-blue-500 animate-spin" />
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Scanning Submissions...</p>
        </div>
      ) : filteredSubmissions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubmissions.map((sub) => (
              <motion.div
                key={sub.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden flex flex-col group"
              >
                {/* Image Gallery */}
                {sub.screenshots && sub.screenshots.length > 0 && (
                  <div className="aspect-video bg-slate-950 flex gap-1 p-1 border-b border-white/5">
                    {(sub.screenshots || []).slice(0, 2).map((url, i) => (
                      <div key={i} className="flex-1 relative overflow-hidden bg-slate-900/50 rounded-lg group/img flex items-center justify-center">
                        <img 
                          src={url} 
                          alt="Proof" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-500" 
                          onClick={() => setActiveLightboxImage(url)} 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <ExternalLink size={20} className="text-white" />
                        </div>
                      </div>
                    ))}
                    {sub.screenshots.length > 2 && (
                      <div className="w-20 bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 hover:text-white relative rounded-lg cursor-pointer" onClick={() => setActiveLightboxImage(sub.screenshots[2])}>
                        +{sub.screenshots.length - 2}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-sm font-display font-black text-white uppercase italic truncate max-w-[200px]">
                        {sub.surveyTitle || 'Untitled Survey'}
                      </h3>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1">{sub.userName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {sub.submittedAt?.toDate?.()?.toLocaleString() || (sub.submittedAt?.seconds ? new Date(sub.submittedAt.seconds * 1000).toLocaleString() : 'N/A')}
                      </p>
                    </div>
                  </div>

                  {sub.note && (
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={10} className="text-slate-500" />
                        <span className="text-[8px] font-black uppercase text-slate-500">User Note</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic">"{sub.note}"</p>
                    </div>
                  )}

                  <div className="mt-auto space-y-2">
                    {sub.status === 'pending' && (
                      <>
                        {/* Expected Payout Action */}
                        {parseExpectedPayout(sub.note) > 0 && (
                          <button
                            onClick={() => handleQuickApprove(sub)}
                            disabled={processingId === sub.id}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                          >
                            {processingId === sub.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            Approve Expected ({parseExpectedPayout(sub.note)} WC)
                          </button>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRewardModal(sub)}
                            disabled={processingId === sub.id}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-widest border border-white/5"
                          >
                            Custom
                          </button>
                          <button
                            onClick={() => setShowRejectionModal(sub)}
                            disabled={processingId === sub.id}
                            className="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-widest"
                          >
                            Reject
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-4 gap-2">
                          {[50, 100, 250, 500].map(amt => (
                            <button
                              key={amt}
                              onClick={() => handleQuickApprove(sub, amt)}
                              disabled={processingId === sub.id}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-[9px] font-black border border-white/5 transition-all"
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>

                        {/* Quick Reject Presets */}
                        <div className="grid grid-cols-2 gap-2">
                          {['Invalid Proof', 'Already Used'].map(reason => (
                            <button
                              key={reason}
                              onClick={() => handleQuickReject(sub, reason)}
                              disabled={processingId === sub.id}
                              className="bg-red-500/5 hover:bg-red-500/10 text-red-500/60 py-2 rounded-lg text-[8px] font-black border border-red-500/5 transition-all"
                            >
                              Reject: {reason}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {sub.status === 'approved' && (
                      <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest">
                        <ShieldCheck size={14} />
                        Approved (+{sub.rewardAmount} WC)
                      </div>
                    )}
                    {sub.status === 'rejected' && (
                      <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest flex-col text-center">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} />
                          Rejected
                        </div>
                        {sub.rejectionReason && <p className="text-[8px] mt-1 opacity-70 italic">{sub.rejectionReason}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {submissions.length > 0 && (
            <div className="flex items-center justify-between mt-8 bg-slate-900/40 p-4 rounded-3xl border border-white/5 shadow-xl">
              <button
                disabled={submissionsPage === 1}
                onClick={() => {
                  setSubmissionsPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl disabled:opacity-30 disabled:hover:bg-white/5 transition-all text-xs border border-white/5"
              >
                Previous Page
              </button>
              <span className="text-xs font-extrabold text-slate-400">Page {submissionsPage}</span>
              <button
                disabled={!hasMoreSubmissions}
                onClick={() => {
                  setSubmissionsPage(p => p + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl disabled:opacity-30 disabled:hover:bg-white/5 transition-all text-xs border border-white/5"
              >
                Next Page
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-24 bg-slate-900/30 border border-white/5 rounded-[3rem] relative overflow-hidden">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner">
            <Search size={32} className="text-slate-700" />
          </div>
          <h3 className="font-display font-black text-white text-2xl uppercase tracking-tighter italic">Clean Queue</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">No {filter} submissions found</p>
        </div>
      )}

      {/* Reward Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRewardModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm relative z-10">
              <h3 className="text-xl font-display font-black text-white mb-2 uppercase italic tracking-tight">Set WC Reward</h3>
              <p className="text-slate-400 text-xs mb-6">Enter the amount of Wise Coins to award for this survey completion.</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-display font-black text-amber-500 text-center focus:border-amber-500/50 outline-none transition-all"
                    placeholder="50"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-500/50 font-black text-xs uppercase tracking-widest">WC</div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowRewardModal(null)} className="flex-1 py-4 bg-white/5 text-slate-400 font-black rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                  <button onClick={handleApprove} className="flex-2 py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20 uppercase tracking-widest text-[10px]">Approve & Credit</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRejectionModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm relative z-10">
              <h3 className="text-xl font-display font-black text-white mb-2 uppercase italic tracking-tight text-red-500">Reject Submission</h3>
              <p className="text-slate-400 text-xs mb-6">Provide a reason why this proof was rejected. This will be shown to the user.</p>
              
              <div className="space-y-4">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-4 text-sm font-medium text-white focus:border-red-500/50 outline-none transition-all resize-none"
                  placeholder="e.g. Blurry screenshot, incorrect survey page, proof already used..."
                  rows={4}
                />

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowRejectionModal(null)} className="flex-1 py-4 bg-white/5 text-slate-400 font-black rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                  <button onClick={handleReject} className="flex-2 py-4 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest text-[10px]">Confirm Reject</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeLightboxImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveLightboxImage(null)} 
              className="absolute inset-0 bg-black/95 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative max-w-4xl max-h-[85vh] z-10 flex flex-col items-center gap-4"
            >
              <button 
                onClick={() => setActiveLightboxImage(null)} 
                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white font-bold p-2.5 rounded-full transition-all focus:outline-none"
                title="Close"
              >
                <X size={20} />
              </button>
              
              <div className="relative overflow-auto rounded-xl border border-white/10 shadow-2xl bg-slate-950 flex items-center justify-center max-w-full">
                <img 
                  src={activeLightboxImage} 
                  alt="Proof Fullscreen" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[75vh] object-contain select-none" 
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveLightboxImage(null)} 
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Close Proof
                </button>
                <a 
                  href={activeLightboxImage} 
                  download={`proof_survey_${Date.now()}.jpg`}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                >
                  Download Proof
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </Layout>
  );
};

export default SurveyVerification;

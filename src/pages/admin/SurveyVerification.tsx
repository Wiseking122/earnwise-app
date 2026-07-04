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
  runTransaction
} from 'firebase/firestore';
import { Check, X, Search, Filter, Loader2, ExternalLink, MessageSquare, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SurveySubmission } from '../../types/wise_coin';

const SurveyVerification = () => {
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [showRewardModal, setShowRewardModal] = useState<SurveySubmission | null>(null);
  const [rewardAmount, setRewardAmount] = useState('50');
  const [showRejectionModal, setShowRejectionModal] = useState<SurveySubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'survey_submissions'),
      where('status', '==', filter)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveySubmission));
      // Sort client-side by submittedAt desc
      docs.sort((a, b) => {
        const timeA = a.submittedAt?.seconds || 0;
        const timeB = b.submittedAt?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [filter]);

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

  return (
    <Layout title="Survey Verification" showBack>
      <div className="p-4 space-y-6">
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
      ) : submissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map((sub) => (
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
                      {sub.submittedAt?.toDate?.()?.toLocaleString() || 'N/A'}
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

                <div className="mt-auto flex gap-2">
                  {sub.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setShowRewardModal(sub)}
                        disabled={processingId === sub.id}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-widest"
                      >
                        {processingId === sub.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectionModal(sub)}
                        disabled={processingId === sub.id}
                        className="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-widest"
                      >
                        <X size={14} />
                        Reject
                      </button>
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

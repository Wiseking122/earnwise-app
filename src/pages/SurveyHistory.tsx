import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Search, Calendar, ChevronRight, ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { SurveySubmission } from '../types/wise_coin';

const SurveyHistory = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'survey_submissions'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SurveySubmission))
        .filter(sub => sub.status === 'approved');
      // Sort client-side by submittedAt desc
      docs.sort((a, b) => {
        const timeA = a.submittedAt?.seconds || 0;
        const timeB = b.submittedAt?.seconds || 0;
        return timeB - timeA;
      });
      setSubmissions(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching history:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'approved': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'rejected': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'approved': return <CheckCircle2 size={14} />;
      case 'rejected': return <XCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
         <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-display font-black">Survey History</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
            ))}
          </div>
        ) : submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${getStatusColor(sub.status)}`}>
                        {getStatusIcon(sub.status)}
                        {sub.status}
                      </span>
                      {sub.rewardAmount && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                          +{sub.rewardAmount} WC
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-display font-black text-white uppercase italic tracking-tight">
                      {sub.surveyTitle || 'Unnamed Survey Submission'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 justify-end">
                      <Calendar size={10} />
                      {sub.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </div>
                  </div>
                </div>

                {sub.note && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 bg-white/5 p-2 rounded-lg italic">
                    "{sub.note}"
                  </p>
                )}

                {sub.rejectionReason && sub.status === 'rejected' && (
                  <div className="text-[10px] text-red-400 font-medium italic mt-2">
                    Reason: {sub.rejectionReason}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[3rem] relative overflow-hidden">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner">
              <Search size={32} className="text-slate-700" />
            </div>
            <h3 className="font-display font-black text-white text-2xl uppercase tracking-tighter italic">No History</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Your survey submissions will appear here</p>
            <button
              onClick={() => navigate('/submit-survey')}
              className="mt-8 px-6 py-3 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Submit Your First Proof
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyHistory;

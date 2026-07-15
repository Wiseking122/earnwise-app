import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, doc, updateDoc, setDoc, onSnapshot, serverTimestamp, query, orderBy, limit, where, startAfter, getDocs, getCountFromServer } from 'firebase/firestore';
import { sendNotification } from '../../lib/notifications';
import { 
  ShieldAlert, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  ExternalLink, 
  MessageSquare, 
  AlertCircle, 
  X, 
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface Appeal {
  id: string;
  appealId: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  message: string;
  screenshot?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  suspensionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function AppealsManager() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Real-time counts
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Pagination states
  const [appealsPage, setAppealsPage] = useState(1);
  const [appealsPageAnchors, setAppealsPageAnchors] = useState<any[]>([]);
  const [hasMoreAppeals, setHasMoreAppeals] = useState(true);

  // Custom confirmation and alert modals
  const [confirmModal, setConfirmModal] = useState<{
    type: 'Approve' | 'Reject';
    appeal: Appeal;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Static count fetchers instead of live onSnapshot to prevent excessive quota usage
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [pending, approved, rejected] = await Promise.all([
          getCountFromServer(query(collection(db, 'appeals'), where('status', '==', 'Pending'))),
          getCountFromServer(query(collection(db, 'appeals'), where('status', '==', 'Approved'))),
          getCountFromServer(query(collection(db, 'appeals'), where('status', '==', 'Rejected')))
        ]);
        setPendingCount(pending.data().count);
        setApprovedCount(approved.data().count);
        setRejectedCount(rejected.data().count);
      } catch (err: any) {
        if (err?.message?.includes("Quota exceeded") || String(err).includes("Quota exceeded")) {
          console.warn("Firestore quota exceeded for count queries in Appeals. Setting counts to 0.");
          setPendingCount(0);
          setApprovedCount(0);
          setRejectedCount(0);
        } else {
          console.error("Failed to fetch appeal counts:", err);
        }
      }
    };
    fetchCounts();
  }, []);

  // Reset pagination when tab changes
  useEffect(() => {
    setAppealsPage(1);
    setAppealsPageAnchors([]);
    setHasMoreAppeals(true);
  }, [activeTab]);

  // Fetch paginated appeals from Firestore based on activeTab
  useEffect(() => {
    async function fetchAppeals() {
      setLoading(true);
      const startTime = performance.now();
      
      let q = query(
        collection(db, 'appeals'),
        where('status', '==', activeTab),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (appealsPage > 1 && appealsPageAnchors[appealsPage - 2]) {
        q = query(
          collection(db, 'appeals'),
          where('status', '==', activeTab),
          orderBy('createdAt', 'desc'),
          startAfter(appealsPageAnchors[appealsPage - 2]),
          limit(20)
        );
      }

      try {
        const snapshot = await getDocs(q);
        const list: Appeal[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Appeal[];
        
        setAppeals(list);
        setHasMoreAppeals(snapshot.docs.length === 20);

        if (snapshot.docs.length > 0) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          setAppealsPageAnchors((prev) => {
            const updated = [...prev];
            updated[appealsPage - 1] = lastDoc;
            return updated;
          });
        }
        setError(null);
        const endTime = performance.now();
        console.log(`[APPEALS] Query took ${endTime - startTime}ms`);
      } catch (err: any) {
        console.error("Error reading appeals:", err);
        setError("Failed to synchronize appeals database.");
      } finally {
        setLoading(false);
      }
    }

    fetchAppeals();
  }, [activeTab, appealsPage]);

  // Filter appeals based on searchQuery (status is already filtered by DB query)
  const filteredAppeals = appeals.filter(appeal => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      appeal.fullName?.toLowerCase().includes(searchLower) ||
      appeal.username?.toLowerCase().includes(searchLower) ||
      appeal.email?.toLowerCase().includes(searchLower) ||
      appeal.message?.toLowerCase().includes(searchLower) ||
      appeal.userId?.toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });

  // Count helper using real-time listener counts
  const countByStatus = (status: 'Pending' | 'Approved' | 'Rejected') => {
    if (status === 'Pending') return pendingCount;
    if (status === 'Approved') return approvedCount;
    return rejectedCount;
  };

  // Handle Approve Action
  const handleApprove = (appeal: Appeal) => {
    setConfirmModal({
      type: 'Approve',
      appeal
    });
  };

  // Handle Reject Action
  const handleReject = (appeal: Appeal) => {
    setConfirmModal({
      type: 'Reject',
      appeal
    });
  };

  // Execute the confirmed action
  const executeConfirmedAction = async () => {
    if (!confirmModal) return;
    const { type, appeal } = confirmModal;
    setConfirmModal(null);
    setProcessingId(appeal.id);

    try {
      if (type === 'Approve') {
        // 1. Update the appeal status to Approved
        await updateDoc(doc(db, 'appeals', appeal.id), {
          status: 'Approved',
          updatedAt: serverTimestamp()
        });

        // 2. Reactivate the user's account
        await setDoc(doc(db, 'users', appeal.userId), {
          securityMetrics: {
            isSuspended: false,
            suspensionReason: ''
          }
        }, { merge: true });

        // 3. Send system in-app notification
        await sendNotification({
          userId: appeal.userId,
          title: 'Account Restored 🎉',
          message: 'Your suspension appeal was approved and your account is reactivated. Welcome back!',
          type: 'security'
        });

        setAlertModal({
          title: 'Account Reactivated',
          message: `The suspension for ${appeal.fullName} (@${appeal.username}) has been successfully revoked.`,
          type: 'success'
        });
      } else {
        // 1. Update appeal status to Rejected
        await updateDoc(doc(db, 'appeals', appeal.id), {
          status: 'Rejected',
          updatedAt: serverTimestamp()
        });

        // 2. Send in-app notification explaining the appeal was denied
        await sendNotification({
          userId: appeal.userId,
          title: 'Appeal Rejected ⚠️',
          message: 'Your suspension appeal was reviewed and rejected by our compliance team. Your account remains suspended.',
          type: 'security'
        });

        setAlertModal({
          title: 'Appeal Rejected',
          message: `The appeal for ${appeal.fullName} (@${appeal.username}) has been rejected. Their account remains suspended.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error(`Failed to process ${type} action:`, err);
      setAlertModal({
        title: 'Operation Failed',
        message: err.message || `An error occurred while attempting to ${type.toLowerCase()} the appeal.`,
        type: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <Layout title="Appeals Manager" showBack>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 min-h-screen bg-[#030712] text-slate-100">
        
        {/* Top Header info */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic flex items-center gap-2 text-white">
              <ShieldAlert className="text-amber-500 animate-pulse" size={26} />
              Suspension Appeals
            </h2>
            <p className="text-xs text-slate-400">
              Evaluate and process user-submitted suspension appeals and evidence.
            </p>
          </div>
        </div>

        {/* Search & Tabs control */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search by Name, Username, Email, Message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090D1A] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-[#090D1A] p-1 rounded-2xl border border-white/5 w-full sm:max-w-md">
            {(['Pending', 'Approved', 'Rejected'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = countByStatus(tab);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isActive 
                      ? tab === 'Pending' ? 'bg-amber-500 text-black shadow-lg font-black'
                        : tab === 'Approved' ? 'bg-emerald-500 text-black shadow-lg font-black'
                        : 'bg-rose-500 text-white shadow-lg font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive 
                      ? 'bg-black/20 text-current' 
                      : tab === 'Pending' ? 'bg-amber-500/10 text-amber-400'
                        : tab === 'Approved' ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appeals display list */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2 font-bold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-amber-500" size={40} />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Synchronizing Appeals Ledger...</p>
          </div>
        ) : filteredAppeals.length === 0 ? (
          <div className="bg-[#090D1A]/50 border border-white/5 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-black uppercase text-xs tracking-wider">No appeals found</p>
              <p className="text-slate-500 text-[11px]">There are no {activeTab.toLowerCase()} appeals matching your search.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppeals.map((appeal) => (
              <div 
                key={appeal.id}
                className="bg-[#090D1A] border border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-white/20 transition-colors"
              >
                {/* Visual Accent glow line */}
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
                  appeal.status === 'Pending' ? 'from-amber-600 via-amber-400 to-amber-600' :
                  appeal.status === 'Approved' ? 'from-emerald-600 via-teal-400 to-emerald-600' :
                  'from-rose-600 via-red-400 to-rose-600'
                }`} />

                <div className="space-y-4">
                  {/* User info header */}
                  <div className="flex items-start justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                        {appeal.fullName ? appeal.fullName.charAt(0).toUpperCase() : <User size={16} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase">{appeal.fullName}</h4>
                        <p className="text-[10px] text-amber-400 font-bold">@{appeal.username}</p>
                        <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Mail size={10} />
                          {appeal.email}
                        </p>
                      </div>
                    </div>
                    
                    <span className="text-[8px] font-mono text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(appeal.createdAt)}
                    </span>
                  </div>

                  {/* Suspension reason stated */}
                  {appeal.suspensionReason && (
                    <div className="bg-red-950/20 border border-red-900/10 rounded-xl p-3 text-[10px] text-red-300">
                      <span className="font-black uppercase text-[8px] tracking-wider text-red-400 flex items-center gap-1 mb-1">
                        <AlertTriangle size={10} />
                        Original Suspension Reason:
                      </span>
                      <p className="italic">"{appeal.suspensionReason}"</p>
                    </div>
                  )}

                  {/* User message block */}
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <MessageSquare size={10} />
                      User Message:
                    </span>
                    <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto font-medium">
                      {appeal.message}
                    </div>
                  </div>

                  {/* Image/evidence if provided */}
                  {appeal.screenshot ? (
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <ExternalLink size={10} />
                        Evidence Screenshot:
                      </span>
                      <div className="relative group overflow-hidden border border-white/10 rounded-xl aspect-video bg-black max-w-[200px] cursor-pointer" onClick={() => setSelectedScreenshot(appeal.screenshot!)}>
                        <img 
                          src={appeal.screenshot} 
                          alt="Appeal Evidence" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-black uppercase bg-black/70 border border-white/10 text-white px-2.5 py-1 rounded-lg">View Fullscreen</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 font-semibold italic">
                      * No screenshot evidence attached.
                    </div>
                  )}
                </div>

                {/* Actions container */}
                <div className="mt-5 border-t border-white/5 pt-4 flex gap-2">
                  {appeal.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(appeal)}
                        disabled={processingId !== null}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        {processingId === appeal.id ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle size={12} />}
                        Approve & Reactivate
                      </button>
                      <button
                        onClick={() => handleReject(appeal)}
                        disabled={processingId !== null}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-rose-500/10"
                      >
                        {processingId === appeal.id ? <Loader2 className="animate-spin" size={12} /> : <XCircle size={12} />}
                        Reject Appeal
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex justify-between items-center text-slate-500 font-mono text-[10px] px-2">
                      <span className="font-semibold">Decided at: {formatDate(appeal.updatedAt)}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        appeal.status === 'Approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {appeal.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Pagination Controls */}
            {filteredAppeals.length > 0 && (
              <div className="flex items-center justify-between mt-8 bg-slate-900/40 p-4 rounded-3xl border border-white/5 shadow-xl">
                <button
                  disabled={appealsPage === 1}
                  onClick={() => {
                    setAppealsPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl disabled:opacity-30 disabled:hover:bg-white/5 transition-all text-xs border border-white/5"
                >
                  Previous Page
                </button>
                <span className="text-xs font-extrabold text-slate-400">Page {appealsPage}</span>
                <button
                  disabled={!hasMoreAppeals}
                  onClick={() => {
                    setAppealsPage(p => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl disabled:opacity-30 disabled:hover:bg-white/5 transition-all text-xs border border-white/5"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={() => setSelectedScreenshot(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer border border-white/10"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative">
            <img 
              src={selectedScreenshot} 
              alt="Evidence Fullscreen" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl ${confirmModal.type === 'Approve' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {confirmModal.type === 'Approve' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-black uppercase tracking-tight italic text-white">
                  Confirm {confirmModal.type} Action
                </h3>
                <div className="text-xs text-slate-400 leading-relaxed">
                  {confirmModal.type === 'Approve' ? (
                    <p>Are you sure you want to <strong>APPROVE</strong> the appeal for <strong>{confirmModal.appeal.fullName} (@{confirmModal.appeal.username})</strong>? This will instantly revoke their suspension and reactivate their access to Earnwise.</p>
                  ) : (
                    <p>Are you sure you want to <strong>REJECT</strong> the appeal for <strong>{confirmModal.appeal.fullName} (@{confirmModal.appeal.username})</strong>? Their account will remain fully suspended.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2 justify-end">
              <button 
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={executeConfirmedAction}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                  confirmModal.type === 'Approve' 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                Confirm {confirmModal.type}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-white/5 mb-2">
              {alertModal.type === 'success' ? (
                <CheckCircle size={28} className="text-emerald-400" />
              ) : (
                <XCircle size={28} className="text-rose-500" />
              )}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black uppercase tracking-tight text-white italic">
                {alertModal.title}
              </h3>
              <p className="text-xs text-slate-300 px-2 leading-relaxed">
                {alertModal.message}
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button 
                onClick={() => setAlertModal(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

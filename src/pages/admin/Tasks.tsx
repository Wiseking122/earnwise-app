import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  runTransaction,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Task, TaskType, TaskCompletion } from '../../types';
import { sendNotification, NotificationType } from '../../lib/notifications';
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Check, 
  Clock, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Megaphone,
  ExternalLink
} from 'lucide-react';

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [adRequests, setAdRequests] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'manage' | 'verify' | 'ads'>('manage');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedScreenshotForModal, setSelectedScreenshotForModal] = useState<string | null>(null);
  
  // New Task Form
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TaskType>('ad');
  const [newTotalBudget, setNewTotalBudget] = useState('');
  const [newCpa, setNewCpa] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newAdvertiserId, setNewAdvertiserId] = useState('internal_platform');
  const [newLink, setNewLink] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newShareText, setNewShareText] = useState('');
  const [newDurationDays, setNewDurationDays] = useState('30');
  const [enableSocialShare, setEnableSocialShare] = useState(false);
  const [adDurations, setAdDurations] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const qComps = query(collection(db, 'completions'), where('status', '==', 'pending'));
    const unsubComps = onSnapshot(qComps, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskCompletion));
      // Sort locally by submittedAt desc
      docs.sort((a, b) => {
        const timeA = (a.submittedAt as any)?.toMillis?.() || 0;
        const timeB = (b.submittedAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setCompletions(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'completions'));

    const qAds = query(collection(db, 'tasks'), where('status', '==', 'pending'));
    const unsubAds = onSnapshot(qAds, (snap) => {
      setAdRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    return () => {
      unsubTasks();
      unsubComps();
      unsubAds();
    };
  }, []);

  const handleApproveAd = async (ad: Task) => {
    try {
      const duration = parseInt(adDurations[ad.id] || '30');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      await updateDoc(doc(db, 'tasks', ad.id), { 
        status: 'active',
        durationDays: duration,
        expiresAt: expiresAt,
        activatedAt: serverTimestamp()
      });
      
      if (ad.advertiserId) {
        await sendNotification({
          userId: ad.advertiserId,
          title: '✅ Ad Approved!',
          message: `Your campaign "${ad.title}" is now live across the platform.`,
          type: NotificationType.SUCCESS
        });
      }
    } catch (err: any) {
      console.error("Approval detailed error:", err);
      alert(`Approval failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRejectAd = async (ad: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', ad.id), { status: 'rejected' });
      if (ad.advertiserId) {
        await sendNotification({
          userId: ad.advertiserId,
          title: '❌ Ad Rejected',
          message: `Your campaign "${ad.title}" was not approved. Check our guidelines.`,
          type: NotificationType.ALERT
        });
      }
    } catch (err: any) {
      console.error("Rejection detailed error:", err);
      alert(`Rejection failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const budget = parseFloat(newTotalBudget);
      const cpa = parseFloat(newCpa);
      const userPayout = cpa * 0.70;
      const platformMargin = cpa * 0.30;
      const duration = parseInt(newDurationDays);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      const taskRef = await addDoc(collection(db, 'tasks'), {
        title: newTitle,
        advertiserId: newAdvertiserId,
        totalBudget: budget,
        remainingBudget: budget,
        userPayout,
        platformMargin,
        tag: newTag || 'general',
        link: newLink || null,
        videoUrl: newVideoUrl || null,
        imageUrl: newImageUrl || null,
        shareText: newShareText || null,
        enableSocialShare,
        type: newType,
        status: 'active',
        durationDays: duration,
        expiresAt: expiresAt,
        createdAt: serverTimestamp()
      });

      // Broadcast Notification
      await sendNotification({
        userId: 'all',
        title: '🚀 New High-Paying Task!',
        message: `A new task "${newTitle}" is now live! Earn ₦${userPayout.toLocaleString()} instantly.`,
        type: NotificationType.INFO,
        actionLink: `/tasks/${taskRef.id}`
      });

      setIsAdding(false);
      setNewTitle('');
      setNewTotalBudget('');
      setNewCpa('');
      setNewTag('');
      setNewLink('');
      setNewVideoUrl('');
      setNewImageUrl('');
      setNewShareText('');
      setEnableSocialShare(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'active' ? 'inactive' : 'active';
    await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus, updatedAt: serverTimestamp() });
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteDoc(doc(db, 'tasks', id));
    }
  };

  const handleVerifyCompletion = async (completion: TaskCompletion, status: 'approved' | 'rejected') => {
    try {
      let referrerId: string | null = null;

      if (status === 'approved') {
        const userSnap = await getDoc(doc(db, 'users', completion.userId));
        const userData = userSnap.data();
        if (userData?.referredBy && !userData.hasReceivedReferralBonus) {
          const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', userData.referredBy), limit(1));
          const referrerSnap = await getDocs(referrerQuery);
          if (!referrerSnap.empty) {
            referrerId = referrerSnap.docs[0].id;
          }
        }
      }

      await runTransaction(db, async (transaction) => {
        const compRef = doc(db, 'completions', completion.id);
        const userRef = doc(db, 'users', completion.userId);
        
        transaction.update(compRef, { 
          status, 
          verifiedAt: serverTimestamp() 
        });

        const notifTitle = status === 'approved' ? '✅ Submission Approved!' : '❌ Submission Rejected';
        const taskIdent = completion.taskId ? completion.taskId.slice(0, 5) : 'Task';
        const notifMsg = status === 'approved' 
          ? `Your submission for task ${taskIdent}... was approved. ₦${completion.rewardEarned} added to your balance.`
          : 'Your submission was rejected. Please ensure you followed all instructions and provided clear proof.';
        
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: completion.userId,
          title: notifTitle,
          message: notifMsg,
          read: false,
          type: status === 'approved' ? NotificationType.SUCCESS : NotificationType.ALERT,
          createdAt: serverTimestamp(),
          readBy: []
        });

        if (status === 'approved') {
          const uSnap = await transaction.get(userRef);
          if (uSnap.exists()) {
            const uData = uSnap.data();
            
            // IMPORTANT: Manual manual tasks go to WITHDRAWABLE directly if the admin wants.
            // For now, we will add to both balance (total) and pendingBalance (escrow)
            // unless we decide on a different platform policy.
            // USER REQUEST FIX: The admin was unable to "approve into funds" because
            // previous code only hit pendingBalance which wasn't used for withdrawals.
            
            transaction.update(userRef, { 
              balance: (uData.balance || 0) + completion.rewardEarned,
              withdrawableBalance: (uData.withdrawableBalance || 0) + completion.rewardEarned,
              updatedAt: serverTimestamp()
            });

            const transRef = doc(collection(db, 'transactions'));
            transaction.set(transRef, {
              userId: completion.userId,
              amount: completion.rewardEarned,
              type: 'earning',
              status: 'completed', // Manually approved tasks are finalized immediately
              description: `Manual Reward: ${taskIdent}`,
              createdAt: serverTimestamp()
            });

            if (referrerId) {
              const referrerRef = doc(db, 'users', referrerId);
              const referrerSnap = await transaction.get(referrerRef);
              if (referrerSnap.exists()) {
                const referralBonus = 2.00;
                const rData = referrerSnap.data();
                transaction.update(referrerRef, { 
                  pendingBalance: (rData.pendingBalance || 0) + referralBonus 
                });
                transaction.update(userRef, { hasReceivedReferralBonus: true });

                const refTransRef = doc(collection(db, 'transactions'));
                transaction.set(refTransRef, {
                  userId: referrerId,
                  amount: referralBonus,
                  type: 'referral',
                  status: 'pending',
                  availableAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  description: `Referral bonus for ${uData.displayName || 'Friend'}`,
                  createdAt: serverTimestamp()
                });
              }
            }
          }
        }
      });
    } catch (err: any) {
      console.error("Verification error details:", err);
      alert(`Verification failed: ${err.message || 'Unknown error'}`);
      handleFirestoreError(err, OperationType.UPDATE, 'verify_completion');
    }
  };

  return (
    <Layout title="Task Admin" showBack>
      <div className="p-4 space-y-6">
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'manage' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Manage
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ads' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Ad Approvals ({adRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('verify')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'verify' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Proof ({completions.length})
          </button>
        </div>

        {activeTab === 'ads' && (
          <div className="space-y-4">
             {adRequests.length > 0 ? (
               adRequests.map((ad) => (
                 <div key={ad.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-gray-900">{ad.title}</h4>
                        <p className="text-xs text-blue-600 font-black">Budget: ₦{ad.totalBudget.toLocaleString()} • Payout: ₦{ad.userPayout}</p>
                      </div>
                      <a href={ad.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <ExternalLink size={18} />
                      </a>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-400">Campaign Duration (Days)</label>
                       <input 
                         type="number" 
                         value={adDurations[ad.id] || '30'} 
                         onChange={(e) => setAdDurations(prev => ({ ...prev, [ad.id]: e.target.value }))}
                         className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-blue-500"
                         placeholder="Set days (e.g. 30)"
                       />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleApproveAd(ad)}
                        className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRejectAd(ad)}
                        className="flex-1 bg-amber-50 text-amber-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(ad.id)}
                        className="bg-red-50 text-red-600 p-3 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <Megaphone size={48} className="text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold">No pending ad approvals</p>
               </div>
             )}
          </div>
        )}

        {activeTab === 'manage' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Task Library</h3>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-100"
              >
                {isAdding ? <X size={20} /> : <Plus size={20} />}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleCreateTask} className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-xl space-y-4">
                <input 
                  type="text" placeholder="Task Title (e.g. Subscribe to Tech Channel)" required 
                  className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-bold"
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                />
                
                <div className="grid grid-cols-2 gap-4">
                   <select 
                    className="bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-bold"
                    value={newType} onChange={e => setNewType(e.target.value as TaskType)}
                  >
                    <option value="ad">Watch Ad</option>
                    <option value="survey">Survey</option>
                    <option value="app_download">App Download</option>
                    <option value="content_creation">Content</option>
                  </select>
                  <input 
                    type="text" placeholder="Behavioral Tag (e.g. finance, tech)" 
                    className="bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-bold"
                    value={newTag} onChange={e => setNewTag(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">Total Budget (₦)</label>
                    <input 
                      type="number" placeholder="10000" required step="0.01"
                      className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-bold"
                      value={newTotalBudget} onChange={e => setNewTotalBudget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">CPA (Cost Per Action) (₦)</label>
                    <input 
                      type="number" placeholder="50" required step="0.01"
                      className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-bold"
                      value={newCpa} onChange={e => setNewCpa(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">Duration (Days)</label>
                    <input 
                      type="number" placeholder="30" required
                      className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-bold"
                      value={newDurationDays} onChange={e => setNewDurationDays(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <input 
                    type="url" placeholder="Affiliate Link (Optional)" 
                    className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-medium"
                    value={newLink} onChange={e => setNewLink(e.target.value)}
                  />
                  <input 
                    type="url" placeholder="Video URL (Optional)" 
                    className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-medium"
                    value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)}
                  />
                  <input 
                    type="url" placeholder="Image URL (Optional)" 
                    className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-medium"
                    value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                  <input 
                    type="checkbox" id="enableShare" className="w-5 h-5 accent-blue-600"
                    checked={enableSocialShare} onChange={e => setEnableSocialShare(e.target.checked)}
                  />
                  <label htmlFor="enableShare" className="text-xs font-black uppercase text-gray-500">Enable Social Sharing Activity</label>
                </div>
                {enableSocialShare && (
                  <textarea 
                    placeholder="Share Text (e.g. Join me on Julia and earn from brands! #Monetize)"
                    className="w-full bg-gray-50 text-slate-900 border-none rounded-xl p-4 text-sm font-medium h-20"
                    value={newShareText} onChange={e => setNewShareText(e.target.value)}
                  />
                )}

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">
                    <span>User Payout (70%)</span>
                    <span>₦{(parseFloat(newCpa) * 0.7 || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-400">
                    <span>Platform Margin (30%)</span>
                    <span>₦{(parseFloat(newCpa) * 0.3 || 0).toFixed(2)}</span>
                  </div>
                </div>

                <button className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-100">Deploy Advertiser Task</button>
              </form>
            )}

            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">{task.title}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                      Creator: {task.advertiserId === 'internal_platform' || !task.advertiserId ? '🛡️ Admin' : `👤 User Advertiser (${task.advertiserId.slice(0, 8)})`}
                    </p>
                    <p className="text-xs font-black text-blue-600 mt-1">
                      ₦{(task.userPayout || 0).toFixed(2)} Payout • {task.type} • Tag: {task.tag || 'none'}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        task.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {task.status}
                      </span>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Remaining: ₦{task.remainingBudget?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleTaskStatus(task)} className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                      {task.status === 'active' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="p-2 bg-red-50 text-red-550 rounded-lg group hover:bg-red-100 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {completions.length > 0 ? (
              completions.map(comp => {
                const targetTask = tasks.find(t => t.id === comp.taskId);
                const isCampaign = !!(comp as any).isCampaignTask || !!comp.screenshot;

                return (
                  <div key={comp.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase">User: {comp.userId.slice(0, 8)}...</p>
                          {isCampaign ? (
                            <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">
                              Advertiser Campaign Proof
                            </span>
                          ) : (
                            <span className="inline-block bg-slate-50 border border-slate-100 text-slate-600 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">
                              Standard Proof Submission
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-base leading-tight">
                          {targetTask?.title || "Task Completion"}
                        </h4>
                        <p className="text-sm font-black text-green-600">₦{comp.rewardEarned.toFixed(2)} Payout</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold">
                          {comp.submittedAt?.toDate ? new Date(comp.submittedAt.toDate()).toLocaleDateString() : 'Just now'}
                        </p>
                      </div>
                    </div>

                    {/* Proof Description Text */}
                    <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/50 space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">Proof Details / Handle Description:</span>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">
                        {(comp as any).proofText || comp.proof || "No additional text description was provided."}
                      </p>
                    </div>

                    {/* Screenshot Proof */}
                    {(comp as any).screenshot && (
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">Screenshot Proof (Click to expand):</span>
                        <div className="relative inline-block overflow-hidden rounded-2xl border border-slate-200 group">
                          <img 
                            src={(comp as any).screenshot} 
                            alt="Screenshot Proof" 
                            onClick={() => setSelectedScreenshotForModal((comp as any).screenshot)}
                            className="max-h-44 object-cover cursor-pointer group-hover:scale-[1.02] active:scale-95 transition-all duration-300" 
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVerifyCompletion(comp, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-green-100"
                      >
                        <Check size={18} /> Approve & Reward
                      </button>
                      <button 
                        onClick={() => handleVerifyCompletion(comp, 'rejected')}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      >
                        <X size={18} /> Reject Submission
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20">
                <AlertCircle size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold">No pending submissions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Screenshot Modal Overlay */}
      {selectedScreenshotForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button 
              onClick={() => setSelectedScreenshotForModal(null)} 
              className="absolute -top-12 right-0 bg-white text-slate-900 rounded-full w-10 h-10 flex items-center justify-center font-black shadow-lg hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all text-sm z-[60]"
            >
              ✕
            </button>
            <img 
              src={selectedScreenshotForModal} 
              alt="Expanded Proof" 
              className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl bg-white animate-fade-in" 
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

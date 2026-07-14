import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, TaskCompletion, PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import { getOrGenerateDeviceFingerprint } from '../lib/security';
import { PLANS } from '../constants/plans';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  ArrowRight,
  Info,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { playRewardSound } from './sounds';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';
import { uploadProofImage } from '../lib/uploadService';

const taskTypeGradients: Record<string, string> = {
  survey: 'bg-gradient-to-b from-orange-50 to-white border-orange-100',
  ad: 'bg-gradient-to-b from-emerald-50 to-white border-emerald-100',
  video: 'bg-gradient-to-b from-blue-50 to-white border-blue-100',
  referral: 'bg-gradient-to-b from-purple-50 to-white border-purple-100',
  app_download: 'bg-gradient-to-b from-indigo-50 to-white border-indigo-100',
  content_creation: 'bg-gradient-to-b from-pink-50 to-white border-pink-100',
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [proof, setProof] = useState(''); // Added state for proof
  const [shake, setShake] = useState(false);
  const [preTaskTimer, setPreTaskTimer] = useState(300); // 5 minutes in seconds
  const [isPreTimerActive, setIsPreTimerActive] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | Blob | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showRestriction, setShowRestriction] = useState(false);
  const [isRenewalRequired, setIsRenewalRequired] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'payouts'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isRenewalRequired !== undefined) {
          setIsRenewalRequired(!!data.isRenewalRequired);
        }
      }
    });
    return () => unsub();
  }, []);

  const isPlanExpired = useMemo(() => {
    if (!profile?.planEndDate || profile?.plan === 'free' || profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com') return false;
    const end = profile.planEndDate.toDate ? profile.planEndDate.toDate() : new Date(profile.planEndDate);
    return new Date() > end;
  }, [profile?.planEndDate, profile?.plan, profile?.role, user?.email]);

  const isUserFree = useMemo(() => {
    const baseFree = profile?.plan === 'free' && profile?.role !== 'admin' && user?.email !== 'wiseking7890@gmail.com';
    if (baseFree) return true;
    if (isRenewalRequired && isPlanExpired) return true;
    return false;
  }, [profile?.plan, profile?.role, user?.email, isRenewalRequired, isPlanExpired]);

  const isCampaignTask = !!(task?.advertiserId && task?.advertiserId !== 'internal_platform' && task?.advertiserId !== 'admin');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(URL.createObjectURL(file));
      setScreenshotFile(file);
      setError('');

    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please drop an image file (PNG, JPG, JPEG).');
        return;
      }
      
      setScreenshot(URL.createObjectURL(file));
      setError('');

      setIsCompressing(true);
      try {
        const { compressImage } = await import('../lib/uploadService');
        const compressedBlob = await compressImage(file);
        setScreenshotFile(compressedBlob);
      } catch (err) {
        setScreenshotFile(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleCampaignSubmit = async () => {
    if (isUserFree) {
      setShowRestriction(true);
      return;
    }
    if (!task || !user || alreadyCompleted || submitted) return;
    if (!screenshot) {
      setError('Please upload a screenshot of your completed task as proof.');
      return;
    }
    setSubmitting(true);
    setError('');
    setUploadProgress(5);
    
    try {
      // 1. Upload screenshot
      let uploadUrl = '';
      if (screenshotFile) {
        const uploadResult = await uploadProofImage(
          screenshotFile, 
          user.uid, 
          task.id, 
          'proof-images',
          (progress) => {
            const uiProgress = Math.min(85, Math.floor(15 + (progress * 0.7)));
            setUploadProgress(uiProgress);
          }
        );
        uploadUrl = uploadResult.downloadUrl;
      } else if (screenshot && screenshot.startsWith('data:')) {
        const uploadResult = await uploadProofImage(
          screenshot, 
          user.uid, 
          task.id, 
          'proof-images',
          (progress) => {
            const uiProgress = Math.min(85, Math.floor(15 + (progress * 0.7)));
            setUploadProgress(uiProgress);
          }
        );
        uploadUrl = uploadResult.downloadUrl;
      } else {
        throw new Error('Screenshot data is invalid.');
      }

      setUploadProgress(88);

      // 2. Call backend
      const deviceFingerprint = getOrGenerateDeviceFingerprint();
      console.log('[TASK-CAMPAIGN] Sending request to:', getApiUrl('/api/v1/tasks/verify-proof'));
      
      let response;
      try {
        response = await fetch(getApiUrl('/api/v1/tasks/verify-proof'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.uid,
            taskId: task.id,
            taskTitle: task.title,
            proof: proof || 'Screenshot Proof Provided',
            rewardAmount: calculatedReward,
            screenshot: uploadUrl,
            deviceFingerprint
          })
        });
      } catch (fetchErr: any) {
        console.error('[TASK-CAMPAIGN] Network/Fetch Error:', fetchErr);
        throw new Error(`Connection Error: Could not reach verification server. (${fetchErr.message})`);
      }

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[TASK-DETAIL] Failed to parse response:', responseText);
        throw new Error(`Server returned an invalid response (Status ${response.status}). Please try again later.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Verification request failed. Please try again.');
      }
      
      if (data.fallback) {
        // Run client-side verification fallback
        const completionDocRef = doc(db, 'completions', `${user.uid}_${task.id}`);
        const payoutAmount = calculatedReward;

        await setDoc(completionDocRef, {
          userId: user.uid,
          taskId: task.id,
          taskTitle: task.title,
          status: 'pending',
          proof: proof || 'Screenshot Proof Provided',
          screenshot: uploadUrl || null,
          rewardEarned: payoutAmount,
          submittedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });

        setWiseAiMessage(`Proof submitted successfully! Awaiting admin manual review.`);
      } else if (data.status === 'pending') {
        setWiseAiMessage(`Proof submitted successfully! Awaiting admin manual review.`);
      } else if (data.approved) {
        setWiseAiMessage(`Wise AI: ${data.message} Reward of ${calculatedReward.toFixed(2)} WiseCoins added to your task wallet.`);
      } else {
        setWiseAiMessage(`Proof submitted successfully! Awaiting admin manual review.`);
      }

      playRewardSound();
      setSubmitted(true);
      setTimeout(() => navigate('/earnings'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error submitting campaign completion');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!task) return;
    // Check if task is ad or video based. Ad based has task.type === 'ad' or has videoUrl
    const isAdOrVideo = task.type === 'ad' || task.videoUrl;
    if (isAdOrVideo) {
      setIsPreTimerActive(false);
    } else {
      let timer: NodeJS.Timeout;
      if (preTaskTimer > 0) {
        timer = setTimeout(() => setPreTaskTimer(preTaskTimer - 1), 1000);
      } else {
        setIsPreTimerActive(false);
      }
      return () => clearTimeout(timer);
    }
  }, [preTaskTimer, task]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && task && !task.requiresProof) {
        handleAutoSubmit();
    }
    return () => clearTimeout(timer);
  }, [countdown, task]);

  useEffect(() => {
    const isCountingDown = countdown !== null && countdown > 0;

    // Capture initial children of body and documentElement to find any newly appended elements (overlays, iframes, etc.)
    const initialBodyChildren = Array.from(document.body.children);
    const initialHtmlChildren = Array.from(document.documentElement.children);

    const cleanupAdsterra = () => {
      // 1. Clear target ad container
      const container = document.getElementById('adsterra-timer-banner');
      if (container) {
        container.innerHTML = '';
      }

      // 2. Remove script elements from DOM entirely
      const scriptSelectors = [
        'script[src*="invoke.js"]',
        'script[src*="sturgeonvelocity.com"]'
      ];
      scriptSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(s => s.remove());
      });

      // 3. Wreak total destruction on any elements injected during countdown
      const currentBodyChildren = Array.from(document.body.children);
      currentBodyChildren.forEach(child => {
        if (!initialBodyChildren.includes(child)) {
          try {
            child.remove();
          } catch (e) {
            console.error("Error removing body child during Adsterra cleanup:", e);
          }
        }
      });

      const currentHtmlChildren = Array.from(document.documentElement.children);
      currentHtmlChildren.forEach(child => {
        if (!initialHtmlChildren.includes(child)) {
          try {
            child.remove();
          } catch (e) {
            console.error("Error removing html child during Adsterra cleanup:", e);
          }
        }
      });

      // 4. Fallback search for any known adsterra classes, frames, or overlays to destroy them from memory
      const querySelectors = [
        '[class*="adsterra"]', '[id*="adsterra"]',
        'iframe[src*="adsterra"]',
        'iframe[src*="sturgeonvelocity.com"]',
        'div[style*="z-index"][style*="position: fixed"]' // common pattern for overlay ads
      ];
      querySelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        } catch (e) {
          // ignore selector syntax errors
        }
      });

      // Clean up global options
      try {
        delete (window as any).atOptions;
      } catch (e) {}
    };

    if (!isCountingDown) {
      cleanupAdsterra();
      return;
    }

    const adContainer = document.getElementById('adsterra-timer-banner');
    if (adContainer) {
      adContainer.innerHTML = '';

      // 1. Configure and load Adsterra banner
      (window as any).atOptions = {
        'key' : '676b0b6eb3c82b512b4b9ca2349ac3e7',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };

      const adsterraScript = document.createElement('script');
      adsterraScript.type = 'text/javascript';
      adsterraScript.src = 'https://sturgeonvelocity.com/676b0b6eb3c82b512b4b9ca2349ac3e7/invoke.js';

      // Append script to the dedicated adsterra-timer-banner container
      adContainer.appendChild(adsterraScript);
    }

    return () => {
      cleanupAdsterra();
    };
  }, [countdown]);

  const handleAutoSubmit = async () => {
    if (isUserFree) {
      setShowRestriction(true);
      return;
    }
    if (!task || !user || alreadyCompleted || submitted) return;
    setSubmitting(true);
    try {
      // Call the backend endpoint for secure completion
      const resp = await fetch(getApiUrl('/api/user/complete-task'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          taskId: task.id,
          deviceFingerprint: navigator.userAgent
        })
      });
      
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Failed to complete task');
      }

      if (data.fallback) {
        // Run client-side verification fallback
        const userDocRef = doc(db, 'users', user.uid);
        const completionDocRef = doc(db, 'completions', `${user.uid}_${task.id}`);
        const transactionRef = doc(collection(db, 'transactions'));

        const payoutAmount = calculatedReward;

        // Perform writes directly
        await setDoc(completionDocRef, {
          userId: user.uid,
          taskId: task.id,
          status: 'approved',
          rewardEarned: payoutAmount,
          submittedAt: serverTimestamp()
        });

        await updateDoc(userDocRef, {
          wiseCoins: increment(payoutAmount),
          tasksCompleted: increment(1),
          updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, 'wise_coin_wallets', user.uid), {
          userId: user.uid,
          balance: increment(payoutAmount),
          updatedAt: serverTimestamp()
        }, { merge: true });

        await setDoc(transactionRef, {
          userId: user.uid,
          amount: payoutAmount,
          type: 'earning',
          status: 'completed',
          description: `Verified Reward: ${task.title}`,
          createdAt: serverTimestamp()
        });
      }

      playRewardSound();
      setSubmitted(true);
      setTimeout(() => navigate('/earnings'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setCountdown(null);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!id || !user) return;
      try {
        const taskSnap = await getDoc(doc(db, 'tasks', id));
        if (taskSnap.exists()) {
          const taskData = { id: taskSnap.id, ...taskSnap.data() } as Task;
          setTask(taskData);

          // Increment clicksCount tracking
          await updateDoc(doc(db, 'tasks', id), {
            clicksCount: increment(1)
          }).catch(err => console.error("Error incrementing clicksCount:", err));

          // Check if already completed if not repeatable
          if (!taskData.isRepeatable) {
            const q = query(
              collection(db, 'completions'), 
              where('taskId', '==', id), 
              where('userId', '==', user.uid)
            );
            const compSnap = await getDocs(q);
            if (!compSnap.empty) {
              setAlreadyCompleted(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching task:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, user]);

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;
  const calculatedReward = task ? (task.reward ?? task.userPayout ?? 0) * multiplier : 0;

  const [wiseAiMessage, setWiseAiMessage] = useState<string>('');

  const handleProofSubmit = async () => {
    if (isUserFree) {
      setShowRestriction(true);
      return;
    }
    if (!task || !user || alreadyCompleted || submitted) return;
    if (!screenshot && !proof) {
      setError('Please upload a screenshot of your completed task or provide written verification details.');
      return;
    }
    setSubmitting(true);
    setError('');
    setWiseAiMessage('');
    setUploadProgress(5);

    try {
      // 1. Upload screenshot if exists
      let uploadUrl = '';
      if (screenshotFile) {
        console.log('[TASK-DETAIL] Uploading screenshot file...');
        const uploadResult = await uploadProofImage(
          screenshotFile, 
          user.uid, 
          task.id, 
          'proof-images',
          (progress) => {
            const uiProgress = Math.min(85, Math.floor(15 + (progress * 0.7)));
            setUploadProgress(uiProgress);
          }
        );
        uploadUrl = uploadResult.downloadUrl;
      } else if (screenshot && screenshot.startsWith('data:')) {
        console.log('[TASK-DETAIL] Uploading base64 screenshot...');
        const uploadResult = await uploadProofImage(
          screenshot, 
          user.uid, 
          task.id, 
          'proof-images',
          (progress) => {
            const uiProgress = Math.min(85, Math.floor(15 + (progress * 0.7)));
            setUploadProgress(uiProgress);
          }
        );
        uploadUrl = uploadResult.downloadUrl;
      }

      setUploadProgress(88);

      // 2. Call backend
      const deviceFingerprint = getOrGenerateDeviceFingerprint();
      console.log('[TASK-DETAIL] Sending request to:', getApiUrl('/api/v1/tasks/verify-proof'));
      
      let response;
      try {
        response = await fetch(getApiUrl('/api/v1/tasks/verify-proof'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.uid,
            taskId: task.id,
            taskTitle: task.title,
            proof: proof || 'Screenshot Proof Provided',
            screenshot: uploadUrl || null,
            rewardAmount: calculatedReward,
            deviceFingerprint
          })
        });
      } catch (fetchErr: any) {
        console.error('[TASK-DETAIL] Network/Fetch Error:', fetchErr);
        throw new Error(`Connection Error: Could not reach the server. (${fetchErr.message})`);
      }

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[TASK-DETAIL] Failed to parse response:', responseText);
        throw new Error(`Server returned an invalid response (Status ${response.status}). Please try again later.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Verification request failed. Please try again.');
      }

      if (data.fallback) {
        const payoutAmount = calculatedReward;
        const completionDocRef = doc(db, 'completions', `${user.uid}_${task.id}`);
        console.log("[DEBUG] Fallback logic running for:", user.uid, "task:", task.id, "payout:", payoutAmount);
        try {
          await setDoc(completionDocRef, {
            userId: user.uid,
            taskId: task.id,
            taskTitle: task.title,
            status: 'pending',
            proof: proof || 'Screenshot provided',
            screenshot: uploadUrl || null,
            rewardEarned: payoutAmount,
            submittedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });
          console.log("[DEBUG] Completion doc set as pending in fallback.");
        } catch (dbErr) {
          console.error("[DEBUG] DB update FAILED:", dbErr);
          throw dbErr;
        }

        setWiseAiMessage(`Proof submitted successfully! Awaiting admin manual review.`);
      } else if (data.status === 'pending') {
        setWiseAiMessage(`Proof submitted successfully! Awaiting admin manual review.`);
      } else if (data.approved) {
        setWiseAiMessage(`Wise AI: ${data.message} Reward of ${calculatedReward.toFixed(2)} WiseCoins added to your task wallet.`);
      } else {
        setError(`Wise AI Rejected: ${data.message}`);
        setSubmitting(false);
        return;
      }

      playRewardSound();
      setSubmitted(true);
      setTimeout(() => navigate('/earnings'), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startTask = () => {
    if (isUserFree) {
      setShowRestriction(true);
      return;
    }
    if (task?.link) {
      window.open(task.link, '_blank');
    }
    setShowContent(true);
    setCountdown(30); // 30 second timer for manual tasks
  };

  if (loading) return <Layout showBack><div className="p-8 text-center">Loading task...</div></Layout>;
  if (!task) return <Layout showBack><div className="p-8 text-center">Task not found.</div></Layout>;

  return (
    <Layout title="Task Details" showBack>
      <div className="p-4 space-y-6">
        {/* Header Section */}
        <section className={`rounded-3xl p-6 border shadow-sm text-center relative overflow-hidden ${
          taskTypeGradients[task.type] || 'bg-white border-gray-100'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, currentColor 0%, transparent 70%)' }} />
          
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3 ${
            task.type === 'ad' ? 'bg-emerald-500 text-white' :
            task.type === 'video' ? 'bg-blue-500 text-white' :
            task.type === 'referral' ? 'bg-purple-500 text-white' :
            'bg-indigo-500 text-white'
          }`}>
            <DollarSign size={32} strokeWidth={3} />
          </div>
          
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-current/10 text-[8px] font-black uppercase tracking-widest text-slate-500">
               Premium Task
            </span>
            <div className="flex items-center gap-1 bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest">Verified</span>
            </div>
          </div>

          <h2 className="text-2xl font-black mb-2 text-slate-900 uppercase italic tracking-tight">{task.title}</h2>
          
          <div className="flex items-center justify-center gap-4 text-sm font-bold">
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {calculatedReward.toFixed(2)} WiseCoins
              </span>
              {multiplier > 1 && (
                <span className="text-[9px] text-blue-600 font-black uppercase mt-1 tracking-widest">
                  {multiplier}x {profile?.plan} Bonus Active
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <Clock size={14} /> 5-10 min
            </span>
          </div>
        </section>

        {/* Rich Media Section */}
        {(task.imageUrl || task.videoUrl) && (
          <section className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative group">
            {task.videoUrl ? (
              <div className="aspect-video w-full">
                <iframe 
                  src={task.videoUrl.replace('watch?v=', 'embed/')} 
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : task.imageUrl ? (
              <img src={task.imageUrl} alt={task.title} className="w-full h-auto object-cover max-h-64" />
            ) : null}
          </section>
        )}

        {/* Task Content / Affiliate Link Button */}
        {task.link && !showContent && (
          <button 
            onClick={startTask}
            className="w-full p-6 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-blue-200 group"
          >
            <div className="flex items-center justify-between">
               <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Banner Ads Partner</p>
                  <h4 className="text-lg font-black leading-tight">Visit & Start Earning</h4>
               </div>
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowRight size={24} />
               </div>
            </div>
          </button>
        )}

        {/* Description */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <h3 className="font-black text-lg">Requirements</h3>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-sm text-gray-600">{task.description}</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-sm text-gray-600">{task.requirements || "Ensure you follow all steps carefully to receive your reward."}</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-sm text-gray-600">Submit completion and wait 24-48 hours for verification.</p>
            </div>
          </div>
        </section>

        {/* Security Info */}
        <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 border border-blue-100">
          <ShieldCheck className="text-blue-500 flex-shrink-0" size={20} />
          <div>
            <h4 className="text-xs font-bold text-blue-700 uppercase mb-0.5">Verified Partner</h4>
            <p className="text-[10px] text-blue-600 leading-tight">This task is provided by a verified Earnwise partner. Your data is secure and rewards are guaranteed upon valid completion.</p>
          </div>
        </div>

        {/* Error/Warning */}
        {alreadyCompleted && (
          <div className="bg-orange-50 rounded-2xl p-4 flex gap-3 border border-orange-100">
            <AlertCircle className="text-orange-500 flex-shrink-0" size={20} />
            <p className="text-xs text-orange-700 font-medium">You have already completed this task. Non-repeatable tasks can only be earned once.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 flex gap-3 border border-red-100 text-red-600 text-xs font-medium">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Share Section */}
        {task.enableSocialShare && (
          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <ArrowRight className="rotate-[-45deg]" size={16} />
               </div>
               <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Share to Socials</h4>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'WhatsApp', icon: '📱', color: 'bg-emerald-500', url: `https://wa.me/?text=${encodeURIComponent(task.shareText || '')}` },
                { name: 'Facebook', icon: '🔵', color: 'bg-blue-600', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(task.shareText || '')}` },
                { name: 'YouTube', icon: '🔴', color: 'bg-red-600', url: `https://www.youtube.com/` },
                { name: 'TikTok', icon: '🎵', color: 'bg-black', url: `https://www.tiktok.com/` }
              ].map(social => (
                <button
                  key={social.name}
                  onClick={() => {
                    window.open(social.url, '_blank');
                    if (countdown === null) startTask();
                  }}
                  className={`${social.color} h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg active:scale-95 transition-all`}
                >
                  <span className="text-base">{social.icon}</span>
                  <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">{social.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 font-bold text-center italic">Share using any platform to trigger your reward timer</p>
          </section>
        )}

        {/* Action Button / Timer */}
        <div className="pt-4">
          {!showContent ? (
            isPreTimerActive ? (
              <div className="w-full py-4 rounded-2xl font-black text-lg bg-gray-100 text-gray-500 shadow-none text-center">
                Wait {formatTime(preTaskTimer)} to start
              </div>
            ) : (
              <button
                onClick={startTask}
                disabled={alreadyCompleted}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${
                  alreadyCompleted
                    ? 'bg-gray-100 text-gray-400 shadow-none'
                    : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {alreadyCompleted ? 'Already Completed' : 'Start Task'}
                {!alreadyCompleted && <ArrowRight size={20} />}
              </button>
            )
          ) : (
             <div className="space-y-4">
               {countdown !== null && countdown > 0 ? (
                 <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] text-center">
                    <div 
                      id="adsterra-timer-banner" 
                      className="w-full flex items-center justify-center min-h-[50px] bg-black/95 rounded-2xl overflow-hidden shadow-inner p-2 mb-6 border border-white/5" 
                    />
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="40" cy="40" r="36"
                          stroke="currentColor" strokeWidth="8"
                          fill="transparent" className="text-slate-200"
                        />
                        <circle
                          cx="40" cy="40" r="36"
                          stroke="currentColor" strokeWidth="8"
                          fill="transparent" className="text-blue-600 transition-all duration-1000"
                          strokeDasharray={226}
                          strokeDashoffset={226 - (226 * (countdown || 0)) / 30}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-black text-2xl text-slate-900">
                        {countdown}
                      </span>
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Verifying Activity...</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Please stay on this page</p>
                 </div>
               ) : isCampaignTask ? (
                 <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-md space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">★</span>
                     <h4 className="font-black text-lg text-slate-900">Campaign Verification Proof</h4>
                   </div>
                   
                   <p className="text-xs text-slate-500 font-medium leading-relaxed">
                     This is an advertiser-sponsored campaign task. You must upload a screenshot matching the requirements to be approved and rewarded by the administrator.
                   </p>

                   {/* Drag and Drop Zone */}
                   <div 
                     onDragEnter={handleDrag}
                     onDragOver={handleDrag}
                     onDragLeave={handleDrag}
                     onDrop={handleDrop}
                     className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative group ${
                       dragActive 
                         ? 'border-blue-500 bg-blue-50/50' 
                         : screenshot 
                         ? 'border-emerald-500/50 bg-emerald-50/20' 
                         : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
                     }`}
                   >
                     <input 
                       type="file" 
                       accept="image/*" 
                       onChange={handleFileChange} 
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     
                     {screenshot ? (
                       <div className="space-y-3">
                         <div className="relative inline-block z-20">
                           <img 
                             src={screenshot} 
                             alt="Upload Preview" 
                             className="h-28 mx-auto rounded-xl object-cover shadow-sm border border-slate-100" 
                           />
                           <button 
                             type="button"
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               setScreenshot(null);
                             }} 
                             className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full shadow-md hover:bg-red-650 transition-all text-xs flex items-center justify-center font-bold"
                           >
                             ✕
                           </button>
                         </div>
                         <p className="text-xs text-emerald-600 font-bold">✓ Screenshot Loaded Successfully</p>
                         <p className="text-[10px] text-slate-400">Click or drag again to replace</p>
                       </div>
                     ) : (
                       <div className="space-y-2 pointer-events-none">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                           <Upload size={24} />
                         </div>
                         <p className="text-sm font-bold text-slate-700">Drag & drop your screenshot proof here</p>
                         <p className="text-xs text-slate-400">or <span className="text-blue-600 underline">browse files</span></p>
                         <p className="text-[10px] text-slate-400 italic">Supports PNG, JPG, JPEG (Max 2MB)</p>
                       </div>
                     )}
                   </div>

                   <textarea
                     className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     placeholder="Optional: Enter your username, handle, or comment details here..."
                     value={proof}
                     onChange={(e) => setProof(e.target.value)}
                   />

                   <motion.button
                     animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                     transition={{ duration: 0.4 }}
                     onClick={() => {
                       if (submitting || !screenshot) {
                         setShake(true);
                         setTimeout(() => setShake(false), 400);
                       } else {
                         handleCampaignSubmit();
                       }
                     }}
                     className={`w-full py-4 rounded-2xl font-black text-lg text-white active:scale-[0.98] transition-all ${
                       submitting || !screenshot ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100'
                     }`}
                   >
                     {submitting ? 'Submitting (${uploadProgress}%)' : 'Submit Verification Proof'}
                   </motion.button>
                 </div>
               ) : task?.requiresProof ? (
                 <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-md space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">★</span>
                     <h4 className="font-black text-lg text-slate-900">Task Verification Proof</h4>
                   </div>
                   
                   <p className="text-xs text-slate-500 font-medium leading-relaxed">
                     Please upload a screenshot of your completed task. Our administrative team will manually review and verify your submission.
                   </p>

                   {/* Drag and Drop Zone */}
                   <div 
                     onDragEnter={handleDrag}
                     onDragOver={handleDrag}
                     onDragLeave={handleDrag}
                     onDrop={handleDrop}
                     className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative group ${
                       dragActive 
                         ? 'border-blue-500 bg-blue-50/50' 
                         : screenshot 
                         ? 'border-emerald-500/50 bg-emerald-50/20' 
                         : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
                     }`}
                   >
                     <input 
                       type="file" 
                       accept="image/*" 
                       onChange={handleFileChange} 
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     
                     {screenshot ? (
                       <div className="space-y-3">
                         <div className="relative inline-block z-20">
                           <img 
                             src={screenshot} 
                             alt="Upload Preview" 
                             className="h-28 mx-auto rounded-xl object-cover shadow-sm border border-slate-100" 
                           />
                           <button 
                             type="button"
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               setScreenshot(null);
                             }} 
                             className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full shadow-md hover:bg-red-650 transition-all text-xs flex items-center justify-center font-bold"
                           >
                             ✕
                           </button>
                         </div>
                         <p className="text-xs text-emerald-600 font-bold">✓ Screenshot Loaded Successfully</p>
                         <p className="text-[10px] text-slate-400">Click or drag again to replace</p>
                       </div>
                     ) : (
                       <div className="space-y-2 pointer-events-none">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                           <Upload size={24} />
                         </div>
                         <p className="text-sm font-bold text-slate-700">Drag & drop your screenshot proof here</p>
                         <p className="text-xs text-slate-400">or <span className="text-blue-600 underline">browse files</span></p>
                         <p className="text-[10px] text-slate-400 italic">Supports PNG, JPG, JPEG (Max 2MB)</p>
                       </div>
                     )}
                   </div>

                   <textarea
                     className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     placeholder="Optional: Enter your username, handle, or any additional description here..."
                     value={proof}
                     onChange={(e) => setProof(e.target.value)}
                   />

                   <motion.button
                     animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                     transition={{ duration: 0.4 }}
                     onClick={() => {
                       if (submitting || (!screenshot && !proof)) {
                         setShake(true);
                         setTimeout(() => setShake(false), 400);
                       } else {
                         handleProofSubmit();
                       }
                     }}
                     className={`w-full py-4 rounded-2xl font-black text-lg text-white active:scale-[0.98] transition-all ${
                       submitting || (!screenshot && !proof) ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100'
                     }`}
                   >
                     {submitting ? 'Submitting (${uploadProgress}%)' : 'Submit Verification Proof'}
                   </motion.button>
                 </div>
               ) : (
                 <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] text-center">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Verifying...</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Reward will be approved automatically</p>
                 </div>
               )}
             </div>
          )}
          <p className="text-center text-[10px] text-gray-400 mt-4 px-8 leading-tight">
            By clicking submit, you confirm that you have completed all the requirements for this task. Fraudulent submissions may lead to account suspension.
          </p>
        </div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {submitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-green-200"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-3xl font-black mb-2">Great Job!</h2>
            <p className="text-gray-500 font-medium mb-2">Awaiting manual verification.</p>
            {wiseAiMessage && <p className="text-sm text-green-600 font-bold mb-8 bg-green-50 p-4 rounded-xl border border-green-100">{wiseAiMessage}</p>}
            <p className="text-xs text-blue-600 font-bold animate-pulse">Redirecting to earnings...</p>
          </motion.div>
        )}
      </AnimatePresence>
      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="start or complete tasks" 
      />
    </Layout>
  );
}

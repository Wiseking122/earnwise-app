import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Play, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Sparkles,
  ArrowRight,
  BrainCircuit,
  DollarSign,
  AlertCircle,
  Loader2,
  Lock,
  Download,
  Zap,
  FileText,
  Table,
  Wrench,
  CheckSquare,
  BookOpen,
  ArrowLeft,
  Briefcase,
  Eye,
  ExternalLink,
  HelpCircle,
  Award,
  AlertTriangle,
  Check,
  Copy,
  Info,
  X
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { getApiUrl } from '../lib/config';
import { COURSES } from '../data/courses';
import { getEnrichedStep } from '../data/courseEnrichment';
import axios from 'axios';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';

export default function CoursePlayer() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isOwned, setIsOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [showRestriction, setShowRestriction] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const course = COURSES.find(c => c.id === id);

  const maxFreeCredits = profile?.plan === 'golden' ? 4 : (profile?.plan === 'platinum' ? 2 : 0);
  const freeCreditsLeft = maxFreeCredits - (profile?.freeCoursesUsed || 0);
  const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
  const hasFreeCredit = freeCreditsLeft > 0 || isAdmin;

  useEffect(() => {
    if (!user || !id) return;

    const checkOwnership = async () => {
      try {
        if (isAdmin) {
          setIsOwned(true);
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, 'coursePurchases'), 
          where('userId', '==', user.uid),
          where('courseId', '==', id)
        );
        const snap = await getDocs(q);
        setIsOwned(!snap.empty);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `coursePurchases/${id}`);
        setLoading(false);
      }
    };

    checkOwnership();
  }, [user, id, profile?.role]);

  useEffect(() => {
    if (!id) return;
    try {
      const stored = localStorage.getItem(`checked_tasks_${id}`);
      if (stored) {
        setCheckedTasks(JSON.parse(stored));
      } else {
        setCheckedTasks({});
      }
    } catch (_) {}
  }, [id]);

  const handleToggleTask = (taskKey: string) => {
    setCheckedTasks(prev => {
      const updated = { ...prev, [taskKey]: !prev[taskKey] };
      try {
        localStorage.setItem(`checked_tasks_${id}`, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const coursePrice = course?.price || 6000;
  const affiliateCommission = Math.round(coursePrice * 0.30);

  const handlePurchase = async () => {
    if (!profile) return;
    if (profile.plan === 'free' && !isAdmin) {
      setShowRestriction(true);
      return;
    }
    if (!user || !course) return;

    if (!hasFreeCredit && (profile?.depositBalance || 0) < coursePrice) {
      const errStr = `Insufficient deposited balance. Your deposited balance from your personal bank is ₦${(profile?.depositBalance || 0).toLocaleString()}, but ₦${coursePrice.toLocaleString()} is required to unlock this course. Only bank deposits are accepted for Academy courses, not task earnings.`;
      setPurchaseError(errStr);
      alert(errStr);
      return;
    }

    setPurchaseError(null);
    setPurchaseLoading(true);
    try {
      const activeReferrer = localStorage.getItem('earnwise_course_referrer') || profile?.referredBy || null;
      const targetRefId = (activeReferrer && activeReferrer !== user.uid) ? activeReferrer : null;

      const res = await axios.post(getApiUrl('/api/v1/academy/purchase'), {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title,
        coursePrice: coursePrice,
        referrerId: targetRefId
      });

      if (res.data) {
        if (res.data.useClientFallback) {
          console.warn("[ACADEMY] Server bypass enabled. Executing client-side transaction...");
          
          const purchaseId = `${user.uid}_${course.id}`;
          const purchaseRef = doc(db, 'coursePurchases', purchaseId);
          await setDoc(purchaseRef, {
            purchaseId,
            userId: user.uid,
            courseId: course.id,
            courseTitle: course.title,
            amount: hasFreeCredit ? 0 : coursePrice,
            isFree: hasFreeCredit,
            referrerId: targetRefId,
            affiliateCommission: hasFreeCredit ? 0 : (targetRefId ? affiliateCommission : 0),
            platformShare: hasFreeCredit ? 0 : (targetRefId ? coursePrice - affiliateCommission : coursePrice),
            purchasedAt: new Date()
          });

          const userRef = doc(db, 'users', user.uid);
          if (hasFreeCredit) {
            if (profile?.role !== 'admin') {
              await updateDoc(userRef, {
                freeCoursesUsed: increment(1)
              });
            }
          } else {
            await updateDoc(userRef, {
              balance: increment(-coursePrice),
              withdrawableBalance: increment(-coursePrice),
              depositBalance: increment(-coursePrice)
            });

            // Write buyer transaction
            const transRef = doc(collection(db, 'transactions'));
            await setDoc(transRef, {
              id: transRef.id,
              userId: user.uid,
              amount: -coursePrice,
              type: 'withdrawal',
              description: `Unlocked Course: ${course.title}`,
              createdAt: new Date()
            });

            // Credit 30% affiliate commission to promoter's separate affiliate wallet
            if (targetRefId && affiliateCommission > 0) {
              try {
                const referrerUserRef = doc(db, 'users', targetRefId);
                await updateDoc(referrerUserRef, {
                  affiliateBalance: increment(affiliateCommission),
                  affiliateEarnings: increment(affiliateCommission),
                  totalAffiliateSales: increment(1),
                  totalEarnings: increment(affiliateCommission)
                });

                const refTransRef = doc(collection(db, 'transactions'));
                await setDoc(refTransRef, {
                  id: refTransRef.id,
                  userId: targetRefId,
                  amount: affiliateCommission,
                  type: 'affiliate_commission',
                  description: `30% Course Affiliate Commission: ${course.title} (Sale to ${profile?.displayName || 'Student'})`,
                  createdAt: new Date()
                });

                const affSaleRef = doc(collection(db, 'affiliateSales'));
                await setDoc(affSaleRef, {
                  id: affSaleRef.id,
                  referrerId: targetRefId,
                  buyerId: user.uid,
                  buyerName: profile?.displayName || profile?.username || 'Student',
                  courseId: course.id,
                  courseTitle: course.title,
                  coursePrice: coursePrice,
                  commissionRate: 0.30,
                  commissionAmount: affiliateCommission,
                  platformShare: coursePrice - affiliateCommission,
                  status: 'credited',
                  createdAt: new Date()
                });
              } catch (affErr) {
                console.warn("[ACADEMY] Client fallback affiliate commission credit warning:", affErr);
              }
            }
          }
        }
        try {
          localStorage.removeItem('earnwise_course_referrer');
        } catch (_) {}
        setIsOwned(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Transaction encryption failed.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleDownload = () => {
    if (!isOwned) {
      alert("Access Denied: Confirmed course enrollment is required before accessing or downloading course materials.");
      return;
    }
    if (profile?.plan === 'free' && !isAdmin) {
      setShowRestriction(true);
      return;
    }
    if (!course) return;

    const content = `
REVENUE ACADEMY: STRATEGY NODE
===============================
Title: ${course.title}
Category: ${course.category}
Income Potential: ${course.incomePotential}

PROTOCOL STEPS:
${course.steps.map((step, i) => `${i + 1}. ${step}`).join('\n\n')}

-------------------------------
Generated via Earnwise Academy
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${course.title.replace(/\s+/g, '_')}_Strategy.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerResourceDownload = (resOrName: any, type?: string, description?: string) => {
    if (!isOwned) {
      alert("Access Denied: Confirmed enrollment is required before accessing or downloading worksheets, guides, and templates.");
      return;
    }
    let downloadUrl: string | undefined;
    let filename = '';

    if (typeof resOrName === 'object' && resOrName !== null) {
      downloadUrl = resOrName.downloadUrl;
      filename = resOrName.filename || resOrName.name;
    } else {
      filename = resOrName;
    }

    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const resName = typeof resOrName === 'string' ? resOrName : (resOrName?.name || 'Resource');
    const resType = type || resOrName?.type || 'DOCUMENT';
    const resDesc = description || resOrName?.description || 'EarnWise Academic Resource';

    const fileContent = `
=========================================
EARNWISE PREMIUM ACADEMY STRATEGY ASSET
=========================================
Asset Name : ${resName}
Format Type: ${String(resType).toUpperCase()}
Description: ${resDesc}

Tactical Directive:
Deploy this asset in active setups. Maintain optimization parameters for high yield.

-----------------------------------------
(C) Earnwise Prestige Arbitrage Core Ltd
    `.trim();

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resName.replace(/\s+/g, '_')}_Protocol_Asset.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 1000): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        if (retries > 0) throw new Error('Retry');
        return response;
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  const askTutor = async () => {
    if (!isOwned) {
      setMessages(prev => [...prev, { role: 'ai', content: "🔒 Access Denied: Confirmed course enrollment is required before accessing 24/7 AI Master Tutor assistance." }]);
      return;
    }
    if (profile?.plan === 'free' && !isAdmin) {
      setShowRestriction(true);
      return;
    }
    if (!question.trim() || aiLoading || !user || !course) return;
    
    const userMsg = question.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuestion('');
    setAiLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);
      
      const enrichedStep = getEnrichedStep(course.title, course.steps[activeStep], activeStep);
      const lessonContext = `
        Lesson: ${course.steps[activeStep]}
        Module: ${enrichedStep.moduleTitle}
        Key Points: ${enrichedStep.subsections.map(s => `${s.subtitle}: ${s.content}`).join(' | ')}
        Assignment: ${enrichedStep.assignment.tasks.join(', ')}
      `;

      const res = await fetchWithRetry(getApiUrl('/api/v1/academy/ask-tutor'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          courseId: course.id,
          courseTitle: course.title,
          question: userMsg,
          context: lessonContext,
          history: messages.slice(-12).map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Protocol failure. AI Node offline.");
      }
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        let aiFullResponse = "";
        let lastUpdateTime = Date.now();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiFullResponse += decoder.decode(value, { stream: true });
          
          const now = Date.now();
          if (now - lastUpdateTime > 50) {
             setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = aiFullResponse;
                return newMessages;
             });
             lastUpdateTime = now;
          }
        }
        setMessages(prev => {
           const newMessages = [...prev];
           newMessages[newMessages.length - 1].content = aiFullResponse;
           return newMessages;
        });
      }
    } catch (err: any) {
      setMessages(prev => {
         const newMessages = [...prev];
         newMessages[newMessages.length - 1].content = "I'm here to guide you through this course. I'm experiencing a temporary connectivity issue, but please feel free to ask your question again, or I can help you with general course insights.";
         return newMessages;
      });
    } finally {
      setAiLoading(false);
    }
  };

  const expandProtocol = async () => {
    if (!isOwned) {
      alert("Access Denied: Confirmed course enrollment is required before accessing detailed execution blueprints.");
      return;
    }
    if (aiLoading || !user || !course) return;
    
    setAiLoading(true);
    setExpandedStep("");
    try {
      const enrichedStep = getEnrichedStep(course.title, course.steps[activeStep], activeStep);
      const lessonContext = `
        Lesson: ${course.steps[activeStep]}
        Module: ${enrichedStep.moduleTitle}
        Key Points: ${enrichedStep.subsections.map(s => `${s.subtitle}: ${s.content}`).join(' | ')}
        Assignment: ${enrichedStep.assignment.tasks.join(', ')}
      `;

      const res = await fetch(getApiUrl('/api/v1/academy/ask-tutor'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          courseId: course.id,
          courseTitle: course.title,
          question: `Provide a full, 1000-word detailed execution blueprint for Step ${activeStep + 1}: ${course.steps[activeStep]}. Include specific operational tools, legal requirements, mathematical profit projections, and advanced execution hacks.`,
          context: lessonContext
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "AI Protocol Expansion Node offline. Check your credits.");
      }
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        let aiFullResponse = "";
        let lastUpdateTime = Date.now();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiFullResponse += decoder.decode(value, { stream: true });
          
          const now = Date.now();
          if (now - lastUpdateTime > 50) {
             setExpandedStep(aiFullResponse);
             lastUpdateTime = now;
          }
        }
        setExpandedStep(aiFullResponse);
      }
    } catch (err: any) {
      const serverErr = err.message || "Expansion Node offline. Check validation parameters.";
      setExpandedStep(serverErr);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiLoading]);

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center bg-slate-950 text-white">
          <Loader2 className="animate-spin text-amber-500" size={36} />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
          <AlertCircle className="text-rose-500" size={48} />
          <h3 className="text-xl font-display font-black uppercase">Strategy Registry Not Found</h3>
          <button onClick={() => navigate('/academy')} className="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Back to Academy</button>
        </div>
      </Layout>
    );
  }

  const enrichedStep = getEnrichedStep(course.title, course.steps[activeStep], activeStep);

  return (
    <Layout>
      <div className="flex-1 flex flex-col bg-slate-950">
        {/* Course Header */}
        <header className="p-4 sm:p-6 bg-[#0b081e]/90 border-b border-white/5 flex items-center justify-between gap-4 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/academy')}
              className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold text-violet-400">Tactical Strategy Suite</span>
              <h1 className="text-base sm:text-lg font-display font-black uppercase text-white truncate max-w-[200px] sm:max-w-md mt-0.5 tracking-tight flex items-center gap-2">
                 {course.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#818090] font-mono leading-none">
             NODE RESOLVER <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-sm">v2.4.0</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 text-slate-100 relative">
          {!isOwned ? (
            <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-6 max-w-xl mx-auto">
               <div className="w-20 h-20 bg-[#0b081e] rounded-3xl shadow-2xl flex items-center justify-center text-amber-400 ring-2 ring-amber-500/20 shadow-amber-500/5 relative">
                  <Lock size={32} />
                  <div className="absolute -inset-0.5 rounded-3xl bg-linear-to-r from-amber-500 to-violet-600 opacity-20 blur-xs pointer-events-none" />
               </div>
               
               <div className="space-y-2">
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20">
                   <Sparkles size={11} />
                   <span>Accredited Academic Curriculum</span>
                 </div>
                 <h3 className="text-2xl sm:text-3xl font-display font-black text-white italic uppercase tracking-tight">{course.title}</h3>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                   {course.description}
                 </p>
               </div>

               {/* Course Value & Curriculum Stack */}
               <div className="w-full bg-[#0e0a26] border border-white/10 rounded-2xl p-4 text-left space-y-3">
                 <div className="flex items-center justify-between border-b border-white/5 pb-2">
                   <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Estimated Earning Potential</span>
                   <span className="text-xs font-bold text-emerald-400">{course.incomePotential}</span>
                 </div>
                 {course.targetAudience && (
                   <p className="text-[11px] text-slate-300">
                     <strong className="text-amber-400 font-bold">Target Audience:</strong> {course.targetAudience}
                   </p>
                 )}
                 <div className="space-y-1.5 pt-1">
                   <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Included in this enrollment:</p>
                   <ul className="text-[11px] text-slate-300 space-y-1">
                     <li className="flex items-center gap-2">
                       <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                       <span>{course.steps.length} In-Depth Practical Strategy Modules & Exercises</span>
                     </li>
                     <li className="flex items-center gap-2">
                       <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                       <span>Downloadable Excel Worksheets, PDF Guides & Swipe Templates</span>
                     </li>
                     <li className="flex items-center gap-2">
                       <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                       <span>24/7 AI Master Tutor for lesson explanations & assignments</span>
                     </li>
                     <li className="flex items-center gap-2">
                       <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                       <span>30% Affiliate Marketing Reseller Rights (Earn ₦{affiliateCommission.toLocaleString()} per referral)</span>
                     </li>
                   </ul>
                 </div>
               </div>
               
               {/* Valuation and Affiliate Split Callout */}
               <div className="w-full max-w-sm space-y-3">
                 <div className="bg-[#0b081e] p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between relative overflow-hidden">
                    <div className="text-left">
                       <p className="text-[8px] font-mono tracking-widest text-[#818090] uppercase">ENROLLMENT PRICE</p>
                       <p className="text-2xl font-display font-black text-white leading-tight">
                          {hasFreeCredit ? 'FREE (PLAN TIER)' : `₦${coursePrice.toLocaleString()}`}
                       </p>
                    </div>
                    {!hasFreeCredit && (
                      <div className="text-right">
                        <span className="text-[8px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm">70/30 Share (30% You)</span>
                        <p className="text-[10px] text-slate-400 mt-1">Affiliate Earns: <span className="text-emerald-400 font-bold">₦{affiliateCommission.toLocaleString()}</span></p>
                      </div>
                    )}
                 </div>

                 <button 
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className="w-full bg-linear-to-r from-amber-500 to-yellow-600 text-slate-950 h-14 rounded-2xl font-display font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                 >
                   {purchaseLoading ? <Loader2 className="animate-spin text-slate-950" /> : <>{hasFreeCredit ? 'Decrypt Strategy Access' : 'Make Payment / Enroll Now'} <ArrowRight size={16} /></>}
                 </button>
               </div>

               {!hasFreeCredit && (profile?.depositBalance || 0) < coursePrice && (
                 <div className="w-full max-w-sm bg-red-950/40 p-4 rounded-xl border border-red-500/20 text-center space-y-2">
                    <p className="text-xs text-red-500 font-bold">
                      ⚠️ Deposited balance is too low (₦{(profile?.depositBalance || 0).toLocaleString()})
                    </p>
                    <p className="text-[10px] text-slate-400">
                      You need at least ₦{coursePrice.toLocaleString()} in bank-deposited funds to purchase this course. (Note: Task earnings cannot be used).
                    </p>
                    <Link 
                      to="/deposit" 
                      className="inline-block text-[11px] uppercase tracking-wider font-extrabold text-amber-500 hover:underline hover:text-amber-400"
                    >
                      Make Payment / Deposit Funds →
                    </Link>
                 </div>
               )}

               {purchaseError && (
                 <p className="text-xs text-red-500 font-bold mt-2 text-center max-w-sm">{purchaseError}</p>
               )}
            </div>
          ) : (
            <div className="p-4 sm:p-8 space-y-6 pb-32 max-w-5xl mx-auto w-full">
              {/* Affiliate Partner Quick Share Banner */}
              <div className="bg-linear-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded font-black">70% Affiliate Reseller</span>
                    <span className="text-xs font-bold text-white">Earn ₦{affiliateCommission.toLocaleString()} per sale</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">Promote this accredited course to others. Every student who enrolls through your link credits 70% direct cash to your Referral Balance!</p>
                </div>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/academy?ref=${user?.uid}&course=${course.id}`;
                    navigator.clipboard.writeText(link);
                    setCopiedSnippet(true);
                    setTimeout(() => setCopiedSnippet(false), 2500);
                  }}
                  className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
                >
                  {copiedSnippet ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                  <span>{copiedSnippet ? 'Link Copied!' : 'Copy Affiliate Link'}</span>
                </button>
              </div>

              {/* Progress Tracker */}
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 space-y-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">CURRICULUM NODE DIRECTIVE</span>
                      <h4 className="text-sm font-display font-black uppercase text-slate-300 mt-2 tracking-wide font-sans">
                        Step {activeStep + 1} of {course.steps.length}: {enrichedStep.moduleTitle}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-violet-400 font-bold bg-violet-500/10 px-3 py-1 rounded-full self-start sm:self-center">
                      {Math.round(((activeStep + 1) / course.steps.length) * 100)}% Complete
                    </span>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${((activeStep + 1) / course.steps.length) * 100}%` }}
                         className="h-full bg-linear-to-r from-violet-600 to-amber-500"
                       />
                    </div>
                    <button 
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[#a19fc0] hover:text-white transition-colors border border-white/5 hover:border-white/10 px-3.5 py-2 rounded-xl bg-slate-950/40 cursor-pointer"
                    >
                      <Download size={14} />
                      Download Manifest
                    </button>
                 </div>
              </div>

              {/* Step Content Card */}
              <motion.div 
                key={activeStep}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-[#0b081e]/90 rounded-[2rem] border border-amber-500/20 shadow-2xl p-6 sm:p-10 space-y-8 relative overflow-hidden ring-1 ring-violet-500/10"
              >
                 {/* Decorative Ambient Shadows */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-amber-500/5 to-transparent pointer-events-none rounded-full" />
                 <div className="absolute bottom-0 left-0 w-80 h-80 bg-radial from-violet-600/10 to-transparent pointer-events-none rounded-full" />

                 {/* Segment Top Title Header */}
                 <div className="flex items-start justify-between border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-linear-to-br from-amber-500 to-yellow-600 text-slate-950 font-display font-black text-xl italic rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                          {(activeStep + 1).toString().padStart(2, '0')}
                       </div>
                       <div>
                          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-violet-400 font-bold">Action Protocol Directive</p>
                          <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase mt-0.5 tracking-tightest">
                             {enrichedStep.moduleTitle}
                          </h3>
                       </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-black border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 rounded-xl">
                       <Zap size={12} className="fill-amber-400 animate-pulse" /> PRESTIGE VALUE ACTIVE
                    </div>
                 </div>

                 {/* 1. Learning Objectives (if present) */}
                 {enrichedStep.learningObjectives && enrichedStep.learningObjectives.length > 0 && (
                   <div className="bg-linear-to-r from-amber-500/10 via-violet-500/10 to-transparent p-5 rounded-2xl border border-amber-500/20 space-y-3">
                     <div className="flex items-center gap-2">
                       <Award size={15} className="text-amber-400" />
                       <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                         CORE LEARNING OBJECTIVES
                       </h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                       {enrichedStep.learningObjectives.map((obj, oIdx) => (
                         <div key={oIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                           <span className="text-amber-400 font-bold mt-0.5">✓</span>
                           <span>{obj}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* 2. Synopsis Summary */}
                 <div className="space-y-3">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#a19fc0] flex items-center gap-2">
                       <BookOpen size={14} className="text-amber-400" />
                       OVERVIEW ABSTRACT & CORE THESIS
                    </h4>
                    <p className="text-slate-200 text-sm sm:text-base leading-relaxed pl-1 font-medium select-text font-sans">
                       {course.steps[activeStep]}
                    </p>
                 </div>

                 {/* 3. Detailed Core Framework Breakdown */}
                 <div className="space-y-6 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                          <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                             IN-DEPTH LESSON MODULES & FIELD BLUEPRINTS
                          </h4>
                       </div>
                       <span className="text-[10px] font-mono text-slate-400">
                         {enrichedStep.subsections.length} Core Lessons
                       </span>
                    </div>
                    
                    <div className="space-y-6">
                       {enrichedStep.subsections.map((sub, sIdx) => (
                         <div key={sIdx} className="bg-slate-900/70 p-6 rounded-2xl border border-white/5 space-y-4 hover:border-amber-500/20 transition-all">
                            <h5 className="text-sm font-display font-bold text-white tracking-wide border-b border-white/5 pb-2.5 flex items-center justify-between">
                               <span className="text-violet-300">{sub.subtitle}</span>
                               <span className="text-[9px] font-mono font-normal text-slate-500">LESSON 0{sIdx + 1}</span>
                            </h5>
                            
                            <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line space-y-3 select-text">
                               {sub.content}
                            </div>

                            {sub.workedScenario && (
                              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/25 space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                                  <span>💡</span> WORKED SCENARIO & NUMBERS
                                </div>
                                <p className="text-emerald-200/90 leading-relaxed font-sans select-text">{sub.workedScenario}</p>
                               </div>
                            )}

                            {sub.proTip && (
                              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/25 space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                                  <Zap size={12} className="fill-amber-400" /> PRO EXECUTION TIP
                                </div>
                                <p className="text-amber-200/90 leading-relaxed font-sans select-text">{sub.proTip}</p>
                               </div>
                            )}

                            {sub.commonPitfall && (
                              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/25 space-y-1.5 text-xs">
                                <div className="flex items-center gap-1.5 text-rose-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                                  <AlertTriangle size={12} /> COMMON PITFALL TO AVOID
                                </div>
                                <p className="text-rose-200/90 leading-relaxed font-sans select-text">{sub.commonPitfall}</p>
                               </div>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* 4. AI Enhanced Intelligence Lab */}
                 <AnimatePresence>
                   {expandedStep ? (
                     <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="mt-6 p-6 rounded-3xl bg-linear-to-r from-violet-950/40 via-[#100b2b]/80 to-slate-900 border border-violet-500/30 space-y-4"
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-violet-400">
                           <BrainCircuit size={16} className="text-violet-400 animate-pulse" />
                           <span className="text-[10px] font-mono uppercase tracking-widest font-black">AI ENHANCED PROTOCOL BLUEPRINT</span>
                         </div>
                         <span className="text-[9px] font-mono text-amber-400 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded-md">DECRYPTED DEEP</span>
                       </div>
                       <div className="prose prose-invert prose-xs max-w-none text-slate-300 leading-relaxed font-sans text-xs whitespace-pre-wrap pl-4 border-l-2 border-violet-500/30 select-text">
                         {expandedStep}
                       </div>
                     </motion.div>
                   ) : (
                     <button 
                       onClick={expandProtocol}
                       disabled={aiLoading}
                       className="w-full py-5 rounded-2xl bg-linear-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 text-violet-300 text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-3 hover:from-violet-600/20 hover:to-indigo-600/20 hover:border-violet-500/40 transition-all group shadow-inner cursor-pointer"
                     >
                        {aiLoading ? <Loader2 size={16} className="animate-spin text-violet-400" /> : (
                          <>
                            <Sparkles size={14} className="text-violet-400 group-hover:rotate-45 transition-transform" />
                            GENERATE HIGH-DETAIL BLUEPRINT (AI ENHANCED DIRECTIVE)
                          </>
                        )}
                     </button>
                   )}
                 </AnimatePresence>

                 {/* 5. Interactive Knowledge Check Quiz (if present) */}
                 {enrichedStep.knowledgeCheck && enrichedStep.knowledgeCheck.length > 0 && (
                   <div className="bg-linear-to-b from-indigo-950/40 to-slate-900/60 p-6 sm:p-8 rounded-3xl border border-indigo-500/30 space-y-6">
                     <div className="flex items-center justify-between border-b border-white/5 pb-4">
                       <div className="flex items-center gap-2.5 text-indigo-400">
                         <HelpCircle size={18} />
                         <div>
                           <h4 className="text-xs font-mono uppercase tracking-widest font-black text-white">
                             KNOWLEDGE CHECK & MASTERY AUDIT
                           </h4>
                           <p className="text-[10px] text-slate-400">Test your comprehension before proceeding to the practical assignment.</p>
                         </div>
                       </div>
                       <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md">
                         {enrichedStep.knowledgeCheck.length} Questions
                       </span>
                     </div>

                     <div className="space-y-6">
                       {enrichedStep.knowledgeCheck.map((q, qIdx) => {
                         const qKey = `${activeStep}_q_${qIdx}`;
                         const selectedOpt = quizAnswers[qKey];
                         const isAnswered = selectedOpt !== undefined;
                         const isCorrect = isAnswered && selectedOpt === q.correctIndex;

                         return (
                           <div key={qIdx} className="bg-slate-950/60 p-5 rounded-2xl border border-white/5 space-y-3.5">
                             <p className="text-xs font-bold text-slate-200 font-sans">
                               <span className="text-indigo-400 font-mono mr-2">Q{qIdx + 1}.</span>
                               {q.question}
                             </p>

                             <div className="grid grid-cols-1 gap-2 pt-1">
                               {q.options.map((opt, oIdx) => {
                                 const isThisSelected = selectedOpt === oIdx;
                                 let optStyle = "bg-slate-900/50 border-white/5 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-900";
                                 
                                 if (isAnswered) {
                                   if (oIdx === q.correctIndex) {
                                     optStyle = "bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-bold";
                                   } else if (isThisSelected) {
                                     optStyle = "bg-rose-950/40 border-rose-500/60 text-rose-300";
                                   } else {
                                     optStyle = "bg-slate-950/30 border-white/5 text-slate-500 opacity-60";
                                   }
                                 }

                                 return (
                                   <button
                                     key={oIdx}
                                     onClick={() => {
                                       if (!isAnswered) {
                                         setQuizAnswers(prev => ({ ...prev, [qKey]: oIdx }));
                                       }
                                     }}
                                     disabled={isAnswered}
                                     className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                                   >
                                     <span className="flex-1 pr-3">{opt}</span>
                                     {isAnswered && oIdx === q.correctIndex && (
                                       <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">✓ Correct</span>
                                     )}
                                     {isAnswered && isThisSelected && oIdx !== q.correctIndex && (
                                       <span className="text-rose-400 font-bold text-xs">✗ Incorrect</span>
                                     )}
                                   </button>
                                 );
                               })}
                             </div>

                             {isAnswered && (
                               <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${isCorrect ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-amber-950/20 border-amber-500/30 text-amber-200'}`}>
                                 <div className="font-mono text-[10px] uppercase font-bold tracking-wider">
                                   {isCorrect ? '✓ Explanation & Verification:' : '⚠️ Solution Explanation:'}
                                 </div>
                                 <p className="text-[11px] font-sans leading-relaxed text-slate-300">{q.explanation}</p>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 )}

                 {/* 6. Actionable Step-by-Step Assignment & Deliverables */}
                 <div className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                       <div className="flex items-center gap-2.5 text-amber-400">
                          <CheckSquare size={18} />
                          <div>
                            <h4 className="text-xs font-mono uppercase tracking-widest font-black text-white font-sans">
                               {enrichedStep.assignment.title || 'PRACTICAL ACTION ASSIGNMENT & DELIVERABLES'}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">Milestone Verification & Field Tasks</span>
                          </div>
                       </div>
                       <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-3 py-1 rounded-md">
                          {enrichedStep.assignment.tasks.filter((_, idx) => checkedTasks[`${activeStep}_${idx}`]).length} / {enrichedStep.assignment.tasks.length} Completed
                       </span>
                    </div>

                    {enrichedStep.assignment.purpose && (
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold">ASSIGNMENT OBJECTIVE</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{enrichedStep.assignment.purpose}</p>
                      </div>
                    )}

                    {enrichedStep.assignment.instructions && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                          <Info size={12} className="text-amber-400" /> STEP-BY-STEP INSTRUCTIONS
                        </span>
                        <div className="space-y-2">
                          {enrichedStep.assignment.instructions.map((inst, iIdx) => (
                            <div key={iIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                              <span className="w-5 h-5 rounded-full bg-violet-950 border border-violet-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-violet-300 flex-shrink-0 mt-0.5">{iIdx + 1}</span>
                              <span className="leading-relaxed font-sans">{inst}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {enrichedStep.assignment.expectedOutput && (
                      <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-violet-300 font-bold">EXPECTED LEARNER DELIVERABLE</span>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">{enrichedStep.assignment.expectedOutput}</p>
                      </div>
                    )}

                    {enrichedStep.assignment.rubric && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                          <Award size={12} className="text-amber-400" /> EVALUATION RUBRIC & SCORING STANDARD
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {enrichedStep.assignment.rubric.map((rub, rIdx) => (
                            <div key={rIdx} className="bg-slate-950/50 p-3 rounded-xl border border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-amber-300 font-sans">{rub.criteria}</span>
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded">{rub.points}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-normal font-sans">{rub.standard}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {enrichedStep.assignment.alternativeSimulation && (
                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                          <AlertTriangle size={13} /> GLOBAL ALTERNATIVE / NIGERIA SIMULATION TRACK
                        </div>
                        <p className="text-xs text-amber-200/90 leading-relaxed font-sans select-text">
                          {enrichedStep.assignment.alternativeSimulation}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                        ACTION TASKS & MILESTONE VERIFICATION CHECKLIST
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {enrichedStep.assignment.tasks.map((task, idx) => {
                           const tKey = `${activeStep}_${idx}`;
                           const isChecked = !!checkedTasks[tKey];
                           return (
                             <div 
                               key={idx} 
                               onClick={() => handleToggleTask(tKey)}
                               className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                 isChecked 
                                   ? 'bg-violet-950/30 border-violet-500/50 text-slate-100 shadow-md shadow-violet-950/30' 
                                   : 'bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-900/50'
                               }`}
                             >
                                <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                  isChecked 
                                    ? 'bg-amber-500 border-amber-500 text-slate-950' 
                                    : 'border-slate-600 hover:border-slate-400'
                                }`}>
                                   {isChecked && <Check size={12} className="stroke-[3]" />}
                                </div>
                                <span className="text-xs font-semibold leading-relaxed font-sans">
                                   {task}
                                </span>
                             </div>
                           );
                         })}
                      </div>
                    </div>
                 </div>

                 {/* 7. Genuine Resources, Spreadsheets & PDF Field Guides */}
                 <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#a19fc0] flex items-center gap-2">
                          <Wrench size={14} className="text-amber-400" />
                          GENUINE RESOURCES, SPREADSHEETS & PDF FIELD GUIDES
                       </h4>
                       <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded">
                         OFFICIAL BINARY ASSETS
                       </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       {enrichedStep.resources.map((res: any, rIdx: number) => (
                         <div 
                           key={rIdx} 
                           className="bg-slate-900/50 hover:bg-slate-900/90 p-5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group flex flex-col justify-between space-y-4"
                         >
                            <div className="space-y-2">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                     {res.type === 'spreadsheet' ? (
                                       <Table size={18} className="text-emerald-400" />
                                     ) : (
                                       <FileText size={18} className="text-amber-400" />
                                     )}
                                     <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                                       res.type === 'spreadsheet' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                                     }`}>
                                        {res.type === 'spreadsheet' ? 'EXCEL .XLSX' : 'PDF DOCUMENT'}
                                     </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-500">READY</span>
                               </div>
                               <h5 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                                  {res.name}
                                </h5>
                               <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                                  {res.description}
                               </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                               <button
                                 onClick={() => triggerResourceDownload(res)}
                                 className="flex-1 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                               >
                                 <Download size={12} /> Download
                               </button>
                               <button
                                 onClick={() => setSelectedResource(res)}
                                 className="py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                 title="Preview & Google Drive"
                               >
                                 <Eye size={12} /> Preview
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* 8. Prominent Navigation Action Bar */}
                 <div className="flex flex-col sm:flex-row gap-4 border-t border-white/5 pt-8 mt-4">
                    <button 
                      disabled={activeStep === 0}
                      onClick={() => {
                        setActiveStep(prev => prev - 1);
                        setExpandedStep(null);
                      }}
                      className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-xs font-mono font-black uppercase tracking-widest hover:bg-white/10 disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft size={14} /> PREVIOUS MODULE
                    </button>
                    <button 
                      onClick={() => {
                        if (activeStep < course.steps.length - 1) {
                          setActiveStep(prev => prev + 1);
                          setExpandedStep(null);
                        } else {
                          navigate('/academy');
                        }
                      }}
                      className="flex-[2] py-5 rounded-2xl bg-linear-to-r from-amber-500 to-yellow-600 text-slate-950 text-xs font-display font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {activeStep === course.steps.length - 1 ? (
                        <>FINISH COURSE & ARCHIVE CREDENTIALS ✓</>
                      ) : (
                        <>MARK MODULE COMPLETED & NEXT STEP →</>
                      )}
                    </button>
                 </div>
              </motion.div>

              {/* Course Insights & AI Teaser */}
              <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/20 space-y-3 shadow-inner">
                 <div className="flex items-center gap-2 text-emerald-400">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-black">REVENUE ADVOCATE PRO-TIP</span>
                 </div>
                 <p className="text-xs text-emerald-200/95 leading-relaxed font-sans font-medium select-text italic">
                    "Success in premium digital arbitrage comes from establishing system architectures over personal labor loops. Every active task Checked represents structural validation against standard industry bottlenecks. Maintain high yield discipline."
                 </p>
              </div>

              {/* Chat Toggle Button (Floating) */}
              <div className="fixed bottom-24 right-6 z-[1100]">
                 <button 
                  onClick={() => setChatOpen(true)}
                  className="w-14 h-14 bg-linear-to-br from-violet-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-violet-900/40 flex items-center justify-center hover:scale-105 active:scale-90 transition-all group cursor-pointer"
                 >
                    <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
                 </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Tutor Chat Overlay */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="fixed inset-0 z-[1200] bg-slate-950 flex flex-col border-l border-white/5"
            >
              <header className="p-5 flex items-center justify-between border-b border-white/5 bg-[#0b081e]/90">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-900/20">
                       <BrainCircuit size={20} />
                    </div>
                    <div>
                       <h3 className="text-sm font-display font-black uppercase text-white tracking-wide italic">Wise AI Tutor</h3>
                       <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-mono font-black uppercase text-slate-400">COGNITIVE COMPUTE ONLINE</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setChatOpen(false)} className="text-[10px] font-mono font-black uppercase text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 rounded-lg cursor-pointer">Close Session</button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-[#04020b]">
                 <div className="bg-linear-to-br from-violet-950/50 to-slate-900 border border-violet-500/25 text-slate-200 p-4 rounded-t-[1.5rem] rounded-br-[1.5rem] max-w-[85%] shadow-md shadow-violet-950/20">
                    <p className="text-xs font-semibold leading-relaxed font-sans">
                      Greetings, specialist. I am the **Wise AI**. I have mapped out every metric in <span className="underline text-amber-400">"{course.title}"</span>. Present your queries below to accelerate execution parameters.
                    </p>
                 </div>
                 
                 {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-t-[1.5rem] ${
                        m.role === 'user' 
                          ? 'bg-linear-to-r from-amber-500 to-yellow-600 text-slate-950 rounded-bl-[1.5rem] font-bold' 
                          : 'bg-slate-900 border border-white/5 text-slate-200 rounded-br-[1.5rem] shadow-sm font-sans text-xs'
                      } max-w-[85%]`}>
                         <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">{m.content}</p>
                      </div>
                   </div>
                 ))}

                 {aiLoading && (
                   <div className="flex justify-start">
                      <div className="bg-slate-900 border border-white/5 p-4 rounded-t-[1.5rem] rounded-br-[1.5rem] shadow-sm flex items-center gap-2">
                         <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-4 bg-[#0b081e] border-t border-white/5 flex items-center gap-2">
                 <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askTutor()}
                  placeholder="Inquire on tactical frameworks..."
                  className="flex-1 bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs font-semibold text-white focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                 />
                 <button 
                  onClick={askTutor}
                  disabled={aiLoading || !question.trim()}
                  className="w-12 h-12 bg-linear-to-br from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50 cursor-pointer"
                 >
                    <Send size={18} />
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resource Preview & Google Drive Modal */}
        <AnimatePresence>
          {selectedResource && (
            <div className="fixed inset-0 z-[1300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0b081e] border border-amber-500/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      selectedResource.type === 'spreadsheet' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {selectedResource.type === 'spreadsheet' ? <Table size={24} /> : <FileText size={24} />}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                        {selectedResource.type === 'spreadsheet' ? 'EXCEL SPREADSHEET RESOURCE' : 'PDF FIELD GUIDE'}
                      </span>
                      <h3 className="text-base sm:text-lg font-display font-black text-white">{selectedResource.name}</h3>
                    </div>
                  </div>
                  <button onClick={() => setSelectedResource(null)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  <p className="leading-relaxed">{selectedResource.description}</p>
                  
                  {selectedResource.previewContent && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-3">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">DOCUMENT EXECUTIVE ABSTRACT</span>
                      <p className="text-slate-300 font-sans leading-relaxed">{selectedResource.previewContent.summary}</p>
                      
                      {selectedResource.previewContent.keyPoints && (
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          <span className="text-[9px] font-mono uppercase text-slate-400 font-bold">CORE SECTIONS & WORKSHEETS:</span>
                          {selectedResource.previewContent.keyPoints.map((pt: string, pIdx: number) => (
                            <div key={pIdx} className="flex items-start gap-2 text-[11px] text-slate-400">
                              <span className="text-amber-400">•</span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedResource.previewContent.sampleSnippet && (
                        <div className="p-3 bg-black/60 rounded-xl border border-white/5 font-mono text-[11px] text-amber-300 whitespace-pre-wrap select-all">
                          {selectedResource.previewContent.sampleSnippet}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      triggerResourceDownload(selectedResource);
                      setSelectedResource(null);
                    }}
                    className="flex-1 py-3.5 bg-linear-to-r from-amber-500 to-yellow-600 text-slate-950 rounded-xl font-display font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
                  >
                    <Download size={16} /> Download File
                  </button>
                  
                  <a
                    href={selectedResource.type === 'spreadsheet' ? 'https://docs.google.com/spreadsheets/u/0/create' : 'https://drive.google.com/drive/my-drive'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-display font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                  >
                    <ExternalLink size={16} /> Open in Google Drive / {selectedResource.type === 'spreadsheet' ? 'Sheets' : 'Drive'}
                  </a>

                  {selectedResource.previewContent?.sampleSnippet && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedResource.previewContent.sampleSnippet);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="py-3.5 px-4 bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-1.5 border border-violet-500/20 cursor-pointer"
                    >
                      {copiedSnippet ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedSnippet ? 'Copied!' : 'Copy Snippet'}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="access Revenue Academy courses" 
      />
    </Layout>
  );
}

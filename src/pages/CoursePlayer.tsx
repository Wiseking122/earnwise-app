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
  Briefcase
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { COURSES } from '../data/courses';
import { getEnrichedStep } from '../data/courseEnrichment';
import axios from 'axios';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const course = COURSES.find(c => c.id === id);

  const maxFreeCredits = profile?.plan === 'golden' ? 5 : (profile?.plan === 'platinum' ? 2 : 0);
  const freeCreditsLeft = maxFreeCredits - (profile?.freeCoursesUsed || 0);
  const hasFreeCredit = freeCreditsLeft > 0 || profile?.role === 'admin';

  useEffect(() => {
    if (!user || !id) return;

    const checkOwnership = async () => {
      try {
        if (profile?.role === 'admin') {
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

  const handlePurchase = async () => {
    if (!user || !course) return;

    if (!hasFreeCredit && (profile?.depositBalance || 0) < 7000) {
      const errStr = `Insufficient deposited balance. Your deposited balance from your personal bank is ₦${(profile?.depositBalance || 0).toLocaleString()}, but ₦7,000 is required to unlock this course. Only bank deposits are accepted for Academy courses, not task earnings.`;
      setPurchaseError(errStr);
      alert(errStr);
      return;
    }

    setPurchaseError(null);
    setPurchaseLoading(true);
    try {
      const res = await axios.post('/api/v1/academy/purchase', {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title
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
            amount: hasFreeCredit ? 0 : 7000,
            isFree: hasFreeCredit,
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
              balance: increment(-7000),
              withdrawableBalance: increment(-7000),
              depositBalance: increment(-7000)
            });
          }
        }
        setIsOwned(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Transaction encryption failed.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleDownload = () => {
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

  const triggerResourceDownload = (name: string, type: string, description: string) => {
    const fileContent = `
=========================================
EARNWISE PREMIUM ACADEMY STRATEGY ASSET
=========================================
Asset Name : ${name}
Format Type: ${type.toUpperCase()}
Description: ${description}

Tactical Directive:
Deploy this asset in active setups. Maintain optimization parameters for high yield.

-----------------------------------------
(C) Earnwise Prestige Arbitrage Core Ltd
    `.trim();

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}_Protocol_Asset.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const askTutor = async () => {
    if (!question.trim() || aiLoading || !user || !course) return;
    
    const userMsg = question.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuestion('');
    setAiLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);
      
      const res = await fetch('/api/v1/academy/ask-tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          courseId: course.id,
          courseTitle: course.title,
          question: userMsg,
          context: course.steps.join(' | ')
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
      const serverErr = err.message || "Protocol failure. AI Node offline.";
      setMessages(prev => {
         const newMessages = [...prev];
         newMessages[newMessages.length - 1].content = serverErr;
         return newMessages;
      });
    } finally {
      setAiLoading(false);
    }
  };

  const expandProtocol = async () => {
    if (aiLoading || !user || !course) return;
    
    setAiLoading(true);
    setExpandedStep("");
    try {
      const res = await fetch('/api/v1/academy/ask-tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          courseId: course.id,
          courseTitle: course.title,
          question: `Provide a full, 1000-word detailed execution blueprint for Step ${activeStep + 1}: ${course.steps[activeStep]}. Include specific Nigerian tools, legal requirements, mathematical profit projections, and advanced execution hacks.`,
          context: course.steps.join(' | ')
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
             NODE RESOLVER <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-sm">v1.2.8</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 text-slate-100 relative">
          {!isOwned ? (
            <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-8 max-w-xl mx-auto">
               <div className="w-24 h-24 bg-[#0b081e] rounded-[2rem] shadow-2xl flex items-center justify-center text-amber-400 ring-2 ring-amber-500/20 shadow-amber-500/5 relative">
                  <Lock size={36} />
                  <div className="absolute -inset-0.5 rounded-[2rem] bg-linear-to-r from-amber-500 to-violet-600 opacity-20 blur-xs pointer-events-none" />
               </div>
               
               <div className="space-y-3">
                 <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">Secure Transmission Encrypted</span>
                 <h3 className="text-3xl font-display font-black text-white italic uppercase tracking-tight">Strategy Locked</h3>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                   {hasFreeCredit 
                     ? (profile?.role === 'admin' ? "Admin protocol active. Full strategy credentials decrypted." : `Credential allocation active. You have ${freeCreditsLeft} free strategy unlocks remaining in your tier.`)
                     : "This high-yield elite strategy requires a standard digital allocation to decrypt and download."}
                 </p>
               </div>
               
               <div className="bg-[#0b081e] p-5 rounded-2xl border border-amber-500/20 flex items-center gap-4 w-full max-w-xs relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-amber-500/5 rounded-full pointer-events-none" />
                  {hasFreeCredit ? (
                    <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
                      <Zap className="fill-violet-400 animate-pulse" size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 font-display font-black text-lg">
                      ₦
                    </div>
                  )}
                  <div className="text-left">
                     <p className="text-[8px] font-mono tracking-widest text-[#818090] uppercase">REQUISITION VALUATION</p>
                     <p className="text-xl font-display font-black text-white leading-tight">
                        {hasFreeCredit ? 'FREE (PLAN TIER)' : '₦7,000 COP'}
                     </p>
                  </div>
               </div>

               <button 
                onClick={handlePurchase}
                disabled={purchaseLoading}
                className="w-full max-w-xs bg-linear-to-r from-amber-500 to-yellow-600 text-slate-950 h-14 rounded-2xl font-display font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
               >
                 {purchaseLoading ? <Loader2 className="animate-spin text-slate-950" /> : <>{hasFreeCredit ? 'Decrypt Strategy Access' : 'Purchase Decryption'} <ArrowRight size={16} /></>}
               </button>

               {!hasFreeCredit && (profile?.depositBalance || 0) < 7000 && (
                 <div className="w-full max-w-xs bg-red-950/40 p-4 rounded-xl border border-red-500/20 text-center space-y-2 mt-4">
                   <p className="text-xs text-red-500 font-bold">
                     ⚠️ Deposited balance is too low (₦{(profile?.depositBalance || 0).toLocaleString()})
                   </p>
                   <p className="text-[10px] text-slate-400">
                     You need at least ₦7,000 in bank-deposited funds to purchase this course. (Note: Task earnings cannot be used).
                   </p>
                   <Link 
                     to="/deposit" 
                     className="inline-block text-[10px] uppercase tracking-wider font-extrabold text-amber-500 hover:underline hover:text-amber-400"
                   >
                     Deposit Funds & Unlock Course →
                   </Link>
                 </div>
               )}

               {purchaseError && (
                 <p className="text-xs text-red-500 font-bold mt-3 text-center max-w-xs">{purchaseError}</p>
               )}
            </div>
          ) : (
            <div className="p-4 sm:p-8 space-y-8 pb-32 max-w-5xl mx-auto w-full">
              {/* Progress Tracker */}
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 space-y-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">CURRICULUM NODE DIRECTIVE</span>
                      <h4 className="text-sm font-display font-black uppercase text-slate-300 mt-2 tracking-wide font-sans">
                        Step {activeStep + 1} of {course.steps.length}: {getEnrichedStep(course.title, course.steps[activeStep], activeStep).moduleTitle}
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
                             {getEnrichedStep(course.title, course.steps[activeStep], activeStep).moduleTitle}
                          </h3>
                       </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-black border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 rounded-xl">
                       <Zap size={12} className="fill-amber-400 animate-pulse" /> PRESTIGE VALUE ACTIVE
                    </div>
                 </div>

                 {/* 1. Synopsis Summary */}
                 <div className="space-y-3">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#a19fc0] flex items-center gap-2">
                       <BookOpen size={14} className="text-amber-400" />
                       OVERVIEW ABSTRACT
                    </h4>
                    <p className="text-slate-200 text-base leading-relaxed pl-1 font-medium select-text font-sans">
                       {course.steps[activeStep]}
                    </p>
                 </div>

                 {/* 2. Detailed Core Framework Breakdown */}
                 <div className="space-y-6 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                       <h4 className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
                          DETAILED CORE FRAMEWORK BREAKDOWN & OPERATIONS
                       </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {getEnrichedStep(course.title, course.steps[activeStep], activeStep).subsections.map((sub, sIdx) => (
                         <div key={sIdx} className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between hover:border-violet-500/10 transition-colors">
                            <div className="space-y-2">
                               <h5 className="text-[10px] font-mono tracking-wider text-violet-300 font-black uppercase">
                                  {sub.subtitle}
                               </h5>
                               <p className="text-xs text-slate-300 leading-relaxed select-text font-sans">
                                  {sub.content}
                               </p>
                            </div>
                            <div className="pt-2 text-[9px] font-mono text-[#515060] border-t border-white/5">
                               NODE REFERENCE KEY #{sIdx + 128}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* 3. AI Enhanced Intelligence Lab */}
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

                 {/* 4. Actionable Step-by-Step Assignment/Exercise */}
                 <div className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-white/5 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                       <div className="flex items-center gap-2.5 text-amber-400">
                          <CheckSquare size={16} className="text-amber-400" />
                          <h4 className="text-[11px] font-mono uppercase tracking-widest font-black font-sans">
                             YOUR ACTION TASKS & MILESTONE CHECKS
                          </h4>
                       </div>
                       <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">
                          {getEnrichedStep(course.title, course.steps[activeStep], activeStep).assignment.tasks.filter((_, idx) => checkedTasks[`${activeStep}_${idx}`]).length} / {getEnrichedStep(course.title, course.steps[activeStep], activeStep).assignment.tasks.length} Completed
                       </span>
                    </div>

                    <p className="text-xs text-slate-400 pl-1 font-sans">
                       Before registering completion for Step {activeStep + 1}, satisfy the following operational tasks. Select each once resolved:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                       {getEnrichedStep(course.title, course.steps[activeStep], activeStep).assignment.tasks.map((task, idx) => {
                         const tKey = `${activeStep}_${idx}`;
                         const isChecked = !!checkedTasks[tKey];
                         return (
                           <div 
                             key={idx} 
                             onClick={() => handleToggleTask(tKey)}
                             className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                               isChecked 
                                 ? 'bg-violet-950/20 border-violet-500/40 text-slate-100 shadow-md shadow-violet-950/30' 
                                 : 'bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-900/40'
                             }`}
                           >
                              <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                isChecked 
                                  ? 'bg-amber-500 border-amber-500 text-slate-950' 
                                  : 'border-slate-600 hover:border-slate-400'
                              }`}>
                                 {isChecked && <span className="text-[10px] font-black">✓</span>}
                              </div>
                              <span className="text-xs font-semibold leading-relaxed font-sans">
                                 {task}
                              </span>
                           </div>
                         );
                       })}
                    </div>
                 </div>

                 {/* 5. Resource Download Section */}
                 <div className="space-y-4 pt-2 border-t border-white/5">
                    <h4 className="text-[11px] font-mono uppercase tracking-widest text-[#a19fc0] flex items-center gap-2">
                       <Wrench size={14} className="text-amber-400" />
                       PREMIUM TOOLS & ASSET REGISTRY
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       {getEnrichedStep(course.title, course.steps[activeStep], activeStep).resources.map((res, rIdx) => (
                         <div 
                           key={rIdx} 
                           onClick={() => triggerResourceDownload(res.name, res.type, res.description)}
                           className="bg-slate-900/40 hover:bg-slate-900/80 p-5 rounded-2xl border border-white/5 hover:border-amber-500/25 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                         >
                            <div className="space-y-1.5">
                               <div className="flex items-center gap-2">
                                  {res.type === 'spreadsheet' ? (
                                    <Table size={16} className="text-emerald-400" />
                                  ) : (
                                    <FileText size={16} className="text-amber-400" />
                                  )}
                                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400 px-1.5 py-0.5 bg-white/5 rounded-md">
                                     {res.type}
                                  </span>
                               </div>
                               <h5 className="text-[11px] font-mono text-slate-200 truncate font-bold group-hover:text-amber-400 transition-colors bg-transparent border-none p-0 outline-hidden">
                                  {res.name}
                               </h5>
                               <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                  {res.description}
                               </p>
                            </div>
                            <div className="pt-2 text-[9px] font-mono font-bold text-amber-500 uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                               <Download size={10} /> REQUISITION SECURE
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* 6. Prominent Navigation Action Bar */}
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
      </div>
    </Layout>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Zap
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { COURSES } from '../data/courses';
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
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
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

  const handlePurchase = async () => {
    if (!user || !course) return;
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
          
          // Perform client-side purchase write because server-side Admin SDK lacks database administrative roles
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

          // Deduct points or consume credit from user document directly via Client SDK
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
              withdrawableBalance: increment(-7000)
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

  const askTutor = async () => {
    if (!question.trim() || aiLoading || !user || !course) return;
    
    const userMsg = question.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuestion('');
    setAiLoading(true);

    try {
      const res = await axios.post('/api/v1/academy/ask-tutor', {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title,
        question: userMsg,
        context: course.steps.join(' | ')
      });
      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Protocol failure. AI Node offline." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const expandProtocol = async () => {
    if (aiLoading || !user || !course) return;
    
    setAiLoading(true);
    setExpandedStep(null);
    try {
      const res = await axios.post('/api/v1/academy/ask-tutor', {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title,
        question: `Provide a full, 1000-word detailed execution blueprint for Step ${activeStep + 1}: ${course.steps[activeStep]}. Include specific Nigerian tools, legal requirements, mathematical profit projections, and advanced execution hacks.`,
        context: course.steps.join(' | ')
      });
      setExpandedStep(res.data.answer);
    } catch (err) {
      alert("AI Protocol Expansion Node offline. Check your credits.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiLoading]);

  if (!course) return <Layout><div className="p-10 text-center uppercase font-black">Course not found</div></Layout>;

  return (
    <Layout showBack title={course.title}>
      <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
        {/* Course Header Image */}
        <div className="flex-shrink-0 h-48 relative overflow-hidden">
          <img src={course.imageUrl} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-6 px-5 w-full">
             <span className="text-[9px] font-black uppercase text-blue-400 tracking-[0.3em] mb-1 block">Level: Elite Specialist</span>
             <h2 className="text-xl font-display font-black text-white italic uppercase">{course.title}</h2>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 relative">
          {!isOwned ? (
            <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
               <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-blue-600 ring-4 ring-blue-50">
                  <Lock size={32} />
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl font-display font-black text-slate-900 italic uppercase">Curriculum Locked</h3>
                 <p className="text-xs text-slate-500 font-medium font-display leading-tight italic">
                   {hasFreeCredit 
                     ? (profile?.role === 'admin' ? "Admin protocol active. Course access granted." : `You have ${freeCreditsLeft} free strategy unlocks remaining in your plan.`)
                     : "This high-payout strategy requires a ₦7,000 allocation to decrypt."}
                 </p>
               </div>
               <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 w-full max-w-[280px]">
                  {hasFreeCredit ? (
                    <Zap className="text-blue-600 fill-blue-600 animate-pulse" size={24} />
                  ) : (
                    <span className="text-xl font-display font-black text-blue-600 w-6 h-6 flex items-center justify-center select-none" style={{ lineHeight: 1 }}>₦</span>
                  )}
                  <div className="text-left">
                     <p className="text-[8px] font-black text-blue-400 uppercase">Cost to Unlock</p>
                     <p className="text-lg font-display font-black text-blue-900">
                       {hasFreeCredit ? 'FREE (PLAN PERK)' : '₦7,000'}
                     </p>
                  </div>
               </div>
               <button 
                onClick={handlePurchase}
                disabled={purchaseLoading}
                className="w-full max-w-[280px] bg-slate-900 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-95 transition-all"
               >
                 {purchaseLoading ? <Loader2 className="animate-spin" /> : <>{hasFreeCredit ? 'Claim Strategy Access' : 'Unlock Strategy'} <ArrowRight size={16} /></>}
               </button>
            </div>
          ) : (
            <div className="p-5 space-y-8 pb-32">
              {/* Progress Tracker */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step {activeStep + 1} of {course.steps.length}</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{Math.round(((activeStep + 1) / course.steps.length) * 100)}% Complete</span>
                 </div>
                 <div className="flex gap-2">
                    <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${((activeStep + 1) / course.steps.length) * 100}%` }}
                         className="h-full bg-blue-600"
                       />
                    </div>
                    <button 
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </button>
                 </div>
              </div>

              {/* Step Content Card */}
              <motion.div 
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 relative overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }} />
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-display font-black text-sm italic">
                      {(activeStep + 1).toString().padStart(2, '0')}
                   </div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Action Protocol</h4>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                   {course.steps[activeStep]}
                </p>

                <AnimatePresence>
                  {expandedStep && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 pt-6 border-t border-slate-100 space-y-4"
                    >
                      <div className="flex items-center gap-2 text-blue-600">
                        <BrainCircuit size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Enhanced Protocol Analysis</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-slate-600 font-medium leading-relaxed whitespace-pre-wrap text-[11px]">
                        {expandedStep}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex flex-col gap-3 pt-6">
                   <div className="flex gap-2">
                      <button 
                        disabled={activeStep === 0}
                        onClick={() => {
                          setActiveStep(prev => prev - 1);
                          setExpandedStep(null);
                        }}
                        className="flex-1 py-4 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        Previous
                      </button>
                      <button 
                        disabled={activeStep === course.steps.length - 1}
                        onClick={() => {
                          setActiveStep(prev => prev + 1);
                          setExpandedStep(null);
                        }}
                        className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:bg-emerald-500 active:scale-95 transition-all"
                      >
                          {activeStep === course.steps.length - 1 ? 'Course Complete ✓' : 'Next Step →'}
                      </button>
                   </div>
                   
                   {!expandedStep && (
                     <button 
                       onClick={expandProtocol}
                       disabled={aiLoading}
                       className="w-full py-4 rounded-2xl bg-blue-600/5 border border-blue-600/20 text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all group"
                     >
                        {aiLoading ? <Loader2 size={16} className="animate-spin" /> : (
                          <>
                            <Sparkles size={16} className="group-hover:animate-pulse" />
                            Generate High-Detail Protocol (AI)
                          </>
                        )}
                     </button>
                   )}
                </div>
              </motion.div>

              {/* Course Insights & AI Teaser */}
              <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 space-y-3">
                 <div className="flex items-center gap-2 text-emerald-600">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Revenue Pro-Tip</span>
                 </div>
                 <p className="text-[10px] font-bold text-emerald-800 leading-relaxed italic">
                    "Success in digital arbitrage comes from identifying the gap between low-cost labor and high-value outcomes. This step is where most earners fail by being too vague. Be specific."
                 </p>
              </div>

              {/* Chat Toggle Button (Floating) */}
              <div className="fixed bottom-24 right-6 z-[1100]">
                 <button 
                  onClick={() => setChatOpen(true)}
                  className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center active:scale-90 transition-all group"
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
              className="fixed inset-0 z-[1200] bg-white flex flex-col"
            >
              <header className="p-5 flex items-center justify-between border-b border-slate-100">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                       <BrainCircuit size={20} />
                    </div>
                    <div>
                       <h3 className="text-sm font-display font-black uppercase italic">Elite Tutor AI</h3>
                       <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-black uppercase text-slate-400">Node Active</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setChatOpen(false)} className="text-[10px] font-black uppercase text-slate-400">Close</button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-slate-50">
                 <div className="bg-blue-600 text-white p-4 rounded-t-[1.5rem] rounded-br-[1.5rem] max-w-[85%]">
                    <p className="text-xs font-bold leading-relaxed">Greetings, scholar. I am your Gemini-powered tutor. I have processed the details of <span className="underline italic">"{course.title}"</span>. Ask me anything to accelerate your earnings.</p>
                 </div>
                 
                 {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-t-[1.5rem] ${
                        m.role === 'user' 
                          ? 'bg-slate-900 text-white rounded-bl-[1.5rem]' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-br-[1.5rem] shadow-sm'
                      } max-w-[85%]`}>
                         <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      </div>
                   </div>
                 ))}

                 {aiLoading && (
                   <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 p-4 rounded-t-[1.5rem] rounded-br-[1.5rem] shadow-sm flex items-center gap-2">
                         <div className="flex gap-1">
                            <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" />
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
                 <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askTutor()}
                  placeholder="Ask the elite protocol..."
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                 />
                 <button 
                  onClick={askTutor}
                  disabled={aiLoading || !question.trim()}
                  className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
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

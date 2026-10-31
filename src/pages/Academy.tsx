import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Star, 
  TrendingUp, 
  ArrowRight,
  DollarSign,
  Briefcase,
  Share2,
  Copy,
  Check,
  Sparkles,
  Calculator,
  Percent,
  MessageSquare,
  HelpCircle,
  X,
  ChevronRight,
  Award,
  Zap,
  Users,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Download,
  Send
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { COURSES } from '../data/courses';
import { Course, CoursePurchase, AffiliateSale } from '../types';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';

export default function Academy() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  // View mode: 'affiliate' (Promote & Earn 30%) or 'learn' (Study & Certify)
  const [activeTab, setActiveTab] = useState<'affiliate' | 'learn'>('affiliate');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [purchasedCourses, setPurchasedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestriction, setShowRestriction] = useState(false);
  
  // Affiliate stats & state
  const [affiliateSales, setAffiliateSales] = useState<AffiliateSale[]>([]);
  const [copiedCourseId, setCopiedCourseId] = useState<string | null>(null);
  const [selectedSwipeCourse, setSelectedSwipeCourse] = useState<Course | null>(null);
  const [swipeTab, setSwipeTab] = useState<'whatsapp' | 'status' | 'twitter' | 'objections'>('status');
  const [copiedSwipeText, setCopiedSwipeText] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Interactive Commission Calculator State
  const [calcSalesPerWeek, setCalcSalesPerWeek] = useState(5);
  const [calcAvgPrice, setCalcAvgPrice] = useState(6500);

  // Track incoming referral from URL query parameters (?ref=...&course=...)
  const [detectedReferrer, setDetectedReferrer] = useState<string | null>(null);

  const categories = ['All', 'Freelancing', 'AI Strategy', 'E-commerce', 'Writing', 'Design', 'Marketing', 'Photography', 'Education'];

  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    try {
      COURSES.forEach(c => {
        const cached = localStorage.getItem(`course_override_${c.id}`);
        if (cached) {
          initial[c.id] = cached;
        }
      });
    } catch (_) {}
    return initial;
  });

  // Capture incoming referral parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const targetCourse = params.get('course');
      if (ref) {
        if (!user || user.uid !== ref) {
          localStorage.setItem('earnwise_course_referrer', ref);
          setDetectedReferrer(ref);
        }
      }
      if (targetCourse) {
        localStorage.setItem('earnwise_target_course', targetCourse);
      }
    } catch (_) {}
  }, [user]);

  // Real-time listener for user's purchased courses
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'coursePurchases'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPurchasedCourses(snap.docs.map(doc => (doc.data() as CoursePurchase).courseId));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coursePurchases');
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // Real-time listener for user's affiliate sales
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'affiliateSales'), where('referrerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateSale));
      setAffiliateSales(list);
    }, (err) => {
      console.warn("Could not load affiliate sales:", err);
    });

    return unsub;
  }, [user]);

  // Real-time listener for course image overrides
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, 'course_overrides'), (snap) => {
      const overrides: Record<string, string> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.image) {
          overrides[doc.id] = data.image;
          try {
            localStorage.setItem(`course_override_${doc.id}`, data.image);
          } catch (_) {}
        }
      });
      setImageOverrides(overrides);
    }, (error) => {
      console.warn("Could not load real-time course cover overrides: ", error);
    });

    return unsub;
  }, [user]);

  const filteredCourses = useMemo(() => {
    return COURSES.map(c => {
      if (imageOverrides[c.id]) {
        return { ...c, image: imageOverrides[c.id] };
      }
      return c;
    }).filter(c => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'All' || c.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category, imageOverrides]);

  // Copy unique affiliate link helper - points DIRECTLY to specific product page
  const handleCopyAffiliateLink = (courseId: string) => {
    const affiliateUid = user?.uid || profile?.referralCode || 'guest';
    const link = `${window.location.origin}/product/${courseId}?ref=${affiliateUid}`;
    navigator.clipboard.writeText(link);
    setCopiedCourseId(courseId);
    setTimeout(() => setCopiedCourseId(null), 2500);
  };

  // Get personalized swipe text for modal with direct product link
  const getPersonalizedSwipeText = (course: Course) => {
    const affiliateUid = user?.uid || profile?.referralCode || 'guest';
    const link = `${window.location.origin}/product/${course.id}?ref=${affiliateUid}`;
    if (!course.swipeCopy) return link;

    switch (swipeTab) {
      case 'whatsapp':
        return course.swipeCopy.whatsapp.replace('{{LINK}}', link);
      case 'status':
        return course.swipeCopy.statusHook.replace('{{LINK}}', link);
      case 'twitter':
        return course.swipeCopy.twitter.replace('{{LINK}}', link);
      case 'objections':
        return `💡 FREQUENTLY ASKED QUESTIONS ABOUT ${course.title.toUpperCase()}\n\n${course.swipeCopy.objectionBuster}\n\n👉 Enroll with verified certification here: ${link}`;
      default:
        return link;
    }
  };

  const handleCopySwipeText = () => {
    if (!selectedSwipeCourse) return;
    const text = getPersonalizedSwipeText(selectedSwipeCourse);
    navigator.clipboard.writeText(text);
    setCopiedSwipeText(true);
    setTimeout(() => setCopiedSwipeText(false), 2500);
  };

  // Total affiliate commission earnings
  const totalAffiliateEarned = affiliateSales.reduce((sum, sale) => sum + (sale.commissionAmount || 0), 0);

  return (
    <Layout>
      <div className="px-4 pt-4 pb-24 space-y-6 max-w-5xl mx-auto">
        
        {/* Referral Welcome Notification if visitor arrived via an affiliate link */}
        {detectedReferrer && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-emerald-900 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600 shrink-0" />
              <p className="text-[11px] font-medium">
                <strong>Partner Invitation:</strong> You are browsing through an authorized EarnWise Affiliate link. All curriculum & AI tutor benefits are fully active.
              </p>
            </div>
            <button 
              onClick={() => setDetectedReferrer(null)} 
              className="p-1 text-emerald-600 hover:text-emerald-900"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* --- SECTION 1: AFFILIATE MARKETING DEFINITION & HERO BANNER --- */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-[#0d1424] to-[#121d38] border border-blue-500/20 p-5 sm:p-7 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[10px] font-mono uppercase tracking-widest font-black">
                <Sparkles size={12} className="text-blue-400" />
                <span>EarnWise Affiliate Marketing Marketplace</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                <Percent size={12} />
                <span>Strict 70/30 Marketplace Split</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-3xl font-display font-black uppercase italic tracking-tight leading-tight">
                Turn Knowledge Into <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400">30% Cash Commissions</span>
              </h1>
              <p className="text-[11px] sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl line-clamp-3 sm:line-clamp-none">
                Earn 30% direct cash commission (₦1,500 – ₦2,100 per sale) on certified courses priced strictly between <strong>₦5,000 and ₦7,000</strong>. Commissions credit instantly to your <strong>Affiliate Wallet</strong> for Saturday payouts. Platform retains 70% for LMS & AI Master Tutor support.
              </p>
            </div>

            {/* Quick Feature Grid - Optimized for mobile 2 columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5">
                <p className="text-[8px] sm:text-[8.5px] font-mono uppercase text-slate-400 font-bold">Your Commission</p>
                <p className="text-sm sm:text-base font-black text-emerald-400">30% Cash</p>
                <p className="text-[8px] sm:text-[9px] text-slate-400">₦1.5k - ₦2.1k / sale</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5">
                <p className="text-[8px] sm:text-[8.5px] font-mono uppercase text-slate-400 font-bold">Platform Share</p>
                <p className="text-sm sm:text-base font-black text-cyan-400">70% Platform</p>
                <p className="text-[8px] sm:text-[9px] text-slate-400">LMS & 24/7 AI Tutor</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5">
                <p className="text-[8px] sm:text-[8.5px] font-mono uppercase text-slate-400 font-bold">Payout Schedule</p>
                <p className="text-sm sm:text-base font-black text-amber-400">Every Saturday</p>
                <p className="text-[8px] sm:text-[9px] text-slate-400">Separate wallet</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5">
                <p className="text-[8px] sm:text-[8.5px] font-mono uppercase text-slate-400 font-bold">Course Price</p>
                <p className="text-sm sm:text-base font-black text-violet-400">₦5k – ₦7k</p>
                <p className="text-[8px] sm:text-[9px] text-slate-400">Verified tools</p>
              </div>
            </div>

            {/* Explainer Trigger & How It Works Button */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <HelpCircle size={14} className="text-amber-400" />
                <span>{showHowItWorks ? 'Hide Affiliate Blueprint' : 'How Affiliate Marketing Works'}</span>
              </button>
              <span className="text-[10px] text-slate-400 font-medium">
                Independent Affiliate Wallet: Separate Saturday payouts from task or referral withdrawals.
              </span>
            </div>

            {/* Collapsible Step-by-Step Blueprint */}
            <AnimatePresence>
              {showHowItWorks && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#0b1020] border border-blue-500/30 rounded-2xl p-4 sm:p-5 space-y-3 mt-3 overflow-hidden"
                >
                  <h4 className="text-xs font-display font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span>The EarnWise 70/30 Affiliate Model Explained</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300 text-xs">
                    <div className="bg-white/5 p-3 rounded-xl space-y-1">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mb-1">1</div>
                      <p className="font-bold text-white text-xs">Pick Any Course</p>
                      <p className="text-[11px] text-slate-400">Choose from top high-income niches (TikTok Shop, WhatsApp Lead Siphon, CapCut Video, Freelancing). All courses qualify with real practical templates.</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl space-y-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-1">2</div>
                      <p className="font-bold text-white text-xs">Share Ready-Made Swipe Copy</p>
                      <p className="text-[11px] text-slate-400">Click &quot;Get Promo Kit&quot; on any course to copy high-converting WhatsApp status slides, broadcast messages, and objection handlers with your link embedded.</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl space-y-1">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs mb-1">3</div>
                      <p className="font-bold text-white text-xs">Collect 30% Instant Cash</p>
                      <p className="text-[11px] text-slate-400">When your buyer completes payment (₦5k–₦7k), you receive 30% (₦1,500 – ₦2,100) immediately in your Affiliate Wallet. Platform keeps 70%.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- SECTION 2: DUAL TAB NAVIGATION --- */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('affiliate')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'affiliate'
                ? 'bg-slate-950 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 size={15} className={activeTab === 'affiliate' ? 'text-emerald-400' : ''} />
            <span>Affiliate Hub (Earn 30% Cash)</span>
            <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-full text-[9px]">
              70/30
            </span>
          </button>
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'learn'
                ? 'bg-slate-950 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={15} className={activeTab === 'learn' ? 'text-blue-400' : ''} />
            <span>Study & Certify (Student View)</span>
            <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px]">
              {purchasedCourses.length} Enrolled
            </span>
          </button>
        </div>

        {/* --- SECTION 3: AFFILIATE DASHBOARD & EARNING CALCULATOR (when in affiliate mode) --- */}
        {activeTab === 'affiliate' && (
          <div className="space-y-4">
            {/* My Affiliate Performance Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase">
                  <Users size={13} />
                  <span>Affiliate Sales Made</span>
                </div>
                <p className="text-xl font-display font-black text-slate-900 mt-1">
                  {affiliateSales.length} <span className="text-xs font-normal text-slate-400">sales</span>
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase">
                  <DollarSign size={13} />
                  <span>Total 30% Earned</span>
                </div>
                <p className="text-xl font-display font-black text-emerald-600 mt-1">
                  ₦{totalAffiliateEarned.toLocaleString()}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-cyan-600 text-[10px] font-black uppercase">
                  <Briefcase size={13} />
                  <span>Affiliate Wallet</span>
                </div>
                <p className="text-xl font-display font-black text-slate-900 mt-1">
                  ₦{(profile?.affiliateBalance || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-black uppercase">
                  <Zap size={13} />
                  <span>Saturday Payout</span>
                </div>
                <button
                  onClick={() => navigate('/withdrawal?type=affiliate')}
                  className="mt-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span>Withdraw ₦</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* Interactive Affiliate Income Calculator */}
            <div className="bg-linear-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/30 rounded-3xl p-5 text-white space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-black uppercase tracking-wide">Live 30% Commission Calculator</h3>
                    <p className="text-[11px] text-slate-300">See how much you can earn every week promoting EarnWise Academic courses.</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold self-start sm:self-center">
                  30% Take-Home (User)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                      <span>Expected Sales Per Week:</span>
                      <span className="text-emerald-400 font-mono text-sm">{calcSalesPerWeek} sales / week</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={calcSalesPerWeek} 
                      onChange={(e) => setCalcSalesPerWeek(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>1 sale (Side-Hustle)</span>
                      <span>5 sales (Regular)</span>
                      <span>10 sales (Pro)</span>
                      <span>20 sales (Elite)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                      <span>Course Price Target:</span>
                      <span className="text-cyan-400 font-mono text-sm">₦{calcAvgPrice.toLocaleString()} (Guaranteed 5k-7k)</span>
                    </div>
                    <div className="flex gap-2">
                      {[5000, 6000, 6500, 7000].map(p => (
                        <button
                          key={p}
                          onClick={() => setCalcAvgPrice(p)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            calcAvgPrice === p 
                              ? 'bg-emerald-500 text-slate-950 font-black' 
                              : 'bg-white/10 text-slate-300 hover:bg-white/15'
                          }`}
                        >
                          ₦{p / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculation Output Cards */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-mono uppercase text-slate-400">Weekly Earnings (30%)</p>
                    <p className="text-xl sm:text-2xl font-display font-black text-emerald-400">
                      ₦{Math.round(calcSalesPerWeek * calcAvgPrice * 0.30).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">Paid every Saturday</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-mono uppercase text-slate-400">Monthly Projected (30%)</p>
                    <p className="text-xl sm:text-2xl font-display font-black text-cyan-400">
                      ₦{Math.round(calcSalesPerWeek * 4 * calcAvgPrice * 0.30).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">Based on 4 payout cycles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SECTION 4: SEARCH & CATEGORY FILTER --- */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder={activeTab === 'affiliate' ? "Search affiliate products to promote..." : "Search courses to study..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
            />
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  category === cat 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* --- SECTION 5: COURSE LIST (AFFILIATE VIEW vs STUDENT VIEW) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course, index) => {
              const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
              const isOwned = purchasedCourses.includes(course.id) || isAdmin;
              const commission = course.affiliateCommissionAmount || Math.round(course.price * 0.30);

              return (
                <motion.div
                  layout
                  key={course.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Course Header Image */}
                    <div className="relative aspect-video overflow-hidden">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-slate-950/70 text-white backdrop-blur-md border border-white/20">
                          {course.category}
                        </span>

                        {activeTab === 'affiliate' ? (
                          <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-sm flex items-center gap-1">
                            <Sparkles size={10} />
                            <span>Earn ₦{commission.toLocaleString()} (30%)</span>
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider backdrop-blur-md border ${
                            isOwned 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-white/20 text-white border-white/30'
                          }`}>
                            {isAdmin ? 'Admin Pass' : (isOwned ? 'Enrolled' : `₦${course.price.toLocaleString()}`)}
                          </span>
                        )}
                      </div>

                      {/* Title & Income Potential Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                        <h3 className="text-white font-display font-black text-lg uppercase italic leading-tight">{course.title}</h3>
                        <p className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                          <TrendingUp size={12} />
                          <span>Potential: {course.incomePotential}</span>
                        </p>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      {/* Course Value Details */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between text-slate-500 font-mono text-[9px] uppercase">
                          <span>Quality Guarantee</span>
                          <span>Verified Curriculum</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>{course.steps.length} Modules • Worksheets • 24/7 AI Master Tutor</span>
                        </div>
                      </div>

                      {/* Affiliate Pricing Breakdown */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <div>
                          <p className="text-[8px] font-mono uppercase text-slate-400 font-bold">Product Price</p>
                          <p className="text-sm font-display font-black text-slate-900">₦{course.price.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-mono uppercase text-emerald-600 font-bold">30% Affiliate Share</p>
                          <p className="text-sm font-display font-black text-emerald-600">₦{commission.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-0">
                    {activeTab === 'affiliate' ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyAffiliateLink(course.id)}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-3 rounded-xl font-black uppercase tracking-wider text-[9.5px] flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            {copiedCourseId === course.id ? (
                              <>
                                <Check size={13} className="text-emerald-400" />
                                <span>Link Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy 30% Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setSelectedSwipeCourse(course)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 px-3 rounded-xl font-black uppercase tracking-wider text-[9.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <MessageSquare size={13} />
                            <span>Promo Kit</span>
                          </button>
                        </div>

                        <button
                          onClick={() => navigate(`/academy/course/${course.id}`)}
                          className="w-full text-center text-[10px] text-slate-500 hover:text-slate-900 font-bold py-1 flex items-center justify-center gap-1"
                        >
                          <span>Preview Student Experience</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/academy/course/${course.id}`)}
                        className={`w-full py-3 rounded-xl font-black uppercase tracking-wider text-[9.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isOwned
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20'
                        }`}
                      >
                        {isOwned ? (
                          <>
                            <span>Resume Learning</span>
                            <ArrowRight size={13} />
                          </>
                        ) : (
                          <>
                            <span>Enroll Now (₦{course.price.toLocaleString()})</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search size={22} />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">No matching academic courses found</p>
          </div>
        )}

        {/* --- SECTION 6: FOOTER INFORMATION --- */}
        <div className="pt-6 pb-6 text-center border-t border-slate-200 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            EarnWise Academic Affiliate Network • 70% Partner Split • 100% Legit
          </p>
          <p className="text-[9px] text-slate-400">
            All commissions are paid directly to your Referral Wallet every Saturday with zero deduction fees.
          </p>
        </div>
      </div>

      {/* --- MODAL: PROMOTIONAL SWIPE KIT FOR AFFILIATE PROMOTERS --- */}
      <AnimatePresence>
        {selectedSwipeCourse && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-white/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-mono uppercase font-black">
                    <Sparkles size={12} />
                    <span>High-Converting Promo Kit (Earn 30%: ₦{(selectedSwipeCourse.affiliateCommissionAmount || Math.round(selectedSwipeCourse.price * 0.30)).toLocaleString()})</span>
                  </div>
                  <h3 className="text-base font-display font-black uppercase text-white truncate max-w-xs sm:max-w-md">
                    {selectedSwipeCourse.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSwipeCourse(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Swipe Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSwipeTab('status')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    swipeTab === 'status' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  📱 Status Hook
                </button>
                <button
                  onClick={() => setSwipeTab('whatsapp')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    swipeTab === 'whatsapp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  💬 WhatsApp DM
                </button>
                <button
                  onClick={() => setSwipeTab('twitter')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    swipeTab === 'twitter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🐦 Social Post
                </button>
                <button
                  onClick={() => setSwipeTab('objections')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    swipeTab === 'objections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  💡 Objection FAQ
                </button>
              </div>

              {/* Swipe Content Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                
                {/* Visual Product Banner Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Promotional Product Banner</p>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedSwipeCourse.image;
                        link.download = `${selectedSwipeCourse.id}-banner.jpg`;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-[9.5px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={11} />
                      <span>Download Banner Flyer</span>
                    </button>
                  </div>
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={selectedSwipeCourse.image} alt={selectedSwipeCourse.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-sm">
                          Earn ₦{(selectedSwipeCourse.affiliateCommissionAmount || Math.round(selectedSwipeCourse.price * 0.30)).toLocaleString()} (30%)
                        </span>
                        <p className="text-white text-xs font-black uppercase mt-1">{selectedSwipeCourse.title}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Direct Product Affiliate Link (Straight to Course)</p>
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-800 truncate">
                      {`${window.location.origin}/product/${selectedSwipeCourse.id}?ref=${user?.uid || profile?.referralCode || 'guest'}`}
                    </span>
                    <button
                      onClick={() => handleCopyAffiliateLink(selectedSwipeCourse.id)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 shrink-0 cursor-pointer"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Ready-To-Paste Marketing Copy</p>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Link Auto-Inserted</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-sans text-slate-800 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto select-all">
                    {getPersonalizedSwipeText(selectedSwipeCourse)}
                  </div>
                </div>

                {/* Direct WhatsApp Share Button */}
                <button
                  onClick={() => {
                    const text = getPersonalizedSwipeText(selectedSwipeCourse);
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Send size={15} />
                  <span>Share Straight to WhatsApp</span>
                </button>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles size={12} className="text-emerald-600 shrink-0" />
                    <span>Affiliate Payout Guarantee:</span>
                  </p>
                  <p className="text-emerald-800 text-[10.5px]">
                    When anyone clicks your link, they are taken straight to this product. When they pay, 30% cash commission (₦{(selectedSwipeCourse.affiliateCommissionAmount || Math.round(selectedSwipeCourse.price * 0.30)).toLocaleString()}) is automatically credited to your separate Affiliate Wallet. Withdrawals happen every Saturday with 0% fees!
                  </p>
                </div>
              </div>

              {/* Modal Footer CTA */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedSwipeCourse(null)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-xs uppercase"
                >
                  Close
                </button>
                <button
                  onClick={handleCopySwipeText}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  {copiedSwipeText ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy Promo Copy & Link</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="access premium courses" 
      />
    </Layout>
  );
}

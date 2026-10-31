import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Download, 
  Zap, 
  FileText, 
  Table, 
  Share2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  Users, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  ExternalLink,
  Wallet,
  AlertCircle,
  Loader2,
  BookOpen,
  Send,
  Eye
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { getApiUrl } from '../lib/config';
import { COURSES } from '../data/courses';
import axios from 'axios';

export default function ProductLanding() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [isOwned, setIsOwned] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTab, setShareTab] = useState<'whatsapp' | 'social' | 'banner'>('whatsapp');
  const [copiedSwipe, setCopiedSwipe] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  // Find course
  const course = COURSES.find(c => c.id === id);

  // Capture & persist referral code from query params
  const refFromUrl = searchParams.get('ref');
  useEffect(() => {
    if (refFromUrl && id) {
      try {
        localStorage.setItem(`earnwise_course_referrer_${id}`, refFromUrl);
        localStorage.setItem('earnwise_course_referrer', refFromUrl);
        localStorage.setItem('earnwise_last_ref', refFromUrl);
      } catch (_) {}
    }
  }, [refFromUrl, id]);

  const activeReferrer = (id ? localStorage.getItem(`earnwise_course_referrer_${id}`) : null) 
    || localStorage.getItem('earnwise_course_referrer') 
    || refFromUrl 
    || null;

  // Dynamic OpenGraph / Page Title in Head
  useEffect(() => {
    if (!course) return;
    const originalTitle = document.title;
    document.title = `${course.title} — EarnWise Academic (₦${course.price.toLocaleString()})`;

    // Update meta tags dynamically
    const updateMeta = (prop: string, content: string) => {
      let tag = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute('property', prop);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    updateMeta('og:title', `${course.title} — ₦${course.price.toLocaleString()}`);
    updateMeta('og:description', course.description);
    updateMeta('og:image', course.image);
    updateMeta('og:url', window.location.href);
    updateMeta('twitter:title', course.title);
    updateMeta('twitter:description', course.description);
    updateMeta('twitter:image', course.image);

    return () => {
      document.title = originalTitle;
    };
  }, [course]);

  // Check ownership
  useEffect(() => {
    if (!id) return;
    if (!user) {
      setCheckingOwnership(false);
      setIsOwned(false);
      return;
    }

    const checkOwnership = async () => {
      try {
        const isAdmin = profile?.role === 'admin' || user.email === 'wiseking7890@gmail.com';
        if (isAdmin) {
          setIsOwned(true);
          setCheckingOwnership(false);
          return;
        }

        const q = query(
          collection(db, 'coursePurchases'),
          where('userId', '==', user.uid),
          where('courseId', '==', id)
        );
        const snap = await getDocs(q);
        setIsOwned(!snap.empty);
      } catch (err) {
        console.warn("[PRODUCT] Ownership check error:", err);
      } finally {
        setCheckingOwnership(false);
      }
    };

    checkOwnership();
  }, [user, id, profile?.role]);

  if (!course) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="text-rose-500" size={48} />
          <h2 className="text-xl font-display font-black uppercase text-slate-900">Product Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm">The course or academic product you requested does not exist or has been relocated.</p>
          <Link to="/academy" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
            Explore All Courses
          </Link>
        </div>
      </Layout>
    );
  }

  const coursePrice = course.price;
  const affiliateCommission = Math.floor(coursePrice * 0.30); // 30% User / 70% Platform split
  const platformShare = coursePrice - affiliateCommission; // Exact 70%
  const depositBalance = profile?.depositBalance || 0;
  const hasSufficientDeposit = depositBalance >= coursePrice;

  const affiliateUid = user?.uid || profile?.referralCode || 'partner';
  const directAffiliateUrl = `${window.location.origin}/product/${course.id}?ref=${affiliateUid}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directAffiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadBanner = () => {
    const link = document.createElement('a');
    link.href = course.image;
    link.download = `${course.id}-promotional-banner.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareWhatsApp = () => {
    const text = `🔥 *${course.title.toUpperCase()}*\n\n${course.description}\n\n💰 Price: *₦${coursePrice.toLocaleString()}* (One-Time Payment)\n✅ Includes Step-by-Step Practical Modules\n📊 Real Excel Templates & PDF Guides\n🤖 24/7 AI Master Tutor Access\n\n👉 *View Product & Get Instant Access:* ${directAffiliateUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareTwitter = () => {
    const text = `Master ${course.title} with practical step-by-step blueprints, downloadable worksheets & 24/7 AI Tutor support: ${directAffiliateUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = `🔥 ${course.title}\n\n${course.description}\n\nPrice: ₦${coursePrice.toLocaleString()}\nInstant Access: ${directAffiliateUrl}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(directAffiliateUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExecutePurchase = async () => {
    if (!user) {
      setGuestModalOpen(true);
      return;
    }

    if (!hasSufficientDeposit && profile?.role !== 'admin') {
      const msg = `Insufficient deposited balance. You have ₦${depositBalance.toLocaleString()} in your deposit balance, but ₦${coursePrice.toLocaleString()} is required. Direct bank deposits are required for Academy products.`;
      setPurchaseError(msg);
      return;
    }

    setPurchaseError(null);
    setPurchaseLoading(true);

    try {
      const targetRefId = (activeReferrer && activeReferrer !== user.uid) ? activeReferrer : (profile?.referredBy && profile.referredBy !== user.uid ? profile.referredBy : null);

      const res = await axios.post(getApiUrl('/api/v1/academy/purchase'), {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title,
        coursePrice: coursePrice,
        referrerId: targetRefId
      });

      if (res.data) {
        if (res.data.useClientFallback) {
          // Client SDK fallback execution
          const purchaseId = `${user.uid}_${course.id}`;
          const purchaseRef = doc(db, 'coursePurchases', purchaseId);
          await setDoc(purchaseRef, {
            purchaseId,
            userId: user.uid,
            courseId: course.id,
            courseTitle: course.title,
            amount: coursePrice,
            isFree: false,
            referrerId: targetRefId,
            affiliateCommission: targetRefId ? affiliateCommission : 0,
            platformShare: targetRefId ? platformShare : coursePrice,
            purchasedAt: new Date()
          });

          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            balance: increment(-coursePrice),
            withdrawableBalance: increment(-coursePrice),
            depositBalance: increment(-coursePrice)
          });

          const transRef = doc(collection(db, 'transactions'));
          await setDoc(transRef, {
            id: transRef.id,
            userId: user.uid,
            amount: -coursePrice,
            type: 'withdrawal',
            description: `Unlocked Course: ${course.title}`,
            createdAt: new Date()
          });

          // Credit 30% affiliate commission to promoter's separate affiliate balance
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
                description: `30% Course Affiliate Commission: ${course.title} (Direct Sale)`,
                createdAt: new Date()
              });

              const affSaleRef = doc(collection(db, 'affiliateSales'));
              await setDoc(affSaleRef, {
                id: affSaleRef.id,
                referrerId: targetRefId,
                buyerId: user.uid,
                buyerName: profile?.displayName || profile?.username || 'Verified Buyer',
                courseId: course.id,
                courseTitle: course.title,
                coursePrice: coursePrice,
                commissionRate: 0.30,
                commissionAmount: affiliateCommission,
                platformShare: platformShare,
                status: 'credited',
                createdAt: new Date()
              });
            } catch (affErr) {
              console.warn("[PRODUCT] Affiliate credit fallback warning:", affErr);
            }
          }
        }

        try {
          localStorage.removeItem(`earnwise_course_referrer_${course.id}`);
        } catch (_) {}

        setIsOwned(true);
        setPurchaseSuccess(true);
        setTimeout(() => {
          navigate(`/academy/course/${course.id}`);
        }, 1200);
      }
    } catch (err: any) {
      setPurchaseError(err.response?.data?.error || err.message || "Failed to process payment. Please verify your connection.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
        
        {/* Affiliate Referral Notice Banner */}
        {activeReferrer && (
          <div className="bg-linear-to-r from-emerald-600 to-teal-700 text-white py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm sticky top-0 z-40">
            <Sparkles size={14} className="shrink-0" />
            <span>Official Affiliate Referral Link Active — Promoting Partner #{activeReferrer.slice(0, 8)}</span>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <Link to="/academy" className="hover:text-white transition-colors flex items-center gap-1 font-bold">
              ← Back to Academy
            </Link>
            <div className="flex items-center gap-1 text-[11px] font-mono uppercase bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Verified Academic Product</span>
            </div>
          </div>

          {/* HERO SECTION: BANNER & QUICK SPECS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Visual Product Banner */}
            <div className="md:col-span-7 space-y-4">
              <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                {/* Floating Tags */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-md border border-white/20">
                    {course.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-slate-950 font-bold backdrop-blur-md">
                    ★ 4.9 Rating (240+ Reviews)
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-black tracking-widest">
                    ESTIMATED EARNING POTENTIAL: {course.incomePotential}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-display font-black uppercase text-white leading-tight">
                    {course.title}
                  </h1>
                </div>
              </div>

              {/* Quick Trust Badges */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3">
                  <Clock size={16} className="mx-auto text-amber-400 mb-1" />
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Pace</p>
                  <p className="text-xs font-bold text-white">Self-Paced</p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3">
                  <BookOpen size={16} className="mx-auto text-blue-400 mb-1" />
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Curriculum</p>
                  <p className="text-xs font-bold text-white">{course.steps.length} Modules</p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3">
                  <Zap size={16} className="mx-auto text-emerald-400 mb-1" />
                  <p className="text-[10px] text-slate-400 uppercase font-mono">AI Master Tutor</p>
                  <p className="text-xs font-bold text-white">24/7 Included</p>
                </div>
              </div>
            </div>

            {/* CHECKOUT & PRICING CARD (SELAR-STYLE) */}
            <div className="md:col-span-5 bg-gradient-to-b from-[#13112a] to-[#0c0a1f] border border-amber-500/30 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-1.5 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">Standard Enrollment</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Verified Gated Access</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-black text-white">₦{coursePrice.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 line-through">₦25,000</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">Save 76%</span>
                </div>
                <p className="text-[10px] text-slate-400">One-time payment • Lifetime access to course, worksheets, and updates.</p>
              </div>

              {/* What You'll Receive Immediately */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono uppercase text-slate-300 tracking-wider font-bold">What is unlocked upon payment:</p>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Complete {course.steps.length}-Step Practical Masterclass</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Downloadable PDF Guides & Execution Blueprint</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Excel-Compatible Worksheets & Profit Calculators</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Google Drive Resource Viewing & Downloads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>24/7 AI Master Tutor for direct assignment help</span>
                  </li>
                </ul>
              </div>

              {/* Gated Access Notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Lock size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Strict Access Gate:</strong> Modules, video player, and files are 100% locked until payment confirmation. Nobody can access materials without verified purchase.
                </p>
              </div>

              {/* Primary Call to Action */}
              <div className="space-y-2 pt-1">
                {isOwned ? (
                  <button
                    onClick={() => navigate(`/academy/course/${course.id}`)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <span>✓ You Own This Course — Open Player</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleExecutePurchase}
                      disabled={purchaseLoading}
                      className="w-full bg-linear-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-slate-950 font-display font-black text-xs uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      {purchaseLoading ? (
                        <>
                          <Loader2 className="animate-spin text-slate-950" size={16} />
                          <span>Verifying Payment...</span>
                        </>
                      ) : (
                        <>
                          <span>Make Payment / Enroll Now (₦{coursePrice.toLocaleString()})</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {/* Deposit balance check */}
                    {user && !hasSufficientDeposit && profile?.role !== 'admin' && (
                      <div className="text-center space-y-1 pt-1">
                        <p className="text-[10px] text-rose-400 font-bold">
                          Deposit balance: ₦{depositBalance.toLocaleString()} (Needs ₦{coursePrice.toLocaleString()})
                        </p>
                        <Link 
                          to="/deposit" 
                          className="inline-block text-[11px] text-amber-400 hover:text-amber-300 font-extrabold underline uppercase"
                        >
                          Make Payment / Deposit Funds →
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {purchaseError && (
                  <p className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-500/30 text-center">
                    {purchaseError}
                  </p>
                )}

                {purchaseSuccess && (
                  <p className="text-xs text-emerald-400 bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-500/30 text-center font-bold">
                    ✓ Payment confirmed! Redirecting to course portal...
                  </p>
                )}
              </div>

              {/* Affiliate Promotion Callout */}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-mono uppercase text-slate-400 font-bold">Earn 30% Affiliate Share</p>
                  <p className="text-xs font-bold text-emerald-400">₦{affiliateCommission.toLocaleString()} / sale</p>
                </div>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={12} />
                  <span>Promote Product</span>
                </button>
              </div>

            </div>
          </div>

          {/* COURSE DETAILS & CURRICULUM ACCORDION */}
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-white tracking-tight">
                Curriculum Overview & What You Will Master
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Every module is engineered for practical Nigerian and international execution. Below is the structured syllabus you will unlock immediately after confirmed payment.
              </p>
            </div>

            {/* Modules List */}
            <div className="space-y-3">
              {course.steps.map((step, idx) => {
                const isOpen = activeAccordion === idx;
                return (
                  <div 
                    key={idx}
                    className="bg-slate-900/70 border border-white/5 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setActiveAccordion(isOpen ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/5 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white leading-snug">{step}</p>
                          <span className="text-[9.5px] font-mono uppercase text-slate-400">
                            Includes Worksheet • Practical Task • AI Tutor Blueprint
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-400 shrink-0">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-0 text-xs text-slate-300 border-t border-white/5 space-y-2 bg-slate-950/40">
                        <p className="leading-relaxed text-slate-300">
                          This module provides comprehensive tactical training, real-world case studies, operational checklists, and step-by-step guidance to ensure mastery before advancing.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-mono">
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <FileText size={11} className="text-blue-400" />
                            <span>PDF Study Note</span>
                          </span>
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Table size={11} className="text-emerald-400" />
                            <span>Excel Worksheet</span>
                          </span>
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Lock size={11} className="text-amber-400" />
                            <span>Requires Confirmed Payment</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEARNER GUARANTEE & ACCESS STATEMENT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={26} />
            </div>
            <h3 className="text-lg font-display font-black uppercase text-white">EarnWise Academic Quality Guarantee</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We uphold strict academic standards. Every course qualifies up to international and local commercial benchmarks. 
              Course revenue is distributed strictly according to our 70/30 model (70% platform maintenance & AI computing, 30% direct cash affiliate payout).
            </p>
            <div className="pt-2">
              <button
                onClick={handleExecutePurchase}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider py-3 px-8 rounded-xl cursor-pointer"
              >
                {isOwned ? "Access Course Materials" : `Make Payment & Start Learning (₦${coursePrice.toLocaleString()})`}
              </button>
            </div>
          </div>

        </div>

        {/* --- MODAL: SHARE WITH BANNER & AFFILIATE KIT --- */}
        <AnimatePresence>
          {shareModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-5 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                      Earn 30% Cash (₦{affiliateCommission.toLocaleString()} per sale)
                    </span>
                    <h3 className="text-base font-display font-black uppercase text-white truncate max-w-xs">
                      Share {course.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShareModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Sub-tabs */}
                <div className="flex border-b border-white/5 bg-slate-950/50 p-1.5 gap-1">
                  <button
                    onClick={() => setShareTab('whatsapp')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      shareTab === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={() => setShareTab('banner')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      shareTab === 'banner' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🖼️ Banner Flyer
                  </button>
                  <button
                    onClick={() => setShareTab('social')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      shareTab === 'social' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌐 Social & Link
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  
                  {/* Visual Banner Preview */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Promotional Product Banner</p>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-md">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3">
                        <div>
                          <p className="text-white text-xs font-black uppercase">{course.title}</p>
                          <p className="text-amber-400 text-[10px] font-bold">₦{coursePrice.toLocaleString()} • 30% Commission: ₦{affiliateCommission.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direct Product Link */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Direct Product Affiliate Link</p>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-emerald-400 truncate">
                        {directAffiliateUrl}
                      </span>
                      <button
                        onClick={handleCopyLink}
                        className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shrink-0 cursor-pointer"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {shareTab === 'whatsapp' && (
                    <div className="space-y-3">
                      <div className="bg-slate-950 border border-white/5 p-3 rounded-xl text-xs text-slate-300 space-y-1">
                        <p className="font-bold text-white flex items-center gap-1.5">
                          <Sparkles size={13} className="text-emerald-400" />
                          <span>WhatsApp High-Converting Hook:</span>
                        </p>
                        <p className="text-slate-400 text-[11px] whitespace-pre-line leading-relaxed">
                          {`🔥 Master ${course.title} with practical step-by-step blueprints, downloadable worksheets & 24/7 AI Tutor.\n\n👉 View product & enroll here: ${directAffiliateUrl}`}
                        </p>
                      </div>
                      <button
                        onClick={handleShareWhatsApp}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                      >
                        <Send size={15} />
                        <span>Send to WhatsApp Now</span>
                      </button>
                    </div>
                  )}

                  {shareTab === 'banner' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Download this official high-definition promotional flyer to post on your <strong>WhatsApp Status</strong>, <strong>Facebook Story</strong>, or <strong>Instagram</strong> with your direct product link!
                      </p>
                      <button
                        onClick={handleDownloadBanner}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download size={15} />
                        <span>Download Promotional Banner Flyer</span>
                      </button>
                    </div>
                  )}

                  {shareTab === 'social' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleShareTwitter}
                          className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Share on X (Twitter)</span>
                        </button>
                        <button
                          onClick={handleShareTelegram}
                          className="bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Share on Telegram</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[10px] text-emerald-300">
                    💡 <strong>Commission Policy:</strong> Every Saturday between 8:00 AM and 6:00 PM WAT, your 30% affiliate earnings can be withdrawn to your personal bank account with 0% processing fee!
                  </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setShareModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- MODAL: GUEST SIGN IN / QUICK CHECKOUT --- */}
        <AnimatePresence>
          {guestModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-5 text-center shadow-2xl"
              >
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto text-amber-400 border border-amber-500/20">
                  <Lock size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-black uppercase text-white">Create Account or Sign In to Enroll</h3>
                  <p className="text-xs text-slate-400">
                    To unlock {course.title} and access the curriculum, worksheets, and 24/7 AI tutor, please sign in or register your account.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => navigate(`/welcome?redirect=/product/${course.id}`)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider py-3.5 rounded-xl cursor-pointer"
                  >
                    Sign In / Register to Enroll
                  </button>
                  <button
                    onClick={() => setGuestModalOpen(false)}
                    className="w-full text-xs text-slate-400 hover:text-white py-2"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  );
}

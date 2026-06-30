import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { PLANS, PlanDetails } from '../constants/plans';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getApiUrl } from '../lib/config';
import { doc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  CheckCircle2, 
  Crown, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  CreditCard,
  Wallet
} from 'lucide-react';
import DepositTab from '../components/DepositTab';

export default function Upgrade() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'deposit'>('plans');

  const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';

  const paystackPublicKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY;

  const handleUpgradeWithBalance = async (plan: PlanDetails) => {
    if (!profile?.uid) {
      setError("User session lost. Please refresh and try again.");
      return;
    }

    if ((profile?.withdrawableBalance || 0) < plan.cost) {
      setError(`Insufficient balance. You need ₦${(plan.cost - (profile?.withdrawableBalance || 0)).toLocaleString()} more. Please deposit funds first.`);
      return;
    }
    
    setLoading(plan.id);
    setError(null);
    try {
      // In a real app, I'd move this to a secure server endpoint too, but I'll use verify-upgrade as a generic 'activate' call since it already handles the DB update
      const response = await axios.post(getApiUrl('/api/paystack/verify-upgrade'), {
        reference: `WALLET_${Date.now()}`,
        userId: profile.uid,
        planId: plan.id,
        amount: plan.cost,
        isBalancePayment: true // Tell server to deduct from balance
      });

      if (response.data.status === "success") {
        if (response.data.useClientFallback) {
          console.warn("[PAYMENT] Server upgrade write denied. Engaging Client SDK fallback execution...");
          
          const userRef = doc(db, 'users', profile.uid);
          
          // Deduct cost and update plan directly in client SDK
          await updateDoc(userRef, {
            plan: plan.id,
            subscriptionTier: 'premium',
            balance: increment(-plan.cost),
            withdrawableBalance: increment(-plan.cost),
            updatedAt: serverTimestamp()
          });

          // Award referral bonus immediately in client-side fallback
          if (profile.referredBy && !profile.hasReceivedReferralBonus) {
            const bonusAmount = Math.floor(plan.cost * 0.3);
            if (bonusAmount > 0) {
              try {
                const refVariants = Array.from(new Set([
                  profile.referredBy,
                  profile.referredBy.toLowerCase(),
                  profile.referredBy.toUpperCase()
                ].filter(Boolean) as string[]));
                
                let referrerSnap = await getDocs(query(collection(db, 'users'), where('referralCode', 'in', refVariants), limit(1)));
                if (referrerSnap.empty) {
                  referrerSnap = await getDocs(query(collection(db, 'users'), where('username', 'in', refVariants), limit(1)));
                }

                if (!referrerSnap.empty) {
                  const referrerDoc = referrerSnap.docs[0];
                  await updateDoc(referrerDoc.ref, {
                    balance: increment(bonusAmount),
                    referralBalance: increment(bonusAmount),
                    withdrawableBalance: increment(bonusAmount),
                    referralEarnings: increment(bonusAmount),
                    updatedAt: serverTimestamp()
                  });

                  await addDoc(collection(db, 'notifications'), {
                    userId: referrerDoc.id,
                    title: '🎁 Referral Upgrade Commission!',
                    message: `Your friend (${profile.displayName || profile.username || 'Someone'}) upgraded to ${plan.id}! You have received a 30% commission of ₦${bonusAmount}.`,
                    type: 'reward',
                    createdAt: serverTimestamp(),
                    readBy: []
                  });

                  // Update the local document to prevent duplicate bonuses
                  await updateDoc(userRef, {
                    hasReceivedReferralBonus: true
                  });
                }
              } catch (refErr) {
                console.error("[REFERRAL_FALLBACK] Failed to award referral bonus:", refErr);
              }
            }
          }

          // Log the transaction document
          const transactionId = `WALLET_TX_${Date.now()}`;
          const transRef = doc(db, 'transactions', transactionId);
          await setDoc(transRef, {
            userId: profile.uid,
            amount: -plan.cost,
            type: 'withdrawal',
            description: `Activated ${plan.name} Plan using wallet balance`,
            createdAt: serverTimestamp(),
            reference: `WALLET_${Date.now()}`
          });
        }

        setSuccess(`Welcome to ${plan.name}! Your account has been upgraded.`);
        setTimeout(() => {
          setSuccess(null);
          navigate('/earnings'); 
        }, 3000);
      }
    } catch (err: any) {
      console.error("Upgrade failed:", err.response?.data);
      setError(err.response?.data?.message || "Upgrade failed. Please try again or contact support.");
    } finally {
      setLoading(null);
    }
  };

  const PlanCard = ({ plan }: { plan: PlanDetails }) => {
    return (
      <motion.div 
        key={plan.id}
        whileHover={{ y: -3 }}
        className={`relative bg-white border-2 rounded-2xl p-5 sm:p-6 transition-all duration-300 overflow-hidden group ${
          profile?.plan === plan.id 
            ? 'border-indigo-600 shadow-md ring-4 ring-indigo-50' 
            : 'border-slate-100 hover:border-indigo-200 hover:shadow-md shadow-xs'
        }`}
      >
        {profile?.plan === plan.id && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-[0.15em] shadow-md relative z-10">
            Active Tier
          </div>
        )}

        <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)' }} />

        <div className="space-y-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${plan.color} rounded-xl flex items-center justify-center text-white shadow-md relative flex-shrink-0`}>
              <Zap size={22} className="relative z-10" />
              <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h4>
              <div className="flex items-baseline gap-1">
                <span className="text-indigo-600 font-black text-lg tracking-tighter">₦{plan.cost.toLocaleString()}</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">/ Lifetime</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 py-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Included Benefits</p>
            <div className="grid grid-cols-1 gap-2.5">
              {plan.perks.map((perk, i) => (
                <div key={`perk-${plan.id}-${i}`} className="flex items-start gap-2 group/perk">
                  <div className="mt-0.5 w-4 h-4 bg-emerald-50 rounded-md flex items-center justify-center flex-shrink-0 group-hover/perk:bg-emerald-500 transition-colors">
                    <CheckCircle2 size={10} className="text-emerald-500 group-hover/perk:text-white transition-colors" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover/perk:text-slate-900 transition-colors leading-tight">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleUpgradeWithBalance(plan)}
            disabled={!!loading || profile?.plan === plan.id}
            className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all relative overflow-hidden group/sub ${
              profile?.plan === plan.id
                ? 'bg-slate-50 text-slate-400 cursor-default border border-slate-100 shadow-inner'
                : 'bg-slate-900 text-white hover:bg-black active:scale-[0.98] shadow-md'
            }`}
          >
            {loading === plan.id ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : profile?.plan === plan.id ? (
              <>
                <ShieldCheck size={22} className="text-emerald-500" />
                Current Tier
              </>
            ) : (
              <>
                <span>Activate Plan</span>
                <ArrowRight size={20} className="group-hover/sub:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  if (authLoading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout title="Membership">
      <div className="p-3.5 sm:p-5 pb-24 space-y-6 max-w-2xl mx-auto relative">
        <div className="premium-blur" />
        
        {/* Header */}
        <div className="text-center pt-4 space-y-2">
          <motion.div 
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-md border border-white/10 mb-3">
              <Sparkles size={12} className="text-amber-400" />
              Elite Tiers
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tighter leading-none italic uppercase">
              Financial <br /> <span className="text-blue-600">Freedom</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Multiply your results with high-yield tiers</p>
          </motion.div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'plans' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Crown size={14} />
            Subscription Plans
          </button>
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'deposit' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wallet size={14} />
            Deposit Funds
          </button>
        </div>

        {activeTab === 'plans' ? (
          <>
            {/* Action Messages */}
            <AnimatePresence>
              {success && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center gap-3 text-emerald-700 shadow-md"
                >
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{success}</p>
                </motion.div>
              )}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center gap-3 text-rose-700 shadow-md"
                >
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current Plan Bento Card */}
            <div className="bg-slate-950 bg-[#020617] rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl border border-white/5" style={{ backgroundColor: '#020617' }}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-16 -mt-16 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)' }} />
              
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Account Ranking</p>
                  <h2 className="text-2xl font-display font-black capitalize italic flex items-center gap-2">
                    {isAdmin ? "Admin Elite" : `${profile?.plan} Tier`}
                    {(profile?.plan !== 'free' || isAdmin) && <ShieldCheck className="text-blue-500" size={24} />}
                  </h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Global Payout Efficiency: {isAdmin ? "10.0" : (PLANS.find(p => p.id === profile?.plan)?.multiplier || 1.0)}x {isAdmin && "(Free Admin Access)"}
                  </p>
                </div>
                
                <div className="p-3 bg-white/10 border border-white/10 rounded-2xl shrink-0">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                    <Crown size={22} className="text-white fill-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Tiers Highlight Block */}
            <div className="bg-slate-950 bg-[#020617] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden border border-white/10 shadow-3xl space-y-6" style={{ backgroundColor: '#020617' }}>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-24 -mt-24 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)' }} />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full -ml-24 -mb-24 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)' }} />

              <div className="text-center md:text-left relative z-10 space-y-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/25 text-amber-300 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-amber-500/30">
                  <Sparkles size={10} /> Ultimate Prestige Tiers
                </span>
                <h3 className="text-2xl font-display font-black tracking-tighter uppercase italic text-white">Institutional High-Yield plans</h3>
                <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-xl">
                  Unlock the full power of the Earnwise network. Platinum & Golden members receive maximum multipliers, priority payout settlements, and personal mentoring.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* Platinum highlight card */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full uppercase tracking-wider">₦15,000 Tier</span>
                      <span className="text-[10px] font-black text-indigo-400">7.5x MULTIPLIER</span>
                    </div>
                    <h4 className="text-lg font-display font-black tracking-tight mt-2 uppercase italic text-white">Platinum Elite</h4>
                    <p className="text-[11px] text-slate-400">Accelerated path for high-volume network participation.</p>
                    
                    <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-indigo-400 shrink-0" />
                        <span>Dedicated WhatsApp Account Manager</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-indigo-400 shrink-0" />
                        <span>Instant Auto-Approvals (within 30m)</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-indigo-400 shrink-0" />
                        <span>Unlimited Wise AI Assistance</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Golden highlight card */}
                <div className="bg-white/5 border border-amber-500/30 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)' }} />
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full uppercase tracking-wider">₦25,000 Tier</span>
                      <span className="text-[10px] font-black text-amber-400">10x MULTIPLIER</span>
                    </div>
                    <h4 className="text-lg font-display font-black tracking-tight mt-2 uppercase italic text-white">Golden Apex</h4>
                    <p className="text-[11px] text-slate-400">Our highest-earning institutional plan with a massive 1,000% boost.</p>
                    
                    <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                        <span>Golden Monthly Revenue Split</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                        <span>Zero-Wait Automated Withdrawals</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                        <span>Elite Concierge & Mentor Channels</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              {PLANS.filter(p => p.id !== 'free').map((plan) => (
                <motion.div 
                  key={plan.id}
                  whileHover={{ y: -4 }}
                  className={`relative bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-300 group flex flex-col justify-between ${
                    profile?.plan === plan.id 
                      ? 'border-blue-600 shadow-2xl bg-blue-50/10' 
                      : 'hover:border-blue-100 hover:shadow-xl shadow-sm'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`w-12 h-12 ${plan.color} rounded-xl flex items-center justify-center text-white shadow-lg relative`}>
                        <Zap size={20} className="relative z-10" />
                        <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      {profile?.plan === plan.id && (
                        <div className="px-3.5 py-1 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-md">
                          Active
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase italic">{plan.name}</h4>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-blue-600 font-display font-black text-2xl tracking-tighter">₦{plan.cost.toLocaleString()}</span>
                        <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">/ Lifetime</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      {plan.perks.map((perk, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <CheckCircle2 size={10} className="text-blue-600" />
                          </div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpgradeWithBalance(plan)}
                    disabled={!!loading || profile?.plan === plan.id || isAdmin}
                    className={`w-full mt-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
                      profile?.plan === plan.id || isAdmin
                        ? 'bg-slate-50 text-slate-400 cursor-default border border-slate-100'
                        : 'bg-slate-950 text-white hover:bg-blue-600 active:scale-[0.98] shadow-lg shadow-slate-900/10'
                    }`}
                  >
                    {loading === plan.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (profile?.plan === plan.id || isAdmin) ? (
                      'Unlocked (Admin)'
                    ) : (
                      <>
                        <span>Activate Now</span>
                        <ArrowRight size={14} className="group-hover/sub:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <DepositTab />
        )}

        {/* Strategic Footer Grid alignment */}
        <div className="bg-slate-950 bg-[#020617] rounded-2xl p-6 text-center border border-white/5 relative overflow-hidden shadow-2xl mt-4" style={{ backgroundColor: '#020617' }}>
          <div className="absolute inset-0 bg-linear-to-b from-blue-600/5 to-transparent pointer-events-none" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em] relative z-10 leading-relaxed max-w-sm mx-auto">
            All upgrade payments are instantly executed via secure gateway. Multipliers are applied across all network tasks immediately upon tier activation.
          </p>
        </div>
      </div>
    </Layout>
  );
}

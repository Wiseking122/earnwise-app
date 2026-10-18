import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PLANS, PlanDetails } from '../constants/plans';
import { db } from '../lib/firebase';
import { getApiUrl } from '../lib/config';
import { doc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Zap, 
  CheckCircle2, 
  Crown, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  Wallet
} from 'lucide-react';
import DepositTab from './DepositTab';

export default function UpgradeTabContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'deposit'>('plans');

  const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';

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
      const response = await axios.post(getApiUrl('/api/paystack/verify-upgrade'), {
        reference: `WALLET_${Date.now()}`,
        userId: profile.uid,
        planId: plan.id,
        amount: plan.cost,
        isBalancePayment: true
      });

      if (response.data.status === "success") {
        if (response.data.useClientFallback) {
          console.warn("[PAYMENT] Server upgrade write denied. Engaging Client SDK fallback execution...");
          
          const userRef = doc(db, 'users', profile.uid);
          
          await updateDoc(userRef, {
            plan: plan.id,
            subscriptionTier: 'premium',
            balance: increment(-plan.cost),
            withdrawableBalance: increment(-plan.cost),
            updatedAt: serverTimestamp()
          });

          const upgradeBonusKey = `hasReceivedUpgradeBonus_${plan.id}`;
          if (profile.referredBy && !(profile as any)[upgradeBonusKey]) {
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

                  await addDoc(collection(db, 'transactions'), {
                    userId: referrerDoc.id,
                    amount: bonusAmount,
                    type: 'referral',
                    status: 'completed',
                    description: `30% Referral upgrade commission for ${profile.displayName || profile.username || 'Friend'}'s upgrade to ${plan.id.toUpperCase()}`,
                    createdAt: serverTimestamp(),
                    reference: `REF_UPGRADE_${profile.uid}_${plan.id}_${Date.now()}`
                  });

                  await addDoc(collection(db, 'notifications'), {
                    userId: referrerDoc.id,
                    title: '🎁 Referral Upgrade Commission!',
                    message: `Your friend (${profile.displayName || profile.username || 'Someone'}) upgraded to ${plan.id}! You have received a 30% commission of ₦${bonusAmount}.`,
                    type: 'reward',
                    createdAt: serverTimestamp(),
                    readBy: []
                  });

                  await updateDoc(userRef, {
                    [upgradeBonusKey]: true,
                    hasReceivedReferralBonus: true
                  });
                }
              } catch (refErr) {
                console.error("[REFERRAL_FALLBACK] Failed to award referral bonus:", refErr);
              }
            }
          }

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

  if (authLoading) {
    return <div className="p-8 text-center text-slate-400">Loading subscription tiers...</div>;
  }

  return (
    <div className="space-y-6">
      {reason === 'plan_required' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 relative z-10"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Account Activation Required</h3>
            <p className="text-blue-200 text-[11px]">To access tasks, academy, and premium features, please activate a plan below.</p>
          </div>
        </motion.div>
      )}
      
      {/* Header Banner */}
      <div className="text-center pt-2 space-y-2">
        <motion.div 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm mb-2">
            <Sparkles size={11} className="text-amber-400" />
            High-Yield Tiers
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tighter leading-none italic uppercase">
            Upgrade <span className="text-amber-400">Membership</span>
          </h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5">
            Boost task earnings, limits, and unlock instant withdrawals
          </p>
        </motion.div>
      </div>

      {/* Subtab Switcher: Plans vs Deposit */}
      <div className="flex bg-slate-900/90 backdrop-blur-xl p-1 rounded-xl border border-white/10">
        <button 
          onClick={() => setActiveTab('plans')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'plans' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Crown size={14} className={activeTab === 'plans' ? 'fill-white' : ''} />
          Subscription Plans
        </button>
        <button 
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'deposit' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
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
                className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-center gap-3 text-emerald-300 shadow-md"
              >
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                <p className="text-xs font-black uppercase tracking-tight">{success}</p>
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex items-center gap-3 text-rose-300 shadow-md"
              >
                <AlertCircle size={18} className="shrink-0 text-rose-400" />
                <p className="text-xs font-black uppercase tracking-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Plan Bento Card */}
          <div className="bg-slate-950 rounded-2xl p-5 text-white relative overflow-hidden shadow-2xl border border-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-16 -mt-16 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37, 99, 245, 0.2) 0%, transparent 70%)' }} />
            
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Account Ranking</p>
                <h3 className="text-xl sm:text-2xl font-display font-black capitalize italic flex items-center gap-2">
                  {isAdmin ? "Admin Elite" : `${profile?.plan || 'Free'} Tier`}
                  {(profile?.plan !== 'free' || isAdmin) && <ShieldCheck className="text-amber-400" size={22} />}
                </h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Global Task Multiplier: {isAdmin ? "10.0" : (PLANS.find(p => p.id === profile?.plan)?.multiplier || 1.0)}x {isAdmin && "(Free Admin Access)"}
                </p>
              </div>
              
              <div className="p-3 bg-white/10 border border-white/10 rounded-2xl shrink-0">
                <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <Crown size={22} className="text-slate-950 fill-slate-950" />
                </div>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            {PLANS.filter(p => p.id !== 'free').map((plan) => (
              <motion.div 
                key={plan.id}
                whileHover={{ y: -3 }}
                className={`relative bg-slate-950 border rounded-2xl p-5 transition-all duration-300 group flex flex-col justify-between ${
                  profile?.plan === plan.id 
                    ? 'border-amber-400/80 shadow-2xl bg-amber-500/5' 
                    : 'border-white/10 hover:border-blue-500/50 hover:shadow-xl'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className={`w-11 h-11 ${plan.color} rounded-xl flex items-center justify-center text-white shadow-lg relative`}>
                      <Zap size={18} className="relative z-10" />
                      <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    {profile?.plan === plan.id && (
                      <div className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-md flex items-center gap-1">
                        <Crown size={10} className="fill-slate-950" />
                        Active Tier
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg font-display font-black text-white tracking-tight uppercase italic">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-amber-400 font-display font-black text-2xl tracking-tighter">₦{plan.cost.toLocaleString()}</span>
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">/ Lifetime</span>
                    </div>

                    {/* Earnings Summary Bento Badge */}
                    <div className="mt-3 grid grid-cols-2 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <div className="text-left">
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Daily Limit</div>
                        <div className="text-xs font-black text-white">{plan.dailyLimit}</div>
                      </div>
                      <div className="text-left border-l border-white/10 pl-2.5">
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Cap</div>
                        <div className="text-xs font-black text-blue-400">{plan.maxEarnings}</div>
                      </div>
                    </div>

                    {plan.description && (
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-2.5 text-left bg-white/5 p-2 rounded-xl border border-white/5">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-white/10">
                    {plan.perks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                          <CheckCircle2 size={10} className="text-emerald-400" />
                        </div>
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-tight">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleUpgradeWithBalance(plan)}
                  disabled={!!loading || profile?.plan === plan.id || isAdmin}
                  className={`w-full mt-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
                    profile?.plan === plan.id || isAdmin
                      ? 'bg-white/5 text-slate-500 cursor-default border border-white/5'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-amber-500/20'
                  }`}
                >
                  {loading === plan.id ? (
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (profile?.plan === plan.id || isAdmin) ? (
                    'Unlocked'
                  ) : (
                    <>
                      <span>Activate Now</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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

      {/* Strategic Footer Notice */}
      <div className="bg-slate-950 rounded-2xl p-5 text-center border border-white/5 relative overflow-hidden shadow-xl">
        <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-[0.2em] relative z-10 leading-relaxed max-w-sm mx-auto">
          All tier activations apply instant multipliers across tasks, automated priority validation, and daily earnings ceilings.
        </p>
      </div>
    </div>
  );
}

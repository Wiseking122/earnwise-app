import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowLeft, 
  ChevronRight, 
  ShieldCheck, 
  Zap,
  AlertCircle,
  CreditCard,
  History,
  CheckCircle
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

export default function Deposit() {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');

  const paystackPublicKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY;

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (reference && user?.uid && verifyStatus === 'idle') {
      verifyDeposit(reference, searchParams.get('amount'));
    }
  }, [searchParams, user, verifyStatus]);

  const verifyDeposit = async (ref: string, amountOverride?: string | null) => {
    setVerifyStatus('verifying');
    setLoading(true);
    try {
      const response = await axios.post('/api/paystack/verify-deposit', {
        reference: ref,
        userId: user?.uid,
        amount: amountOverride || amount
      });
      if (response.data.status === 'success') {
        let depositAmt = response.data.amount || Number(amountOverride) || Number(amount) || 500;
        
        // Anti-conversion multiplier safety guard
        if (depositAmt >= 100000 && !ref.startsWith('SIM_PAY_')) {
          console.warn("[PAYMENT] Extremely large deposit amount detected. Applying Kobo-to-Naira conversion as safeguard.", depositAmt);
          depositAmt = depositAmt / 100;
        }

        if (response.data.useClientFallback) {
          console.warn("[PAYMENT] Server deposit write denied. Engaging Client SDK fallback execution...");
          
          if (user?.uid) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              balance: increment(depositAmt),
              withdrawableBalance: increment(depositAmt),
              depositBalance: increment(depositAmt),
              updatedAt: serverTimestamp()
            });

            const transactionId = `DEP_TX_${Date.now()}`;
            const transRef = doc(db, 'transactions', transactionId);
            await setDoc(transRef, {
              userId: user.uid,
              amount: depositAmt,
              type: 'bonus',
              description: `Wallet Deposit (Verified: ${ref})`,
              createdAt: serverTimestamp(),
              reference: ref
            });

            const notificationId = `DEP_NOTIF_${Date.now()}`;
            await setDoc(doc(db, 'notifications', notificationId), {
              userId: user.uid,
              title: '💰 Deposit Successful!',
              message: `₦${depositAmt.toLocaleString()} has been added to your wallet.`,
              type: 'success',
              createdAt: serverTimestamp(),
              readBy: []
            });
          }
        }
        
        setVerifyStatus('success');
        setTimeout(() => {
          navigate(`/earnings?deposit_success=true&amount=${depositAmt}`);
        }, 2500);
      } else {
        setVerifyStatus('failed');
        setError("Verification failed. Please contact support.");
      }
    } catch (err) {
      console.error(err);
      setVerifyStatus('failed');
      setError("Failed to verify transaction. It might still be processing.");
    } finally {
      setLoading(false);
    }
  };

  const onSuccess = (reference: any) => {
    verifyDeposit(reference.reference, amount);
  };

  const onClose = () => {
    setLoading(false);
  };

  const amounts = [1000, 2000, 5000, 10000, 25000, 50000];

  useEffect(() => {
    // Pre-load Paystack script
    if (typeof (window as any).PaystackPop === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleDeposit = () => {
    if (!user?.uid || !user?.email) {
      setError("Please log in first");
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 500) {
      setError("Minimum deposit is ₦500");
      return;
    }

    if (!paystackPublicKey) {
      setError("Payment gateway not configured. Please contact support.");
      return;
    }

    setLoading(true);
    setError(null);

    const initPaystack = () => {
      if (typeof (window as any).PaystackPop !== 'undefined') {
        const handler = (window as any).PaystackPop.setup({
          key: paystackPublicKey,
          email: user.email,
          amount: Math.floor(numAmount * 100),
          ref: `DEP_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
          callback: (response: any) => {
            verifyDeposit(response.reference, String(numAmount));
          },
          onClose: () => {
            setLoading(false);
          }
        });
        handler.openIframe();
      } else {
        console.warn("Paystack JS not loaded, retrying...");
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => {
          initPaystack();
        };
        script.onerror = () => {
          setLoading(false);
          setError("Failed to load payment gateway. Please check your internet connection and try again.");
        };
        document.head.appendChild(script);
      }
    };

    initPaystack();
  };


  return (
    <Layout title="Capital Deposit">
      <div className="p-3.5 sm:p-5 pb-24 space-y-4 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Cinematic Balance Display */}
        <div className="bg-slate-950 rounded-xl p-4 sm:p-6 text-white relative overflow-hidden shadow-xl group border border-white/5">
          <div className="absolute inset-0 bg-linear-to-br from-blue-600/20 via-transparent to-slate-950 opacity-100" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none -mr-32 -mt-32" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} />
          
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Grade Balance</p>
                <h3 className="text-2xl sm:text-4xl font-display font-black tracking-tighter italic">
                  ₦{(profile?.withdrawableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </h3>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-12 transition-transform shrink-0">
                <Wallet size={16} className="text-blue-500 sm:w-6 sm:h-6" />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-blue-500/30">
                <ShieldCheck size={12} /> Real-time Settlement
              </div>
              {((import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY)?.startsWith('pk_test') && (
                <div className="flex items-center gap-2 bg-amber-600/20 text-amber-400 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-amber-500/30">
                  Dev Environment
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verified Verification State */}
        <AnimatePresence>
          {verifyStatus === 'verifying' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-950 rounded-xl p-6 sm:p-10 text-center relative overflow-hidden border border-blue-900 shadow-xl"
            >
              <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-transparent" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center p-2"
              >
                <Zap size={18} className="text-blue-500 animate-pulse" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-display font-black text-white uppercase italic tracking-tighter">Syncing Protocol</h3>
              <p className="text-slate-400 text-[8px] sm:text-[9px] uppercase font-black tracking-[0.2em] mt-1">Confirming network ledger response</p>
            </motion.div>
          )}

          {verifyStatus === 'success' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-500 rounded-xl p-6 sm:p-8 text-white text-center shadow-xl shadow-emerald-900/20 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)' }} />
              <CheckCircle size={36} className="mx-auto mb-4 drop-shadow-2xl" />
              <h3 className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-tighter">Capital Secured</h3>
              <p className="text-emerald-50 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mt-1.5 opacity-80 leading-relaxed">Your global ledger has been updated</p>
              <button 
                onClick={() => {
                  navigate(`/earnings?deposit_success=true&amount=${amount}`);
                }}
                className="mt-6 bg-slate-950 text-white px-6 py-2.5 rounded-lg font-black uppercase text-[8px] sm:text-[9px] tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl border border-white/10"
              >
                Go to Wallet
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Transfer Quantum</label>
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <CreditCard size={10} className="text-slate-400" />
                <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Global Gateway</span>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center">
                <span className="text-lg font-display font-black text-slate-400 group-focus-within:text-blue-600 transition-colors">₦</span>
              </div>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="500"
                className="w-full bg-white border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xl sm:text-2xl font-display font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:text-slate-100 placeholder:italic appearance-none shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-1">
            {amounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`py-2.5 rounded-lg font-display font-black text-[11px] sm:text-xs italic tracking-tight transition-all active:scale-90 border-2 ${
                  amount === amt.toString() 
                    ? "bg-slate-950 border-slate-950 text-white shadow-xl" 
                    : "bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:text-slate-900"
                }`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-2.5 text-rose-700 shadow-sm"
            >
              <AlertCircle size={16} />
              <p className="text-xs font-black uppercase tracking-tight">{error}</p>
            </motion.div>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !amount || Number(amount) < 500}
            className={`w-full py-2.5 sm:py-3 rounded-lg font-display font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] italic flex items-center justify-center gap-2.5 transition-all relative overflow-hidden group/btn ${
              loading || !amount || Number(amount) < 500
                ? 'bg-slate-100 text-slate-300 cursor-default border border-slate-200'
                : 'bg-slate-950 text-white hover:bg-blue-600 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={14} className="group-hover/btn:fill-white transition-all" />
                <span>Execute Protocol</span>
                <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform opacity-50" />
              </>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Global Security Bento Cards */}
        <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-100">
           <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 text-blue-600 shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Automated Ledger System</h5>
                  <p className="text-[9px] text-slate-500 font-bold leading-normal mt-1 uppercase tracking-tighter opacity-80">
                    Consensus required for instant wallet realization. Secure node verification active.
                  </p>
                </div>
              </div>
           </div>
           
           <Link to="/transactions" className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group active:scale-95 transition-all shadow-sm hover:border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all duration-500 border border-slate-100 shrink-0">
                  <History size={16} />
                </div>
                <h5 className="text-[11px] font-display font-black text-slate-900 uppercase tracking-tight italic">Protocol History</h5>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-950 group-hover:text-white transition-all">
                <ChevronRight size={14} />
              </div>
           </Link>
        </div>
      </div>
    </Layout>
  );
}

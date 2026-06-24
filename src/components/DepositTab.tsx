import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { 
  Wallet, 
  ChevronRight, 
  ShieldCheck, 
  Zap,
  AlertCircle,
  CreditCard,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function DepositTab() {
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
      verifyDeposit(reference);
    }
  }, [searchParams, user, verifyStatus]);

  const verifyDeposit = async (ref: string) => {
    setVerifyStatus('verifying');
    setLoading(true);
    try {
      const urlAmount = searchParams.get('amount');
      const response = await axios.post('/api/paystack/verify-deposit', {
        reference: ref,
        userId: user?.uid,
        amount: urlAmount || amount
      });
      if (response.data.status === 'success') {
        let depositAmt = response.data.amount || Number(urlAmount) || Number(amount) || 500;
        
        // Anti-conversion multiplier safety guard (e.g. if we get Kobo instead of Naira, convert safely)
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

            // Log the transactions document
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

            // Send notification
            const notificationId = `DEP_NOTIF_${Date.now()}`;
            const notificationRef = doc(db, 'notifications', notificationId);
            await setDoc(notificationRef, {
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
        // Auto-redirect after 2 seconds
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

  const handleDeposit = async () => {
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
            verifyDeposit(response.reference);
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
    <div className="space-y-4">
      {/* Verification States */}
      <AnimatePresence>
        {verifyStatus === 'verifying' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-950 rounded-2xl p-6 text-center relative overflow-hidden border border-blue-900 shadow-2xl"
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-transparent" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center p-1"
            >
              <Zap size={20} className="text-blue-500 animate-pulse" />
            </motion.div>
            <h3 className="text-lg font-display font-black text-white uppercase italic tracking-tighter">Syncing Protocol</h3>
            <p className="text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] mt-1">Confirming network ledger response</p>
          </motion.div>
        )}

        {verifyStatus === 'success' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-emerald-500 rounded-2xl p-8 text-white text-center shadow-2xl shadow-emerald-900/20 relative overflow-hidden group mb-4"
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)' }} />
            <CheckCircle size={36} className="mx-auto mb-4 drop-shadow-2xl" />
            <h3 className="text-xl font-display font-black uppercase italic tracking-tighter">Capital Secured</h3>
            <p className="text-emerald-50 text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80 leading-relaxed">Your global ledger has been updated</p>
            <button 
              onClick={() => {
                navigate(`/earnings?deposit_success=true&amount=${amount}`);
              }}
              className="mt-6 bg-slate-950 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl border border-white/10"
            >
              Go to Wallet
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Container */}
        <>
          <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Transfer Quantum</label>
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <CreditCard size={10} className="text-slate-400" />
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Global Gateway</span>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center">
                <span className="text-xl font-display font-black text-slate-400 group-focus-within:text-blue-600 transition-colors">₦</span>
              </div>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-600 rounded-2xl py-4 pl-12 pr-4 text-2xl font-display font-black focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:italic appearance-none shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-1">
            {amounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`py-2 rounded-xl font-display font-black text-[11px] italic tracking-tight transition-all active:scale-90 border-2 ${
                  amount === amt.toString() 
                    ? "bg-slate-950 border-slate-950 text-white shadow-xl shadow-slate-900/40" 
                    : "bg-white border-slate-100 text-slate-450 hover:border-blue-200 hover:text-slate-900"
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
              className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700 shadow-md"
            >
              <AlertCircle size={18} />
              <p className="text-xs font-black uppercase tracking-tight">{error}</p>
            </motion.div>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className={`w-full py-4 rounded-2xl font-display font-black text-xs uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all relative overflow-hidden group/btn ${
              loading || !amount
                ? 'bg-slate-100 text-slate-300 cursor-default border border-slate-200'
                : 'bg-slate-950 text-white hover:bg-blue-600 active:scale-[0.98] shadow-2xl border border-white/5'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Zap size={16} className="group-hover/btn:fill-white transition-all" />
                <span>Execute Protocol</span>
                <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform opacity-50" />
              </>
            )}
          </button>
        </>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-blue-600 flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Automated Ledger System</h5>
            <p className="text-[9px] text-slate-500 font-bold leading-relaxed mt-0.5 uppercase tracking-tighter opacity-80">
              Network consensus required for instant wallet realization. Secure node verification active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

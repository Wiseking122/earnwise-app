import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Users } from 'lucide-react';
import { Logo } from '../components/Logo';
import axios from 'axios';
import { safeStorage } from '../lib/storage';

export default function Welcome() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  // Compute if they landed with a referral code
  const referralCodeFromUrl = searchParams.get('ref');
  const referralCodeFromStorage = safeStorage.getItem('referralCode');
  const hasReferralOrigin = !!(referralCodeFromUrl || referralCodeFromStorage);

  // Pre-fill, select Create Account tab, and permanently lock referral code if referral exists
  useEffect(() => {
    const code = referralCodeFromUrl || referralCodeFromStorage;
    if (code) {
      setReferralCodeInput(code);
      setIsLogin(false);
      safeStorage.setItem('referralCode', code);
    }
  }, [referralCodeFromUrl, referralCodeFromStorage]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          await handleUserDoc(result.user);
          navigate('/');
        }
      } catch (err: any) {
        console.error("Redirect auth error:", err);
        if (err.code === 'auth/account-exists-with-different-credential') {
            setError("An account already exists with the same email. Please sign in using your original method.");
        } else if (err.code === 'auth/unauthorized-domain') {
            setError(`Unauthorized Domain: Please add "${window.location.hostname}" to Authorized Domains in your Firebase Console (Authentication > Settings).`);
        } else {
            setError(err.message);
        }
      } finally {
        setCheckingRedirect(false);
      }
    };
    handleRedirectResult();
  }, [navigate]);

  const handleUserDoc = async (user: any, extraData?: { firstName: string, lastName: string, phoneNumber: string, referralCode?: string }) => {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const isTargetAdmin = user.email === 'wiseking7890@gmail.com';
        
        if (!userDoc.exists()) {
          const referralCodeFromUrl = searchParams.get('ref');
          const referralCodeFromStorage = safeStorage.getItem('referralCode');
          const finalReferralCode = referralCodeFromUrl || referralCodeFromStorage || extraData?.referralCode;
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: (extraData ? `${extraData.firstName} ${extraData.lastName}`.trim() : user.displayName) || user.email?.split('@')[0],
            firstName: extraData?.firstName || user.displayName?.split(' ')[0] || '',
            lastName: extraData?.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
            phoneNumber: extraData?.phoneNumber || user.phoneNumber || '',
            role: isTargetAdmin ? 'admin' : 'user',
            balance: 0,
            pendingBalance: 0,
            withdrawableBalance: 0,
            taskEarnings: 0,
            referralEarnings: 0,
            bonusEarnings: 0,
            vaultBalance: 0,
            xp: 0,
            level: 1,
            streak: 0,
            badges: ['Rookie'],
            plan: 'free',
            subscriptionTier: 'free',
            referralCode,
            referredBy: finalReferralCode || null,
            createdAt: serverTimestamp()
          };

          await setDoc(userDocRef, userData, { merge: true });
          
          safeStorage.removeItem('referralCode');

          // Send Welcome Email for new user
          await axios.post('/api/auth/send-welcome-email', { 
            email: user.email, 
            name: userData.displayName
          }).catch(err => console.error("Failed to send welcome email", err));
        } else if (isTargetAdmin && userDoc.data()?.role !== 'admin') {
          // Force admin role for the owner if they exist but aren't admin
          await setDoc(userDocRef, { role: 'admin' }, { merge: true });
          console.log("Forced admin role for owner");
        }
    } catch (dbErr) {
        console.error("Firestore creation error:", dbErr);
        handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile
        try {
          await handleUserDoc(user, { firstName, lastName, phoneNumber, referralCode: referralCodeInput });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      navigate('/');
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please create an account.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is disabled in this project. Please use the "Continue with Google" button below.');
        // Auto-switch to a more prominent Google UI if we detect it's disabled
        setIsLogin(true); 
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTelegram = !!(window as any).Telegram?.WebApp;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // In some environments (Telegram, restricted iframes), popups are blocked.
      // We try popup first, but if it fails with specific codes, we inform the user.
      try {
        const { user } = await signInWithPopup(auth, provider);
        await handleUserDoc(user);
        navigate('/');
      } catch (popupErr: any) {
        console.warn("Popup sign-in failed, checking fallback:", popupErr);
        
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          // If we are in an environment where popups are notoriously difficult (like Telegram), 
          // we should probably warn the user rather than just redirecting, 
          // but signInWithRedirect is the standard fallback.
          if (isTelegram) {
            setError('Sign-in blocked by Telegram. Please tap the (⋮) menu and "Open in Browser" to sign in with Google, or use Email & Password below.');
          } else {
            await signInWithRedirect(auth, provider);
          }
        } else if (popupErr.code === 'auth/account-exists-with-different-credential') {
          setError("An account already exists with the same email. Please sign in using your original method.");
        } else {
          throw popupErr;
        }
      }
      } catch (err: any) {
      console.error("Google Sign-in error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain "${window.location.hostname}" is not authorized for Google Sign-in. Please add it to "Authorized domains" in your Firebase Console (Authentication > Settings).`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 items-center justify-center relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 rounded-full pointer-events-none animate-pulse" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full pointer-events-none animate-pulse delay-700" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }} />

      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-8 relative z-10"
      >
        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100 shadow-blue-50">
          <Logo size={64} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3 text-slate-900">Earnwise</h1>
        <p className="text-slate-500 font-bold tracking-wide text-base sm:text-lg">Your Gateway to Digital Wealth</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-gray-900 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border border-white/50 relative z-10"
      >
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-2">
            <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest border border-blue-100">
              ⚡️ Secure Access Gateway
            </span>
            <p className="text-xs text-slate-500 font-bold max-w-[280px] mx-auto pt-1 leading-relaxed">
              Earnwise utilizes Google OAuth or Credentials for maximum security.
            </p>
          </div>

          <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-[1.5rem] ring-1 ring-slate-200">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-black transition-all transform duration-300 ${isLogin ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-blue-600 scale-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-black transition-all transform duration-300 ${!isLogin ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-blue-600 scale-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="First Name"
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 px-5 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Last Name"
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 px-5 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              )}
              {!isLogin && (
                <input 
                  type="tel" 
                  placeholder="+234 800 000 0000"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 px-5 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              )}
              <div className="space-y-1 relative">
                <input 
                  type="email" 
                  placeholder="Email Address"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 px-5 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1 relative">
                <input 
                  type="password" 
                  placeholder="Password"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 px-5 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {!isLogin && (
                <input 
                  type="text" 
                  placeholder="Referral Code (Optional)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] py-4 px-5 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase().trim())}
                />
              )}
              
              <button 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
          </form>

          <div className="relative my-4 text-center">
            <span className="bg-white px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">or</span>
          </div>

          <button 
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-[1.5rem] shadow-[0_12px_24px_-8px_rgba(59,130,246,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Google" />
            <span className="text-base">Continue with Google</span>
          </button>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 text-red-600 text-xs p-4 rounded-xl font-bold flex items-center gap-2 border border-red-100"
              >
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-50 text-emerald-600 text-xs p-4 rounded-xl font-bold flex items-center gap-2 border border-emerald-100"
              >
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Community Links */}
        <div className="mt-8 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[.2em] text-center mb-1">Official Channels</p>
          <div className="grid grid-cols-3 gap-2">
            <a 
              href="https://t.me/Earnwise01" 
              target="_blank" 
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#0088cc]/5 hover:bg-[#0088cc]/10 border border-[#0088cc]/10 py-2.5 rounded-2xl transition-all group"
            >
              <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" className="w-4 h-4 opacity-80" alt="Telegram" />
              <span className="text-[9px] font-black text-[#0088cc]/80 uppercase tracking-tighter">Channel</span>
            </a>
            <a 
              href="https://t.me/earnwise0" 
              target="_blank" 
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/20 py-2.5 rounded-2xl transition-all group shadow-sm"
            >
              <Users size={16} className="text-[#0088cc]" />
              <span className="text-[9px] font-black text-[#0088cc] uppercase tracking-tighter">Group</span>
            </a>
            <a 
              href="https://chat.whatsapp.com/FvzXNEVSAUxLL06YOoLSWo" 
              target="_blank" 
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#25D366]/5 hover:bg-[#25D366]/10 border border-[#25D366]/10 py-2.5 rounded-2xl transition-all"
            >
              <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" className="w-4 h-4 opacity-80" alt="WhatsApp" />
              <span className="text-[9px] font-black text-[#25D366]/80 uppercase tracking-tighter">WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden ring-1 ring-slate-100">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} alt="User" />
                    </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] font-black text-white ring-1 ring-blue-100">+50k</div>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trusted by 50,000+ Nigerian Earners</p>
            
            <div className="flex gap-4 pt-4 border-t border-slate-100 w-full justify-center">
              <button 
                onClick={() => navigate('/outline')} 
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full"
              >
                Earnings Outline
              </button>
              <button onClick={() => navigate('/privacy')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">Privacy</button>
              <button onClick={() => navigate('/terms')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">Terms</button>
              <button onClick={() => navigate('/support')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">Support</button>
            </div>
        </div>
      </motion.div>
    </div>
  );
}

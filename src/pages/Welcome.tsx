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
import { setDoc, doc, getDoc, serverTimestamp, query, collection, where, limit, getDocs, updateDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Users, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import axios from 'axios';
import { safeStorage } from '../lib/storage';

export default function Welcome() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [authNetworkError, setAuthNetworkError] = useState(false);
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
        if (err.message === "auth/telegram-duplicate") {
            setError("Account already exists for this Telegram profile.");
        } else if (err.code === 'auth/account-exists-with-different-credential') {
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

  const checkTelegramIdDuplicate = async (tgId: string) => {
    const q = query(collection(db, 'users'), where('telegramId', '==', tgId), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const handleUserDoc = async (user: any, extraData?: { firstName: string, lastName: string, phoneNumber: string, referralCode?: string }) => {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const isTargetAdmin = user.email === 'wiseking7890@gmail.com';
        
        if (!userDoc.exists()) {
          const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
          
          if (telegramId) {
             const duplicate = await checkTelegramIdDuplicate(telegramId);
             if (duplicate) {
                await user.delete();
                throw new Error("auth/telegram-duplicate");
             }
          }

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
            taskBalance: 0,
            referralBalance: 0,
            telegramId: telegramId,
            pendingBalance: 0,
            withdrawableBalance: 0,
            depositBalance: 0,
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
            totalReferrals: 0,
            hasReceivedReferralBonus: false,
            createdAt: serverTimestamp()
          };

          await setDoc(userDocRef, userData, { merge: true });

          // Increment Referral Count for Referrer
          if (finalReferralCode) {
            try {
              const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', finalReferralCode), limit(1));
              const referrerSnap = await getDocs(referrerQuery);
              if (!referrerSnap.empty) {
                const referrerDoc = referrerSnap.docs[0];
                await updateDoc(referrerDoc.ref, {
                  totalReferrals: increment(1)
                });
              }
            } catch (err) {
              console.error("Failed to increment referral count:", err);
            }
          }

          
          safeStorage.removeItem('referralCode');

          // Send Welcome Email for new user
          await axios.post(getApiUrl('/api/auth/send-welcome-email'), { 
            email: user.email, 
            name: userData.displayName
          }).catch(err => console.error("Failed to send welcome email", err));
        } else if (isTargetAdmin && userDoc.data()?.role !== 'admin') {
          // Force admin role for the owner if they exist but aren't admin
          await setDoc(userDocRef, { role: 'admin' }, { merge: true });
          console.log("Forced admin role for owner");
        }
    } catch (dbErr: any) {
        console.error("Firestore creation error:", dbErr);
        if (dbErr.message === "auth/telegram-duplicate") {
            throw dbErr;
        }
        handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAuthNetworkError(false);
    setMessage('');

    try {
      if (isLogin) {
        // Hybrid Login Logic: Check if input is a User ID (no @) or an Email
        if (email.trim() && !email.includes('@')) {
          await signInWithUserId(email.trim());
          navigate('/');
          return;
        }
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile
        try {
          await handleUserDoc(user, { firstName, lastName, phoneNumber, referralCode: referralCodeInput });
        } catch (dbErr: any) {
          if (dbErr.message === "auth/telegram-duplicate") {
             throw dbErr;
          }
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      navigate('/');
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.message === "auth/telegram-duplicate") {
         setError("Account already exists for this Telegram profile.");
      } else if (err.code === 'auth/invalid-credential') {
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
    setAuthNetworkError(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // In some environments (Telegram, restricted iframes), popups are blocked.
      // We try popup first, but if it fails with specific codes, we inform the user.
      try {
        const { user } = await signInWithPopup(auth, provider);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        // If it's a completely new account, enforce duplicate Telegram ID check here
        if (!userDoc.exists()) {
            const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
            if (telegramId) {
                const isDuplicate = await checkTelegramIdDuplicate(telegramId);
                if (isDuplicate) {
                    await user.delete(); // Rollback account creation
                    auth.signOut();
                    setError("Account already exists for this Telegram profile.");
                    setLoading(false);
                    return;
                }
            }
        }
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
        } else if (popupErr.code === 'auth/network-request-failed' || popupErr.message?.includes('network-request-failed')) {
          setAuthNetworkError(true);
          setError('Google Sign-In failed due to secure iframe/network restrictions. Tap "Troubleshooting Guide" below for immediate steps to fix this.');
        } else {
          throw popupErr;
        }
      }
      } catch (err: any) {
      console.error("Google Sign-in error:", err);
      if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setAuthNetworkError(true);
        setError('Google Sign-In failed due to secure iframe/network restrictions. Tap "Troubleshooting Guide" below for immediate steps to fix this.');
      } else if (err.code === 'auth/operation-not-allowed') {
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
    <div className="min-h-screen bg-transparent flex flex-col p-6 items-center py-10 relative">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)', animation: 'floatElement 8s ease-in-out infinite' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)', animation: 'floatElement 12s ease-in-out infinite reverse' }} />

      <motion.div 
        initial={{ opacity: 0, y: -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, type: "spring", bounce: 0.4 }}
        className="text-center mb-8 relative z-10"
      >
        <motion.div 
          whileHover={{ scale: 1.05, rotate: -5 }}
          className="w-24 h-24 bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-blue-500/20"
        >
          <Logo size={64} />
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3 text-white drop-shadow-md">Earnwise</h1>
        <p className="text-slate-400 font-bold tracking-wide text-base sm:text-lg drop-shadow-sm uppercase text-[11px] tracking-widest">Your Gateway to Digital Wealth</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", bounce: 0.2 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-white shadow-2xl border border-white/10 relative z-10"
      >
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-2">
            <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest border border-blue-500/20 shadow-inner">
              ⚡️ Secure Access Gateway
            </span>
            <p className="text-xs text-slate-400 font-bold max-w-[280px] mx-auto pt-1 leading-relaxed">
              Earnwise utilizes Google OAuth or Credentials for maximum security.
            </p>
          </div>

          <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-[1.5rem] ring-1 ring-white/5 border border-white/5 shadow-inner">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); }}
              className={`flex-1 py-3 px-1 rounded-xl text-xs font-black transition-all transform duration-300 ${isLogin ? 'bg-blue-600 shadow-[0_4px_15px_rgba(37,99,235,0.4)] text-white scale-100' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); }}
              className={`flex-1 py-3 px-1 rounded-xl text-xs font-black transition-all transform duration-300 ${!isLogin ? 'bg-blue-600 shadow-[0_4px_15px_rgba(37,99,235,0.4)] text-white scale-100' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="First Name"
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Last Name"
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
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
                  className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              )}
              <div className="space-y-1 relative">
                <input 
                  type="email" 
                  placeholder="Email Address"
                  required
                  className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1 relative">
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 pr-12 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || !email}
                    className="text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest disabled:opacity-50 mt-1 drop-shadow-sm"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              
              {!isLogin && (
                <input 
                  type="text" 
                  placeholder="Referral Code (Optional)"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase().trim())}
                />
              )}
              
              <button 
                disabled={loading}
                className="w-full bg-white hover:bg-slate-200 text-slate-900 font-black py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
          </form>

          <div className="relative my-4 text-center">
            <span className="bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full relative z-10 border border-white/5 py-1">or</span>
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -z-0"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-[1.5rem] shadow-[0_12px_24px_-8px_rgba(59,130,246,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-blue-400/30"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Google" />
            <span className="text-sm tracking-wide">Continue with Google</span>
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
            {authNetworkError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 text-xs text-slate-300 space-y-3 shadow-lg shrink-0 mt-2 text-left"
              >
                <div className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-wider text-[10px] pb-1 border-b border-white/5">
                  <KeyRound size={14} />
                  <span>Google Sign-In Troubleshooting Guide</span>
                </div>
                
                <p className="leading-relaxed text-[11px]">
                  The AI Studio preview runs inside a highly secure and restricted <strong className="text-white">iframe sandbox</strong>. This can block popups, cross-origin web cookies, and socket handshakes.
                </p>

                <div className="space-y-2 text-[11px]">
                  <div className="flex gap-2 items-start">
                    <span className="bg-blue-500/20 text-blue-300 w-4 h-4 rounded-md flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</span>
                    <p className="leading-normal">
                      <strong className="text-white">Recommended method:</strong> Open this application in a <strong className="text-blue-400 hover:underline cursor-pointer" onClick={() => window.open(window.location.href, '_blank')}>New Tab</strong> using the icon in the top right of the preview toolbar. Running natively in a new window bypasses these browser constraints.
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <span className="bg-blue-500/20 text-blue-300 w-4 h-4 rounded-md flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</span>
                    <p className="leading-normal">
                      <strong className="text-white">Firebase Setup:</strong> Ensure your project's authorization settings allow this container. In your <strong className="text-white">Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong>, make sure you've added:
                      <code className="block bg-slate-950 p-2 rounded-lg font-mono text-[9px] text-amber-300 mt-1 select-all break-all border border-white/5 font-semibold">
                        {window.location.hostname}
                      </code>
                    </p>
                  </div>

                  <div className="flex gap-2 items-start">
                    <span className="bg-blue-500/20 text-blue-300 w-4 h-4 rounded-md flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">3</span>
                    <p className="leading-normal">
                      <strong className="text-white">Alternative:</strong> Create a test user directly inside this iframe using the <strong className="text-white">Email &amp; Password form</strong> above (just select <em>Create Account</em>). This does not rely on third-party redirects and works flawlessly inside sandbox frames.
                    </p>
                  </div>
                </div>
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
          <div className="grid grid-cols-2 gap-2">
            <a 
              href="https://t.me/earnwise0" 
              target="_blank" 
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#0088cc]/5 hover:bg-[#0088cc]/10 border border-[#0088cc]/10 py-2.5 rounded-2xl transition-all group"
            >
              <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" className="w-4 h-4 opacity-80" alt="Telegram" />
              <span className="text-[9px] font-black text-[#0088cc]/80 uppercase tracking-tighter">Channel</span>
            </a>
            <a 
              href="https://t.me/Earnwise01" 
              target="_blank" 
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/20 py-2.5 rounded-2xl transition-all group shadow-sm"
            >
              <Users size={16} className="text-[#0088cc]" />
              <span className="text-[9px] font-black text-[#0088cc] uppercase tracking-tighter">Group</span>
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

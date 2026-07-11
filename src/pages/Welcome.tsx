import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { setDoc, doc, getDoc, serverTimestamp, query, collection, where, limit, getDocs, updateDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Users, Eye, EyeOff, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import axios from 'axios';
import { safeStorage } from '../lib/storage';
import { getOrGenerateDeviceFingerprint } from '../lib/security';

// Helper to execute Firestore queries with a strict timeout
const getDocsWithTimeout = async (q: any, timeoutMs = 3500): Promise<any> => {
  return Promise.race([
    getDocs(q),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs))
  ]);
};

export default function Welcome() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [authNetworkError, setAuthNetworkError] = useState(false);
  const [securityModal, setSecurityModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'device' | 'telegram' | null;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: null
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  // Compute if they landed with a referral code
  const referralCodeFromUrl = searchParams.get('ref')?.toLowerCase().trim();
  const referralCodeFromStorage = safeStorage.getItem('referralCode')?.toLowerCase().trim();
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

  const checkTelegramIdDuplicate = async (tgId: string) => {
    const q = query(collection(db, 'users'), where('telegramId', '==', tgId), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const handleUserDoc = async (user: any, extraData?: { firstName: string, lastName: string, phoneNumber: string, username: string, referralCode?: string }) => {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const isTargetAdmin = user.email?.toLowerCase() === 'wiseking7890@gmail.com';
        const existingData = userDoc.exists() ? userDoc.data() : null;
        
        const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id ? String(telegramUser.id) : (existingData?.telegramId || null);
        
        if (telegramId && !existingData?.telegramId) {
           const duplicate = await checkTelegramIdDuplicate(telegramId);
           if (duplicate) {
              await user.delete();
              throw new Error("auth/telegram-duplicate");
           }
        }

        const referralCodeFromUrl = searchParams.get('ref')?.toLowerCase().trim();
        const referralCodeFromStorage = safeStorage.getItem('referralCode')?.toLowerCase().trim();
        const finalReferralCode = (referralCodeFromUrl || referralCodeFromStorage || extraData?.referralCode)?.toLowerCase().trim();
        
        // Use provided username as both the display identifier and the referral code
        const finalUsername = extraData?.username?.toLowerCase().trim() || existingData?.username || `user_${user.uid.substring(0, 5)}`;

        const userData = {
          uid: user.uid,
          email: user.email,
          username: finalUsername,
          displayName: (extraData ? `${extraData.firstName} ${extraData.lastName}`.trim() : user.displayName) || existingData?.displayName || finalUsername,
          firstName: extraData?.firstName || existingData?.firstName || user.displayName?.split(' ')[0] || '',
          lastName: extraData?.lastName || existingData?.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
          phoneNumber: extraData?.phoneNumber || existingData?.phoneNumber || user.phoneNumber || '',
          role: isTargetAdmin ? 'admin' : (existingData?.role || 'user'),
          balance: existingData?.balance ?? 0,
          taskBalance: existingData?.taskBalance ?? 0,
          referralBalance: existingData?.referralBalance ?? 0,
          telegramId: telegramId,
          deviceFingerprint: existingData?.deviceFingerprint || getOrGenerateDeviceFingerprint(),
          registeredDeviceFingerprint: existingData?.registeredDeviceFingerprint || getOrGenerateDeviceFingerprint(),
          registeredDeviceId: existingData?.registeredDeviceId || getOrGenerateDeviceFingerprint(),
          pendingBalance: existingData?.pendingBalance ?? 0,
          withdrawableBalance: existingData?.withdrawableBalance ?? 0,
          depositBalance: existingData?.depositBalance ?? 0,
          taskEarnings: existingData?.taskEarnings ?? 0,
          referralEarnings: existingData?.referralEarnings ?? 0,
          bonusEarnings: existingData?.bonusEarnings ?? 0,
          vaultBalance: existingData?.vaultBalance ?? 0,
          xp: existingData?.xp ?? 0,
          level: existingData?.level ?? 1,
          streak: existingData?.streak ?? 0,
          badges: existingData?.badges || ['Rookie'],
          plan: existingData?.plan || 'free',
          subscriptionTier: existingData?.subscriptionTier || 'free',
          referralCode: finalUsername,
          referredBy: existingData?.referredBy || finalReferralCode || null,
          totalReferrals: existingData?.totalReferrals ?? 0,
          hasReceivedReferralBonus: existingData?.hasReceivedReferralBonus ?? false,
          referralCounted: existingData?.referralCounted ?? false,
          createdAt: existingData?.createdAt || serverTimestamp()
        };

        // Increment Referral Count for Referrer if we have a valid referral and this is a new referral for this user
        const shouldIncrement = finalReferralCode && !userData.referralCounted;
        if (shouldIncrement) {
          try {
            let referrerDoc = null;
            let rq = query(collection(db, 'users'), where('referralCode', '==', finalReferralCode), limit(1));
            let rs = await getDocs(rq);
            if (!rs.empty) {
              referrerDoc = rs.docs[0];
            } else {
              rq = query(collection(db, 'users'), where('referralCode', '==', finalReferralCode.toUpperCase()), limit(1));
              rs = await getDocs(rq);
              if (!rs.empty) {
                referrerDoc = rs.docs[0];
              } else {
                rq = query(collection(db, 'users'), where('username', '==', finalReferralCode), limit(1));
                rs = await getDocs(rq);
                if (!rs.empty) {
                  referrerDoc = rs.docs[0];
                } else {
                  rq = query(collection(db, 'users'), where('username', '==', finalReferralCode.toUpperCase()), limit(1));
                  rs = await getDocs(rq);
                  if (!rs.empty) {
                    referrerDoc = rs.docs[0];
                  }
                }
              }
            }

            if (referrerDoc) {
              await updateDoc(referrerDoc.ref, {
                totalReferrals: increment(1)
              });
              userData.referralCounted = true;
              const referrerData = referrerDoc.data();
              userData.referredBy = referrerData.referralCode || referrerData.username || finalReferralCode;
              console.log(`[REFERRAL] Successfully matched referrer and incremented totalReferrals: ${userData.referredBy}`);
            }
          } catch (err) {
            console.error("Failed to increment referral count:", err);
          }
        }

        await setDoc(userDocRef, userData, { merge: true });

        safeStorage.removeItem('referralCode');
        safeStorage.removeItem('isRegistering');

        // Send Welcome Email for new user
        await axios.post(getApiUrl('/api/auth/send-welcome-email'), { 
          email: user.email, 
          name: userData.displayName
        }).catch(err => console.error("Failed to send welcome email", err));
        
        if (isTargetAdmin && userData.role !== 'admin') {
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
        let loginEmail = email.trim();
        
        if (!loginEmail) throw new Error("Please enter your email or username.");
        if (!password) throw new Error("Please enter your password.");

        // If input is a username (no @), look up the associated email in Firestore
        if (!loginEmail.includes('@')) {
          try {
            const q = query(collection(db, 'users'), where('username', '==', loginEmail.toLowerCase().trim()), limit(1));
            const snap = await getDocsWithTimeout(q, 4500);
            
            if (snap.empty) {
              throw new Error("No account found with this username. Please check your spelling or sign up.");
            }
            
            loginEmail = snap.docs[0].data().email;
          } catch (err: any) {
            console.error("Username lookup error:", err);
            if (err.message === "timeout") {
              throw new Error("Connection timed out. Please check your network and try again.");
            }
            throw err;
          }
        }

        // --- NEW ANTI-FRAUD LOGIN VERIFICATION ---
        const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
        const deviceFingerprint = getOrGenerateDeviceFingerprint();

        // Call backend to verify deviceFingerprint and telegramId rules for login
        await axios.post(getApiUrl('/api/auth/login-check'), {
          email: loginEmail,
          deviceFingerprint,
          telegramId
        });

        await signInWithEmailAndPassword(auth, loginEmail, password);

        // --- UPDATE LOGIN TRACKING ---
        try {
          await axios.post(getApiUrl('/api/auth/login'), {
            email: loginEmail,
            deviceFingerprint,
            telegramId
          });
        } catch (trackErr) {
          console.warn("Login tracking failed, but session is active:", trackErr);
        }
      } else {
        if (!username.trim()) throw new Error("Username is required");
        if (!email.trim()) throw new Error("Email is required");
        if (!password) throw new Error("Password is required");
        
        // --- NEW ANTI-FRAUD VERIFICATION ---
        const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
        const deviceFingerprint = getOrGenerateDeviceFingerprint();

        // Check if username is taken
        let usernameTaken = false;
        try {
          const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()), limit(1));
          const usernameSnap = await getDocsWithTimeout(q, 3000);
          if (!usernameSnap.empty) {
            usernameTaken = true;
          }
        } catch (err) {
          console.warn("Client-side username check timed out or failed, falling back to backend check:", err);
        }
        if (usernameTaken) {
          throw new Error("Username is already taken. Please choose another.");
        }

        // 1. Direct client-side Firestore fallback check (fully functional on Vercel without a configured backend)
        let isTelegramDuplicate = false;
        if (telegramId) {
          try {
            const tgQuery = query(collection(db, 'users'), where('telegramId', '==', String(telegramId)), limit(1));
            const tgSnap = await getDocsWithTimeout(tgQuery, 3000);
            if (!tgSnap.empty) {
              isTelegramDuplicate = true;
            }
          } catch (err) {
            console.warn("Client-side telegram check timed out or failed:", err);
          }
        }
        if (isTelegramDuplicate) {
          throw new Error("This Telegram account is already linked to an existing Earnwise profile.");
        }

        let isDeviceLimitReached = false;
        if (deviceFingerprint) {
          try {
            const regQuery = query(collection(db, 'users'), where('registeredDeviceFingerprint', '==', String(deviceFingerprint)), limit(1));
            const regSnap = await getDocsWithTimeout(regQuery, 3000);
            
            let legacySnap = null;
            if (regSnap.empty) {
              const legacyQuery = query(collection(db, 'users'), where('deviceFingerprint', '==', String(deviceFingerprint)), limit(1));
              legacySnap = await getDocsWithTimeout(legacyQuery, 3000);
            }

            if (!regSnap.empty || (legacySnap && !legacySnap.empty)) {
              isDeviceLimitReached = true;
            }
          } catch (err) {
            console.warn("Client-side device fingerprint check timed out or failed:", err);
          }
        }
        if (isDeviceLimitReached) {
          throw new Error("Registration limit reached. Only one Earnwise account can be registered per device.");
        }

        // 2. Call backend as a centralized logging and backup verify
        try {
          await axios.post(getApiUrl('/api/auth/register-check'), {
            deviceFingerprint,
            telegramId,
            username: username.toLowerCase().trim()
          });
        } catch (apiErr: any) {
          const errMsg = apiErr.response?.data?.error || apiErr.response?.data?.message;
          if (errMsg) {
            throw new Error(errMsg);
          }
          // If the backend is offline or not capable, we can proceed because the client-side check above already verified the rules
          console.warn("Backend check skipped or failed, using client-side verification instead.");
        }

        // Set isRegistering flag inside safeStorage BEFORE calling createUserWithEmailAndPassword
        safeStorage.setItem('isRegistering', 'true');

        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
         // Create user profile
        try {
          await handleUserDoc(user, { firstName, lastName, phoneNumber, username, referralCode: referralCodeInput });
          
          // Upon successful registration, permanently cache the token inside localStorage
          localStorage.setItem('earnwise_registration_token', deviceFingerprint);
        } catch (dbErr: any) {
          safeStorage.removeItem('isRegistering');
          if (dbErr.message === "auth/telegram-duplicate" || dbErr.message?.includes("already linked") || dbErr.message?.includes("already exists")) {
             throw dbErr;
          }
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      navigate('/');
    } catch (err: any) {
      safeStorage.removeItem('isRegistering');
      console.error("Auth error:", err);
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      
      if (serverMsg === "auth/telegram-duplicate" || serverMsg?.includes("This Telegram account is already linked") || serverMsg?.includes("Account already exists for this Telegram profile") || serverMsg?.includes("telegram-duplicate")) {
        setSecurityModal({
          isOpen: true,
          title: "Account Already Exists",
          description: "Account already exists for this Telegram profile. Please log in instead to safeguard your progress and earnings.",
          type: 'telegram'
        });
      } else if (serverMsg === "auth/device-limit" || serverMsg?.includes("Registration limit reached") || serverMsg?.includes("Only one Earnwise account can be registered per device")) {
        setSecurityModal({
          isOpen: true,
          title: "Registration Limit Reached",
          description: "To ensure a fair and secure earning ecosystem for all partners, Earnwise enforces a strict limit of one active registration per device. You are welcome to log in to your existing account, or sign in as a friend on this device at any time.",
          type: 'device'
        });
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If you previously used Google Login, you may need to use the "Forgot Password" link to set a password for your email.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please create an account.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else {
        setError(serverMsg || String(err));
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
              Earnwise utilizes high-grade encryption and secure credentials for maximum security.
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
                <div className="space-y-4">
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
                  <input 
                    type="text" 
                    placeholder="Username (Invitation Code)"
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number"
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-[1.25rem] py-4 px-5 text-sm font-semibold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all outline-none"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1 relative">
                <input 
                  type="text" 
                  placeholder={isLogin ? "Email or Username" : "Email Address"}
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
                  onChange={(e) => setReferralCodeInput(e.target.value.toLowerCase().trim())}
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
            <span className="bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full relative z-10 border border-white/5 py-1">Secure Email Access</span>
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -z-0"></div>
          </div>

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

      {/* Custom Security Trust Modal */}
      <AnimatePresence>
        {securityModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSecurityModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Content Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full relative overflow-hidden text-center z-10"
            >
              {/* Top Banner Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

              {/* Icon Container */}
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 mt-2">
                <ShieldAlert size={24} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-2">
                {securityModal.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 px-1">
                {securityModal.description}
              </p>

              {/* Buttons Layout */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                    setIsLogin(true); // Switch to Login screen
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98]"
                >
                  Switch to Sign In
                </button>
                <button
                  onClick={() => setSecurityModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-colors"
                >
                  Dismiss
                </button>
              </div>

              {/* Footer Trust Indicator */}
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-slate-300" />
                <span>Earnwise Identity Protection</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

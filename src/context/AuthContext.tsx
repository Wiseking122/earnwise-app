import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs, increment, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { getApiUrl } from '../lib/config';
import { safeStorage } from '../lib/storage';
import { PLANS } from '../constants/plans';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  accessToken: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setProfile(null);
        setAccessToken(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
      console.log("[AUTH] Received profile update:", docSnap.data());
      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // Self-healing: Ensure primary admin always has admin role and existing users have a referralCode/stats
        const updates: any = {};
        let needsUpdate = false;

        if (user.email === 'wiseking7890@gmail.com' && userData.role !== 'admin') {
          updates.role = 'admin';
          needsUpdate = true;
        }

        if (!userData.referralCode || !userData.username) {
          const finalUsername = userData.username || userData.displayName?.replace(/\s+/g, '').toLowerCase() || `user_${user.uid.substring(0, 5)}`;
          updates.username = finalUsername;
          updates.referralCode = finalUsername;
          needsUpdate = true;
        }

        if (userData.totalReferrals === undefined) {
          updates.totalReferrals = 0;
          needsUpdate = true;
        }

        if (userData.referralEarnings === undefined) {
          updates.referralEarnings = 0;
          needsUpdate = true;
        }

        // Self-heal: Award the referral upgrade bonus to the referrer if this user is upgraded
        // but the referrer hasn't received the bonus yet.
        if (userData.plan && userData.plan !== 'free' && userData.referredBy && !userData.hasReceivedReferralBonus) {
          const planDetails = PLANS.find(p => p.id === userData.plan);
          const planCost = planDetails?.cost || 0;
          const bonusAmount = Math.floor(planCost * 0.3);
          
          if (bonusAmount > 0) {
            console.log(`[REFERRAL_HEAL] Attempting to award missed referral bonus of ₦${bonusAmount} to referrer ${userData.referredBy}`);
            try {
              const refVariants = Array.from(new Set([
                userData.referredBy,
                userData.referredBy.toLowerCase(),
                userData.referredBy.toUpperCase()
              ].filter(Boolean) as string[]));
              
              let referrerSnap = await getDocs(query(collection(db, 'users'), where('referralCode', 'in', refVariants), limit(1)));
              if (referrerSnap.empty) {
                referrerSnap = await getDocs(query(collection(db, 'users'), where('username', 'in', refVariants), limit(1)));
              }
              
              if (!referrerSnap.empty) {
                const referrerDoc = referrerSnap.docs[0];
                
                // Atomically increment the referrer's balance using Firestore increment
                await updateDoc(referrerDoc.ref, {
                  balance: increment(bonusAmount),
                  referralBalance: increment(bonusAmount),
                  withdrawableBalance: increment(bonusAmount),
                  referralEarnings: increment(bonusAmount),
                  updatedAt: serverTimestamp()
                });
                
                // Create a notification for the referrer
                await addDoc(collection(db, 'notifications'), {
                  userId: referrerDoc.id,
                  title: '🎁 Referral Upgrade Commission!',
                  message: `Your friend (${userData.displayName || userData.username}) upgraded to ${userData.plan}! You have received a 30% commission of ₦${bonusAmount}.`,
                  type: 'reward',
                  createdAt: serverTimestamp(),
                  readBy: []
                });
                
                updates.hasReceivedReferralBonus = true;
                needsUpdate = true;
                console.log(`[REFERRAL_HEAL] Successfully awarded referral bonus to referrer ${userData.referredBy}`);
              }
            } catch (err) {
              console.error("[REFERRAL_HEAL] Failed to self-heal referral bonus:", err);
            }
          }
        }

        if (needsUpdate) {
          try {
            await updateDoc(userDocRef, updates);
          } catch (err) {
            console.error("Profile self-healing update error:", err);
          }
        }

        const finalReferralCode = userData.referralCode || updates.referralCode || Math.random().toString(36).substring(2, 8).toLowerCase();

        setProfile({
          id: docSnap.id,
          uid: docSnap.id,
          ...userData,
          referralCode: finalReferralCode,
          totalReferrals: userData.totalReferrals !== undefined ? userData.totalReferrals : 0,
          referralEarnings: userData.referralEarnings !== undefined ? userData.referralEarnings : 0
        } as any);

        setLoading(false);
      } else {
        // If we are currently in the middle of a registration flow (where the signup page is actively creating the user doc),
        // we MUST NOT write a fallback profile. Writing a fallback profile would race with the signup page,
        // overwriting the custom username/referralCode with a generic 'user_abc12' fallback.
        if (safeStorage.getItem('isRegistering') === 'true') {
          console.log("[AUTH] Registration in progress. Skipping fallback profile auto-creation.");
          return;
        }

        // Double-check the server directly to verify if the profile document exists,
        // avoiding local cache sync lags or initial listener ticks from overwriting real server data.
        try {
          const directSnap = await getDoc(userDocRef);
          if (directSnap.exists()) {
            const serverData = directSnap.data();
            const finalReferralCode = serverData.referralCode || serverData.username || Math.random().toString(36).substring(2, 8).toLowerCase();
            setProfile({
              id: directSnap.id,
              uid: directSnap.id,
              ...serverData,
              referralCode: finalReferralCode,
              totalReferrals: serverData.totalReferrals !== undefined ? serverData.totalReferrals : 0,
              referralEarnings: serverData.referralEarnings !== undefined ? serverData.referralEarnings : 0
            } as any);
            setLoading(false);
            return;
          }
        } catch (serverErr: any) {
          const errMsg = serverErr?.message || String(serverErr);
          if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('could not reach') || errMsg.toLowerCase().includes('network')) {
            console.warn("[AUTH] Firestore client is offline. Guarding user balance and suspending profile initialization until connection is restored:", errMsg);
          } else {
            console.warn("[AUTH] Server verification check suspended during connectivity shift:", errMsg);
          }
          // CRITICAL: If we are offline or unable to reach the server, do NOT proceed to write a fallback profile.
          // Doing so would overwrite the real server document with a blank profile (clearing user balance to 0).
          // We abort and wait for the connection to recover.
          return;
        }

        // If the user's document really does not exist on the server, auto-create it immediately for self-healing
        const finalUsername = user.displayName?.replace(/\s+/g, '').toLowerCase() || `user_${user.uid.substring(0, 5)}`;
        const referralCodeFromStorage = safeStorage.getItem('referralCode')?.toLowerCase().trim() || null;
        const fallbackProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          username: finalUsername,
          referralCode: finalUsername,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          phoneNumber: user.phoneNumber || '',
          role: user.email === 'wiseking7890@gmail.com' ? 'admin' : 'user',
          balance: 0,
          taskBalance: 0,
          referralBalance: 0,
          telegramId: null,
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
          dailyEmailEnabled: true,
          dailyPushEnabled: true,
          referredBy: referralCodeFromStorage,
          totalReferrals: 0,
          hasReceivedReferralBonus: false,
          referralCounted: false,
          createdAt: serverTimestamp()
        };

        if (referralCodeFromStorage) {
          try {
            let referrerDoc = null;
            let rq = query(collection(db, 'users'), where('referralCode', '==', referralCodeFromStorage), limit(1));
            let rs = await getDocs(rq);
            if (!rs.empty) {
              referrerDoc = rs.docs[0];
            } else {
              rq = query(collection(db, 'users'), where('referralCode', '==', referralCodeFromStorage.toUpperCase()), limit(1));
              rs = await getDocs(rq);
              if (!rs.empty) {
                referrerDoc = rs.docs[0];
              } else {
                rq = query(collection(db, 'users'), where('username', '==', referralCodeFromStorage), limit(1));
                rs = await getDocs(rq);
                if (!rs.empty) {
                  referrerDoc = rs.docs[0];
                } else {
                  rq = query(collection(db, 'users'), where('username', '==', referralCodeFromStorage.toUpperCase()), limit(1));
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
              fallbackProfile.referralCounted = true;
              const referrerData = referrerDoc.data();
              fallbackProfile.referredBy = referrerData.referralCode || referrerData.username || referralCodeFromStorage;
              console.log(`[REFERRAL_AUTH] Successfully matched referrer and incremented totalReferrals: ${fallbackProfile.referredBy}`);
            }
          } catch (err) {
            console.error("Failed to increment referral count in AuthContext:", err);
          }
        }

        try {
          await setDoc(userDocRef, fallbackProfile, { merge: true });
          setProfile({ id: user.uid, ...fallbackProfile } as any);
          safeStorage.removeItem('referralCode');
        } catch (err) {
          console.error("Failed to auto-create missing profile:", err);
          // Set local state anyway so user has a working session
          setProfile({ id: user.uid, ...fallbackProfile } as any);
        }
        setLoading(false);
      }
    }, (error) => {
      const errMsg = error?.message || String(error);
      if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('could not reach') || errMsg.toLowerCase().includes('network')) {
        console.warn("[AUTH] Profile snapshot listener operating in offline mode:", errMsg);
      } else {
        console.warn("[AUTH] Profile listen notice:", errMsg);
      }
      setLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  // Referrer self-healing: automatically credit missed referral upgrade commissions when the referrer loads their session
  useEffect(() => {
    if (!profile?.referralCode || !profile?.uid) return;
    
    let isCancelled = false;
    
    async function healReferrals() {
      try {
        const variants = Array.from(new Set([
          profile.referralCode,
          profile.referralCode.toLowerCase(),
          profile.referralCode.toUpperCase(),
          profile.username,
          profile.username?.toLowerCase(),
          profile.username?.toUpperCase()
        ].filter(Boolean) as string[]));

        console.log(`[REFERRAL_HEAL] Running referrer self-healing check for code: ${profile.referralCode}...`);
        const q = query(
          collection(db, 'users'),
          where('referredBy', 'in', variants)
        );
        const querySnapshot = await getDocs(q);
        if (isCancelled) return;
        
        for (const docSnap of querySnapshot.docs) {
          const rUser = docSnap.data();
          if (rUser.plan && rUser.plan !== 'free' && !rUser.hasReceivedReferralBonus) {
            const planDetails = PLANS.find(p => p.id === rUser.plan);
            const planCost = planDetails?.cost || 0;
            const bonusAmount = Math.floor(planCost * 0.3);
            
            if (bonusAmount > 0) {
              console.log(`[REFERRAL_HEAL] Found upgraded referral ${docSnap.id} without bonus. Awarding ₦${bonusAmount} to referrer ${profile.uid}`);
              
              // 1. Update referred user first to prevent duplicate bonus processing
              await updateDoc(doc(db, 'users', docSnap.id), {
                hasReceivedReferralBonus: true
              });
              
              // 2. Increment referrer's balances atomically in Firestore
              await updateDoc(doc(db, 'users', profile.uid), {
                balance: increment(bonusAmount),
                referralBalance: increment(bonusAmount),
                withdrawableBalance: increment(bonusAmount),
                referralEarnings: increment(bonusAmount),
                updatedAt: serverTimestamp()
              });
              
              // 3. Append notification log for the referrer
              await addDoc(collection(db, 'notifications'), {
                userId: profile.uid,
                title: '🎁 Referral Upgrade Commission!',
                message: `Your friend (${rUser.displayName || rUser.username || 'Someone'}) upgraded to ${rUser.plan}! You have received a 30% commission of ₦${bonusAmount}.`,
                type: 'reward',
                createdAt: serverTimestamp(),
                readBy: []
              });
            }
          }
        }
      } catch (err) {
        console.error("[REFERRAL_HEAL] Error in referrer self-healing check:", err);
      }
    }
    
    // Check after a short delay to let profile loading stabilize
    const timer = setTimeout(() => {
      healReferrals();
    }, 2000);
    
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [profile?.referralCode, profile?.uid]);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

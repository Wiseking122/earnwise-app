import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { safeStorage } from '../lib/storage';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  accessToken: string | null;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define Google Tasks scope
const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';

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

        if (!userData.referralCode) {
          updates.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
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

        if (needsUpdate) {
          try {
            await updateDoc(userDocRef, updates);
          } catch (err) {
            console.error("Profile self-healing update error:", err);
          }
        }

        const finalReferralCode = userData.referralCode || updates.referralCode || Math.random().toString(36).substring(2, 8).toUpperCase();

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
        // If the user's document does not exist, auto-create it immediately for self-healing
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const fallbackProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
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
          referralCode,
          referredBy: null,
          createdAt: serverTimestamp()
        };

        try {
          await setDoc(userDocRef, fallbackProfile, { merge: true });
          setProfile({ id: user.uid, ...fallbackProfile } as any);
        } catch (err) {
          console.error("Failed to auto-create missing profile:", err);
          // Set local state anyway so user has a working session
          setProfile({ id: user.uid, ...fallbackProfile } as any);
        }
        setLoading(false);
      }
    }, (error) => {
      console.error("Profile listen error:", error);
      setLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope(TASKS_SCOPE);
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }

      // Ensure user document exists (Profile creation)
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      
      // Use getDoc instead of onSnapshot for the creation check to be more direct
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const finalReferralCode = safeStorage.getItem('referralCode');
        const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          phoneNumber: user.phoneNumber || '',
          role: user.email === 'wiseking7890@gmail.com' ? 'admin' : 'user',
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
          dailyEmailEnabled: true,
          dailyPushEnabled: true,
          referralCode,
          referredBy: finalReferralCode || null,
          createdAt: serverTimestamp()
        };
        // Use merge: true just in case, but we checked exists()
        await setDoc(userDocRef, userData, { merge: true });
        
        // Award referral credit to the referrer if exists
        if (finalReferralCode) {
          try {
            const referrersQuery = query(collection(db, 'users'), where('referralCode', '==', finalReferralCode));
            const referrersSnap = await getDocs(referrersQuery);
            if (!referrersSnap.empty) {
              const referrerDoc = referrersSnap.docs[0];
              await updateDoc(referrerDoc.ref, {
                totalReferrals: increment(1)
              });
            }
          } catch (err) {
            console.warn("Failed to credit referrer count:", err);
          }
        }

        safeStorage.removeItem('referralCode');

        // Welcome Notification
        addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: "Welcome to Earnwise!",
          message: "We're glad you're here. Start completing tasks to earn rewards.",
          type: "success",
          read: false,
          createdAt: serverTimestamp(),
          readBy: []
        }).catch(err => console.error("Could not send welcome notification", err));
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessToken, logout, signInWithGoogle }}>
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

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
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
        setAccessToken(null); // Clear token on logout
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Self-healing: Ensure primary admin always has admin role
        if (user.email === 'wiseking7890@gmail.com' && data.role !== 'admin') {
          try {
            await updateDoc(userDocRef, { role: 'admin' });
          } catch (err) {
            console.error("Admin upgrade error:", err);
          }
        }

        setProfile({ id: docSnap.id, ...data } as any);
        setLoading(false);
      } else {
        // ...creation logic handled in sign-in or via explicit trigger to avoid accidental overwrites
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
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          phoneNumber: user.phoneNumber || '',
          role: user.email === 'wiseking7890@gmail.com' ? 'admin' : 'user',
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
          dailyEmailEnabled: true,
          dailyPushEnabled: true,
          referralCode,
          referredBy: finalReferralCode || null,
          createdAt: serverTimestamp()
        };
        // Use merge: true just in case, but we checked exists()
        await setDoc(userDocRef, userData, { merge: true });
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

  const logout = () => signOut(auth);

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

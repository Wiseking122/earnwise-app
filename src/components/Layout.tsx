import { ReactNode, useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  List, 
  Wallet, 
  User as UserIcon, 
  ChevronLeft,
  LayoutDashboard,
  Crown,
  Bell,
  Lock,
  Gift,
  ListTodo,
  BookOpen,
  Megaphone
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import InstallModal from './InstallModal';
import NotificationPanel from './NotificationPanel';
import { playNotificationSound } from '../pages/sounds';
import TransactionReceipt from './TransactionReceipt';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export default function Layout({ children, title, showBack }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNewNotifs, setHasNewNotifs] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const lastNotifId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      
      // Set header color to match the theme
      if (WebApp.setHeaderColor) {
        WebApp.setHeaderColor('#ffffff');
      }
    } catch (err) {
      console.warn("Telegram WebApp initialization suppressed or failed:", err);
    }
  }, []);

  // Global Notification Listener (for sound, badge, and native OS push notifications)
  useEffect(() => {
    if (!user) return;

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => {
        console.warn("Could not request notification permission on mount:", err);
      });
    }

    const q = query(
      collection(db, 'notifications'), 
      where('userId', 'in', ['all', user.uid])
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const notifs = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        // Local sort by createdAt descending to find the latest
        notifs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || Date.now();
            const timeB = b.createdAt?.toMillis?.() || Date.now();
            return timeB - timeA;
        });

        const hasUnread = notifs.some((n: any) => {
            if (n.userId === 'all') {
                return !(n.readBy && user && n.readBy.includes(user.uid));
            } else {
                return !n.read;
            }
        });
        setHasNewNotifs(hasUnread);

        if (notifs.length === 0) return;

        const latestDoc = notifs[0];
        const latestId = latestDoc.id;

        if (isInitialLoad.current) {
          lastNotifId.current = latestId;
          isInitialLoad.current = false;
          return;
        }

        if (latestId !== lastNotifId.current) {
          lastNotifId.current = latestId;
          playNotificationSound();

          // Dispatch native phone/browser OS notification banner
          try {
            const title = latestDoc.title || "Earnwise Notification";
            const message = latestDoc.message || "";

            if ('Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(title, {
                    body: message,
                    icon: '/icon.png',
                    badge: '/icon.png',
                    tag: 'earnwise-' + latestId,
                    renotify: true,
                    vibrate: [200, 100, 200]
                  } as any).catch(() => {
                    new Notification(title, { body: message, icon: '/icon.png' });
                  });
                }).catch(() => {
                  new Notification(title, { body: message, icon: '/icon.png' });
                });
              } else {
                new Notification(title, { body: message, icon: '/icon.png' });
              }
            }
          } catch (pushErr) {
            console.error("Error dispatching native OS push notification:", pushErr);
          }
        }
      }
    }, (error) => {
      console.warn("Notification listener error:", error);
    });

    return unsub;
  }, [user]);

  // Global Completed Withdrawal Transaction Listener (for automatic receipt pop-up)
  useEffect(() => {
    if (!user) return;

    const getSeenIds = (): string[] => {
      try {
        const stored = localStorage.getItem('earnwise_seen_receipts');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    const addSeenId = (id: string) => {
      try {
        const current = getSeenIds();
        if (!current.includes(id)) {
          localStorage.setItem('earnwise_seen_receipts', JSON.stringify([...current, id]));
        }
      } catch (err) {
        console.error("Error storing seen receipt ID:", err);
      }
    };

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('type', '==', 'withdrawal'),
      where('status', '==', 'completed')
    );

    const unsub = onSnapshot(q, (snap) => {
      const seenIds = getSeenIds();
      let newReceiptToPop: any = null;

      snap.docs.forEach((doc) => {
        const txId = doc.id;
        const data = doc.data();

        if (seenIds.includes(txId)) return;

        // Check if transaction is recent (within 5 minutes)
        const createdAtMs = data.createdAt?.toMillis?.() || Date.now();
        const isRecent = (Date.now() - createdAtMs) < 5 * 60 * 1000;

        if (isRecent) {
          newReceiptToPop = {
            id: txId,
            amount: data.amount,
            fee: data.receiptDetails?.fee ?? (data.amount * 0.05),
            netPayout: data.receiptDetails?.netPayout ?? (data.amount * 0.95),
            processedAt: data.createdAt?.toDate?.() || new Date(),
            bankName: data.receiptDetails?.bankName || 'N/A',
            accountName: data.receiptDetails?.accountName || 'N/A'
          };
        } else {
          // Silence older ones by marking them seen
          addSeenId(txId);
        }
      });

      if (newReceiptToPop) {
        setActiveReceipt(newReceiptToPop);
        addSeenId(newReceiptToPop.id);
      }
    }, (err) => {
      console.warn("Transaction listener error in Layout:", err);
    });

    return unsub;
  }, [user]);

  const isFree = profile?.plan === 'free' && profile?.role !== 'admin';

  const navItems = [
    { path: '/', label: 'Home', icon: Home, locked: isFree },
    { path: '/tasks', label: 'Tasks', icon: List, locked: isFree },
    { path: '/academy', label: 'Academy', icon: BookOpen, locked: isFree },
    { path: '/advertiser', label: 'Post Ads', icon: Megaphone, locked: false },
    { path: '/upgrade', label: 'Upgrade', icon: Crown, locked: false },
    { path: '/earnings', label: 'Wallet', icon: Wallet, locked: isFree },
    { path: '/profile', label: 'Profile', icon: UserIcon, locked: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, type: "spring", bounce: 0 }}
      className="flex flex-col h-screen bg-transparent text-white overflow-hidden font-sans relative"
    >
      {/* Header */}
      <header className="px-5 flex items-center justify-between bg-slate-900/50 backdrop-blur-3xl border-b border-white/5 shadow-xs sticky top-0 z-[100] h-14">
        <div className="flex items-center gap-2">
          {showBack && (
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)} 
              className="p-1.5 -ml-1.5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-300" />
            </motion.button>
          )}
          <Logo size={24} />
          <h1 className="font-display font-black text-lg tracking-tight text-white uppercase italic drop-shadow-sm">Earnwise</h1>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            {profile.role === 'admin' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/admin')}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors relative group"
                title="Admin Console"
              >
                <LayoutDashboard size={18} className="text-blue-400 transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              </motion.button>
            )}
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setHasNewNotifs(false);
              }}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors relative group"
            >
              <Bell size={18} className="text-slate-300 active:rotate-12 transition-transform" />
              {hasNewNotifs && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              )}
            </button>
            {profile.plan !== 'free' && (
              <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-xl flex items-center justify-center text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-200/50">
                <Crown size={16} className="text-amber-900 fill-amber-900" />
              </div>
            )}
          </div>
        )}
      </header>
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
      <InstallModal />
      
      {activeReceipt && (
        <TransactionReceipt 
          receipt={activeReceipt} 
          onClose={() => setActiveReceipt(null)} 
        />
      )}
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 sm:pb-28 scroll-smooth no-scrollbar">
        {children}
      </main>

      {/* Premium Floating Navigation */}
      <div className="fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 w-[98%] max-w-sm sm:max-w-lg z-[1000] px-1 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.15)] rounded-full">
        <nav className="bg-[#050B1A]/90 backdrop-blur-3xl border border-blue-500/15 shadow-2xl rounded-full h-11 sm:h-14 flex items-center justify-around px-0.5 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
            
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
                <Link 
                key={item.path}
                to={item.path}
                className={`group relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 rounded-full ${
                    isActive ? 'text-blue-400' : (item.locked ? 'text-slate-600' : 'text-slate-400 hover:text-slate-200')
                }`}
                >
                  <motion.div 
                    whileTap={{ scale: 0.85 }}
                    className={`p-0.5 sm:p-1 rounded-full transition-all duration-300 relative flex flex-col items-center justify-center ${isActive ? '' : (item.locked ? 'opacity-40' : '')}`}
                  >
                      {isActive && (
                        <motion.div layoutId="nav-pill" className="absolute inset-0 bg-blue-500/10 rounded-full -z-10 shadow-[0_0_12px_rgba(59,130,246,0.3)]" />
                      )}
                      <Icon size={13} strokeWidth={isActive ? 2.5 : 2} className={`sm:w-[18px] sm:h-[18px] transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                      {item.locked && (
                        <div className="absolute -top-0.5 -right-0.5 bg-slate-900 border border-slate-700 text-slate-400 rounded-full p-[0.5px] shadow-sm">
                           <Lock size={5} />
                        </div>
                      )}
                  </motion.div>
                  <span className={`text-[6.5px] sm:text-[9px] font-black mt-0.5 tracking-wider transition-all duration-300 ${isActive ? 'opacity-100 block' : 'hidden sm:block sm:opacity-0 sm:h-0 sm:mt-0 sm:overflow-hidden group-hover:sm:opacity-100 group-hover:sm:h-auto group-hover:sm:mt-1'}`}>
                      {item.label}
                  </span>
                </Link>
            );
            })}
        </nav>
      </div>
    </motion.div>
  );
}

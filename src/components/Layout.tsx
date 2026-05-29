import { ReactNode, useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
  BookOpen
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import NotificationPanel from './NotificationPanel';
import { playNotificationSound } from '../pages/sounds';

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
      where('userId', 'in', ['all', user.uid]),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const latestDoc = snap.docs[0];
        const latestId = latestDoc.id;

        if (isInitialLoad.current) {
          lastNotifId.current = latestId;
          isInitialLoad.current = false;
          return;
        }

        if (latestId !== lastNotifId.current) {
          lastNotifId.current = latestId;
          setHasNewNotifs(true);
          playNotificationSound();

          // Dispatch native phone/browser OS notification banner
          try {
            const notifData = latestDoc.data();
            const title = notifData.title || "Earnwise Notification";
            const message = notifData.message || "";

            if ('Notification' in window && Notification.permission === 'granted') {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(title, {
                    body: message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'earnwise-' + latestId,
                    renotify: true,
                    vibrate: [200, 100, 200]
                  } as any).catch(() => {
                    new Notification(title, { body: message, icon: '/favicon.ico' });
                  });
                }).catch(() => {
                  new Notification(title, { body: message, icon: '/favicon.ico' });
                });
              } else {
                new Notification(title, { body: message, icon: '/favicon.ico' });
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

  const isFree = profile?.plan === 'free' && profile?.role !== 'admin';

  const navItems = [
    { path: '/', label: 'Home', icon: Home, locked: isFree },
    { path: '/tasks', label: 'Tasks', icon: List, locked: isFree },
    { path: '/academy', label: 'Academy', icon: BookOpen, locked: isFree },
    { path: '/upgrade', label: 'Upgrade', icon: Crown, locked: false },
    { path: '/earnings', label: 'Wallet', icon: Wallet, locked: isFree },
    { path: '/profile', label: 'Profile', icon: UserIcon, locked: false },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Header */}
      <header className="px-5 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm sticky top-0 z-[100] h-14">
        <div className="flex items-center gap-2">
          {showBack && (
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)} 
              className="p-1.5 -ml-1.5 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </motion.button>
          )}
          <Logo size={24} />
          <h1 className="font-display font-black text-lg tracking-tight text-slate-900 uppercase italic">Earnwise</h1>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            {profile.role === 'admin' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/admin')}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors relative group"
                title="Admin Console"
              >
                <LayoutDashboard size={18} className="text-blue-600 transition-colors" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              </motion.button>
            )}
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setHasNewNotifs(false);
              }}
              className="p-1.5 hover:bg-slate-50 rounded-xl transition-colors relative group"
            >
              <Bell size={18} className="text-slate-600 active:rotate-12 transition-transform" />
              {hasNewNotifs && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
            {profile.plan !== 'free' && (
              <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg border border-white/10">
                <Crown size={16} className="text-amber-400 fill-amber-400" />
              </div>
            )}
          </div>
        )}
      </header>
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-28 scroll-smooth no-scrollbar">
        {children}
      </main>

      {/* Premium Floating Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-[1000] px-2">
        <nav className="bg-[#030712] border border-white/10 shadow-2xl rounded-3xl h-16 flex items-center justify-around px-1 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
            
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
                <Link 
                key={item.path}
                to={item.path}
                className={`group relative flex flex-col items-center justify-center w-full h-full transition-all duration-500 rounded-2xl ${
                    isActive ? 'text-white' : (item.locked ? 'text-slate-600' : 'text-slate-500 hover:text-slate-300')
                }`}
                >
                <div className={`p-1.5 rounded-xl transition-all duration-500 relative ${isActive ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : (item.locked ? 'opacity-40' : 'group-hover:bg-white/5')}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'animate-pulse' : ''} />
                    {item.locked && (
                      <div className="absolute -top-1 -right-1 bg-slate-800 border-2 border-slate-950 text-white rounded-full p-0.5 shadow-sm">
                        <Lock size={7} />
                      </div>
                    )}
                </div>
                <span className={`text-[8px] font-black uppercase mt-1 tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100' : 'hidden'}`}>
                    {item.label}
                </span>
                </Link>
            );
            })}
        </nav>
      </div>
    </div>
  );
}

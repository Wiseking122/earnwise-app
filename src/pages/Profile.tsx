import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Shield, 
  LogOut, 
  ChevronRight, 
  Share2, 
  CreditCard,
  HelpCircle,
  FileText,
  Star,
  Flame,
  Award,
  History,
  Settings,
  Crown,
  Zap,
  Camera,
  Edit2,
  Check,
  X,
  Lock,
  Megaphone,
  Trophy,
  ListTodo,
  Clock,
  Mail,
  Bell,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateDoc, doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WithdrawalRequest } from '../types';
import { sendNotification, NotificationType } from '../lib/notifications';

export default function Profile() {
  const { profile, logout, user } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newFirstName, setNewFirstName] = useState(profile?.firstName || '');
  const [newLastName, setNewLastName] = useState(profile?.lastName || '');
  const [newPhotoUrl, setNewPhotoUrl] = useState(profile?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daily Encouragement reminder states
  const [triggeringEncouragement, setTriggeringEncouragement] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [lastEncouragement, setLastEncouragement] = useState<{ headline: string; quote: string; tip: string } | null>(null);
  const [simulatedNotifications, setSimulatedNotifications] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState('09:00');
  const [currentDate, setCurrentDate] = useState('Today');
  const [subscribingAll, setSubscribingAll] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if we can show install prompt
    const checkInstall = () => {
      if ((window as any).deferredPrompt) {
        setCanInstall(true);
      }
    };
    checkInstall();
    window.addEventListener('beforeinstallprompt', checkInstall);
    return () => window.removeEventListener('beforeinstallprompt', checkInstall);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;
    
    // Show the install prompt
    promptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`Earnwise: Install outcome: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    (window as any).deferredPrompt = null;
    setCanInstall(false);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
      
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSpecificTopic = async (topicId: string) => {
    if (!profile?.email) return;
    setTriggeringEncouragement(true);
    setTriggerSuccess(false);
    try {
      const response = await fetch(getApiUrl('/api/auth/send-daily-encouragement'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile.email,
          name: profile.displayName || `${profile.firstName} ${profile.lastName}`,
          userId: profile.uid,
          topicId: topicId
        }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setTriggerSuccess(true);
        setLastEncouragement(data.quote);
        setSimulatedNotifications(prev => [
          {
            id: Date.now(),
            title: `🌅 Daily Hustle: ${data.quote.headline}`,
            message: data.quote.quote,
            time: 'Just Now',
            icon: '⚡'
          },
          ...prev
        ]);

        if (data.storeNotificationClientSide) {
          try {
            await sendNotification({
              userId: profile.uid,
              title: `🌅 Daily Hustle: ${data.quote.headline}`,
              message: `${data.quote.quote} 👉 Today's tip: ${data.quote.tip}`,
              type: NotificationType.REWARD
            });
          } catch (notifErr: any) {
            console.error("Failed to write daily encouragement notification client-side:", notifErr);
          }
        }

        setTimeout(() => setTriggerSuccess(false), 8000);
      } else {
        alert(data.error || 'Failed to trigger coaching walkthrough');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error sending coaching request: ' + err.message);
    } finally {
      setTriggeringEncouragement(false);
    }
  };

  const handleOneClickSubscribeAll = async () => {
    if (!profile) return;
    setSubscribingAll(true);
    try {
      if ('Notification' in window) {
        await Notification.requestPermission().catch(err => {
          console.warn("Could not request notification permission in action:", err);
        });
      }
      await updateDoc(doc(db, 'users', profile.uid), {
        dailyEmailEnabled: true,
        dailyPushEnabled: true,
        updatedAt: new Date()
      });
      await handleTriggerSpecificTopic('earn_higher');
    } catch (err: any) {
      console.error("Failed one-click subscription setup:", err);
    } finally {
      setSubscribingAll(false);
    }
  };

  const handleTriggerEncouragement = async () => {
    await handleTriggerSpecificTopic('earn_higher');
  };

  const toggleSetting = async (key: 'dailyEmailEnabled' | 'dailyPushEnabled', currentValue: boolean) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [key]: !currentValue,
        updatedAt: new Date()
      });
    } catch (err: any) {
      console.error(`Failed to update ${key}:`, err);
    }
  };

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setWithdrawals(docs);
      setLoadingWithdrawals(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed' || w.status === 'approved')
    .reduce((accum, w) => accum + w.amount, 0);

  const currentPendingAmount = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((accum, w) => accum + w.amount, 0);

  const activeRequests = withdrawals.filter(w => w.status === 'pending');

  useEffect(() => {
    if (profile) {
      setNewFirstName(profile.firstName || '');
      setNewLastName(profile.lastName || '');
      setNewPhotoUrl(profile.photoURL || '');
    }
  }, [profile]);

  const handleLogout = async () => {
    await logout();
    navigate('/welcome');
  };

  const menuItems = [
    ...(profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com' ? [{ label: 'Admin Terminal', icon: Shield, path: '/admin' }] : []),
    { label: 'Deposit Funds', icon: Zap, path: '/deposit' },
    { label: 'Vault & Staking', icon: Lock, path: '/vault' },
    { label: 'Achievement Rewards', icon: Trophy, path: '/achievements' },
    { label: 'Post Ads (Advertiser)', icon: Megaphone, path: '/advertiser' },
    { label: 'Transaction History', icon: History, path: '/transactions' },
    { label: 'Upgrade Membership', icon: Crown, path: '/upgrade' },
    { label: 'Payment Details', icon: CreditCard, path: '/withdrawal' },
    { label: 'Refer & Earn', icon: Share2, path: '/referral' },
    ...(canInstall ? [{ label: 'Install App (PWA)', icon: Smartphone, action: handleInstallClick }] : []),
    { label: 'Privacy Policy', icon: Shield, path: '/privacy' },
    { label: 'Terms of Service', icon: FileText, path: '/terms' },
    { label: 'Help & Support', icon: HelpCircle, path: '/support' },
  ];

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        firstName: newFirstName,
        lastName: newLastName,
        displayName: `${newFirstName} ${newLastName}`.trim(),
        photoURL: newPhotoUrl,
        updatedAt: new Date()
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error("Update profile error:", err);
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024) { // Keep it small for Firestore base64 or just as a demo
        alert("Image too large. Please select an image under 200KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const badges = [
    { name: 'Rookie', color: 'bg-blue-100 text-blue-600', locked: false },
    { name: 'Early Bird', color: 'bg-orange-100 text-orange-600', locked: (profile?.streak || 0) < 3 },
    { name: 'Pro Earner', color: 'bg-purple-100 text-purple-600', locked: (profile?.level || 1) < 5 },
    { name: 'Social Star', color: 'bg-green-100 text-green-600', locked: true },
  ];

  return (
    <Layout title="Executive Profile">
      <div className="p-3.5 sm:p-5 pb-24 space-y-5 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Cinematic Profile Header */}
        <div className="bg-slate-950 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden shadow-xl group border border-white/5">
          <div className="absolute inset-0 bg-linear-to-br from-blue-600/20 via-transparent to-slate-950 opacity-100" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none -mr-24 -mt-24" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative group mb-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-500 border-2 border-white/10 shadow-xl relative z-10 overflow-hidden group-hover:scale-105 transition-transform duration-700">
                {newPhotoUrl ? (
                  <img src={newPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-display font-black italic">{profile?.displayName?.[0] || 'U'}</span>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={24} className="text-white" />
                  </div>
                )}
              </div>
              <div className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)' }} />
            </div>

            {!isEditing ? (
              <div className="text-center space-y-2">
                <div className="space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-display font-black tracking-tighter uppercase italic">{profile?.displayName}</h2>
                  <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] font-sans">{profile?.email}</p>
                </div>
                
                <div className="flex justify-center gap-2">
                  <div className="flex items-center gap-1 bg-blue-600 text-white text-[7px] sm:text-[8px] font-black uppercase px-2.5 py-1 rounded-lg tracking-[0.1em] shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    <Star size={8} className="fill-white" />
                    Tier {profile?.level || 1}
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 text-white text-[7px] sm:text-[8px] font-black uppercase px-2.5 py-1 rounded-lg tracking-[0.1em] border border-white/10 backdrop-blur-md">
                    <Crown size={8} className="text-amber-400 fill-amber-400" />
                    {profile?.plan || 'Free'}
                  </div>
                </div>

                <div className="pt-1.5">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-[7.5px] sm:text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1 hover:bg-white/10 hover:text-white transition-all backdrop-blur-md"
                  >
                    <Edit2 size={8} /> Customize Identity
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">First Domain</p>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:ring-2 focus:ring-blue-600/50 outline-none"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Last Domain</p>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:ring-2 focus:ring-blue-600/50 outline-none"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white font-black py-2.5 rounded-xl shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all uppercase tracking-widest text-[9px]"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Update Core</>}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 bg-white/5 text-white font-black py-2.5 rounded-xl flex items-center justify-center active:scale-[0.98] transition-all border border-white/10"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </div>

        {/* Elite Stats Hub */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-100 shadow-sm text-center group hover:border-blue-100 transition-colors">
            <div className="w-7 h-7 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mx-auto mb-1.5 transition-transform group-hover:scale-110">
              <Flame size={14} className="fill-orange-500" />
            </div>
            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Active</p>
            <p className="font-display font-black text-slate-900 text-xs sm:text-sm italic">{profile?.streak || 0} Days</p>
          </div>
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-100 shadow-sm text-center group hover:border-blue-100 transition-colors">
            <div className="w-7 h-7 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center mx-auto mb-1.5 transition-transform group-hover:scale-110">
              <Settings size={14} className="animate-spin-slow" />
            </div>
            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Growth</p>
            <p className="font-display font-black text-slate-900 text-xs sm:text-sm italic">+{((profile?.xp || 0) > 999 ? (profile?.xp! / 1000).toFixed(1) + 'k' : profile?.xp || 0)}</p>
          </div>
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-100 shadow-sm text-center group hover:border-blue-100 transition-colors">
            <div className="w-7 h-7 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center mx-auto mb-1.5 transition-transform group-hover:scale-110">
              <Award size={14} className="fill-purple-500" />
            </div>
            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Rank</p>
            <p className="font-display font-black text-slate-900 text-xs sm:text-sm italic">{profile?.badges?.length || 1} Elite</p>
          </div>
        </div>

        {/* Settlement Operations Dashboard */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black px-4 uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
             <div className="w-6 h-px bg-slate-200" />
             Settlement Ledger
          </h3>
          <div className="bg-slate-950 text-white rounded-xl p-4 sm:p-6 border border-white/5 shadow-xl relative overflow-hidden group">
            {/* Ambient gradients */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />
            
            <div className="relative z-10 space-y-4">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/10">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Total Terminated</p>
                  <p className="font-display font-black text-xl sm:text-2xl text-emerald-400 tracking-tighter italic">
                    {loadingWithdrawals ? (
                      <span className="opacity-50 text-slate-500">₦...</span>
                    ) : (
                      <>₦{totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                    )}
                  </p>
                </div>
                <div className="space-y-1 border-l border-white/10 pl-4">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Current Pending</p>
                  <p className="font-display font-black text-xl sm:text-2xl text-amber-400 tracking-tighter italic animate-pulse">
                    {loadingWithdrawals ? (
                      <span className="opacity-50 text-slate-500">₦...</span>
                    ) : (
                      <>₦{currentPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Status of Active/Current Requests */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Settlement Queue</p>
                  {!loadingWithdrawals && activeRequests.length > 0 && (
                    <span className="text-[8px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-amber-400/20 italic animate-pulse">
                      Processing ({activeRequests.length})
                    </span>
                  )}
                </div>
                
                {loadingWithdrawals ? (
                  <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                ) : activeRequests.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {activeRequests.map((req, idx) => (
                      <div key={req.id || idx} className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-4 flex items-center justify-between hover:border-white/20 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center border border-amber-500/20 relative">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-0.5 right-0.5 animate-ping" />
                            <Clock size={14} />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-display font-black tracking-tight text-white italic">₦{req.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                              {req.bankDetails?.bankName} • {req.bankDetails?.accountNumber}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 italic">
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/5 rounded-xl py-4 px-3 text-center">
                    <p className="text-[8.5px] font-black tracking-widest uppercase text-slate-500 leading-none italic">
                      All settlement channels clear • No pending executions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Menu System */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black px-4 uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
             <div className="w-6 h-px bg-slate-200" />
             Navigation
          </h3>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-1">
            <div className="grid grid-cols-1 divide-y divide-slate-50">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.path) {
                        navigate(item.path);
                      }
                    }}
                    className="group w-full flex items-center justify-between p-2 sm:p-2.5 hover:bg-slate-50 transition-all rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7.5 h-7.5 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
                        <Icon size={16} />
                      </div>
                      <span className="font-display font-black text-slate-900 text-[11px] sm:text-xs uppercase tracking-tight italic group-hover:text-blue-600 transition-colors">{item.label}</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all opacity-0 group-hover:opacity-100">
                      <ChevronRight size={11} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- DAILY ENGAGEMENT & REMINDERS SECTION --- */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black px-4 uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
             <div className="w-6 h-px bg-slate-200" />
             Daily Coaching Engine
          </h3>
          <div className="bg-slate-950 text-white rounded-xl p-4 sm:p-6 border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-white italic">Everyday Masterclass</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Siphon Nigerian digital wealth blueprints directly to your inbox</p>
                </div>
                <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                  <Trophy size={14} className="animate-pulse" />
                </div>
              </div>

              {/* One-Click Global Activator */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${profile?.dailyEmailEnabled !== false && profile?.dailyPushEnabled !== false ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${profile?.dailyEmailEnabled !== false && profile?.dailyPushEnabled !== false ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      </span>
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-200">
                        {profile?.dailyEmailEnabled !== false && profile?.dailyPushEnabled !== false 
                          ? 'Active Subscription: Live Daily Coaching' 
                          : 'Subscription Status: Inactive'}
                      </p>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
                      Schedules daily guidance emails + lockscreen updates covering scaling, upgrading, and task tactics.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOneClickSubscribeAll}
                    disabled={subscribingAll || (profile?.dailyEmailEnabled !== false && profile?.dailyPushEnabled !== false)}
                    className={`font-black px-3.5 py-2 rounded-lg uppercase tracking-wider text-[8px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center shrink-0 ${
                      profile?.dailyEmailEnabled !== false && profile?.dailyPushEnabled !== false
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.25)]'
                    }`}
                  >
                    {subscribingAll ? (
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    ) : profile?.dailyEmailEnabled !== false && profile?.dailyPushEnabled !== false ? (
                      <>✓ Coaching Enabled</>
                    ) : (
                      <>⚡ Activate Daily Coaching in 1-Click</>
                    )}
                  </button>
                </div>
              </div>

              {/* Fine-Tuning Settings Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Email Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSetting('dailyEmailEnabled', profile?.dailyEmailEnabled ?? true)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:border-white/20 hover:bg-white/10 transition-all duration-300 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                      <Mail size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-white">Daily Emails</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Strategy Digests</p>
                    </div>
                  </div>
                  <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${profile?.dailyEmailEnabled !== false ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 ${profile?.dailyEmailEnabled !== false ? 'translate-x-3' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Push Notification Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSetting('dailyPushEnabled', profile?.dailyPushEnabled ?? true)}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:border-white/20 hover:bg-white/10 transition-all duration-300 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                      <Smartphone size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-white">Phone Alerts</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Dopamine Hooks</p>
                    </div>
                  </div>
                  <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${profile?.dailyPushEnabled !== false ? 'bg-purple-600' : 'bg-slate-800'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 ${profile?.dailyPushEnabled !== false ? 'translate-x-3' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              {/* Automated Progress Tracker Directory */}
              <div className="space-y-4 pt-4 border-t border-white/5 text-left">
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    Automated Curriculum Pipeline (10x Daily Drops)
                  </h5>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5 leading-relaxed">
                    Syllabus chapters automatically rotate and deliver sequentially to your active channels.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { 
                      stepIndex: 0, 
                      title: '💸 Chapter 1: How to Earn Higher', 
                      desc: 'Active compounding systems, team royalties & multiplier scaling.',
                      topicId: 'earn_higher',
                      headline: "The Compound Earning Framework",
                      quote: "Average members work for individual micro-tasks. Elite earners build network engines.",
                      tip: "Maintain a consecutive 7-day streak to unlock a 2.5x multiplier on all personal task reward submissions. Pair this by recruiting 5 active friends to tap into a lifelong 20% cash bonus on all their plan activation reserves!"
                    },
                    { 
                      stepIndex: 1, 
                      title: '⚡ Chapter 2: How to Upgrade Tier', 
                      desc: 'Bypassing hold times and activating elite withdrawal limits.',
                      topicId: 'upgrade',
                      headline: "Level Up Your Task Multipliers",
                      quote: "Upgraded accounts secure preferential automated validation and unlimited submission limits.",
                      tip: "Navigate to your Dashboard, click 'Upgrade Tier', and select from the available premium plans. Upgrading instantly increases your task ceiling, grants priority customer support, and shaves withdrawal hold times down to under 10 minutes!"
                    },
                    { 
                      stepIndex: 2, 
                      title: '🏦 Chapter 3: How to Deposit Funds', 
                      desc: 'Secure Paystack Virtual Account gateways and instant balance deposits.',
                      topicId: 'deposit',
                      headline: "Fund Your Direct Operations Securely",
                      quote: "Your wallet is the engine that funds advertising budgets and registers course activations.",
                      tip: "Hover over the Home panel and tap 'Deposit'. Enter your desired amount and click proceed. Our gateway integrates with Paystack, allowing safe bank transfers or card payments instantly. Make sure you copy the single-use virtual account details correctly."
                    },
                    { 
                      stepIndex: 3, 
                      title: '📢 Chapter 4: How to Run Ad Campaigns', 
                      desc: 'Multiplying WhatsApp buyer leads and user attraction engines.',
                      topicId: 'run_ads',
                      headline: "The Earnwise Self-Serve Advertising Pipeline",
                      quote: "If you have a great solution, the crowd must hear it. Ads grant you the megaphone.",
                      tip: "Click on 'Advertise' or 'Create Ad Campaign' in your panel. Choose your daily budget, write a catchy hook, and paste your direct WhatsApp link. Our network of 50,000+ certified Nigerian scholars will begin reviewing and engaging with your campaign within minutes!"
                    },
                    { 
                      stepIndex: 4, 
                      title: '🎯 Chapter 5: How to Earn from Tasks', 
                      desc: 'Speedrun micro-gigs, and proper compliance validation workflows.',
                      topicId: 'earn_tasks',
                      headline: "The Ultimate Micro-Task Speedrunning Cheat Sheet",
                      quote: "Success on tasks comes down to speed and unmanipulated compliance proof.",
                      tip: "Log in around 8 AM and 6 PM when new corporate advertising audits and social follow tasks are assigned. Read task instructions carefully, perform the follow, like, or subscription, and upload the exact screenshot. Our system approves honest submissions instantly!"
                    },
                    { 
                      stepIndex: 5, 
                      title: '📚 Chapter 6: Sourcing Academy Courses', 
                      desc: 'Unlocking high-yield developer, copywriting, and design materials.',
                      topicId: 'buy_course',
                      headline: "Unlock Permanent High-Yield Strategy Blueprints",
                      quote: "An investment in knowledge always pays the best interest dividend.",
                      tip: "Head to the 'Academy' page, browse top blueprints like 'Smartphone Canva & Mobile Design Mastery' or 'WhatsApp Organic Lead Siphon'. Make sure your wallet has sufficient balance, and click 'Enroll Now'. This instantly unlocks the offline lesson plans, strategy guides, and files!"
                    }
                  ].map((chapter) => {
                    const isPassed = (profile?.coachingStep ?? 0) > chapter.stepIndex;
                    const isActive = (profile?.coachingStep ?? 0) % 6 === chapter.stepIndex;
                    return (
                      <div
                        key={chapter.stepIndex}
                        onClick={() => setSelectedLesson(chapter)}
                        className={`border rounded-xl p-3 flex flex-col justify-between transition-all relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-300 ${
                          isActive
                            ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
                            : isPassed
                            ? 'bg-slate-900/40 border-emerald-500/20 opacity-80 hover:border-emerald-500/40'
                            : 'bg-slate-900/60 border-white/5 opacity-60 hover:opacity-90'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 uppercase rounded-bl-lg tracking-wider">
                            Active / Scheduled Next
                          </div>
                        )}
                        {isPassed && (
                          <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[7px] font-black px-2 py-0.5 uppercase rounded-bl-lg tracking-wider border-l border-b border-emerald-500/20">
                            Sent ✓
                          </div>
                        )}
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-blue-400' : isPassed ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {chapter.title}
                          </p>
                          <p className="text-[8px] text-slate-400 font-medium leading-normal mt-1.5">{chapter.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-2.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-blue-400 animate-pulse' : isPassed ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">
                            {isActive ? 'Awaiting automatic 2.4-hour cycle delivery' : isPassed ? 'Delivered via Email & Bell' : 'Queued automatically'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lesson Modal */}
              <AnimatePresence>
                {selectedLesson && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedLesson(null)}
                      className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />
                    
                    {/* Modal Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 shadow-2xl overflow-hidden text-left z-10"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                      
                      <button
                        onClick={() => setSelectedLesson(null)}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-2xl cursor-pointer"
                      >
                        <X size={18} />
                      </button>

                      <div className="space-y-6">
                        <div>
                          <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-blue-500/20">
                            Wise AI Coaching Academy
                          </span>
                          <h3 className="text-sm font-display font-black tracking-tight text-white mt-4 uppercase leading-tight">
                            {selectedLesson.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                            {selectedLesson.headline}
                          </p>
                        </div>

                        <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4 italic relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                          <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                            "{selectedLesson.quote}"
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Strategic Execution Tip:
                          </h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                            {selectedLesson.tip}
                          </p>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={async () => {
                              if (triggeringEncouragement) return;
                              await handleTriggerSpecificTopic(selectedLesson.topicId);
                            }}
                            disabled={triggeringEncouragement}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                          >
                            {triggeringEncouragement ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Mail size={14} /> Deliver Lesson Instantly
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setSelectedLesson(null)}
                            className="sm:w-32 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-black py-4 px-6 rounded-2xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center border border-white/5 cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Animated Simulated Mobile Device Frame inside preview */}
              <div className="space-y-4 pt-4 border-t border-white/5 text-left">
                <div className="bg-slate-900/60 rounded-3xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none">Simulated Phone Lockscreen (Everyday)</p>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-900/85 rounded-2xl p-3 border border-white/5 shadow-inner flex flex-col items-center">
                      <div className="text-center mb-2">
                        <p className="text-xs font-black tracking-tight text-slate-200">{currentTime}</p>
                        <p className="text-[6px] text-slate-500 font-bold uppercase tracking-widest">{currentDate}</p>
                      </div>

                      {/* Display active notifications */}
                      {simulatedNotifications.map(notif => (
                        <div key={notif.id} className="w-full bg-slate-950/90 border border-white/15 rounded-xl p-2.5 flex gap-2 animate-bounce-short text-left mb-2 last:mb-0">
                          <div className="w-6 h-6 bg-blue-600/10 text-blue-400 text-xs rounded-lg flex items-center justify-center shrink-0">
                            {notif.icon}
                          </div>
                          <div>
                            <div className="flex justify-between items-center">
                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-200 leading-none">{notif.title}</p>
                              <span className="text-[6px] text-slate-500 uppercase font-bold">{notif.time}</span>
                            </div>
                            <p className="text-[7px] text-slate-400 font-medium leading-relaxed mt-1">{notif.message}</p>
                          </div>
                        </div>
                      ))}

                      {simulatedNotifications.length === 0 && (
                        <div className="w-full bg-slate-950/40 border border-dashed border-white/5 rounded-xl py-3 px-2 text-center">
                          <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            Click the 1-click subscription activation or any topic above to preview email & push alerts instantly
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback Toast */}
                <AnimatePresence>
                  {triggerSuccess && lastEncouragement && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-400 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                        <Check size={16} />
                      </div>
                      <div className="space-y-1 text-left">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300 leading-none">Coaching Alert Delivered!</p>
                        <p className="text-[8px] text-slate-300 font-medium leading-relaxed mt-1">Check your mailbox for <strong>"{lastEncouragement.headline}"</strong>. An in-app announcement document has also been appended to your notifications catalog.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Executive Action */}
        <button 
          onClick={handleLogout}
          className="w-full bg-rose-50 text-rose-600 font-black py-4 rounded-3xl flex items-center justify-center gap-3 border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95 uppercase tracking-[0.2em] text-[10px]"
        >
          <LogOut size={20} /> Terminate Session
        </button>

        <p className="text-center text-[10px] text-slate-300 font-black uppercase tracking-[0.4em] pb-8 italic opacity-50">Earnwise Elite Protocol • v2.5 Cinematic</p>
      </div>
    </Layout>
  );
}

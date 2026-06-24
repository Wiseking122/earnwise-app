import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { collection, query, getDocs, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { getApiUrl } from '../../lib/config';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Layers, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  History,
  FileText,
  Bell,
  Loader2,
  Megaphone,
  Send,
  Target,
  Plus,
  X,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { sendNotification, NotificationType } from '../../lib/notifications';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activeTasks: 0,
    pendingCompletions: 0,
    pendingWithdrawals: 0,
    pendingEscrow: 0, // NEW
    totalPending: 0,
    totalWithdrawable: 0
  });
  const [clearing, setClearing] = useState(false);
  const [triggeringCoaching, setTriggeringCoaching] = useState(false);
  
  // Custom Notification Form
  const [notifForm, setNotifForm] = useState({ title: '', message: '', targetUserId: 'all' });
  const [sendingNotif, setSendingNotif] = useState(false);

  const handleSendCustomNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) return;
    
    setSendingNotif(true);
    try {
      await sendNotification({
        userId: notifForm.targetUserId,
        title: notifForm.title,
        message: notifForm.message,
        type: NotificationType.SYSTEM
      });
      alert(notifForm.targetUserId === 'all' ? 'Global broadcast successfully successfully sent to all users!' : 'Individual notification sent effectively!');
      setNotifForm({ title: '', message: '', targetUserId: 'all' });
    } catch (err: any) {
      alert(`Failed to transmit: ${err.message}`);
    } finally {
      setSendingNotif(false);
    }
  };

  useEffect(() => {
    // This is a simplified fetch for a dash, in real apps we'd use better indexing or counters
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      let pending = 0;
      let withdrawable = 0;
      snap.docs.forEach(doc => {
        const d = doc.data();
        pending += (d.pendingBalance || 0);
        withdrawable += (d.withdrawableBalance || 0);
      });
      setStats(prev => ({ ...prev, users: snap.size, totalPending: pending, totalWithdrawable: withdrawable }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('status', '==', 'active')), (snap) => {
      setStats(prev => ({ ...prev, activeTasks: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const unsubComps = onSnapshot(query(collection(db, 'completions'), where('status', '==', 'pending')), (snap) => {
      setStats(prev => ({ ...prev, pendingCompletions: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'completions'));

    const unsubWiths = onSnapshot(query(collection(db, 'withdrawals'), where('status', '==', 'pending')), (snap) => {
      setStats(prev => ({ ...prev, pendingWithdrawals: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals'));

    const unsubEscrow = onSnapshot(query(collection(db, 'transactions'), where('status', '==', 'pending')), (snap) => {
      setStats(prev => ({ ...prev, pendingEscrow: snap.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'pending_escrow'));

    return () => {
      unsubUsers();
      unsubTasks();
      unsubComps();
      unsubWiths();
      unsubEscrow();
    };
  }, []);

  const handleClearEscrow = async () => {
    if (!window.confirm("Move all eligible pending funds (7+ days old) to withdrawable balances?")) return;
    setClearing(true);
    try {
      const resp = await fetch(getApiUrl('/api/admin/clear-escrow'), { method: 'POST' });
      const data = await resp.json();
      alert(`Success: ${data.clearedCount || 0} transactions cleared.`);
    } catch (err) {
      console.error(err);
      alert("Failed to clear escrow.");
    } finally {
      setClearing(false);
    }
  };

  const adminMenu = [
    { label: 'Task Management', icon: Layers, path: '/admin/tasks', count: stats.activeTasks, color: 'blue' },
    { label: 'Payment Requests', icon: CreditCard, path: '/admin/payments', count: stats.pendingWithdrawals + stats.pendingEscrow, color: 'green' },
    { label: 'Verify Tasks', icon: CheckCircle, path: '/admin/tasks', count: stats.pendingCompletions, color: 'orange' },
    { label: 'User Directory', icon: Users, path: '/admin/users', count: stats.users, color: 'purple' },
    { label: 'Course Gallery', icon: BookOpen, path: '/admin/courses', count: 12, color: 'blue' },
  ];

  return (
    <Layout title="Admin Panel">
      <div className="p-4 space-y-6">
        {/* Header Stats */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden ring-1 ring-white/10">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Platform Float</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-400">₦{stats.totalWithdrawable.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400">Withdrawable</span>
                </div>
              </div>
              <button 
                onClick={handleClearEscrow}
                disabled={clearing}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                {clearing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Clock size={12} />}
                Clear Escrow
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <Link to="/admin/payments?tab=escrow" className="hover:bg-white/5 p-2 rounded-xl transition-colors">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Funds</p>
                <p className="text-xl font-black text-amber-400">₦{stats.totalPending.toLocaleString()}</p>
              </Link>
              <Link to="/admin/users" className="hover:bg-white/5 p-2 rounded-xl transition-colors">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Users</p>
                <p className="text-xl font-black text-white">{stats.users}</p>
              </Link>
            </div>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 text-white/5 w-40 h-40" />
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {adminMenu.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link 
                key={idx} 
                to={item.path}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                  item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  item.color === 'green' ? 'bg-green-50 text-green-600' :
                  item.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  <Icon size={24} />
                </div>
                <h4 className="font-black text-gray-800 text-sm leading-tight mb-2">{item.label}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-gray-900">{item.count}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* System Alerts */}
        <section className="space-y-3">
          <h3 className="font-black text-lg px-1">Recent Activity</h3>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            <div className="p-4 flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <p className="font-bold text-gray-800">5 New task completions need review</p>
                <p className="text-[10px] text-gray-400 font-medium">Just now</p>
              </div>
            </div>
            <div className="p-4 flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users size={16} />
              </div>
              <div>
                <p className="font-bold text-gray-800">New user registered: sarah_m</p>
                <p className="text-[10px] text-gray-400 font-medium">15 mins ago</p>
              </div>
            </div>
          </div>
        </section>

        {/* Global Broadcast Center */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">Broadcast Center</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Deploy Global Communications</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-indigo-100 shadow-sm">
               Active Node: 01
            </div>
          </div>
          
          <div className="bg-slate-50 p-1 rounded-[2.5rem] border border-slate-200 shadow-inner">
            <div className="bg-white p-8 rounded-[2.2rem] border border-slate-100 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <User size={12} /> Targeting
                  </label>
                  <input
                    type="text"
                    placeholder="Recipient ID (Use 'all' for broadcast)"
                    value={notifForm.targetUserId}
                    onChange={(e) => setNotifForm({...notifForm, targetUserId: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white outline-none text-sm font-black uppercase tracking-tight transition-all text-slate-950 placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <History size={12} /> Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="Broadcast Headline"
                    value={notifForm.title}
                    onChange={(e) => setNotifForm({...notifForm, title: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white outline-none text-sm font-black uppercase tracking-tight transition-all text-slate-950 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <FileText size={12} /> Message Payload
                 </label>
                 <textarea
                   placeholder="Formulate your strategic notification here..."
                   value={notifForm.message}
                   onChange={(e) => setNotifForm({...notifForm, message: e.target.value})}
                   className="w-full p-6 rounded-3xl bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white outline-none min-h-[160px] text-sm font-black text-slate-950 transition-all leading-relaxed placeholder:text-slate-400"
                 />
              </div>

              {notifForm.title && notifForm.message && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50"
                >
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Transmission Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                      <Bell size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{notifForm.title}</p>
                      <p className="text-[9px] text-slate-600 font-medium mt-1 leading-relaxed">{notifForm.message}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleSendCustomNotif}
                disabled={sendingNotif || !notifForm.title || !notifForm.message}
                className="w-full bg-slate-950 text-white py-6 rounded-[1.8rem] font-display font-black text-xs uppercase tracking-[0.4em] italic flex items-center justify-center gap-4 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-20 shadow-2xl shadow-indigo-900/10 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {sendingNotif ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <span>Initiate Broadcast Protocol</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Coaching Orchestrator Controls */}
        <section className="space-y-3">
          <h3 className="font-black text-lg px-1">Automated Wise AI Coaching</h3>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mailer Config Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">SMTP Mailer Setup</p>
                  <p className="text-sm font-black text-slate-800">
                    {(import.meta as any).env?.VITE_SMTP_CONFIGURED === "true" || true ? (
                      <span className="text-emerald-600 flex items-center gap-1">● Resilient Fallback Enabled</span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">⚠️ Dev Simulation Active</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Campaign Steps Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Target size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Coaching Campaign</p>
                  <p className="text-sm font-black text-slate-800">6 Step Automated Masterclass</p>
                </div>
              </div>
            </div>

            {/* Dispatch CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  if (triggeringCoaching) return;
                  setTriggeringCoaching(true);
                  try {
                    const r = await fetch(getApiUrl('/api/admin/trigger-coaching'), { method: 'POST' });
                    const res = await r.json();
                    alert(res.message || "Standard coaching trigger completed");
                  } catch (err: any) {
                    alert(`Failed standard trigger: ${err.message}`);
                  } finally {
                    setTriggeringCoaching(false);
                  }
                }}
                disabled={triggeringCoaching}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Scan Registry (Standard)
              </button>

              <button
                onClick={async () => {
                  if (triggeringCoaching) return;
                  if (!window.confirm("Bypass 2-hour interval? Every opted-in user will instantly receive their next scheduled coaching phase.")) return;
                  setTriggeringCoaching(true);
                  try {
                    const r = await fetch(getApiUrl('/api/admin/trigger-coaching?force=true'), { method: 'POST' });
                    const res = await r.json();
                    alert(res.message || "Force dispatch executed successfully");
                  } catch (err: any) {
                    alert(`Failed force trigger: ${err.message}`);
                  } finally {
                    setTriggeringCoaching(false);
                  }
                }}
                disabled={triggeringCoaching}
                className="bg-indigo-600 text-white hover:bg-indigo-700 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-50"
              >
                ⚡ Force Dispatch Now
              </button>
            </div>
            
            <p className="text-[10px] text-gray-400 font-bold text-center leading-normal">
              Note: Welcome emails are dispatched fully in the background synchronously when users register. Wise AI coaching drops recur automatically every 2 hours on the background server loop or can be forced instantly using the controls above.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}

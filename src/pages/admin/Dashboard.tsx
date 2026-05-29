import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { collection, query, getDocs, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Layers, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

// ... existing imports ...
import { Megaphone, Send, Target, Plus, X } from 'lucide-react';
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
      setNotifForm({ title: '', message: '', targetUserId: 'all' });
      alert('Notification sent effectively!');
    } catch (err) {
      alert('Failed to send notification');
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
      const resp = await fetch('/api/admin/clear-escrow', { method: 'POST' });
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

        {/* Send Notification Section */}
        <section className="space-y-3">
          <h3 className="font-black text-lg px-1">Global Broadcast & Targeted Alert</h3>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Target User ID ('all' for everyone)"
                value={notifForm.targetUserId}
                onChange={(e) => setNotifForm({...notifForm, targetUserId: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
              />
              <input
                type="text"
                placeholder="Notification Title"
                value={notifForm.title}
                onChange={(e) => setNotifForm({...notifForm, title: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
              />
            </div>
            <textarea
              placeholder="Detailed Message Content..."
              value={notifForm.message}
              onChange={(e) => setNotifForm({...notifForm, message: e.target.value})}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] text-sm font-medium"
            />
            <button
              onClick={handleSendCustomNotif}
              disabled={sendingNotif}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {sendingNotif ? 'Dispatching...' : (
                <>
                  <Send size={18} />
                  Transmit Notification
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

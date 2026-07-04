import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  Send, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter,
  Layers,
  Zap,
  Layout,
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Smartphone
} from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, limit } from 'firebase/firestore';
import { Notification, NotificationCategory, NotificationPriority } from '../../types/notifications';
import { format } from 'date-fns';

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'tokens'>('compose');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('system');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [target, setTarget] = useState<'all' | 'premium' | 'free' | 'new' | 'specific'>('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      // Send notification via server API which creates in-app records and triggers FCM Web Push
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminId: auth.currentUser?.uid,
          title,
          message,
          targeting: target,
          userId: target === 'specific' ? specificUserId : undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server returned an error');
      }

      setTitle('');
      setMessage('');
      setButtonText('');
      setButtonUrl('');
      setImage('');
      alert('Notification sent successfully and broadcasted via Web Push!');
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      alert('Failed to send notification: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Bell className="w-8 h-8 text-emerald-400" />
            NOTIFICATION MANAGER
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">FCM & In-App Communications Control</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
          {[
            { id: 'compose', label: 'Compose', icon: Plus },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'tokens', label: 'Devices', icon: Smartphone }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeTab === 'compose' && (
          <>
            <div className="lg:col-span-7">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 border border-white/10 rounded-2xl p-6"
              >
                <form onSubmit={handleSend} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Target Audience</label>
                      <select 
                        value={target}
                        onChange={(e) => setTarget(e.target.value as any)}
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      >
                        <option value="all">Everyone</option>
                        <option value="premium">Premium Users</option>
                        <option value="free">Free Users</option>
                        <option value="new">New Users (7 days)</option>
                        <option value="specific">Specific User ID</option>
                      </select>
                    </div>

                    {target === 'specific' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">User ID</label>
                        <input 
                          type="text"
                          required
                          value={specificUserId}
                          onChange={(e) => setSpecificUserId(e.target.value)}
                          placeholder="e.g. jf83hK92..."
                          className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Notification Title</label>
                    <input 
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 🔥 Daily Reward Ready!"
                      className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Message Body</label>
                    <textarea 
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Enter the main notification content..."
                      className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['system', 'reward', 'withdrawal', 'promo', 'security', 'task'].map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat as any)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                              category === cat ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Priority</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['low', 'normal', 'high'].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p as any)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                              priority === p ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Action Button Text</label>
                      <input 
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="e.g. Claim Now"
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Action Link (URL)</label>
                      <input 
                        type="url"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        placeholder="e.g. https://earnwise.app/tasks"
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <button
                    disabled={sending}
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest"
                  >
                    {sending ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Dispatch Notification
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-emerald-400" />
                  Visual Preview
                </h3>
                
                <div className="bg-slate-800 rounded-3xl p-6 border border-white/5 shadow-inner">
                  <div className="w-full max-w-[280px] mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="p-3 bg-slate-800 flex items-center gap-2 border-b border-white/5">
                      <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
                        <Smartphone className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EARNWISE</span>
                      <span className="text-[8px] text-slate-500 ml-auto">Just Now</span>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-bold text-white mb-1">{title || 'Notification Title'}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{message || 'Your notification message will appear here. This is how users will see it on their devices.'}</p>
                      
                      {buttonText && (
                        <div className="mt-4 pt-3 border-t border-white/5">
                          <div className="py-2 text-center text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 rounded-lg bg-emerald-500/5">
                            {buttonText}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-500 mt-4 font-medium italic">Handheld Device Simulation</p>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Guidelines</h3>
                <ul className="space-y-3">
                  {[
                    "Title should be catchy but short (max 40 chars)",
                    "Message should be direct and call-to-action focused",
                    "Use emojis sparingly to avoid spam filters",
                    "Targeting 'All' will send to every active device token",
                    "System notifications bypass mute settings if urgent"
                  ].map((tip, i) => (
                    <li key={i} className="flex gap-2 text-[10px] text-slate-400 leading-relaxed">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Notification</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Stats</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {notifications.map((n) => (
                      <tr key={n.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs text-slate-300 font-medium">
                            {format(n.createdAt instanceof Date ? n.createdAt : (n.createdAt as any).toDate(), 'MMM d, h:mm a')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <Bell className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white truncate max-w-xs">{n.title}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-xs">{n.message}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {n.userId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {n.readBy?.length || 0} Reads</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded uppercase tracking-widest">
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

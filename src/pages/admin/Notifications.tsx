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
  Smartphone,
  RefreshCw,
  Eye,
  FileText,
  Copy,
  ChevronRight,
  Globe,
  Mail,
  Settings
} from 'lucide-react';
import { getApiUrl } from '../../lib/config';
import { db, auth } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc, limit } from 'firebase/firestore';
import { Notification, NotificationCategory, NotificationPriority, DeviceToken } from '../../types/notifications';
import { format } from 'date-fns';

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'tokens' | 'gmail' | 'gmail_auto'>('compose');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Manual Email States
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTarget, setEmailTarget] = useState<'all' | 'premium' | 'free' | 'with_wisecoins' | 'specific'>('all');
  const [emailSpecificAddress, setEmailSpecificAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);

  // Automated Email Template States
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeSubject, setWelcomeSubject] = useState('');
  const [welcomeBody, setWelcomeBody] = useState('');
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('system');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [target, setTarget] = useState<'all' | 'active' | 'inactive' | 'new' | 'premium' | 'free' | 'pending_withdrawals' | 'with_wisecoins' | 'active_referrals' | 'specific'>('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [image, setImage] = useState('');
  
  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');

  // Filters for History
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
    fetchDevices();
    fetchEmailLogs();
    fetchEmailTemplates();
  }, []);

  const fetchEmailLogs = async () => {
    setLoadingEmailLogs(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/email-logs'));
      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error fetching email logs:", err);
    } finally {
      setLoadingEmailLogs(false);
    }
  };

  const fetchEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/email-templates'));
      if (response.ok) {
        const data = await response.json();
        setWelcomeEnabled(data.welcome?.enabled !== false);
        setWelcomeSubject(data.welcome?.subject || 'Welcome to Earnwise!');
        setWelcomeBody(data.welcome?.body || '');
      }
    } catch (err) {
      console.error("Error fetching email templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const sendManualEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) {
      alert("Please enter a subject and email body.");
      return;
    }
    if (emailTarget === 'specific' && !emailSpecificAddress) {
      alert("Please enter a specific target Gmail address.");
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/send-custom-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
          targeting: emailTarget,
          specificEmail: emailTarget === 'specific' ? emailSpecificAddress.trim() : undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Emails sent successfully!");
        setEmailSubject('');
        setEmailBody('');
        fetchEmailLogs();
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const saveEmailTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTemplates(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/email-templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcome: {
            enabled: welcomeEnabled,
            subject: welcomeSubject,
            body: welcomeBody
          }
        })
      });

      if (response.ok) {
        alert("Automated email templates saved successfully!");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to save templates");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTemplates(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification)));
    } catch (err) {
      console.error("Error fetching notification history:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const q = query(collection(db, 'device_tokens'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setDeviceTokens(snap.docs.map(d => d.data() as DeviceToken));
    } catch (err) {
      console.error("Error fetching device tokens:", err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setCategory('system');
    setPriority('normal');
    setTarget('all');
    setSpecificUserId('');
    setButtonText('');
    setButtonUrl('');
    setImage('');
    setIsScheduled(false);
    setScheduledAt('');
    setRepeat('none');
  };

  const handleSaveDraft = async () => {
    if (!title || !message) {
      alert('Please fill out the Title and Message fields first.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: auth.currentUser?.uid,
          title,
          message,
          targeting: target,
          userId: target === 'specific' ? specificUserId : undefined,
          category,
          priority,
          buttonText,
          buttonUrl,
          image,
          status: 'draft',
          repeat
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server returned an error');
      }

      alert('Notification saved as draft!');
      resetForm();
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      alert('Failed to save draft: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendOrSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isScheduled && !scheduledAt) {
      alert('Please specify a valid schedule date and time.');
      return;
    }

    setSending(true);
    try {
      const payload = {
        adminId: auth.currentUser?.uid,
        title,
        message,
        targeting: target,
        userId: target === 'specific' ? specificUserId : undefined,
        category,
        priority,
        buttonText,
        buttonUrl,
        image,
        status: isScheduled ? 'scheduled' : 'sent',
        scheduledAt: isScheduled ? scheduledAt : null,
        repeat
      };

      const endpoint = editingId ? '/api/notifications/update' : '/api/notifications/send';
      const bodyPayload = editingId ? { ...payload, notificationId: editingId } : payload;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server returned an error');
      }

      const resData = await response.json();
      alert(resData.message || 'Notification processed successfully!');
      resetForm();
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      alert('Failed to process notification: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification? This cannot be undone.')) return;
    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: auth.currentUser?.uid,
          notificationId: id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete notification');
      }

      alert('Notification deleted successfully.');
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      alert('Error deleting: ' + err.message);
    }
  };

  const handleLoadTemplate = (n: Notification) => {
    setEditingId(n.id || null);
    setTitle(n.title);
    setMessage(n.message);
    setCategory(n.category);
    setPriority(n.priority);
    
    // Determine target state
    if (n.userId === 'all' || n.userId === 'active' || n.userId === 'inactive' || n.userId === 'new' || n.userId === 'premium' || n.userId === 'free' || n.userId === 'pending_withdrawals' || n.userId === 'with_wisecoins' || n.userId === 'active_referrals') {
      setTarget(n.userId as any);
      setSpecificUserId('');
    } else {
      setTarget('specific');
      setSpecificUserId(n.userId);
    }

    setButtonText(n.buttonText || '');
    setButtonUrl(n.buttonUrl || '');
    setImage(n.image || '');
    
    if (n.status === 'scheduled' && n.scheduledAt) {
      setIsScheduled(true);
      const sDate = n.scheduledAt instanceof Date ? n.scheduledAt : (n.scheduledAt as any).toDate ? (n.scheduledAt as any).toDate() : new Date(n.scheduledAt as any);
      // Format to yyyy-MM-ddThh:mm for datetime-local input
      setScheduledAt(format(sDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setIsScheduled(false);
      setScheduledAt('');
    }

    setRepeat((n as any).repeat || 'none');
    setActiveTab('compose');
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Bell className="w-8 h-8 text-emerald-400" />
            NOTIFICATION MANAGER
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">FCM & In-App Communications Control</p>
        </div>
        
        <div className="flex flex-wrap bg-slate-900/50 p-1 rounded-xl border border-white/5 gap-1">
          {[
            { id: 'compose', label: 'Compose', icon: Plus },
            { id: 'history', label: 'History & Drafts', icon: Clock },
            { id: 'tokens', label: 'Registered Devices', icon: Smartphone },
            { id: 'gmail', label: 'Gmail Manual', icon: Mail },
            { id: 'gmail_auto', label: 'Gmail Automated', icon: Settings }
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
                <form onSubmit={handleSendOrSchedule} className="space-y-6">
                  {editingId && (
                    <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                      <span>Editing template/scheduled/draft ID: {editingId}</span>
                      <button type="button" onClick={resetForm} className="underline text-[10px] uppercase tracking-wider hover:text-white">Cancel Edit</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Target Audience</label>
                      <select 
                        value={target}
                        onChange={(e) => setTarget(e.target.value as any)}
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      >
                        <option value="all">Everyone</option>
                        <option value="active">Active Users (last 14 days)</option>
                        <option value="inactive">Inactive Users (last 14 days)</option>
                        <option value="new">New Users (registered last 7 days)</option>
                        <option value="premium">Premium Plan Users</option>
                        <option value="free">Free Plan Users</option>
                        <option value="pending_withdrawals">Users with Pending Withdrawals</option>
                        <option value="with_wisecoins">Users with positive WiseCoins Balance</option>
                        <option value="active_referrals">Users with at least 1 Referral</option>
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
                            {cat === 'reward' ? 'WiseCoins' : cat === 'task' ? 'Offers/Surveys' : cat}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
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
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Action Link (URL)</label>
                      <input 
                        type="url"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        placeholder="e.g. https://earnwise.app/tasks (blank defaults to /)"
                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Notification Image URL (Optional)</label>
                    <input 
                      type="url"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="e.g. https://domain.com/banner.png"
                      className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    />
                  </div>

                  {/* Scheduling Section */}
                  <div className="p-4 bg-slate-800/50 border border-white/5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">Schedule for later date</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 bg-slate-800 border-white/10 rounded focus:ring-emerald-500 focus:ring-offset-slate-900"
                      />
                    </div>

                    {isScheduled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Dispatch Time</label>
                          <input 
                            type="datetime-local"
                            required={isScheduled}
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full bg-slate-800 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Repeat Frequency</label>
                          <select 
                            value={repeat}
                            onChange={(e) => setRepeat(e.target.value as any)}
                            className="w-full bg-slate-800 border border-white/5 rounded-lg px-3 py-2 text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="none">One-time notification</option>
                            <option value="daily">Repeat Daily</option>
                            <option value="weekly">Repeat Weekly</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <button
                      type="button"
                      disabled={sending}
                      onClick={handleSaveDraft}
                      className="col-span-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5 uppercase text-xs tracking-wider"
                    >
                      <FileText className="w-4 h-4" />
                      Save Draft
                    </button>

                    <button
                      disabled={sending}
                      type="submit"
                      className="col-span-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-sm"
                    >
                      {sending ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          {isScheduled ? 'Schedule Delivery' : 'Send Immediately'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-emerald-400" />
                  Visual Live Preview
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
                    {image && (
                      <div className="w-full h-32 bg-slate-800 relative overflow-hidden">
                        <img referrerPolicy="no-referrer" src={image} alt="Notification Banner" className="w-full h-full object-cover" />
                      </div>
                    )}
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
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Audience Insights</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-800/40 rounded-xl flex items-center justify-between border border-white/5">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Target Segment:</span>
                    <span className="text-xs text-emerald-400 font-black uppercase tracking-wider">{target}</span>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl flex items-center justify-between border border-white/5">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Expected Devices:</span>
                    <span className="text-xs text-white font-black">{deviceTokens.length} active registered</span>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl flex items-center justify-between border border-white/5">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Channel:</span>
                    <span className="text-xs text-slate-300 font-black uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" /> Web Push Notification (FCM)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="lg:col-span-12 space-y-6">
            {/* Search & Status Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/30 p-4 rounded-xl border border-white/5">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search notifications by title or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full md:w-48 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Drafts</option>
                  <option value="failed">Failed</option>
                </select>
                <button 
                  onClick={fetchHistory}
                  className="p-3 bg-slate-900 border border-white/5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden"
            >
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading history logs...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold uppercase tracking-wider">No notifications found</p>
                  <p className="text-xs text-slate-600 mt-1">Try modifying your query or write a new one.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Notification details</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Audience</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Delivery Statistics</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredNotifications.map((n) => {
                        const dateObj = n.createdAt ? (n.createdAt instanceof Date ? n.createdAt : (n.createdAt as any).toDate ? (n.createdAt as any).toDate() : new Date(n.createdAt as any)) : new Date();
                        const schedObj = n.scheduledAt ? (n.scheduledAt instanceof Date ? n.scheduledAt : (n.scheduledAt as any).toDate ? (n.scheduledAt as any).toDate() : new Date(n.scheduledAt as any)) : null;

                        return (
                          <tr key={n.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs text-slate-300 font-bold">
                                {format(dateObj, 'MMM d, h:mm a')}
                              </p>
                              {n.status === 'scheduled' && schedObj && (
                                <p className="text-[9px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                                  <Clock className="w-2.5 h-2.5" /> Scheduled: {format(schedObj, 'MMM d, h:mm a')}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <Bell className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-white leading-tight">{n.title}</p>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{n.message}</p>
                                  {n.buttonText && (
                                    <span className="inline-block mt-1 bg-white/5 px-2 py-0.5 rounded text-[8px] font-bold text-slate-400">Button: "{n.buttonText}"</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[9px] font-black rounded uppercase tracking-widest border border-white/5">
                                {n.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded uppercase tracking-widest">
                                {n.userId}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1 text-[10px] font-bold">
                                {n.status === 'draft' ? (
                                  <span className="text-slate-500 uppercase tracking-wider">Saved as Draft</span>
                                ) : n.status === 'scheduled' ? (
                                  <span className="text-indigo-400 uppercase tracking-wider">Pending Delivery</span>
                                ) : (
                                  <>
                                    <span className="text-emerald-400 flex items-center gap-1">✔ {(n as any).successCount || 0} Successful</span>
                                    <span className="text-red-400 flex items-center gap-1">✖ {(n as any).failureCount || 0} Failed / Offline</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button 
                                  title="Reuse template or edit draft"
                                  onClick={() => handleLoadTemplate(n)}
                                  className="p-2 bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-lg text-slate-400 transition-all border border-white/5"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  title="Delete notification"
                                  onClick={() => n.id && handleDeleteNotification(n.id)}
                                  className="p-2 bg-slate-800 hover:bg-red-500 hover:text-white rounded-lg text-slate-400 transition-all border border-white/5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">FCM DEVICE BROWSER REGISTRY</h3>
                  <p className="text-xs text-slate-400 mt-1">Live database of active service worker tokens authorized to receive push notifications.</p>
                </div>
                <button 
                  onClick={fetchDevices}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 rounded-lg border border-white/5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Devices
                </button>
              </div>

              {deviceTokens.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold uppercase tracking-wider">No active devices logged</p>
                  <p className="text-xs text-slate-600 mt-1">Visit the app from a client device and grant notification permission to register.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registered</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Device Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Browser Agent</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Token Hash (FCM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {deviceTokens.map((token, i) => {
                        const dateObj = token.createdAt ? (token.createdAt instanceof Date ? token.createdAt : (token.createdAt as any).toDate ? (token.createdAt as any).toDate() : new Date(token.createdAt as any)) : new Date();

                        return (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-bold">
                              {format(dateObj, 'MMM d, h:mm a')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-emerald-400 font-black font-mono">
                              {token.userId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-white/5 text-slate-300 text-[9px] font-black rounded uppercase tracking-wider">
                                {token.deviceType || 'web'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400 truncate max-w-xs font-medium">
                              {token.browser || 'Unknown Browser agent'}
                            </td>
                            <td className="px-6 py-4 font-mono text-[9px] text-slate-500 truncate max-w-xs select-all" title={token.token}>
                              {token.token}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gmail' && (
          <div className="lg:col-span-12 space-y-8">
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-6 sm:p-8 rounded-[2.5rem] shadow-premium">
              <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                Send Manual Gmail Message
              </h2>
              <form onSubmit={sendManualEmail} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Target Audience</label>
                    <select
                      value={emailTarget}
                      onChange={(e) => setEmailTarget(e.target.value as any)}
                      className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-300 font-bold focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="all">All Registered Users</option>
                      <option value="premium">Upgraded (Premium) Users Only</option>
                      <option value="free">Free Users Only</option>
                      <option value="with_wisecoins">Users with Balance &gt; 100 WC</option>
                      <option value="specific">Specific Gmail Address</option>
                    </select>
                  </div>

                  {emailTarget === 'specific' && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Gmail Address</label>
                      <input
                        type="email"
                        placeholder="e.g. user@gmail.com"
                        value={emailSpecificAddress}
                        onChange={(e) => setEmailSpecificAddress(e.target.value)}
                        className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-300 font-bold placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Subject</label>
                  <input
                    type="text"
                    placeholder="Enter email subject line..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-300 font-bold placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Email Body (Plain text or HTML)</label>
                  <textarea
                    rows={10}
                    placeholder="Write your email body here. You can use simple text or include custom HTML formatting..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/5 rounded-2xl p-4 text-sm text-slate-300 font-bold placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider text-xs px-8 py-4 rounded-2xl inline-flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {sendingEmail ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Email Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-6 sm:p-8 rounded-[2.5rem] shadow-premium">
              <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6">Email Dispatch History</h2>
              
              {loadingEmailLogs ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-wider text-xs">
                  No Gmail dispatches recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sent Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Recipients</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {emailLogs.map((log, index) => {
                        const dateVal = log.sentAt ? (log.sentAt.toDate ? log.sentAt.toDate() : new Date(log.sentAt)) : new Date();
                        return (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-bold">
                              {format(dateVal, 'MMM d, yyyy h:mm a')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-white/5 text-slate-300 text-[9px] font-black rounded uppercase tracking-wider">
                                {log.targeting}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-white font-bold truncate max-w-xs">
                              {log.subject}
                            </td>
                            <td className="px-6 py-4 text-xs text-emerald-400 font-black font-mono">
                              {log.recipientCount || log.recipients?.length || 1} users
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gmail_auto' && (
          <div className="lg:col-span-12 space-y-8">
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-6 sm:p-8 rounded-[2.5rem] shadow-premium">
              <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Configure Automated Welcome Email
              </h2>
              
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              ) : (
                <form onSubmit={saveEmailTemplates} className="space-y-6">
                  <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-white text-sm font-black uppercase tracking-wider mb-1">Send Welcome Email automatically</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Triggered whenever a new user registers their account</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWelcomeEnabled(!welcomeEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        welcomeEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          welcomeEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {welcomeEnabled && (
                    <>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Welcome Subject Line</label>
                        <input
                          type="text"
                          value={welcomeSubject}
                          onChange={(e) => setWelcomeSubject(e.target.value)}
                          placeholder="e.g. Welcome to Earnwise, {name}!"
                          className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-300 font-bold placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Use <span className="text-emerald-400 font-mono">{'{name}'}</span> as a placeholder for the user's name.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Custom Welcome Email Body (HTML support)</label>
                        <textarea
                          rows={12}
                          value={welcomeBody}
                          onChange={(e) => setWelcomeBody(e.target.value)}
                          placeholder="Leave blank to use the pre-built default template, or write custom text/HTML here..."
                          className="w-full bg-slate-950/80 border border-white/5 rounded-2xl p-4 text-sm text-slate-300 font-bold placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingTemplates}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider text-xs px-8 py-4 rounded-2xl inline-flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {savingTemplates ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" /> Save Settings
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

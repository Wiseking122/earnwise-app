import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  BarChart3, 
  Filter, 
  Calendar, 
  Globe, 
  Layers, 
  Zap,
  MousePointer2,
  XCircle,
  CheckCircle2,
  Image as ImageIcon,
  Layout,
  Type
} from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { Announcement, AnnouncementPlacement, AnnouncementType, AnnouncementAnimation } from '../../types/announcements';
import { format } from 'date-fns';

export default function AdminAnnouncements() {
  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [shortMessage, setShortMessage] = useState('');
  const [category, setCategory] = useState<AnnouncementType>('info');
  const [priority, setPriority] = useState(1);
  const [placements, setPlacements] = useState<AnnouncementPlacement[]>(['home_top']);
  const [targetAudience, setTargetAudience] = useState<string>('everyone');
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#10b981');
  const [textColor, setTextColor] = useState('#ffffff');
  const [animationType, setAnimationType] = useState<AnnouncementAnimation>('fade');
  const [displayFrequency, setDisplayFrequency] = useState<string>('every_visit');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(d => ({ ...d.data(), id: d.id } as Announcement)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Omit<Announcement, 'id'> = {
        title,
        shortMessage,
        category,
        priority: Number(priority),
        placements,
        targetAudience: targetAudience as any,
        startDate: Timestamp.fromDate(new Date(startDate)),
        endDate: Timestamp.fromDate(new Date(endDate)),
        buttonText,
        buttonLink,
        backgroundColor,
        textColor,
        animationType,
        displayFrequency: displayFrequency as any,
        isActive: true,
        status: 'published',
        manualClose: true,
        stickyUntilClosed: false,
        requireAcknowledgement: false,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      };

      await addDoc(collection(db, 'announcements'), payload);
      
      resetForm();
      setActiveTab('manage');
      fetchAnnouncements();
      alert('Announcement published successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setShortMessage('');
    setButtonText('');
    setButtonLink('');
    setCategory('info');
    setPriority(1);
    setPlacements(['home_top']);
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'announcements', id), { isActive: !current });
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-orange-400" />
            ANNOUNCEMENT ENGINE
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">Dynamic Banners & In-App Messaging</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'manage' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Manage
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'create' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          <div className="lg:col-span-8 bg-slate-900/50 border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleCreate} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Internal Name / Title</label>
                  <input 
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Easter Promo 2024"
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Display Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  >
                    <option value="info">Information (Blue)</option>
                    <option value="promo">Promotion (Orange)</option>
                    <option value="success">Success (Green)</option>
                    <option value="warning">Warning (Yellow)</option>
                    <option value="error">Error/Alert (Red)</option>
                    <option value="update">Update/Feature (Purple)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Main Announcement Message</label>
                <textarea 
                  required
                  value={shortMessage}
                  onChange={(e) => setShortMessage(e.target.value)}
                  rows={3}
                  placeholder="The message users will see directly on the banner..."
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Placements (Select multiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {['home_top', 'home_middle', 'dashboard_header', 'task_center_top', 'full_screen_popup', 'scrolling_marquee'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          if (placements.includes(p as any)) setPlacements(placements.filter(pl => pl !== p));
                          else setPlacements([...placements, p as any]);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          placements.includes(p as any) ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/5 text-slate-400'
                        }`}
                      >
                        {p.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Target Audience</label>
                  <select 
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="new">New Users Only</option>
                    <option value="activated">Activated Users Only</option>
                    <option value="non_activated">Non-Activated Users Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Start Date/Time</label>
                  <input 
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">End Date/Time</label>
                  <input 
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Button Text (Optional)</label>
                  <input 
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. Claim Now"
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Button Link (URL)</label>
                  <input 
                    type="url"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="e.g. https://..."
                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  />
                </div>
              </div>

              <button
                disabled={saving}
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/20 uppercase tracking-widest"
              >
                {saving ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Publish Announcement
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Live Preview</h3>
              <div className="bg-slate-800 rounded-2xl p-4 border border-white/5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={`${title}-${category}`}
                  style={{ backgroundColor }}
                  className="p-4 rounded-xl shadow-lg flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-sm text-white leading-tight">{title || 'Your Title Here'}</h4>
                  </div>
                  <p className="text-[11px] text-white/90 leading-relaxed">{shortMessage || 'The main message will appear here...'}</p>
                  
                  {buttonText && (
                    <div className="mt-1 px-4 py-2 bg-white/20 rounded-lg text-[10px] font-black text-center text-white uppercase tracking-widest">
                      {buttonText}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Styling Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Background</span>
                  <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Animation</span>
                  <select 
                    value={animationType} 
                    onChange={(e) => setAnimationType(e.target.value as any)}
                    className="bg-slate-800 border-0 rounded text-[10px] text-white p-1"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="bounce">Bounce</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <Megaphone className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">No active announcements</p>
              <button onClick={() => setActiveTab('create')} className="mt-4 text-orange-400 text-xs font-black uppercase">Create First</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ann.backgroundColor }}>
                      <Megaphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                        {ann.title}
                        {ann.isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded uppercase">Live</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 text-[8px] font-black rounded uppercase">Paused</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ann.shortMessage}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {format((ann.startDate as Timestamp).toDate(), 'MMM d')} - {format((ann.endDate as Timestamp).toDate(), 'MMM d')}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <Layout className="w-3 h-3" />
                          {ann.placements.length} Placements
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleStatus(ann.id!, ann.isActive)}
                      className={`p-2 rounded-lg transition-colors ${ann.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/5'}`}
                      title={ann.isActive ? 'Pause' : 'Activate'}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteAnnouncement(ann.id!)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

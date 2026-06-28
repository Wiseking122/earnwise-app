import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { db } from '../../lib/firebase';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { getApiUrl } from '../../lib/config';
import { sendNotification, NotificationType } from '../../lib/notifications';
import { Plus, Trash2, BarChart2, Video, Image as ImageIcon, Clock, Upload } from 'lucide-react';

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeEmbedUrl = (url: string) => {
  try {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split(/[?#]/)[0];
    } else {
      const match = url.match(/[?&]v=([^&#]*)/);
      if (match) {
        videoId = match[1];
      }
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1`;
  } catch (e) {
    return url;
  }
};

export default function AdminAds() {
  const [ads, setAds] = useState<any[]>([]);
  const [newAd, setNewAd] = useState({ title: '', type: 'banner', url: '', mediaUrl: '', reward: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'ads'));
    const unsub = onSnapshot(q, (snap) => {
      setAds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg(null);
    }, 5000);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleAddAd = async () => {
    if (!newAd.title || !newAd.url) {
      showStatus("Please enter both Ad Title and Target URL.", 'error');
      return;
    }
    setUploading(true);

    let mediaUrl = newAd.mediaUrl;
    try {
        if (file) {
            const base64Data = await readFileAsBase64(file);
            
            const res = await fetch(getApiUrl('/api/v1/admin/upload-media'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileData: base64Data,
                    fileName: file.name
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Upload failed');
            }

            const data = await res.json();
            mediaUrl = data.url;
        }

        if (!mediaUrl) {
            showStatus("Please upload a media file or provide a direct Media URL.", 'error');
            setUploading(false);
            return;
        }

        await addDoc(collection(db, 'ads'), {
            ...newAd,
            mediaUrl,
            createdAt: new Date(),
            clicks: 0,
            views: 0,
            watchTime: 0
        });

        // Notify all users about the newly created ad
        try {
          await sendNotification({
            userId: 'all',
            title: `New Ad Alert: ${newAd.title}`,
            message: `Earn instant rewards! Watch or view the newly sponsored ad "${newAd.title}" now.`,
            type: NotificationType.SYSTEM,
            actionUrl: '/tasks'
          });
        } catch (notifErr) {
          console.error("Failed to broadcast new ad notification to users:", notifErr);
        }

        setNewAd({ title: '', type: 'banner', url: '', mediaUrl: '', reward: 0 });
        setFile(null);
        showStatus("Ad created successfully!", 'success');
    } catch (error: any) {
        console.error("Upload/Ad creation failed:", error);
        showStatus("Upload/Ad creation failed: " + error.message, 'error');
    } finally {
        setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ad Management</h1>
        
        {/* Status Message */}
        {statusMsg && (
          <div className={`p-4 rounded-2xl border text-sm font-black uppercase tracking-tight ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Create Ad */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
          <h2 className="font-bold text-xl text-slate-800">Create New Premium Ad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input placeholder="Ad Title" className="p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition" value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} />
            <select className="p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition" value={newAd.type} onChange={e => setNewAd({...newAd, type: e.target.value})}>
              <option value="banner">Banner Ad</option>
              <option value="video">Video Ad</option>
            </select>
            <input placeholder="Target URL (Redirect destination)" className="p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition" value={newAd.url} onChange={e => setNewAd({...newAd, url: e.target.value})} />
            <input placeholder="Or paste Direct Media URL (Image/Video URL)" className="p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition" value={newAd.mediaUrl} onChange={e => setNewAd({...newAd, mediaUrl: e.target.value})} />
            <div className="flex items-center gap-4">
                <input type="file" onChange={e => {
                  const selectedFile = e.target.files?.[0] || null;
                  setFile(selectedFile);
                  if (selectedFile) {
                    setNewAd(prev => ({ ...prev, mediaUrl: '' }));
                  }
                }} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="flex-1 p-4 border border-slate-200 rounded-2xl flex items-center gap-2 text-slate-500 cursor-pointer hover:bg-slate-50 transition overflow-hidden text-ellipsis whitespace-nowrap">
                    <Upload size={18} /> {file ? file.name : "Or Upload Media File (Image/Video)"}
                </label>
            </div>
            <input type="number" placeholder="Reward (Points)" className="p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition" value={newAd.reward} onChange={e => setNewAd({...newAd, reward: Number(e.target.value)})} />
          </div>
          <button onClick={handleAddAd} disabled={uploading} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50">
            {uploading ? 'Processing/Uploading...' : <><Plus size={20} /> Create Ad</>}
          </button>
        </div>

        {/* List Ads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ads.map(ad => (
            <div key={ad.id} className="bg-gradient-to-b from-white to-slate-50 p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 space-y-4 hover:border-indigo-100 transition flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${ad.type === 'video' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {ad.type === 'video' ? <Video size={24} /> : <ImageIcon size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight">{ad.title}</h3>
                      <span className="text-[10px] font-mono text-slate-400">ID: {ad.id}</span>
                    </div>
                  </div>
                  {deletingId === ad.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => {
                          deleteDoc(doc(db, 'ads', ad.id))
                            .then(() => {
                              setDeletingId(null);
                              showStatus("Ad deleted successfully!", 'success');
                            })
                            .catch(err => {
                              console.error("Delete failed:", err);
                              showStatus("Delete failed: " + err.message, 'error');
                            });
                        }} 
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg transition"
                      >
                        Sure?
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeletingId(ad.id)} 
                      className="text-slate-300 hover:text-red-500 transition p-1 shrink-0"
                      title="Delete Ad"
                    >
                      <Trash2 size={20}/>
                    </button>
                  )}
                </div>

                {ad.mediaUrl && (
                  <div className="w-full h-32 rounded-2xl bg-slate-950 border border-slate-100 overflow-hidden relative flex items-center justify-center">
                    {ad.type === 'video' ? (
                      isYouTubeUrl(ad.mediaUrl) ? (
                        <iframe 
                          src={getYouTubeEmbedUrl(ad.mediaUrl)} 
                          title={ad.title} 
                          className="w-full h-full border-0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        />
                      ) : (
                        <video 
                          src={getApiUrl(ad.mediaUrl)} 
                          className="w-full h-full object-contain" 
                          muted 
                          playsInline
                          controls
                          preload="metadata"
                        />
                      )
                    ) : (
                      <img 
                        src={getApiUrl(ad.mediaUrl)} 
                        alt={ad.title} 
                        className="w-full h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-[9px] font-mono text-white px-2 py-0.5 rounded-md uppercase">
                      {ad.type}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-sm text-slate-600 font-medium pt-4 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-1.5"><BarChart2 size={16} className="text-indigo-500"/> {ad.clicks || 0} Clicks</div>
                <div className="flex items-center gap-1.5"><BarChart2 size={16} className="text-emerald-500"/> {ad.views || 0} Views</div>
                <div className="flex items-center gap-1.5"><Clock size={16} className="text-amber-500"/> {ad.watchTime || 0}s</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

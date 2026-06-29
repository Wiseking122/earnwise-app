import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getApiUrl } from '../../lib/config';
import { sendNotification, NotificationType } from '../../lib/notifications';
import { Plus, Trash2, BarChart2, Video, Image as ImageIcon, Clock, Upload } from 'lucide-react';

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const isFacebookUrl = (url: string) => {
  if (!url) return false;
  return url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.gg');
};

const isTikTokUrl = (url: string) => {
  if (!url) return false;
  return url.includes('tiktok.com');
};

const isInstagramUrl = (url: string) => {
  if (!url) return false;
  return url.includes('instagram.com');
};

const isTwitterUrl = (url: string) => {
  if (!url) return false;
  return url.includes('twitter.com') || url.includes('x.com');
};

const isVideoFileUrl = (url: string) => {
  if (!url) return false;
  if (url.startsWith('/uploads/') || url.includes('/uploads/')) return true;
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || 
         cleanUrl.endsWith('.webm') || 
         cleanUrl.endsWith('.ogg') || 
         cleanUrl.endsWith('.mov') || 
         cleanUrl.endsWith('.m4v') ||
         (cleanUrl.includes('firebasestorage.googleapis.com') && (
           cleanUrl.includes('.mp4') ||
           cleanUrl.includes('.webm') ||
           cleanUrl.includes('.ogg') ||
           cleanUrl.includes('.mov') ||
           cleanUrl.includes('.m4v')
         ));
};

const getYouTubeEmbedUrl = (url: string) => {
  try {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split(/[?#]/)[0];
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1].split(/[?#]/)[0];
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

const getFacebookEmbedUrl = (url: string) => {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560&autoplay=0&mute=1`;
};

const getTikTokEmbedUrl = (url: string) => {
  const match = url.match(/\/video\/(\d+)/);
  if (match && match[1]) {
    return `https://www.tiktok.com/embed/v2/${match[1]}`;
  }
  return `https://www.tiktok.com/embed/v2/`;
};

const getInstagramEmbedUrl = (url: string) => {
  try {
    let cleanUrl = url.split(/[?#]/)[0];
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    return `${cleanUrl}/embed/`;
  } catch (e) {
    return url;
  }
};

const getTwitterEmbedUrl = (url: string) => {
  const match = url.match(/status\/(\d+)/);
  if (match && match[1]) {
    return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}&theme=dark`;
  }
  return url;
};

const renderMediaElement = (mediaUrl: string, title: string, id: string, type: string) => {
  if (!mediaUrl) return null;

  const resolvedUrl = getApiUrl(mediaUrl);

  if (type === 'video') {
    if (isYouTubeUrl(mediaUrl)) {
      return (
        <iframe 
          src={getYouTubeEmbedUrl(mediaUrl)} 
          title={title} 
          className="w-full h-full border-0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      );
    } else if (isFacebookUrl(mediaUrl)) {
      return (
        <iframe 
          src={getFacebookEmbedUrl(mediaUrl)} 
          title={title} 
          className="w-full h-full border-0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      );
    } else if (isTikTokUrl(mediaUrl)) {
      return (
        <iframe 
          src={getTikTokEmbedUrl(mediaUrl)} 
          title={title} 
          className="w-full h-full border-0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      );
    } else if (isInstagramUrl(mediaUrl)) {
      return (
        <iframe 
          src={getInstagramEmbedUrl(mediaUrl)} 
          title={title} 
          className="w-full h-full border-0" 
          allowFullScreen
        />
      );
    } else if (isTwitterUrl(mediaUrl)) {
      return (
        <iframe 
          src={getTwitterEmbedUrl(mediaUrl)} 
          title={title} 
          className="w-full h-full border-0 bg-black" 
          allowFullScreen
        />
      );
    } else if (isVideoFileUrl(mediaUrl)) {
      return (
        <video 
          key={id}
          src={resolvedUrl} 
          className="w-full h-full object-contain" 
          muted 
          playsInline
          controls
          preload="metadata"
        />
      );
    } else {
      return (
        <img 
          src={resolvedUrl} 
          alt={title} 
          className="w-full h-full object-contain rounded-xl p-1" 
        />
      );
    }
  } else {
    // Banner / image ad
    return (
      <img 
        src={resolvedUrl} 
        alt={title} 
        className="w-full h-full object-contain" 
        referrerPolicy="no-referrer"
      />
    );
  }
};

export default function AdminAds() {
  const [ads, setAds] = useState<any[]>([]);
  const [newAd, setNewAd] = useState({ title: '', type: 'banner', url: '', mediaUrl: '', reward: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
    if (!newAd.title) {
      showStatus("Please enter an Ad Title.", 'error');
      return;
    }
    setUploading(true);

    let mediaUrl = newAd.mediaUrl;
    try {
        if (file) {
            try {
                // Layer 1: Upload directly and securely to Firebase Storage
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
                const uniqueFilename = `${Date.now()}_${safeName}`;
                const storageRef = ref(storage, `ads/${uniqueFilename}`);
                
                const uploadTask = uploadBytesResumable(storageRef, file);
                
                mediaUrl = await new Promise<string>((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    try {
                      uploadTask.cancel();
                    } catch (e) {}
                    reject(new Error("Firebase Storage upload timed out"));
                  }, 15000); // 15 seconds limit for Firebase before fallback

                  uploadTask.on('state_changed', 
                    (snapshot) => {
                      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                      setUploadProgress(Math.round(progress));
                    }, 
                    (error) => {
                      clearTimeout(timeoutId);
                      reject(error);
                    }, 
                    async () => {
                      clearTimeout(timeoutId);
                      try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadUrl);
                      } catch (err) {
                        reject(err);
                      }
                    }
                  );
                });
            } catch (firebaseErr: any) {
                console.warn("Firebase Storage upload failed/timed out, attempting server upload fallback:", firebaseErr);
                setUploadProgress(50); // Set progress to 50% for fallback phase
                
                const base64Data = await readFileAsBase64(file);
                const res = await fetch(getApiUrl('/api/v1/admin/upload-media'), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    fileData: base64Data,
                    fileName: file.name
                  })
                });

                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData.error || `Server responded with status ${res.status}`);
                }

                const data = await res.json();
                if (data.success && data.url) {
                  mediaUrl = data.url;
                } else {
                  throw new Error("Invalid response from fallback upload server");
                }
            }
        }

        if (!mediaUrl) {
            showStatus("Please upload a media file or provide a direct Media URL.", 'error');
            setUploading(false);
            return;
        }

        const adData = {
            ...newAd,
            url: newAd.url.trim() || '#', // Set optional target URL to # if empty
            mediaUrl,
            createdAt: new Date(),
            clicks: 0,
            views: 0,
            watchTime: 0
        };

        await addDoc(collection(db, 'ads'), adData);

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
        setUploadProgress(null);
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
                {file && (
                  <button 
                    onClick={() => setFile(null)} 
                    className="p-4 border border-rose-200 text-rose-500 rounded-2xl hover:bg-rose-50 transition font-bold text-sm whitespace-nowrap"
                    type="button"
                  >
                    Clear
                  </button>
                )}
            </div>
            <input type="number" placeholder="Reward (Points)" className="p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition" value={newAd.reward} onChange={e => setNewAd({...newAd, reward: Number(e.target.value)})} />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-bold">⚠️ Tips for Video or Banner Ad Uploads:</p>
            <p>Directly uploading files (especially large video files) can be slow on standard networks and may exceed platform limitations or timeout.</p>
            <p>For a flawless, lightning-fast experience, we highly recommend hosting your media on a service (e.g., Postimg, Cloudinary, Imgur, Google Drive, YouTube) and pasting the link in the <strong>"Or paste Direct Media URL"</strong> field instead of uploading.</p>
          </div>

          <button onClick={handleAddAd} disabled={uploading} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50">
            {uploading ? (
              uploadProgress !== null ? `Uploading: ${uploadProgress}%` : 'Processing/Uploading...'
            ) : <><Plus size={20} /> Create Ad</>}
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
                    {renderMediaElement(ad.mediaUrl, ad.title, ad.id, ad.type)}
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

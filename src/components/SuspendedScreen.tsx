import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, LogOut, Mail, AlertTriangle, Upload, X, CheckCircle2, Loader2, User, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Helper to compress and convert file to base64
const compressAndGetBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (file.size <= 400 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string || '');
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }
      
      const img = new Image();
      img.onload = async () => {
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch (e) {
          console.warn('[APPEAL_UPLOAD] Image decode failed:', e);
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (!width || !height) {
          resolve(dataUrl);
          return;
        }

        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let newWidth = width;
        let newHeight = height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            newHeight = Math.round((height * MAX_WIDTH) / width);
            newWidth = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            newWidth = Math.round((width * MAX_HEIGHT) / height);
            newHeight = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const isPng = file.type === 'image/png';
          
          if (!isPng) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, newWidth, newHeight);
          }
          
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          try {
            const outputType = isPng ? 'image/png' : 'image/jpeg';
            const quality = isPng ? undefined : 0.8;
            const base64Url = canvas.toDataURL(outputType, quality);
            resolve(base64Url);
          } catch (e) {
            resolve(dataUrl);
          }
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
};

export default function SuspendedScreen() {
  const { profile, logout } = useAuth();
  const reason = profile?.securityMetrics?.suspensionReason || 'Flagged for anomalous automated activity or violating our Terms of Service';

  // State
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeAppeal, setActiveAppeal] = useState<any>(null);
  const [loadingAppeal, setLoadingAppeal] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Sync profile details if they load later
  useEffect(() => {
    if (profile) {
      if (!fullName) setFullName(profile.displayName || '');
      if (!username) setUsername(profile.username || '');
      if (!email) setEmail(profile.email || '');
    }
  }, [profile]);

  // Subscribe to user's appeals
  useEffect(() => {
    if (!profile?.uid) {
      setLoadingAppeal(false);
      return;
    }

    const q = query(
      collection(db, 'appeals'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Find latest appeal based on createdAt (or fallback sorting in JS to avoid index requirements)
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setActiveAppeal(docs[0]);
      } else {
        setActiveAppeal(null);
      }
      setLoadingAppeal(false);
    }, (err) => {
      console.error("Failed to subscribe to appeals", err);
      setLoadingAppeal(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    if (!fullName.trim() || !username.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let base64Url = '';
      if (image) {
        base64Url = await compressAndGetBase64(image);
      }

      const appealRef = doc(collection(db, 'appeals'));
      
      const appealData = {
        appealId: appealRef.id,
        userId: profile.uid,
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        screenshot: base64Url,
        status: 'Pending',
        suspensionReason: reason,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(appealRef, appealData);
      setSuccess(true);
      setShowAppealForm(false);
    } catch (err: any) {
      console.error("Appeal submission failed:", err);
      setError(err.message || 'Failed to submit appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden font-sans">
      {/* Decorative gradient backgrounds to match Earnwise premium theme */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Glow lines in background */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

      <div className="w-full max-w-md my-8 relative">
        <AnimatePresence mode="wait">
          {/* SUCCESS SCREEN */}
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#090D1A]/80 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(16,185,129,0.1)] backdrop-blur-xl relative text-center space-y-6"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 rounded-t-3xl" />
              
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase italic tracking-tight">Appeal Submitted</h3>
                <p className="text-slate-400 text-xs">
                  Your suspension appeal has been delivered successfully. Our compliance team will review your account information, reason, and uploaded screenshot.
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-left text-slate-300">
                <p className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] mb-1">What happens next?</p>
                <p>1. We will verify the details of your suspension against platform activity logs.</p>
                <p className="mt-1">2. Appeals are typically evaluated within 12-24 hours.</p>
                <p className="mt-1">3. Once updated, you will see the changes reflected here instantly, and receive a notification.</p>
              </div>

              <button
                onClick={() => setSuccess(false)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
              >
                View Appeal Status
              </button>
            </motion.div>
          ) : showAppealForm ? (
            /* APPEAL FORM */
            <motion.div
              key="appeal-form"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="bg-[#090D1A]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 rounded-t-3xl" />

              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-amber-500" size={20} />
                  <h3 className="text-base font-black uppercase italic tracking-tight text-white">Submit Appeal</h3>
                </div>
                <button 
                  onClick={() => setShowAppealForm(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg bg-white/5 border border-white/5 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Appeal Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide a detailed explanation of why your account should be reactivated, or clarify any misunderstandings..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-semibold leading-relaxed text-slate-200 focus:border-amber-500 outline-none transition-colors resize-none"
                  />
                </div>

                {/* Optional Screenshot Upload */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 flex justify-between">
                    <span>Optional Screenshot Evidence</span>
                    <span className="text-slate-500">PNG or JPG</span>
                  </label>

                  {!preview ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('appeal-image-picker')?.click()}
                      className={`border-2 border-dashed ${
                        dragActive ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-black/20 hover:border-white/20'
                      } rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2`}
                    >
                      <input
                        type="file"
                        id="appeal-image-picker"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      <Upload size={20} className="text-slate-500" />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-slate-300">Drag & drop your screenshot, or <span className="text-amber-400">browse</span></p>
                        <p className="text-[9px] text-slate-500">Provide any proof that supports your appeal</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={preview} alt="Upload Preview" className="w-12 h-12 object-cover rounded-lg border border-white/10 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{image?.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{(image!.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer border border-red-500/20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Submitting Appeal...
                    </>
                  ) : (
                    'Transmit Appeal'
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* DEFAULT RESTRICTED PAGE */
            <motion.div 
              key="default"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="w-full bg-[#090D1A]/80 border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(239,68,68,0.1)] backdrop-blur-xl relative"
            >
              {/* Top Accent Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 rounded-t-3xl" />

              <div className="flex flex-col items-center text-center space-y-6">
                {/* Animated Warning Emblem */}
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 4,
                    ease: "easeInOut"
                  }}
                  className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  <ShieldAlert size={36} className="animate-pulse" />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase italic tracking-tight flex items-center justify-center gap-2">
                    Access Restricted
                  </h2>
                  <p className="text-red-400 font-black text-[10px] uppercase tracking-widest">
                    Account Suspended
                  </p>
                </div>

                <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-slate-300 text-xs leading-relaxed space-y-4 text-left">
                  <p>
                    Your Earnwise account has been suspended for violating our platform safety agreements and system policies.
                  </p>
                  
                  <div className="border-t border-white/5 pt-3 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <AlertTriangle size={10} className="text-amber-500" />
                      Suspension Reason
                    </span>
                    <p className="text-slate-200 font-mono text-[11px] bg-red-950/20 border border-red-900/20 px-2.5 py-2 rounded-lg italic">
                      "{reason}"
                    </p>
                  </div>
                </div>

                {/* Appeal status check or action */}
                {loadingAppeal ? (
                  <div className="w-full flex justify-center py-4 text-slate-500">
                    <Loader2 className="animate-spin text-slate-500" size={20} />
                  </div>
                ) : activeAppeal ? (
                  <div className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Latest Appeal Status</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        activeAppeal.status === 'Pending' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : activeAppeal.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {activeAppeal.status}
                      </span>
                    </div>

                    {activeAppeal.status === 'Pending' ? (
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        Your appeal has been submitted and is currently <span className="text-amber-400 font-bold">pending review</span>. We will review your case details and screenshot shortly. You'll receive an in-app notification when a decision has been reached.
                      </p>
                    ) : activeAppeal.status === 'Rejected' ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          Your previous appeal was <span className="text-rose-500 font-bold">Rejected</span>. If you have additional evidence or information to share, you can submit a new appeal.
                        </p>
                        <button
                          onClick={() => {
                            setMessage('');
                            setImage(null);
                            setPreview(null);
                            setError(null);
                            setShowAppealForm(true);
                          }}
                          className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Submit a New Appeal
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        Your appeal has been <span className="text-emerald-400 font-bold">Approved</span>! Your account is being reactivated. Please wait a moment...
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAppealForm(true)}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
                  >
                    <FileText size={14} />
                    Submit Appeal
                  </button>
                )}

                {/* Support block */}
                <div className="w-full text-slate-400 text-[11px] text-center space-y-1.5 border-t border-white/5 pt-4">
                  <p>
                    Reach out to our compliance helpdesk for support:
                  </p>
                  <div className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-bold">
                    <Mail size={12} />
                    <span>earnwise29@gmail.com</span>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  onClick={logout}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
                >
                  <LogOut size={12} />
                  Sign Out / Switch Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Camera, Image as ImageIcon, Send, ArrowLeft, Loader2, Info, CheckCircle2, AlertCircle, Coins, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import Layout from '../components/Layout';

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
          console.warn('[OFFER_PROOF] Image decode failed:', e);
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

export default function SubmitProof() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse parameters from search query
  const offerId = String(searchParams.get('offerId') || 'unknown').trim().toLowerCase();
  const offerTitle = searchParams.get('title') ? decodeURIComponent(searchParams.get('title')!) : 'Premium Offer';
  const payout = parseInt(searchParams.get('payout') || '0', 10);

  const [note, setNote] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    if (!image) {
      setError('Please upload a screenshot as proof of completion');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(10);

    try {
      // 1. Calculate dates and perform client-side pre-check to fail fast
      const now = new Date();
      const watMs = now.getTime() + (1 * 60 * 60 * 1000);
      const watDate = new Date(watMs);
      const watYear = watDate.getUTCFullYear();
      const watMonth = String(watDate.getUTCMonth() + 1).padStart(2, '0');
      const watDay = String(watDate.getUTCDate()).padStart(2, '0');
      const completedDateStr = `${watYear}-${watMonth}-${watDay}`;

      const watMidnightInUTC = Date.UTC(watYear, watDate.getUTCMonth(), watDate.getUTCDate(), 0, 0, 0, 0);
      const startOfDayTime = watMidnightInUTC - (1 * 60 * 60 * 1000);

      const q = query(
        collection(db, 'offer_submissions'),
        where('userId', '==', user.uid),
        where('offerId', '==', offerId)
      );
      
      const querySnapshot = await getDocs(q);
      let alreadySubmittedToday = false;
      const nowTime = now.getTime();
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const unlockField = data.unlockAt || data.unlock_at;

        if (unlockField) {
          let unlockDate: Date | null = null;
          if (typeof unlockField.toDate === 'function') {
            unlockDate = unlockField.toDate();
          } else if (unlockField.seconds !== undefined) {
            unlockDate = new Date(unlockField.seconds * 1000);
          } else if (unlockField._seconds !== undefined) {
            unlockDate = new Date(unlockField._seconds * 1000);
          } else {
            unlockDate = new Date(unlockField);
          }
          if (unlockDate && !isNaN(unlockDate.getTime())) {
            const isLockedByTime = nowTime < unlockDate.getTime();
            const isTodayByDate = data.completed_date === completedDateStr;
            if (isLockedByTime || isTodayByDate) {
              alreadySubmittedToday = true;
            }
          }
        } else if (data.completed_date) {
          if (data.completed_date === completedDateStr) {
            alreadySubmittedToday = true;
          }
        } else {
          let submittedDate: Date | null = null;
          const subField = data.submittedAt || data.submitted_at;
          if (subField) {
            if (typeof subField.toDate === 'function') {
              submittedDate = subField.toDate();
            } else if (subField.seconds !== undefined) {
              submittedDate = new Date(subField.seconds * 1000);
            } else if (subField._seconds !== undefined) {
              submittedDate = new Date(subField._seconds * 1000);
            } else {
              submittedDate = new Date(subField);
            }
          }
          if (submittedDate && !isNaN(submittedDate.getTime()) && submittedDate.getTime() >= startOfDayTime) {
            alreadySubmittedToday = true;
          }
        }
      });

      if (alreadySubmittedToday) {
        throw new Error('You have already completed this offer today. Please come back tomorrow.');
      }

      setUploadProgress(40);
      const base64Data = await compressAndGetBase64(image);
      
      if (!base64Data) {
        throw new Error('Failed to prepare and compress your screenshot');
      }

      setUploadProgress(70);

      // Submit via backend endpoint for strict security enforcement
      const response = await fetch(getApiUrl('/api/v1/offers/submit-proof'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userName: profile.username || profile.email?.split('@')[0] || 'User',
          userEmail: profile.email || '',
          offerId,
          offerTitle,
          payout,
          screenshotUrl: base64Data,
          note: note.trim(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to submit proof.');
      }

      // If backend is in client-fallback mode, perform client-side write
      if (responseData.fallback) {
        setUploadProgress(85);
        
        let unlockAtDate: Date;
        if (responseData.unlockAt) {
          unlockAtDate = new Date(responseData.unlockAt);
        } else {
          // Fallback server midnight calculation on client
          const sNow = new Date();
          const sUnlock = new Date(sNow);
          sUnlock.setHours(24, 0, 0, 0);
          unlockAtDate = sUnlock;
        }

        const submissionData = {
          userId: user.uid,
          userName: profile.username || profile.email?.split('@')[0] || 'User',
          userEmail: profile.email || '',
          offerId,
          offerTitle,
          payout,
          screenshotUrl: base64Data,
          note: note.trim(),
          status: 'pending',
          submittedAt: serverTimestamp(),
          unlockAt: Timestamp.fromDate(unlockAtDate),
          
          // Snake case representations for robust compatibility
          user_id: user.uid,
          offer_id: offerId,
          proof: base64Data,
          submitted_at: serverTimestamp(),
          completed_date: completedDateStr,
          unlock_at: Timestamp.fromDate(unlockAtDate),
        };

        await addDoc(collection(db, 'offer_submissions'), submissionData);
      }

      // Mark in localStorage as completed today for absolute zero latency
      try {
        const localCompletedKey = `completed_offers_${user.uid}`;
        const localCompletedObj = JSON.parse(localStorage.getItem(localCompletedKey) || '{}');
        const finalUnlockIso = responseData.unlockAt || new Date(new Date().setHours(24, 0, 0, 0)).toISOString();
        localCompletedObj[offerId] = finalUnlockIso;
        localStorage.setItem(localCompletedKey, JSON.stringify(localCompletedObj));
      } catch (e) {
        console.error("Failed to save to local storage:", e);
      }

      setUploadProgress(100);
      setSuccess(true);
      setTimeout(() => navigate('/offers'), 2000);
    } catch (err: any) {
      console.error('[OFFER_SUBMIT] Failed:', err);
      setError(err.message || 'Failed to submit offer proof. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Submit Offer Proof">
      <div className="p-3 sm:p-5 pb-24 space-y-5 sm:space-y-8 max-w-2xl mx-auto relative text-slate-100">
        <div className="premium-blur" />

        {/* Back Link */}
        <Link to="/offers" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-wider">
          <ArrowLeft size={14} /> Back to Premium Offers
        </Link>

        {/* Offer Info Banner */}
        <div className="bg-gradient-to-r from-blue-900/60 to-indigo-950/60 border border-blue-500/15 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Coins size={16} className="animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest">Active Offer Submission</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase italic tracking-tight leading-tight">
            {offerTitle}
          </h3>
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            Reward: {payout.toLocaleString()} Wisecoin
          </p>
        </div>

        {/* Submission Form */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form
                key="proof-form"
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Upload Section */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-1">
                    Upload Completion Screenshot <span className="text-rose-500">*</span>
                  </label>
                  
                  {!preview ? (
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={loading}
                      />
                      <div className="border-2 border-dashed border-white/10 group-hover:border-blue-500/50 rounded-3xl p-8 text-center transition-all bg-slate-950/20 group-hover:bg-blue-500/5">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-400 group-hover:text-blue-400 group-hover:scale-110 transition-all mb-3 border border-white/5">
                          <Camera size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-200">Tap to select or drop screenshot</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">PNG, JPG or WEBP (Max 15MB)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group bg-slate-950/50">
                      <img src={preview} alt="Screenshot proof" className="w-full max-h-96 object-contain p-2" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={removeImage}
                          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                          disabled={loading}
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Note */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-1">
                    Optional Note
                  </label>
                  <textarea
                    placeholder="Enter any details about your completion (e.g., username used, code received, etc.)"
                    className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white outline-none min-h-[100px] resize-none"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5"
                  >
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-xl relative overflow-hidden ${
                    loading
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-white/5'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Submitting Proof ({uploadProgress}%)
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Proof
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-500/15">
                  <CheckCircle2 size={40} className="text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-black text-white uppercase italic tracking-tight">
                    Proof Submitted!
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
                    Your screenshot has been uploaded and queued for admin review. You will be credited up to <span className="text-emerald-400 font-black">{payout.toLocaleString()} Wisecoin</span> upon manual approval.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Redirecting to Premium Offers...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security Rule Warning */}
        <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Manual Verification Security
            </h5>
            <p className="text-slate-500 text-[9px] leading-relaxed">
              Earnwise requires genuine screenshot proof for all direct tasks. Uploading fake, blank, or duplicate screenshots will trigger automatic bot detection and results in immediate wallet balance forfeitures and a permanent account ban.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

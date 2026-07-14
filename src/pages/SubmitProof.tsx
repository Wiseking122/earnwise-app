import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Camera, Image as ImageIcon, Send, ArrowLeft, Loader2, Info, CheckCircle2, AlertCircle, Coins, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../lib/config';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import Layout from '../components/Layout';
import { uploadProofImage, compressImage } from '../lib/uploadService';

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
  const [image, setImage] = useState<File | Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Do not compress here; uploadProofImage will handle it.
      setImage(file);
      setError(null);
      setPreview(URL.createObjectURL(file));

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
    setUploadProgress(5);

    try {
      if (offerId === 'unknown' || !offerId) {
        throw new Error('Offer ID is missing. Please go back to the offers page and try again.');
      }

      setUploadProgress(10);

      // 1. Calculate dates (for local reference if needed)
      const now = new Date();
      
      // 2. Upload image (compression happens inside uploadProofImage)
      console.log('[UPLOAD] Starting uploadProofImage...');
      const uploadResult = await uploadProofImage(
        image, 
        user.uid, 
        offerId, 
        'offer-proofs',
        (progress) => {
          // Map 0-100% upload progress to 15-85% UI progress range
          // If it's just started (progress 0), we show 15%
          const uiProgress = Math.min(85, Math.floor(15 + (progress * 0.7)));
          setUploadProgress(uiProgress);
        }
      );
      
      const storageUrl = uploadResult.downloadUrl;
      console.log('[UPLOAD] Upload success, URL retrieved');
      setUploadProgress(88);

      // 3. Submit via backend endpoint
      console.log('[OFFER_SUBMIT] Sending request to:', getApiUrl('/api/v1/offers/submit-proof'));
      
      let response;
      try {
        response = await fetch(getApiUrl('/api/v1/offers/submit-proof'), {
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
            screenshotUrl: storageUrl,
            note: note.trim(),
          }),
        });
      } catch (fetchErr: any) {
        console.error('[OFFER_SUBMIT] Network/Fetch Error:', fetchErr);
        throw new Error(`Connection Error: Could not reach the server. Please check your internet or try again later.`);
      }

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to submit proof.');
      }

      setUploadProgress(90);

      // If backend is in client-fallback mode, perform client-side write
      if (responseData.fallback) {
        let unlockAtDate: Date;
        if (responseData.unlockAt) {
          unlockAtDate = new Date(responseData.unlockAt);
        } else {
          const sNow = new Date();
          const sUnlock = new Date(sNow);
          sUnlock.setHours(24, 0, 0, 0);
          unlockAtDate = sUnlock;
        }

        const now = new Date();
        const watMs = now.getTime() + (1 * 60 * 60 * 1000);
        const watDate = new Date(watMs);
        const watYear = watDate.getUTCFullYear();
        const watMonth = String(watDate.getUTCMonth() + 1).padStart(2, '0');
        const watDay = String(watDate.getUTCDate()).padStart(2, '0');
        const completedDateStr = `${watYear}-${watMonth}-${watDay}`;

        const submissionData = {
          userId: user.uid,
          userName: profile.username || profile.email?.split('@')[0] || 'User',
          userEmail: profile.email || '',
          offerId,
          offerTitle,
          payout,
          screenshotUrl: storageUrl,
          note: note.trim(),
          status: 'pending',
          submittedAt: serverTimestamp(),
          unlockAt: Timestamp.fromDate(unlockAtDate),
          user_id: user.uid,
          offer_id: offerId,
          proof: storageUrl,
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
            Reward: {payout.toLocaleString()} WiseCoins
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
                    Your screenshot has been uploaded and queued for admin review. You will be credited up to <span className="text-emerald-400 font-black">{payout.toLocaleString()} WiseCoins</span> upon manual approval.
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Image as ImageIcon, Send, ArrowLeft, Loader2, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const compressAndGetBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    // If the file size is already reasonably small (under 400KB), 
    // bypass any canvas manipulation entirely to avoid browser-specific canvas bugs.
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
        // Guarantee image is fully decoded before trying to draw it onto canvas
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch (e) {
          console.warn('[SURVEY] Image decode failed:', e);
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (!width || !height) {
          console.warn('[SURVEY] Image dimensions are zero, using original data URL');
          resolve(dataUrl);
          return;
        }

        // We use 1200px maximum width/height to make sure the screenshot is extremely clear 
        // for text/survey proofs, while maintaining a tiny footprint
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
            // Fill background with white to support transparency (PNG/WebP screenshots) 
            // and prevent them turning completely black when converted to JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, newWidth, newHeight);
          }
          
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          try {
            // Preserving the original format (PNG or JPEG) is much better for high contrast text screenshots
            const outputType = isPng ? 'image/png' : 'image/jpeg';
            const quality = isPng ? undefined : 0.8;
            const base64Url = canvas.toDataURL(outputType, quality);
            resolve(base64Url);
          } catch (e) {
            console.warn('[SURVEY] Canvas toDataURL failed, using fallback:', e);
            resolve(dataUrl);
          }
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        console.warn('[SURVEY] Image loading failed, falling back to original');
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

const SurveySubmission = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [surveyTitle, setSurveyTitle] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const title = searchParams.get('title');
    if (title) {
      setSurveyTitle(decodeURIComponent(title));
    }
    const payout = searchParams.get('payout');
    if (payout) {
      setNote(prev => prev || `Expected payout: ${payout} WiseCoins`);
    }
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 2) {
      setError('You can only upload up to 2 screenshots');
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    });

    setImages([...images, ...newFiles]);
    setPreviews([...previews, ...newPreviews]);
    setError(null);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...previews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[SURVEY] Submit button clicked');
    if (!profile) {
      console.error('[SURVEY] No user profile found');
      return;
    }
    if (images.length === 0) {
      console.warn('[SURVEY] No images selected');
      setError('Please upload at least one screenshot as proof');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(10);
    console.log('[SURVEY] Starting submission protocol for user:', profile.uid);

    try {
      // 1. Compress images client-side directly into optimized base64 data URLs
      const imageUrls: string[] = [];
      const totalImages = images.length;
      
      for (let i = 0; i < totalImages; i++) {
        const file = images[i];
        console.log(`[SURVEY] Optimizing image ${i + 1}/${totalImages}: ${file.name}`);
        setUploadProgress(10 + Math.round((i / totalImages) * 60));
        
        const base64Data = await compressAndGetBase64(file);
        if (base64Data) {
          imageUrls.push(base64Data);
        } else {
          throw new Error(`Failed to optimize and prepare screenshot: ${file.name}`);
        }
      }

      setUploadProgress(80);
      console.log('[SURVEY] All screenshots compressed successfully. Total size estimation:', imageUrls.reduce((acc, str) => acc + str.length, 0), 'bytes');
      console.log('[SURVEY] Creating survey submission in Firestore...');

      // 2. Create submission document with base64 screenshots inside Firestore
      const submissionData = {
        userId: profile.uid,
        userName: profile.username || profile.email?.split('@')[0] || 'User',
        userEmail: profile.email || '',
        surveyTitle: surveyTitle.trim(),
        note: note.trim(),
        screenshots: imageUrls,
        status: 'pending',
        submittedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'survey_submissions'), submissionData);
      console.log('[SURVEY] Submission document created successfully');

      setUploadProgress(100);
      setSuccess(true);
      setTimeout(() => navigate('/survey-history'), 2000);
    } catch (err: any) {
      console.error('[SURVEY] Submission failed:', err);
      setError(err.message || 'Failed to submit proof. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] p-4 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center max-w-md w-full backdrop-blur-xl"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-display font-black text-white mb-2">Submission Received!</h2>
          <p className="text-slate-400 mb-8">
            Your survey proof has been submitted successfully. Our admin team will verify it and credit your Wise Coins soon.
          </p>
          <button
            onClick={() => navigate('/tasks')}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            Back to Surveys
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-display font-black">Submit Survey Proof</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Info Box */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-4">
          <div className="text-amber-500 shrink-0">
            <Info size={20} />
          </div>
          <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed">
            Please upload clear screenshots showing the survey completion page. Our team reviews all proofs manually to award Wise Coins (WC).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Survey Title */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Survey Title (Optional)</label>
            <input
              type="text"
              value={surveyTitle}
              onChange={(e) => setSurveyTitle(e.target.value)}
              placeholder="e.g. Shopping Habits Survey"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Optional Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional details about the completion..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Proof Screenshots (Max 2)</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <AnimatePresence>
                {previews.map((preview, index) => (
                  <motion.div
                    key={preview}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group"
                  >
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/60 backdrop-blur-md p-1 rounded-md text-white/80 hover:text-white transition-colors"
                    >
                      <AlertCircle size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {images.length < 2 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/10 hover:border-emerald-500/50 transition-all text-slate-400 hover:text-emerald-400">
                  <Camera size={20} />
                  <span className="text-[10px] font-black uppercase">Add Proof</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-3 text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || images.length === 0}
            className="w-full py-4 bg-emerald-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] relative overflow-hidden"
          >
            {loading ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  <span>Submitting Proof... {Math.round(uploadProgress)}%</span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Send size={20} />
                <span>Submit Survey Proof</span>
              </div>
            )}
          </button>
        </form>

        <div className="pt-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
            Verified Submissions are usually processed within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SurveySubmission;

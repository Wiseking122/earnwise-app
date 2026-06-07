import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { COURSES } from '../../data/courses';
import { 
  ArrowLeft, 
  BookOpen, 
  Edit2, 
  Save, 
  Image, 
  ExternalLink, 
  X, 
  Search,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});

  // Listen to Firestore overrides in real-time
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, 'course_overrides'), (snap) => {
      const overrides: Record<string, string> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.image) {
          overrides[doc.id] = data.image;
        }
      });
      setImageOverrides(overrides);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'course_overrides');
    });

    return unsub;
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const compressAndSetImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 800; // Optimal course banner size

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 quality to keep size under Firestore document limit (~40-70KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImageUrlInput(dataUrl);
          showToast('Image processed and optimized successfully!');
        }
      };
      img.onerror = () => {
        showToast('Failed to load image file. Try another.', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      showToast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      compressAndSetImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetImage(e.target.files[0]);
    }
  };

  const filteredCourses = COURSES.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCourse = COURSES.find(c => c.id === selectedCourseId);

  // Set input field value when choosing a course
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    const existingOverride = imageOverrides[courseId] || '';
    const baseCourse = COURSES.find(c => c.id === courseId);
    setImageUrlInput(existingOverride || baseCourse?.image || '');
  };

  // Persists the image URL override to Firestore & localStorage
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    setIsSaving(true);
    const cleanedImage = imageUrlInput.trim();

    // 1. Optimistic Local Save (Ensures immediate local feedback even if DB fails or lacks connection/admin)
    try {
      localStorage.setItem(`course_override_${selectedCourseId}`, cleanedImage);
      setImageOverrides(prev => ({
        ...prev,
        [selectedCourseId]: cleanedImage
      }));
    } catch (localErr) {
      console.error('Local storage failure:', localErr);
    }

    try {
      // 2. Transmit to Cloud Firestore for permanent decentralized synchronization
      const overrideRef = doc(db, 'course_overrides', selectedCourseId);
      await setDoc(overrideRef, { 
        image: cleanedImage,
        updatedAt: new Date()
      }, { merge: true });

      showToast('Course asset committed & synchronized successfully!');
      setSelectedCourseId(null);
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      // Inform client of database rules/permissions constraint but acknowledge local save succeeded
      showToast(`Saved locally, but Sync failed: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title="Admin Course Cover Management">
      <div className="p-4 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="font-black text-xl tracking-tight">Curriculum Gallery</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Deploy Course Banners & Cover Images</p>
          </div>
        </div>

        {/* Global Toast Alert */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl flex items-center gap-3 border text-xs font-bold leading-normal ${
                toast.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                  : 'bg-red-50 text-red-800 border-red-100'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="flex-1">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search academy courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
          />
        </div>

        {/* Courses Matrix */}
        <div className="grid grid-cols-1 gap-4">
          {filteredCourses.map((course) => {
            const hasOverride = !!imageOverrides[course.id];
            const currentImg = imageOverrides[course.id] || course.image;

            return (
              <div 
                key={course.id}
                className="bg-white border border-slate-100 rounded-3xl p-4 flex gap-4 items-center shadow-xs hover:shadow-md transition-all"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                  <img src={currentImg} alt={course.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {course.category}
                    </span>
                    {hasOverride && (
                      <span className="bg-emerald-50 text-emerald-700 font-bold text-[7px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-100">
                        Custom Cover Active
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-800 text-sm truncate">{course.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{course.incomePotential}</p>
                  
                  {hasOverride && (
                    <p className="text-[9px] font-mono text-blue-500 truncate mt-1">
                      {imageOverrides[course.id]}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSelectCourse(course.id)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-3 rounded-2xl transition-colors border border-slate-100"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Course Editing Modal / Overlay Form */}
        <AnimatePresence>
          {selectedCourse && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-end justify-center p-4">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-t-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border-t border-slate-100 pb-8"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Override Cover Asset</span>
                  </div>
                  <button 
                    onClick={() => setSelectedCourseId(null)}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form Container */}
                <form onSubmit={handleSaveOverride} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-tight uppercase italic">
                      {selectedCourse.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      Upload from your machine or paste an online asset link directly to update instantly.
                    </p>
                  </div>

                  {/* File Upload Dropzone (Drag and Drop / Click to Upload) */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                      Upload Course Cover File
                    </label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                      className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50/50 text-blue-600' 
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <input 
                        type="file"
                        id="file-upload-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Upload size={28} className={isDragging ? 'text-blue-500 animate-bounce' : 'text-slate-400'} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          {isDragging ? 'Drop Image Here' : 'Drag & drop image here, or browse'}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          PNG, JPG, WEBP (Auto-Compressed for instant load)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* cover image URL field */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                      Course Cover Image URL or Base64
                    </label>
                    <div className="relative">
                      <Image className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        required
                        placeholder="https://images.unsplash.com/your-custom-image-url..."
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Real-time Preview */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                      Live Cover Asset Preview
                    </span>
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-2 rounded-2xl aspect-video overflow-hidden group relative">
                      {(imageUrlInput.trim().startsWith('data:image/') || imageUrlInput.trim().match(/^https?:\/\//)) ? (
                        <img 
                          src={imageUrlInput.trim()} 
                          alt="Live cover preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1.5 p-4 text-center">
                          <Image size={24} />
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Enter valid HTTP/HTTPS URL or Upload Cover File
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCourseId(null)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Bypass
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || !imageUrlInput.trim()}
                      className="flex-1 py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-35"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save size={14} />
                          <span>Commit Assets</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

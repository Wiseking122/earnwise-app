import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Star, 
  TrendingUp, 
  ArrowRight,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { COURSES } from '../data/courses';
import { CoursePurchase } from '../types';

export default function Academy() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [purchasedCourses, setPurchasedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Freelancing', 'AI Strategy', 'E-commerce', 'Writing', 'Design', 'Marketing', 'Photography', 'Education'];

  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    try {
      COURSES.forEach(c => {
        const cached = localStorage.getItem(`course_override_${c.id}`);
        if (cached) {
          initial[c.id] = cached;
        }
      });
    } catch (_) {}
    return initial;
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'coursePurchases'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPurchasedCourses(snap.docs.map(doc => (doc.data() as CoursePurchase).courseId));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coursePurchases');
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // Real-time listener for course image overrides
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, 'course_overrides'), (snap) => {
      const overrides: Record<string, string> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.image) {
          overrides[doc.id] = data.image;
          try {
            localStorage.setItem(`course_override_${doc.id}`, data.image);
          } catch (_) {}
        }
      });
      setImageOverrides(overrides);
    }, (error) => {
      console.warn("Could not load real-time course cover overrides: ", error);
    });

    return unsub;
  }, [user]);

  const filteredCourses = useMemo(() => {
    return COURSES.map(c => {
      if (imageOverrides[c.id]) {
        return { ...c, image: imageOverrides[c.id] };
      }
      return c;
    }).filter(c => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'All' || c.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category, imageOverrides]);

  return (
    <Layout>
      <div className="px-4 pt-4 pb-20 space-y-5">
        {/* Header Section */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-blue-600">
            <BookOpen size={14} />
            <span className="text-[9px] font-black uppercase tracking-wider">Elite Learning Hub</span>
          </div>
          <h2 className="text-2xl font-display font-black text-slate-900 uppercase italic leading-none">
            Revenue <span className="text-blue-600">Academy</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-medium max-w-[280px]">
            Master high-income skills designed for the modern student earner.
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
           <div className="flex-shrink-0 bg-blue-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 shadow-md">
              <Star size={16} className="fill-white" />
              <div>
                <p className="text-[7px] font-black uppercase opacity-70">Enrolled</p>
                <p className="text-xs font-display font-black">{purchasedCourses.length} Courses</p>
              </div>
           </div>
           <div className="flex-shrink-0 bg-white border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 shadow-xs">
              <TrendingUp size={16} className="text-emerald-500" />
              <div>
                <p className="text-[7px] font-black uppercase text-slate-400">Total Value</p>
                <p className="text-xs font-display font-black text-slate-900">₦210k+</p>
              </div>
           </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search curriculum..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 transition-all shadow-xs"
            />
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  category === cat 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course, index) => {
              const isAdmin = profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com';
              const isOwned = purchasedCourses.includes(course.id) || isAdmin;
              return (
                <motion.div
                  layout
                  key={course.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => navigate(`/academy/course/${course.id}`)}
                  className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs hover:shadow-sm transition-all group"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <div className={`px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider backdrop-blur-md border ${
                        isOwned 
                          ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30' 
                          : 'bg-white/20 text-white border-white/30'
                      }`}>
                        {isAdmin ? 'Admin Access' : (isOwned ? 'Enrolled' : course.category)}
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                       <h3 className="text-white font-display font-black text-base uppercase italic leading-tight">{course.title}</h3>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1 text-slate-500">
                          <Briefcase size={11} />
                          <span className="text-[8.5px] font-bold uppercase">{course.incomePotential}</span>
                       </div>
                       {!isOwned && (
                         <div className="flex items-center gap-1 text-blue-600">
                            <DollarSign size={11} />
                            <span className="text-xs font-display font-black">{course.price.toLocaleString()}</span>
                         </div>
                       )}
                    </div>

                    <p className="text-[9.5px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <button 
                      className={`w-full py-2.5 rounded-lg font-black uppercase tracking-wider text-[8.5px] flex items-center justify-center gap-1.5 transition-all ${
                        isOwned 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {isOwned ? 'Resume Learning' : 'Enroll Now'}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredCourses.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No strategies found matching search criteria</p>
            </div>
          )}
        </div>

        <div className="pt-6 pb-12 text-center border-t border-slate-100">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Earnwise Elite Academy • Education is Leverage</p>
        </div>
      </div>
    </Layout>
  );
}

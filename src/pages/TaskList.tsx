import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task, TaskType } from '../types';
import { useAuth } from '../context/AuthContext';
import { PLANS } from '../constants/plans';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Dices,
  Play, 
  Target, 
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import AdsSection from '../AdsSection';
import { CpxOfferwall } from '../components/CpxOfferwall';
import { CpxWidget } from '../components/CpxWidget';

const CATEGORIES: { id: TaskType | 'all', label: string, icon: any, color: string }[] = [
  { id: 'all', label: 'All Jobs', icon: SlidersHorizontal, color: 'bg-slate-900' },
  { id: 'survey', label: 'Surveys', icon: Search, color: 'bg-orange-500' },
  { id: 'ad', label: 'Ads Center', icon: Play, color: 'bg-emerald-500' },
  { id: 'app_download', label: 'Apps & Jobs', icon: Filter, color: 'bg-blue-500' },
  { id: 'referral', label: 'Affiliate', icon: ShieldCheck, color: 'bg-purple-500' },
];

export default function TaskList() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') as TaskType | 'all' || 'all';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TaskType | 'all'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  const taskCounts = {
    survey: 'LIVE', 
    ad: 9, 
    app_download: tasks.filter(t => t.type === 'app_download').length,
    referral: tasks.filter(t => t.type === 'referral').length,
  };

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('status', '==', 'active'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let result = [...tasks];
    const now = Date.now();
    
    // Filter out expired tasks
    result = result.filter(t => {
      if (!t.expiresAt) return true;
      const expiresAtMillis = t.expiresAt?.toMillis ? t.expiresAt.toMillis() : new Date(t.expiresAt).getTime();
      return expiresAtMillis > now;
    });

    if (activeCategory !== 'all') {
      result = result.filter(t => t.type === activeCategory);
    }
    if (searchQuery) {
      result = result.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredTasks(result);
  }, [tasks, activeCategory, searchQuery]);

  return (
    <Layout title="Premium Jobs">
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />
        
        {/* Search & Statistics Header */}
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search premium opportunities..."
              className="w-full bg-white border border-slate-100 rounded-[2rem] py-4 pl-14 pr-6 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-slate-900 uppercase tracking-tighter text-xl">Job Categories</h3>
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{filteredTasks.length} Live</span>
            </div>
          </div>
        </div>

        {/* Main Category Grid */}
        <div className="grid grid-cols-2 gap-4 pb-2">
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-4 sm:p-5 rounded-3xl sm:rounded-[2rem] border transition-all flex flex-col items-start gap-4 relative overflow-hidden group ${
                  activeCategory === cat.id 
                    ? 'bg-slate-950 border-slate-900 shadow-2xl scale-[1.02]' 
                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg shadow-sm'
                }`}
              >
                 <div className={`absolute top-4 right-4 bg-blue-600 text-white text-[8px] font-black min-w-[1.5rem] h-6 px-1.5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse z-10`}>
                   {cat.id === 'ad' ? taskCounts.ad : taskCounts[cat.id as keyof typeof taskCounts] || 0}
                 </div>
                 
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 relative z-10 ${
                  activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'
                }`}>
                   <cat.icon size={22} className={activeCategory === cat.id ? 'fill-white' : ''} />
                </div>
                
                <div className="relative z-10">
                  <h4 className={`text-sm font-display font-black uppercase tracking-tight italic ${
                    activeCategory === cat.id ? 'text-white' : 'text-slate-900'
                  }`}>
                    {cat.label}
                  </h4>
                  <p className={`text-[9px] font-bold uppercase tracking-widest leading-none mt-1 ${
                    activeCategory === cat.id ? 'text-slate-500' : 'text-slate-400'
                  }`}>Explore Global</p>
                </div>

                {activeCategory === cat.id && (
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }} />
                )}
             </button>
            ))}
        </div>

        {/* Filter Toggle */}
        <div className="flex gap-3 px-1">
            <button
               onClick={() => setActiveCategory('all')}
               className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                 activeCategory === 'all' 
                   ? 'bg-slate-950 text-white border-slate-900' 
                   : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
               }`}
            >
              Show All Network Tasks
            </button>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {activeCategory === 'ad' && <AdsSection onBack={() => setActiveCategory('all')} />}
          {activeCategory === 'survey' && user && (
            <div className="space-y-4">
               <CpxOfferwall userId={user.uid} userName={profile?.displayName} userEmail={user?.email || undefined} />
            </div>
          )}
          
          {loading ? (
            [1, 2, 3].map(i => <div key={`skeleton-${i}`} className="h-32 bg-white rounded-[2.5rem] animate-pulse border border-slate-100 shadow-sm" />)
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <Link 
                key={task.id || index} 
                to={`/tasks/${task.id}`}
                className="block group bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }} />
                
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
                      <Zap size={24} className="group-hover:fill-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.type.replace('_', ' ')} Network</span>
                        {task.isRepeatable && (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                             <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                             <span className="text-[8px] font-black uppercase tracking-tighter">Unlimited</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-display font-black text-slate-900 text-lg leading-tight uppercase italic group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-2xl font-display font-black text-slate-900 tracking-tighter">
                        ₦{((task.userPayout || 0) * multiplier).toFixed(0)}
                      </p>
                      {multiplier > 1 ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 mt-1">
                           <TrendingUp size={10} />
                           <span className="text-[9px] font-black uppercase tracking-tighter">+{((multiplier - 1) * 100).toFixed(0)}% Boost</span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Verified Rate</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (activeCategory === 'ad' || activeCategory === 'survey') ? null : (
            <div className="text-center py-24 bg-white border border-slate-100 rounded-[3rem] shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.02),transparent)]" />
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm relative z-10">
                <Target size={32} className="text-slate-300" />
              </div>
              <h3 className="font-display font-black text-slate-900 text-2xl uppercase tracking-tighter relative z-10 italic">No Jobs Found</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 relative z-10">Check back later for network refresh</p>
            </div>
          )}
        </div>

        {/* Floating Premium Activity Button */}
        <Link 
          to="/lucky-spin"
          className="fixed bottom-32 right-6 bg-slate-950 text-white w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl z-50 group hover:rotate-12 active:scale-90 transition-all border border-white/10"
        >
           <Dices size={28} className="group-hover:scale-110 transition-transform" />
           <div className="absolute right-20 bg-slate-950/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none border border-white/5 shadow-2xl">
              Spin to Win ₦500
           </div>
           <motion.div 
             animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
             transition={{ repeat: Infinity, duration: 2 }}
             className="absolute inset-0 bg-blue-500 rounded-3xl -z-10"
           />
        </Link>
      </div>
    </Layout>
  );
}

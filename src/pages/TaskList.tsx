import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
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
  Video,
  Image as ImageIcon,
  Target, 
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { MonetagBanner } from '../components/MonetagBanner';
import { AdsterraBanner } from '../components/AdsterraBanner';
import AdsSection from '../AdsSection';
import { CpxOfferwall } from '../components/CpxOfferwall';
import { BitcoTasksWall } from '../components/BitcoTasksWall';
import VideoAdsSection from '../components/VideoAdsSection';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';
import { MaintenanceModal } from '../components/MaintenanceModal';

const CATEGORIES: { id: TaskType | 'all', label: string, icon: any, color: string, subtext?: string }[] = [
  { id: 'all', label: 'All Jobs', icon: SlidersHorizontal, color: 'bg-slate-900' },
  { id: 'survey', label: 'Surveys and Offer', icon: Search, color: 'bg-orange-500' },
  { id: 'ad', label: 'Ads Center', icon: Play, color: 'bg-emerald-500' },
  { id: 'referral', label: 'Banner Ads', icon: ShieldCheck, color: 'bg-purple-500' },
];

export default function TaskList() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  useEffect(() => {
    // Ad category effect logic
  }, [category]);
  
  const initialCategory = (category as TaskType | 'all') || 'all';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TaskType | 'all'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [isZeydooModalOpen, setZeydooModalOpen] = useState(false);
  const [showRestriction, setShowRestriction] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("🚧 Task Marketplace Upgrade Regular tasks are temporarily unavailable while we add better sponsored campaigns. Please continue with Surveys for now. Thank you for your patience!");
  const [adsMaintenanceMode, setAdsMaintenanceMode] = useState(false);
  const [isRenewalRequired, setIsRenewalRequired] = useState(true);

  useEffect(() => {
    // Listen for Ads Configuration
    const adsConfigUnsub = onSnapshot(doc(db, 'system_settings', 'ads_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdsMaintenanceMode(data.adsMaintenanceMode ?? false);
        setMaintenanceMessage(data.maintenanceMessage ?? maintenanceMessage);
      }
    });

    return () => adsConfigUnsub();
  }, []);

  useEffect(() => {
    // Prevent direct access to ad category via URL if maintenance is active
    if (activeCategory === 'ad' && adsMaintenanceMode) {
      setActiveCategory('survey');
      setShowMaintenance(true);
    }
  }, [activeCategory, adsMaintenanceMode]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'payouts'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isRenewalRequired !== undefined) {
          setIsRenewalRequired(!!data.isRenewalRequired);
        }
      }
    });
    return () => unsub();
  }, []);

  const isPlanExpired = useMemo(() => {
    if (!profile?.planEndDate || profile?.plan === 'free' || profile?.role === 'admin' || user?.email === 'wiseking7890@gmail.com') return false;
    const end = profile.planEndDate.toDate ? profile.planEndDate.toDate() : new Date(profile.planEndDate);
    return new Date() > end;
  }, [profile?.planEndDate, profile?.plan, profile?.role, user?.email]);

  const isUserFree = useMemo(() => {
    const baseFree = profile?.plan === 'free' && profile?.role !== 'admin' && user?.email !== 'wiseking7890@gmail.com';
    if (baseFree) return true;
    if (isRenewalRequired && isPlanExpired) return true;
    return false;
  }, [profile?.plan, profile?.role, user?.email, isRenewalRequired, isPlanExpired]);

  const taskCounts = {
    survey: 'LIVE', 
    ad: 'LIVE', 
    referral: tasks.filter(t => t.type === 'referral').length,
  };

  const userPlan = profile?.plan || 'free';
  const planDetails = PLANS.find(p => p.id === userPlan);
  const multiplier = planDetails?.multiplier || 1.0;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('status', '==', 'active'));
    
    getDocs(q)
      .then((snap) => {
        const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(taskList);
        setLoading(false);
      })
      .catch((error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
        setLoading(false);
      });
  }, [user]);

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
      <div className="p-3 sm:p-5 pb-24 space-y-5 sm:space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />
        
        {/* Search & Statistics Header */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search premium opportunities..."
              className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-11 pr-5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display font-black text-slate-900 uppercase tracking-tighter text-lg">Job Categories</h3>
              <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{filteredTasks.length} Live</span>
            </div>
          </div>
        </div>

        {/* Main Category Grid */}
        <div className="grid grid-cols-2 gap-3 pb-1">
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                data-category={cat.id}
                onClick={() => {
                  if (cat.id === 'ad' && adsMaintenanceMode) {
                    setShowMaintenance(true);
                    return;
                  }
                  if (isUserFree && cat.id !== 'all' && cat.id !== 'referral') {
                    setShowRestriction(true);
                    return;
                  }
                  setActiveCategory(cat.id);
                }}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-start gap-3 relative overflow-hidden group ${
                  activeCategory === cat.id
                    ? 'bg-slate-950 border-slate-900 shadow-lg scale-[1.01]' 
                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md shadow-sm'
                }`}
              >
                 <div className={`absolute top-3 right-3 bg-blue-600 text-white text-[7.5px] font-black min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse z-10`}>
                    {cat.id === 'ad' ? taskCounts.ad : taskCounts[cat.id as keyof typeof taskCounts] || 0}
                 </div>
                 
                 <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-500 relative z-10 ${
                   activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'
                 }`}>
                    <cat.icon size={18} className={activeCategory === cat.id ? 'fill-white' : ''} />
                 </div>
                 
                 <div className="relative z-10">
                   <h4 className={`text-xs font-display font-black uppercase tracking-tight italic ${
                     activeCategory === cat.id ? 'text-white' : 'text-slate-900'
                   }`}>
                     {cat.label}
                   </h4>
                   <p className={`text-[8px] font-bold uppercase tracking-widest leading-none mt-1 ${
                     activeCategory === cat.id ? 'text-slate-500' : 'text-slate-400'
                   }`}>{cat.subtext || 'Explore Global'}</p>
                 </div>

                 {activeCategory === cat.id && (
                   <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }} />
                 )}
              </button>
            ))}
        </div>

        {/* Filter Toggle */}
        <div className="flex gap-2 px-1">
            <button
               onClick={() => setActiveCategory('all')}
               className={`px-4 py-2 rounded-xl text-[8.5px] sm:text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                 activeCategory === 'all' 
                   ? 'bg-slate-950 text-white border-slate-900' 
                   : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
               }`}
            >
              Show All Network Tasks
            </button>
        </div>

        {/* Task List */}
        <div className="space-y-3.5">
          {activeCategory === 'ad' && <AdsSection onBack={() => setActiveCategory('all')} />}
          {activeCategory === 'survey' && user && (
            <div className="space-y-6">
               <VideoAdsSection userId={user.uid} />
               
               <CpxOfferwall userId={user.uid} userName={profile?.displayName} userEmail={user?.email || undefined} />
               <BitcoTasksWall userId={user.uid} />

               <Link 
                 to="/submit-survey"
                 className="block w-full p-6 bg-linear-to-br from-amber-500 to-yellow-600 rounded-[2rem] text-center shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all group relative overflow-hidden"
               >
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
                 <div className="relative z-10 flex flex-col items-center gap-2">
                   <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-1">
                     <ImageIcon size={24} className="group-hover:rotate-12 transition-transform duration-500" />
                   </div>
                   <h3 className="text-xl font-display font-black text-white uppercase italic tracking-tight">Submit Survey / Offer Proof</h3>
                   <p className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none">Complete surveys & premium offers, then upload screenshot proof to earn Wise Coins</p>
                 </div>
               </Link>
            </div>
          )}

          {activeCategory === 'referral' && (
            <div className="space-y-6">
              {/* Adsterra Banners */}
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="font-display font-black text-xl text-slate-900 uppercase italic tracking-tight">Adsterra Display 01</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Premium Native Display Ad</p>
                </div>
                <AdsterraBanner type="native" />
              </div>

              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="font-display font-black text-xl text-slate-900 uppercase italic tracking-tight">Adsterra Display 02</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Premium Sidebar Display Ad</p>
                </div>
                <div className="flex justify-center">
                  <AdsterraBanner type="iframe" />
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            [1, 2, 3].map(i => <div key={`skeleton-${i}`} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100 shadow-sm" />)
          ) : filteredTasks.length > 0 ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="space-y-3.5"
            >
              {filteredTasks.map((task, index) => {
                const isFree = isUserFree;
                const cardContent = (
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex gap-3 items-center min-w-0 flex-1 mr-2">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500 shrink-0">
                        {isFree ? <Lock size={18} className="text-amber-500" /> : <Zap size={18} className="group-hover:fill-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{task.type.replace('_', ' ')} Network</span>
                          {task.isRepeatable && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-100 shrink-0">
                              <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                              <span className="text-[7.5px] font-black uppercase tracking-tighter">Unlimited</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-display font-black text-slate-900 text-sm sm:text-base leading-tight uppercase italic group-hover:text-blue-600 transition-colors truncate text-left">
                          {task.title}
                        </h4>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="flex flex-col items-end">
                        {isFree ? (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-xl border border-amber-100">
                            <Lock size={10} className="stroke-[3px]" />
                            <span className="text-[9px] font-black uppercase tracking-tight">LOCKED</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-base sm:text-2xl font-display font-black text-slate-900 tracking-tighter">
                              ₦{((task.userPayout || 0) * multiplier).toFixed(0)}
                            </p>
                            {multiplier > 1 ? (
                              <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100 mt-0.5">
                                 <TrendingUp size={8} />
                                 <span className="text-[7.5px] font-black uppercase tracking-tighter">+{((multiplier - 1) * 100).toFixed(0)}% Boost</span>
                              </div>
                            ) : (
                              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">Verified Rate</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <motion.div key={task.id || index} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                    {isFree ? (
                      <button 
                        onClick={() => setShowRestriction(true)}
                        className="w-full text-left block group bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:border-amber-200 transition-all active:scale-[0.98] relative overflow-hidden cursor-pointer"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)' }} />
                        {cardContent}
                      </button>
                    ) : (
                      <Link 
                        to={`/tasks/${task.id}`}
                        className="block group bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:border-blue-200 transition-all active:scale-[0.98] relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }} />
                        {cardContent}
                      </Link>
                    )}
                    {(index === 0 || index === 1 || index === 2) && <MonetagBanner />}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (activeCategory === 'ad' || activeCategory === 'survey' || activeCategory === 'video' || activeCategory === 'referral') ? null : (
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

      {/* Target Modal for Zeydoo */}
      {isZeydooModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50">
               <h3 className="text-white font-display font-black uppercase tracking-widest text-sm">Premium Apps & Jobs</h3>
               <button onClick={() => setZeydooModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition">
                  <span className="text-xl leading-none -mt-0.5">×</span>
               </button>
            </div>
            <div className="flex-1 bg-white relative">
              <iframe 
                src={`https://smrturl.co/o/xxxxxx?ymid=${user?.uid || 'guest'}`}
                className="w-full h-full border-0 absolute inset-0"
                allow="autoplay; fullscreen; microphone; camera"
                title="Zeydoo Offers"
              />
            </div>
          </div>
        </div>
      )}

      <MaintenanceModal 
        isOpen={showMaintenance} 
        onClose={() => setShowMaintenance(false)} 
        message={maintenanceMessage}
      />

      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="start or complete tasks" 
      />
    </Layout>
  );
}

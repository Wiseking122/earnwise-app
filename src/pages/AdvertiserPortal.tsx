import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  runTransaction,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PlanRestrictionModal } from '../components/PlanRestrictionModal';
import { 
  Megaphone, 
  Plus, 
  Wallet, 
  TrendingUp, 
  Users, 
  ExternalLink, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  ArrowLeft,
  AlertCircle,
  FileText,
  CheckCircle,
  Check,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Trash2
} from 'lucide-react';

interface ServiceOption {
  id: string;
  name: string;
  rate: number;
}

const PLATFORM_SERVICES: Record<string, ServiceOption[]> = {
  Facebook: [
    { id: 'fb_likes', name: 'Page Likes', rate: 50 },
    { id: 'fb_followers', name: 'Facebook Followers', rate: 90 }
  ],
  Instagram: [
    { id: 'ig_followers', name: 'Instagram Followers', rate: 60 },
    { id: 'ig_likes', name: 'Post Likes', rate: 25 }
  ],
  Twitter: [
    { id: 'tw_followers', name: 'Twitter Followers', rate: 55 },
    { id: 'tw_retweets', name: 'Retweets', rate: 35 }
  ],
  Youtube: [
    { id: 'yt_subscribers', name: 'Youtube Subscribers', rate: 80 },
    { id: 'yt_likes', name: 'Video Likes', rate: 30 }
  ],
  Tiktok: [
    { id: 'tt_followers', name: 'Tiktok Followers', rate: 70 },
    { id: 'tt_likes', name: 'Video Likes', rate: 25 }
  ]
};

const PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'Youtube', 'Tiktok'];

const TiktokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.95 1.25 2.29 2.11 3.82 2.47V10.2c-1.78-.04-3.53-.78-4.75-2.1-.03 2.91.02 5.82-.02 8.73-.04 1.51-.51 3.02-1.38 4.25-.97 1.36-2.42 2.37-4.08 2.76-1.56.37-3.23.23-4.71-.4-1.48-.63-2.72-1.76-3.48-3.21-.77-1.42-.98-3.11-.64-4.7.35-1.55 1.25-2.97 2.53-3.87 1.21-.86 2.69-1.29 4.18-1.25.02 1.41-.01 2.81 0 4.21-.92-.04-1.87.16-2.65.68-.74.47-1.27 1.25-1.44 2.12-.17.93.03 1.93.56 2.69.51.76 1.34 1.27 2.24 1.38.98.11 1.99-.18 2.73-.83.69-.58 1.07-1.46 1.09-2.37.03-3.92.01-7.85.02-11.77-.02-.27-.01-.55-.01-.83z"/>
  </svg>
);

export default function AdvertiserPortal() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'dashboard' | 'create'>('dashboard');
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRestriction, setShowRestriction] = useState(false);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('Facebook');
  const [selectedServiceId, setSelectedServiceId] = useState('fb_likes');
  const [quantity, setQuantity] = useState(100);
  const [durationDays, setDurationDays] = useState<number | ''>(30); // Default duration to 30 days
  const [targetLink, setTargetLink] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [validationError, setValidationError] = useState('');

  // Sync service selection when platform shifts
  useEffect(() => {
    const services = PLATFORM_SERVICES[selectedPlatform];
    if (services && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [selectedPlatform]);

  // Load advertiser tasks in real-time
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('advertiserId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      // Sort newest campaign first
      tasks.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || '').getTime();
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || '').getTime();
        return dateB - dateA;
      });
      setMyTasks(tasks);
      setHistoryLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const isAdmin = profile?.role === 'admin';

  // Compute pricing
  const services = PLATFORM_SERVICES[selectedPlatform] || [];
  const selectedService = services.find(s => s.id === selectedServiceId) || services[0] || { id: '', name: 'Standard Service', rate: 25 };
  
  // Apply a 2% discount structurally to the rates of ads in campaigns
  const baseRate = selectedService.rate * 0.98; // 2% campaign rate reduction applied
  const baseCost = baseRate * quantity;
  const cleanDuration = Number(durationDays) || 0;
  const dailyFee = 250 * cleanDuration; // ₦250 per day setup & listing maintenance
  const totalWithDaily = baseCost + dailyFee;
  const serviceFee = Math.round(totalWithDaily * 0.05); // 5% fee
  
  // Apply an additional 2% reduction on overall campaign invoice to ensure a safe cumulative cost reduce of 2%+
  const subtotal = totalWithDaily + serviceFee;
  const campaignDiscount = Math.round(subtotal * 0.02); // 2% campaign amount budget reduction
  const totalAmount = isAdmin ? 0 : subtotal - campaignDiscount;
  const isBalanceLow = (profile?.withdrawableBalance || 0) < totalAmount && !isAdmin;

  const handleCreateClick = () => {
    if (profile?.plan === 'free') {
      setShowRestriction(true);
      return;
    }
    setView('create');
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (profile?.plan === 'free') {
      setShowRestriction(true);
      return;
    }
    setValidationError('');

    if (quantity < 50) {
      setValidationError('Campaign quantity must be at least 50 units.');
      return;
    }

    const cleanDuration = Number(durationDays) || 30;
    if (cleanDuration < 1) {
      setValidationError('Campaign duration must be at least 1 day.');
      return;
    }

    if (!targetLink.startsWith('http://') && !targetLink.startsWith('https://')) {
      setValidationError('Please enter a valid campaign URL destination starting with http:// or https://');
      return;
    }

    if (isBalanceLow) {
      setValidationError('Insufficient account balance in your deposit wallet to cover the specified amount.');
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("Advertiser profile not found!");
        
        const userData = userSnap.data();
        const currentBalance = userData.withdrawableBalance || 0;
        
        if (currentBalance < totalAmount) {
          throw new Error("Insufficient funds inside your deposit balance!");
        }

        // 1. Create task entry directly in 'tasks'
        const taskRef = doc(collection(db, 'tasks'));
        
        // Expiration timestamp based on user selected days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + cleanDuration);

        transaction.set(taskRef, {
          advertiserId: user.uid,
          title: campaignName.trim() || `${selectedPlatform} ${selectedService.name} Campaign`,
          description: additionalInstructions.trim() || `Complete ${selectedService.name} actions accurately on ${selectedPlatform}.`,
          link: targetLink.trim(),
          type: 'ad',
          userPayout: selectedService.rate * 0.70, // Users get 70% of unit pay rate
          platformMargin: selectedService.rate * 0.30, // System margin splits
          totalBudget: baseCost,
          remainingBudget: baseCost,
          durationDays: cleanDuration,
          expiresAt: expiresAt,
          status: 'pending', // review queues
          tag: selectedPlatform.toLowerCase(),
          requiresProof: true,
          targetCount: quantity,
          completedCount: 0,
          clicksCount: 0,
          createdAt: serverTimestamp()
        });

        // 2. Clear balance
        transaction.update(userRef, {
          withdrawableBalance: increment(-totalAmount),
          balance: increment(-totalAmount)
        });

        // 3. Log ledger transaction
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: user.uid,
          amount: -totalAmount,
          type: 'withdrawal',
          description: `Launched Ad campaign: ${campaignName.trim() || `${selectedPlatform} ${selectedService.name}`}`,
          createdAt: serverTimestamp()
        });
      });

      // Show beautifully animated success state
      setShowSuccess(true);
      
      // Reset form variables
      setCampaignName('');
      setTargetLink('');
      setAdditionalInstructions('');
      setQuantity(100);
      setDurationDays(30);
      
      // Hold success animation for 2.5 seconds, then return
      setTimeout(() => {
        setShowSuccess(false);
        setView('dashboard');
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Failed to place campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (task: Task) => {
    if (profile?.plan === 'free') {
      setShowRestriction(true);
      return;
    }
    if (!window.confirm(`Are you sure you want to cancel the campaign "${task.title}"? Your remaining budget will be refunded.`)) return;
    
    try {
      setLoading(true);
      const taskRef = doc(db, 'tasks', task.id);
      const userRef = doc(db, 'users', user!.uid);

      await runTransaction(db, async (transaction) => {
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("Campaign no longer exists.");

        const taskData = taskSnap.data();
        
        // We can only cancel if status is pending or active
        const isRefundable = taskData.status === 'active' || taskData.status === 'pending';
        const refundCost = isRefundable ? (taskData.remainingBudget !== undefined ? taskData.remainingBudget : taskData.totalBudget || 0) : 0;
        
        // Proportional fee calculations
        const dailyFeePaid = 250 * (taskData.durationDays || 30);
        const totalPaidWithDailyFees = refundCost + (isRefundable ? dailyFeePaid : 0);
        const refundFee = Math.round(totalPaidWithDailyFees * 0.05);
        const totalRefund = totalPaidWithDailyFees + refundFee;

        // Delete task
        transaction.delete(taskRef);

        if (totalRefund > 0 && !isAdmin) {
          transaction.update(userRef, {
            withdrawableBalance: increment(totalRefund),
            balance: increment(totalRefund)
          });

          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            userId: user!.uid,
            amount: totalRefund,
            type: 'earning',
            description: `Cancelled Campaign Refund: ${task.title}`,
            createdAt: serverTimestamp()
          });
        }
      });

      alert("Campaign successfully cancelled and budget refunded!");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to cancel campaign: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string, size = 18) => {
    switch (platform) {
      case 'Facebook': return <Facebook size={size} className="text-[#1877F2]" />;
      case 'Instagram': return <Instagram size={size} className="text-[#E4405F]" />;
      case 'Twitter': return <Twitter size={size} className="text-[#1DA1F2]" />;
      case 'Youtube': return <Youtube size={size} className="text-[#FF0000]" />;
      case 'Tiktok': return <TiktokIcon className={`w-${size / 4} h-${size / 4} text-[#000000]`} />;
      default: return <Target size={size} />;
    }
  };

  if (view === 'create') {
    return (
      <Layout title="Create Campaign">
        <div className="p-5 pb-24 max-w-4xl mx-auto relative">
          <div className="premium-blur" />
          
          {/* Header & Back Action */}
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setView('dashboard')}
              className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
              id="back-to-ads-dashboard"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight italic">Create Campaign</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Launch your growth campaign in seconds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Form Column */}
            <form onSubmit={handleLaunchCampaign} className="space-y-6 md:col-span-7 bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
              
              {validationError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold leading-normal">{validationError}</p>
                </div>
              )}

              {/* Campaign Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Campaign Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Instagram Growth 2026"
                  className="w-full border border-slate-600 text-slate-900 bg-white rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  id="campaign-name-input"
                />
              </div>

              {/* Platform Selector Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Select Platform</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PLATFORMS.map(platform => {
                    const isSelected = selectedPlatform === platform;
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setSelectedPlatform(platform)}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all group ${
                          isSelected 
                            ? 'bg-blue-50/70 border-blue-200 text-blue-600 shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'
                        }`}
                        id={`platform-selector-${platform.toLowerCase()}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                          isSelected ? 'bg-blue-200/50' : 'bg-slate-50'
                        }`}>
                          {getPlatformIcon(platform, 18)}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">{platform}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Service Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Available Services</label>
                <div className="space-y-2">
                  {services.map(service => {
                    const isSelected = selectedServiceId === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                            : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                        }`}
                        id={`service-option-${service.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-xs font-black uppercase tracking-tight">{service.name}</span>
                        </div>
                        <span className={`text-[12px] font-black ${isSelected ? 'text-blue-300' : 'text-blue-600'}`}>
                          ₦{service.rate} / unit
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quantity (Min 50)</label>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase">Standard Rates</span>
                </div>
                <input 
                  type="number" 
                  min="50"
                  required
                  placeholder="1000"
                  className="w-full border border-slate-600 text-slate-900 bg-white rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={quantity === 0 ? '' : quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  id="campaign-quantity-input"
                />
              </div>

              {/* Campaign Duration (Days) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Campaign Duration (Days)</label>
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase">₦250/day setup fee</span>
                </div>
                <input 
                  type="text" 
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                  placeholder="e.g. 30"
                  className="w-full border border-slate-600 text-slate-900 bg-white rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={durationDays}
                  onChange={e => {
                    const rawVal = e.target.value;
                    if (rawVal === '') {
                      setDurationDays('');
                    } else {
                      const cleanNum = Number(rawVal.replace(/[^0-9]/g, ''));
                      setDurationDays(cleanNum);
                    }
                  }}
                  id="campaign-duration-input"
                />
              </div>

              {/* Destination URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Target Link / URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://facebook.com/your-profile"
                  className="w-full border border-slate-600 text-slate-900 bg-white rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={targetLink}
                  onChange={e => setTargetLink(e.target.value)}
                  id="campaign-target-link"
                />
              </div>

              {/* Instruction Textarea */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Additional Instructions (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Page must be liked and comments must not contain spam..."
                  className="w-full border border-slate-600 text-slate-900 bg-white rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  value={additionalInstructions}
                  onChange={e => setAdditionalInstructions(e.target.value)}
                  id="campaign-instructions"
                />
              </div>

              {/* Launch Action */}
              <button
                type="submit"
                disabled={loading || isBalanceLow}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] ${
                  isBalanceLow 
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/20'
                }`}
                id="launch-campaign-button"
              >
                {loading ? "Initializing Protocols..." : "Launch Campaign"}
              </button>
            </form>

            {/* Sidebar Column: Order Summary */}
            <div className="md:col-span-15 space-y-6 md:col-start-8">
              <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)' }} />
                
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-900 uppercase tracking-tight italic">Order Summary</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Breakdown</p>
                  </div>
                </div>

                {/* Ledger metrics */}
                <div className="space-y-4 text-xs font-bold uppercase tracking-tight text-slate-600">
                  <div className="flex justify-between">
                    <span>Platform</span>
                    <span className="text-slate-900 flex items-center gap-1.5 font-black">
                      {getPlatformIcon(selectedPlatform, 14)}
                      {selectedPlatform}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Service</span>
                    <span className="text-slate-900 font-black">{selectedService.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Base Rate</span>
                    <span className="text-slate-900 font-black flex items-center gap-2">
                      <span className="text-xs line-through text-slate-400">₦{selectedService.rate}</span>
                      <span className="text-emerald-600">₦{baseRate.toFixed(2)}</span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Quantity</span>
                    <span className="text-slate-900 font-black">{quantity.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="text-slate-900 font-black">{durationDays || 0} Days</span>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100 border-dashed">
                    <span>Delivery Total</span>
                    <span className="text-slate-900 font-black flex items-center gap-2">
                      <span className="text-xs line-through text-slate-400">₦{(selectedService.rate * quantity).toLocaleString()}</span>
                      <span>₦{baseCost.toLocaleString()}</span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Daily Host Fee (₦250/d)</span>
                    <span className="text-slate-900 font-black">₦{dailyFee.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Service Fee (5%)</span>
                    <span className="text-slate-900 font-black">₦{serviceFee.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span>Campaign Discount (2%)</span>
                    <span>-₦{campaignDiscount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-black tracking-widest">Total Amount</span>
                    <span className="text-2xl font-display font-black text-blue-500 tracking-tighter flex items-center gap-2">
                      {isAdmin && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg">FREE</span>}
                      ₦{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Low Balance Warning Block */}
                {isBalanceLow && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 space-y-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="p-1 px-1.5 bg-rose-100 text-rose-600 rounded-lg">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider">⚠️ Low Balance</h4>
                        <p className="text-[11px] text-rose-600 font-medium leading-normal mt-1">
                          You don't have enough funds in your deposit wallet. Please top-up to proceed.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/deposit')}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-rose-600/10 transition-colors"
                      id="order-summary-topup-button"
                    >
                      Top-up Now
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Live Overlay Success State Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0b0f19]/70 backdrop-blur-md z-[200] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative border border-slate-100 overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-2 bg-blue-500" />
                
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle size={44} className="animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-black text-slate-900 text-2xl uppercase tracking-tight italic">Campaign Launched!</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                    Amount deducted successfully.<br />Campaign is now entering validation reviews.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </Layout>
    );
  }

  // Active / Pending stats count
  const activeCount = myTasks.filter(t => t.status === 'active').length;
  const pendingCount = myTasks.filter(t => t.status === 'pending').length;

  return (
    <Layout title="Advertise">
      <div className="p-5 pb-24 space-y-8 max-w-2xl mx-auto relative">
        <div className="premium-blur" />

        {/* Advertise Title & Subtitle + Top Action Button */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tighter italic">Advertise</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Boost your social presence and business</p>
          </div>
          <button 
            onClick={handleCreateClick}
            className="px-5 py-3 bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-1.5 shadow-lg hover:bg-blue-600 transition-all active:scale-95"
            id="create-new-ad-top"
          >
            <Plus size={14} strokeWidth={3} /> Create New Ad
          </button>
        </div>

        {/* Ad Status Metrics - Provides a quick glance at current campaigns health */}
        <div className="grid grid-cols-2 gap-4">
          
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner group-hover:scale-105 transition-transform">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Active</p>
              <h4 className="text-xl font-display font-black text-slate-900">{activeCount}</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner group-hover:scale-105 transition-transform">
              <Clock size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Pending</p>
              <h4 className="text-xl font-display font-black text-slate-900">{pendingCount}</h4>
            </div>
          </div>

        </div>

        {/* Split grid columns - Growth Tip (Left) & Your Campaigns (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Growth Tip Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/40 p-6 rounded-[2.5rem] relative overflow-hidden space-y-4 md:col-span-5 shadow-sm">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-blue-200/20" />
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <Megaphone size={14} />
              </div>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Growth Tip</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              Consistency is key. Regular campaigns help you maintain a steady growth trajectory and build social proof.
            </p>

            <button 
              onClick={handleCreateClick}
              className="bg-white/90 hover:bg-white text-blue-600 text-[10px] font-black uppercase tracking-widest py-2.5 px-4 rounded-xl border border-blue-100 shadow-sm transition-colors"
              id="growth-tip-launch-button"
            >
              Launch first ad now
            </button>
          </div>

          {/* Your Campaigns Card Overview */}
          <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm md:col-span-7 space-y-4">
            <h3 className="font-display font-black text-slate-900 uppercase tracking-tight italic text-lg border-b border-slate-50 pb-3">
              Your Campaigns
            </h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {historyLoading ? (
                [1, 2].map(i => (
                  <div key={i} className="h-20 bg-slate-50 border border-slate-100 animate-pulse rounded-2xl" />
                ))
              ) : myTasks.length > 0 ? (
                myTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                        {getPlatformIcon(task.tag ? task.tag.charAt(0).toUpperCase() + task.tag.slice(1) : 'Facebook', 16)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[150px]">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.status === 'active' ? 'bg-emerald-500' :
                            task.status === 'pending' ? 'bg-amber-500' :
                            'bg-slate-300'
                          }`} />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {task.status === 'pending' ? 'Reviewing' : task.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-display text-slate-900 font-extrabold flex flex-col items-end">
                        <span className="text-sm">₦{((task.totalBudget || 0)).toLocaleString()}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 leading-none">
                          Budget
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteCampaign(task)}
                        disabled={loading}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
                        title="Cancel Campaign"
                        id={`cancel-campaign-${task.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 bg-blue-50/50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Megaphone size={24} className="text-blue-400/80" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">No campaigns found</h4>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Ready to boost your presence? Create your first ad today.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
      <PlanRestrictionModal 
        isOpen={showRestriction} 
        onClose={() => setShowRestriction(false)} 
        actionName="create advertising campaigns" 
      />
    </Layout>
  );
}

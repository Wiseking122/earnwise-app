import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PLANS } from '../constants/plans';
import { 
  Users, 
  Copy, 
  Share2, 
  Gift, 
  CheckCircle2, 
  Target,
  Zap,
  Award,
  TrendingUp,
  ExternalLink,
  UserCheck,
  ChevronRight,
  Clock
} from 'lucide-react';

export default function Referral() {
  const { profile } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

  // Fetch recently referred users
  useEffect(() => {
    async function fetchReferrals() {
      if (!profile?.referralCode) return;
      
      try {
        setLoadingReferrals(true);
        const referralsQuery = query(
          collection(db, 'users'),
          where('referredBy', '==', profile.referralCode),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(referralsQuery);
        const list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReferralsList(list);
      } catch (err) {
        console.error("Error fetching referrals:", err);
      } finally {
        setLoadingReferrals(false);
      }
    }

    fetchReferrals();
  }, [profile?.referralCode]);

  // Auto-generate referral code if missing
  useEffect(() => {
    if (profile && !profile.referralCode) {
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userDocRef = doc(db, 'users', profile.uid);
      updateDoc(userDocRef, {
        referralCode: generatedCode
      }).catch(err => {
        console.error("Failed to generate referral code inside Referral page:", err);
      });
    }
  }, [profile]);

  // Use the cleaner invite path
  const referralLink = `${window.location.origin}/invite/${profile?.referralCode}`;
  const shareMessage = `Join Earnwise and start earning money today! I'm inviting you to the world's best earning platform.\n\nSign up here: ${referralLink}`;

  const copyToClipboard = () => {
    if (copiedCode) return;
    navigator.clipboard.writeText(profile?.referralCode || '');
    setCopiedCode(true);
    setToastMessage('Referral code copied successfully!');
    setShowToast(true);
    setTimeout(() => setCopiedCode(false), 2000);
    setTimeout(() => setShowToast(false), 2500);
  };

  const copyLinkToClipboard = () => {
    if (copiedLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setToastMessage('Referral link copied successfully!');
    setShowToast(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Earnwise',
          text: shareMessage,
          url: referralLink,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Error sharing:", err);
          copyLinkToClipboard();
        }
      }
    } else {
      copyLinkToClipboard();
    }
  };

  const socialPlatforms = [
    { 
      name: 'WhatsApp', 
      icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
      url: `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    },
    { 
      name: 'Telegram', 
      icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
      url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`Join Earnwise and start earning!`)}`
    },
    { 
      name: 'Twitter', 
      icon: 'https://cdn-icons-png.flaticon.com/512/3256/3256013.png',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join Earnwise and earn money with me!`)}&url=${encodeURIComponent(referralLink)}`
    }
  ];

  return (
    <Layout>
      <div className="p-4 space-y-6 max-w-sm mx-auto">
        {/* Brand Header */}
        <div className="text-center space-y-3 pt-6">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100 mb-4 scale-110">
            <TrendingUp size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Earnwise <span className="text-blue-600">Refer</span></h2>
          <p className="text-gray-500 font-medium text-sm leading-relaxed">
            Invite your friends to the world's best earning platform and grow your team.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col items-center text-center">
            <Users size={20} className="text-blue-500 mb-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Referred</span>
            <span className="text-xl sm:text-2xl font-display font-black text-slate-900 mt-1">{profile?.totalReferrals || 0}</span>
          </div>
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col items-center text-center">
            <Zap size={20} className="text-amber-500 mb-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Bonus Earned</span>
            <span className="text-xl sm:text-2xl font-display font-black text-slate-900 mt-1">₦{(profile?.referralEarnings || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Hero Banner Part 2 */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="relative z-10 flex flex-col items-center">
            <h3 className="text-lg sm:text-xl font-black mb-2 flex items-center gap-2">
              <Gift size={20} className="text-yellow-400 sm:w-6 sm:h-6" />
              Invite & Earn
            </h3>
            <p className="text-blue-100 text-[9px] sm:text-[10px] uppercase font-black tracking-widest mb-4 sm:mb-6">Commission for Lifetime</p>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 w-full border border-white/20 mb-4 sm:mb-6 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1.5">Referral Code</p>
              <p className="text-2xl sm:text-4xl font-mono font-black tracking-[0.2em]">{profile?.referralCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={copyToClipboard}
                className="bg-white text-blue-600 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-lg relative overflow-hidden cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  {copiedCode ? (
                    <motion.div
                      key="checked"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 45 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="flex items-center gap-1.5 text-green-600 justify-center"
                    >
                      <CheckCircle2 size={14} /> Verified!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-1.5 justify-center"
                    >
                      <Copy size={14} /> Copy Code
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <button 
                onClick={handleShare}
                className="bg-blue-500 text-white py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg border border-blue-400/30"
              >
                <Share2 size={14} /> Share Now
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none -mr-16 -mt-16" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)' }} />
        </div>

        {/* Social Quick Share */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 text-center">Direct Share Options</p>
          <div className="flex justify-between items-center px-4">
            {socialPlatforms.map((platform) => (
              <a 
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md border border-gray-100">
                  <img src={platform.icon} alt={platform.name} className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{platform.name}</span>
              </a>
            ))}
            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={copyLinkToClipboard}
              className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-hidden"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md border border-blue-100 text-blue-600 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {copiedLink ? (
                    <motion.div
                      key="link-checked"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 30 }}
                      transition={{ type: "spring", stiffness: 350, damping: 15 }}
                      className="text-green-600 flex items-center justify-center"
                    >
                      <CheckCircle2 size={24} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="link-default"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center justify-center"
                    >
                      <ExternalLink size={24} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Rewards Breakdown */}
        <section className="space-y-4">
          <h3 className="text-xl font-black px-2 mb-2">Grow your Earnings</h3>
          <div className="space-y-4">
            <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-green-200">
                <Gift size={24} />
              </div>
              <div>
                <h4 className="font-black text-green-900 text-sm">20% Upgrade Commission</h4>
                <p className="text-xs text-green-700 font-medium">Earn 20% instantly when your friend successfully activates a plan.</p>
              </div>
            </div>
          </div>
        </section>

        {/* My Team Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black">My Team</h3>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest">Recent 10</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
            {loadingReferrals ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading team...</p>
              </div>
            ) : referralsList.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {referralsList.map((ref) => (
                  <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                        {ref.displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 truncate max-w-[120px]">
                          {ref.displayName || 'Anonymous'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={10} />
                          <span className="text-[9px] font-bold uppercase tracking-tighter">
                            {ref.createdAt?.seconds ? new Date(ref.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${ref.plan && ref.plan !== 'free' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {ref.plan && ref.plan !== 'free' ? ref.plan : 'Inactive'}
                      </div>
                      {ref.plan && ref.plan !== 'free' && (
                        <span className="text-[10px] font-black text-emerald-600 mt-1">₦{((PLANS.find(p => p.id === ref.plan)?.cost || 0) * 0.2).toLocaleString()} Earned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Users size={32} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900">No team members yet</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 px-4">Start sharing your link to build your team and earn commissions!</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Footer info */}
        <div className="text-center p-4">
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">Earnwise Elite Referral Program</p>
        </div>
      </div>

      {/* Elegant Floating Toast Notification Overlay */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white py-3 px-5 rounded-2xl shadow-2xl border border-white/10 max-w-[90%] w-72"
          >
            <div className="bg-green-500 text-white rounded-full p-0.5 flex-shrink-0">
              <CheckCircle2 size={14} />
            </div>
            <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

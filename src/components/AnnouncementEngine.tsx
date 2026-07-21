import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, AlertTriangle, CheckCircle, Flame, Megaphone, Bell, Sparkles, Shield, Gift } from 'lucide-react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { Announcement, AnnouncementPlacement, AnnouncementType } from '../types/announcements';

const getIcon = (category: AnnouncementType) => {
  switch (category) {
    case 'info': return <Info className="w-5 h-5 text-blue-400" />;
    case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
    case 'promo': return <Flame className="w-5 h-5 text-orange-400" />;
    case 'maintenance': return <Shield className="w-5 h-5 text-slate-400" />;
    case 'update': return <Sparkles className="w-5 h-5 text-purple-400" />;
    case 'offer': return <Gift className="w-5 h-5 text-pink-400" />;
    case 'alert': return <Bell className="w-5 h-5 text-red-400" />;
    default: return <Megaphone className="w-5 h-5 text-slate-400" />;
  }
};

const getAnimationProps = (type: string) => {
  switch (type) {
    case 'fade': return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    case 'slide': return { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -100, opacity: 0 } };
    case 'zoom': return { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 1.1, opacity: 0 } };
    case 'bounce': return { 
      initial: { scale: 0.5, opacity: 0 }, 
      animate: { scale: 1, opacity: 1 }, 
      exit: { scale: 0.5, opacity: 0 },
      transition: { type: 'spring' as const, damping: 10 }
    };
    default: return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  }
};

interface BannerProps {
  announcement: Announcement;
  onDismiss: () => void;
  onAction: () => void;
}

const Banner: React.FC<BannerProps> = ({ announcement, onDismiss, onAction }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (announcement.autoHide && announcement.displayDuration) {
      const timer = setTimeout(() => setIsVisible(false), announcement.displayDuration * 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  if (!isVisible) return null;

  return (
    <motion.div
      {...getAnimationProps(announcement.animationType)}
      style={{ 
        backgroundColor: announcement.backgroundColor || 'rgba(15, 23, 42, 0.9)',
        color: announcement.textColor || 'white'
      }}
      className="relative p-4 rounded-xl border border-white/10 shadow-xl backdrop-blur-md overflow-hidden flex items-center gap-4 group"
    >
      <div className="shrink-0 p-2 bg-white/5 rounded-lg">
        {getIcon(announcement.category)}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm sm:text-base tracking-tight truncate">{announcement.title}</h4>
        <p className="text-xs sm:text-sm opacity-80 line-clamp-2">{announcement.shortMessage}</p>
      </div>
      <div className="flex items-center gap-3">
        {announcement.buttonLink && (
          <button 
            onClick={() => {
              onAction();
              window.open(announcement.buttonLink, '_blank');
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap"
          >
            {announcement.buttonText || 'Learn More'}
          </button>
        )}
        {announcement.manualClose && (
          <button 
            onClick={onDismiss}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const AnnouncementEngine: React.FC<{ placement: AnnouncementPlacement }> = ({ placement }) => {
  const { announcements, trackAction } = useAnnouncements(placement);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const handleDismiss = (id: string) => {
    setDismissed([...dismissed, id]);
    trackAction(id, 'dismiss');
    
    // Store in localStorage if needed for displayFrequency 'once'
    const ann = announcements.find(a => a.id === id);
    if (ann?.displayFrequency === 'once') {
      const stored = JSON.parse(localStorage.getItem('earnwise_dismissed_announcements') || '[]');
      localStorage.setItem('earnwise_dismissed_announcements', JSON.stringify([...stored, id]));
    }
  };

  const handleAction = (id: string) => {
    trackAction(id, 'click');
  };

  const activeAnnouncements = announcements.filter(a => {
    if (dismissed.includes(a.id!)) return false;
    
    if (a.displayFrequency === 'once') {
      const stored = JSON.parse(localStorage.getItem('earnwise_dismissed_announcements') || '[]');
      if (stored.includes(a.id!)) return false;
    }
    
    // Hard-coded filter to remove the requested banner
    const bannerText = "🚀 New sponsored tasks are coming soon! Thank you for your patience while we upgrade the Task Marketplace.";
    if (a.title?.includes("sponsored tasks") || a.shortMessage?.includes("sponsored tasks") || 
        a.title?.includes("New sponsored tasks") || a.shortMessage?.includes("New sponsored tasks")) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {activeAnnouncements.map((ann) => (
          <Banner 
            key={ann.id} 
            announcement={ann} 
            onDismiss={() => handleDismiss(ann.id!)}
            onAction={() => handleAction(ann.id!)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Specialized versions
export const ScrollingBanner: React.FC = () => {
  const { announcements } = useAnnouncements('scrolling_marquee');
  if (announcements.length === 0) return null;

  return (
    <div className="bg-emerald-500/10 border-y border-emerald-500/20 py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-12 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">
        {announcements.map(ann => (
          <span key={ann.id} className="flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            {ann.title}: {ann.shortMessage}
          </span>
        ))}
        {/* Repeat for continuous effect */}
        {announcements.map(ann => (
          <span key={`dup-${ann.id}`} className="flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            {ann.title}: {ann.shortMessage}
          </span>
        ))}
      </div>
    </div>
  );
};

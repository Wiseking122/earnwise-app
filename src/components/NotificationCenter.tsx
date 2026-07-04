import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Info, Gift, CreditCard, Shield, ClipboardList, ExternalLink } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { NotificationCategory } from '../types/notifications';

const getIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'system': return <Info className="w-4 h-4 text-blue-400" />;
    case 'reward': return <Gift className="w-4 h-4 text-emerald-400" />;
    case 'withdrawal': return <CreditCard className="w-4 h-4 text-orange-400" />;
    case 'promo': return <Bell className="w-4 h-4 text-purple-400" />;
    case 'security': return <Shield className="w-4 h-4 text-red-400" />;
    case 'task': return <ClipboardList className="w-4 h-4 text-cyan-400" />;
    default: return <Bell className="w-4 h-4 text-slate-400" />;
  }
};

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
        id="notification-bell"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[101] flex flex-col overflow-hidden"
              id="notification-panel"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded-full uppercase tracking-wider">{unreadCount} New</span>}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"
                    />
                    <p className="text-sm">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-400">All caught up!</p>
                      <p className="text-xs">No notifications for now.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 hover:bg-white/5 transition-all relative group ${!notif.isRead ? 'bg-emerald-500/5' : ''}`}
                        onClick={() => markAsRead(notif.id!)}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                            {getIcon(notif.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-bold truncate ${!notif.isRead ? 'text-white' : 'text-slate-400'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                                {formatDistanceToNow(notif.createdAt instanceof Date ? notif.createdAt : (notif.createdAt as any).toDate(), { addSuffix: true })}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${!notif.isRead ? 'text-slate-300' : 'text-slate-500'}`}>
                              {notif.message}
                            </p>
                            
                            {(notif.buttonUrl || notif.deepLink) && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (notif.buttonUrl) window.open(notif.buttonUrl, '_blank');
                                }}
                                className="mt-3 py-1.5 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all flex items-center gap-2 border border-white/5"
                              >
                                {notif.buttonText || 'View Details'}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {!notif.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 bg-slate-800/50 text-center border-t border-white/10">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    Close Center
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

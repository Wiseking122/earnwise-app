import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Bell, X, Check } from 'lucide-react';

export default function NotificationList({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Notifications for 'all' or specific user
    const q = query(collection(db, 'notifications'), where('userId', 'in', ['all', user.uid]));
    
    const unsub = onSnapshot(q, (snap) => {
        const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Local sort by createdAt descending
        notifs.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
        });
        setNotifications(notifs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));
    
    return unsub;
  }, [user]);

  const markAsRead = async (notif: any) => {
    try {
      if (notif.userId === 'all') {
        const currentReadBy = notif.readBy || [];
        if (user && !currentReadBy.includes(user.uid)) {
          await updateDoc(doc(db, 'notifications', notif.id), {
            readBy: [...currentReadBy, user.uid]
          });
        }
      } else {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      }
    } catch (err) {
      console.warn("Could not mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      for (const n of notifications) {
        const isRead = n.read || (n.readBy && user && n.readBy.includes(user.uid));
        if (!isRead) {
          await markAsRead(n);
        }
      }
    } catch (err) {
      console.warn("Could not mark all as read:", err);
    }
  };

  return (
    <div className="absolute top-16 right-4 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[100] max-h-[400px] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-blue-600" />
          <h3 className="font-bold text-sm">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
          >
            Mark all
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-20 text-center">
            <Bell size={48} className="text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Inbox is clean</p>
          </div>
        ) : (
          notifications.map(n => {
            const isRead = n.read || (n.readBy && user && n.readBy.includes(user.uid));
            return (
              <div 
                key={n.id} 
                onClick={() => !isRead && markAsRead(n)}
                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors relative group ${isRead ? 'bg-white opacity-60' : 'bg-blue-50/40'}`}
              >
                {!isRead && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                )}
                <div className="pl-2">
                  <h4 className={`font-black text-sm leading-tight mb-0.5 ${isRead ? 'text-gray-600' : 'text-slate-900'}`}>{n.title}</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{n.message}</p>
                </div>
                {!isRead && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check size={14} className="text-blue-600" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

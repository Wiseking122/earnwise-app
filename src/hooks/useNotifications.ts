import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  arrayUnion,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { Notification } from '../types/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const userId = auth.currentUser.uid;
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [userId, 'all', 'premium', 'free']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications: Notification[] = [];
      let unread = 0;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Notification;
        const id = docSnap.id;
        
        // Check if read
        const isRead = data.userId === userId 
          ? data.isRead 
          : data.readBy?.includes(userId);

        if (!isRead) unread++;

        fetchedNotifications.push({ ...data, id, isRead });
      });

      setNotifications(fetchedNotifications);
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const notif = notifications.find(n => n.id === notificationId);
    
    if (!notif || notif.isRead) return;

    try {
      const notifRef = doc(db, 'notifications', notificationId);
      if (notif.userId === userId) {
        await updateDoc(notifRef, { isRead: true });
      } else {
        await updateDoc(notifRef, { readBy: arrayUnion(userId) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => markAsRead(n.id!)));
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

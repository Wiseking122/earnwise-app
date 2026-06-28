import { messaging, db, onMessage } from './firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export enum NotificationType {
  SUCCESS = 'success',
  INFO = 'info',
  ALERT = 'alert',
  REWARD = 'reward',
  SYSTEM = 'system'
}

interface NotificationOptions {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionLink?: string;
  actionUrl?: string;
}

export async function sendNotification({ userId, title, message, type, actionLink, actionUrl }: NotificationOptions) {
  try {
    const link = actionLink || actionUrl || null;
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      actionLink: link,
      actionUrl: link,
      read: false,
      readBy: [],
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error sending internal notification:", err);
  }
}

export async function requestNotificationPermission(userId: string) {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        console.log('FCM Token:', token);
        // Save token to user profile
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token),
          pushEnabled: true
        });
        return token;
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return null;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}

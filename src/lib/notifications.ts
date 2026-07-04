import { messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { db, auth } from './firebase';
import { collection, doc, setDoc, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BDK_W9F5_Your_Vapid_Key_Here";

export async function requestNotificationPermission(userId: string) {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await saveTokenToFirestore(userId, token);
        return token;
      }
    }
  } catch (err) {
    console.error("Error requesting notification permission:", err);
  }
  return null;
}

async function saveTokenToFirestore(userId: string, token: string) {
  const userRef = doc(db, 'users', userId);
  const tokenRef = doc(db, 'device_tokens', token);

  const deviceData = {
    token,
    userId,
    platform: 'web',
    browser: navigator.userAgent,
    deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    lastUsedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  try {
    // 1. Save to global tokens collection
    await setDoc(tokenRef, deviceData, { merge: true });

    // 2. Add to user's profile for quick broadcast lookup
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      pushEnabled: true,
      updatedAt: serverTimestamp()
    });
    
    console.log("FCM Token saved successfully");
  } catch (err) {
    console.error("Error saving FCM token:", err);
  }
}

export const NotificationType = {
  SYSTEM: 'system' as const,
  PAYOUT: 'payout' as const,
  REFERRAL: 'referral' as const,
  TASK: 'task' as const,
  REWARD: 'reward' as const,
  DIRECT: 'direct' as const,
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  INFO: 'info' as const,
  ALERT: 'alert' as const,
  ANNOUNCEMENT: 'announcement' as const
};

export type NotificationTypeValue = typeof NotificationType[keyof typeof NotificationType];

export async function sendNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  actionLink?: string;
}) {
  const { userId, title, message, type, actionUrl, actionLink } = params;
  try {
    const notificationData: any = {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    };

    const finalUrl = actionUrl || actionLink;
    if (finalUrl) {
      notificationData.actionUrl = finalUrl;
    }

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (err) {
    console.error("Error sending notification:", err);
  }
}

export function setupMessageListener() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    // You can customize how to show the notification when the app is in foreground
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Earnwise', {
        body: payload.notification?.body,
        icon: '/logo.png',
      });
    }
  });
}

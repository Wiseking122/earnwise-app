import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  REWARD = 'reward',
  ALERT = 'alert',
  SYSTEM = 'system'
}

export async function sendNotification({
  userId,
  title,
  message,
  type = NotificationType.INFO,
  actionLink
}: {
  userId: string | 'all';
  title: string;
  message: string;
  type?: NotificationType;
  actionLink?: string;
}) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      actionLink,
      read: false,
      createdAt: serverTimestamp(),
      readBy: []
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

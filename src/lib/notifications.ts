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
    const data: any = {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      readBy: []
    };
    if (actionLink !== undefined) {
      data.actionLink = actionLink;
    }
    
    await addDoc(collection(db, 'notifications'), data);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

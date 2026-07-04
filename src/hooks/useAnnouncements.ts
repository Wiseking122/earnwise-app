import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { Announcement, AnnouncementPlacement } from '../types/announcements';

export function useAnnouncements(placement: AnnouncementPlacement) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const q = query(
      collection(db, 'announcements'),
      where('isActive', '==', true),
      where('status', '==', 'published'),
      where('placements', 'array-contains', placement)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allActive = snapshot.docs.map(docSnap => ({
        ...docSnap.data() as Announcement,
        id: docSnap.id
      }));

      // Filter by targeting and dates in memory (Firestore limited on complex range queries)
      const user = auth.currentUser;
      let userPlan = 'none';
      let isNew = false;
      let isActivated = false;

      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        userPlan = userData?.plan || 'none';
        isActivated = userPlan !== 'none';
        // Assume new if account created in last 7 days
        const createdAt = userData?.createdAt?.toMillis ? userData.createdAt.toMillis() : 0;
        isNew = (Date.now() - createdAt) < (7 * 24 * 60 * 60 * 1000);
      }

      const filtered = allActive.filter(ann => {
        // Date check
        const start = (ann.startDate as Timestamp).toDate();
        const end = (ann.endDate as Timestamp).toDate();
        if (now < start || now > end) return false;

        // Audience check
        if (ann.targetAudience === 'everyone') return true;
        if (ann.targetAudience === 'new' && isNew) return true;
        if (ann.targetAudience === 'activated' && isActivated) return true;
        if (ann.targetAudience === 'non_activated' && !isActivated) return true;
        if (ann.targetAudience === 'premium' && isActivated) return true;
        
        // Plan check
        if (ann.targetPlanIds && ann.targetPlanIds.length > 0) {
          return ann.targetPlanIds.includes(userPlan);
        }

        return false;
      });

      // Sort by priority
      filtered.sort((a, b) => b.priority - a.priority);

      setAnnouncements(filtered);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [placement]);

  const trackAction = async (announcementId: string, action: 'view' | 'click' | 'dismiss' | 'acknowledge') => {
    try {
      const analyticsRef = doc(db, 'announcement_analytics', announcementId);
      const update: any = {};
      if (action === 'view') update.totalViews = increment(1);
      if (action === 'click') update.totalClicks = increment(1);
      if (action === 'dismiss') update.totalDismissals = increment(1);
      if (action === 'acknowledge') update.totalAcknowledgements = increment(1);
      
      await updateDoc(analyticsRef, update);
    } catch (err) {
      console.warn("Failed to track announcement action:", err);
    }
  };

  return { announcements, loading, trackAction };
}

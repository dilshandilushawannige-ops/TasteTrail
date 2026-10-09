import { auth, db } from '@/firebaseConfig';
import { announcementError, type Announcement } from '@/services/announcementService';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined, unsubscribeReads: (() => void) | undefined;
    let generation = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      const active = ++generation;
      unsubscribeMessages?.(); unsubscribeReads?.();
      setAnnouncements([]); setReadIds(new Set()); setError(''); setLoading(!!user);
      if (!user) return;
      let messagesReady = false, readsReady = false;
      const failed = (cause: unknown) => {
        if (active !== generation) return;
        setError(announcementError(cause)); setLoading(false);
      };
      unsubscribeMessages = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), snapshot => {
        if (active !== generation) return;
        setAnnouncements(snapshot.docs.map(record => {
          const data = record.data();
          return { id: record.id, title: data.title, message: data.message, createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null, updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null };
        }));
        messagesReady = true; if (readsReady) setLoading(false);
      }, failed);
      unsubscribeReads = onSnapshot(collection(db, 'users', user.uid, 'announcementReads'), snapshot => {
        if (active !== generation) return;
        setReadIds(new Set(snapshot.docs.map(record => record.id)));
        readsReady = true; if (messagesReady) setLoading(false);
      }, failed);
    });
    return () => { generation++; unsubscribeAuth(); unsubscribeMessages?.(); unsubscribeReads?.(); };
  }, [retry]);
  const unread = announcements.filter(item => !readIds.has(item.id)).length;
  return { announcements, readIds, unread, loading, error, refresh: () => setRetry(value => value + 1) };
}

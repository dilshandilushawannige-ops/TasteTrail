import { auth, db } from '@/firebaseConfig';
import { collection, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

export interface Announcement { id: string; title: string; message: string; createdAt: Date | null; updatedAt?: Date | null; }
export function createAnnouncementId(): string { return doc(collection(db, 'announcements')).id; }
async function requireAdmin() {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in with an admin account.');
  const { claims } = await user.getIdTokenResult(true);
  const isAdmin = claims.admin === true || claims.admin === 'true' || claims.isAdmin === true
    || claims.role === 'admin' || (Array.isArray(claims.roles) && claims.roles.includes('admin'));
  if (!isAdmin) throw new Error('Only admins can manage announcements.');
  return user;
}
function validateContent(id: string, title: string, message: string) {
  const cleanTitle = title.trim(), cleanMessage = message.trim();
  if (!cleanTitle || cleanTitle.length > 80 || !cleanMessage || cleanMessage.length > 1000) throw new Error('Enter a title (up to 80 characters) and message (up to 1000 characters).');
  if (!id || id.includes('/')) throw new Error('Invalid announcement. Please try again.');
  return { cleanTitle, cleanMessage };
}
export async function publishAnnouncement(id: string, title: string, message: string): Promise<void> {
  const user = await requireAdmin();
  const { cleanTitle, cleanMessage } = validateContent(id, title, message);
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'announcements', id);
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      const data = existing.data();
      if (data.createdBy === user.uid && data.title === cleanTitle && data.message === cleanMessage) return;
      throw new Error('This announcement has already been used. Please start a new announcement.');
    }
    transaction.set(ref, { title: cleanTitle, message: cleanMessage, audience: 'all', createdBy: user.uid, createdAt: serverTimestamp() });
  });
}
export async function updateAnnouncement(id: string, title: string, message: string): Promise<void> {
  const user = await requireAdmin();
  const { cleanTitle, cleanMessage } = validateContent(id, title, message);
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'announcements', id);
    const existing = await transaction.get(ref);
    if (!existing.exists()) throw new Error('This announcement no longer exists.');
    transaction.update(ref, { title: cleanTitle, message: cleanMessage, updatedAt: serverTimestamp(), updatedBy: user.uid });
  });
}
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireAdmin();
  if (!id || id.includes('/')) throw new Error('Invalid announcement.');
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'announcements', id);
    const existing = await transaction.get(ref);
    if (!existing.exists()) throw new Error('This announcement no longer exists.');
    transaction.delete(ref);
  });
}
export async function markAnnouncementRead(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to read notifications.');
  if (!id || id.includes('/')) throw new Error('Invalid notification.');
  await setDoc(doc(db, 'users', user.uid, 'announcementReads', id), { readAt: serverTimestamp() });
}
export function announcementError(cause: unknown): string {
  const code = (cause as { code?: string })?.code;
  if (code === 'permission-denied') return 'Announcements could not be accessed. Please contact the app administrator.';
  if (code === 'unavailable') return 'Check your connection and try again.';
  return cause instanceof Error ? cause.message : 'Could not complete this action. Please try again.';
}

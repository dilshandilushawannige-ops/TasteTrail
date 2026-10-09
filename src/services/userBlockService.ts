import { auth, db } from '@/firebaseConfig';
import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

export type BlockDuration = 7 | 30;
export function blockExpiry(data: { blockedAt?: unknown; blockDurationDays?: unknown }): number | null {
  if (!(data.blockedAt instanceof Timestamp) || (data.blockDurationDays !== 7 && data.blockDurationDays !== 30)) return null;
  return data.blockedAt.toMillis() + data.blockDurationDays * 86400000;
}

export async function blockUser(userId: string, days: BlockDuration): Promise<void> {
  const admin = auth.currentUser;
  if (!admin) throw new Error('Please sign in with an admin account.');
  if (!userId || userId.includes('/') || userId === admin.uid) throw new Error('You cannot block your own account.');
  if (days !== 7 && days !== 30) throw new Error('Choose one week or one month.');
  const { claims } = await admin.getIdTokenResult(true);
  const allowed = claims.admin === true || claims.admin === 'true' || claims.isAdmin === true
    || claims.role === 'admin' || (Array.isArray(claims.roles) && claims.roles.includes('admin'));
  if (!allowed) throw new Error('Only admins can block users.');
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'users', userId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This user no longer exists.');
    const expires = blockExpiry(snapshot.data());
    if (expires && expires > Date.now()) throw new Error('This user is already blocked.');
    transaction.update(ref, { blockedAt: serverTimestamp(), blockDurationDays: days, blockedBy: admin.uid });
  });
}

export async function unblockUser(userId: string): Promise<void> {
  const admin = auth.currentUser;
  if (!admin) throw new Error('Please sign in with an admin account.');
  if (!userId || userId.includes('/') || userId === admin.uid) throw new Error('You cannot unblock your own account.');
  const { claims } = await admin.getIdTokenResult(true);
  const allowed = claims.admin === true || claims.admin === 'true' || claims.isAdmin === true
    || claims.role === 'admin' || (Array.isArray(claims.roles) && claims.roles.includes('admin'));
  if (!allowed) throw new Error('Only admins can unblock users.');
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'users', userId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This user no longer exists.');
    transaction.update(ref, { blockedAt: null, blockDurationDays: 0, blockedBy: admin.uid });
  });
}

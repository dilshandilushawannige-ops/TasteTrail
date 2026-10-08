import { auth, db } from '@/firebaseConfig';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

function savedRestaurantRef(userId: string, restaurantId: string) {
  if (!userId || !restaurantId || restaurantId.includes('/')) {
    throw new Error('A valid user and restaurant ID are required.');
  }
  return doc(db, 'users', userId, 'savedRestaurants', restaurantId);
}

export async function saveRestaurant(restaurantId: string, userId = auth.currentUser?.uid) {
  if (!userId) throw new Error('Please sign in to save restaurants.');
  await setDoc(savedRestaurantRef(userId, restaurantId), {
    restaurantId,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function unsaveRestaurant(restaurantId: string, userId = auth.currentUser?.uid) {
  if (!userId) throw new Error('Please sign in to manage saved restaurants.');
  await deleteDoc(savedRestaurantRef(userId, restaurantId));
}

export async function toggleSavedRestaurant(restaurantId: string, saved: boolean, userId = auth.currentUser?.uid) {
  return saved ? unsaveRestaurant(restaurantId, userId) : saveRestaurant(restaurantId, userId);
}

export function subscribeToSavedRestaurants(
  userId: string,
  callback: (restaurantIds: string[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, 'users', userId, 'savedRestaurants'),
    (snapshot) => callback(snapshot.docs.map((item) => item.data().restaurantId || item.id)),
    (error) => onError?.(error)
  );
}

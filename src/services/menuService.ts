import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import type { MenuCategory, MenuItem, MenuItemInput } from '@/types/menu';

function itemFromSnapshot(id: string, data: Record<string, any>): MenuItem {
  return {
    id,
    restaurantId: data.restaurantId,
    name: data.name || '',
    tagline: data.tagline || '',
    categoryId: data.categoryId || '',
    description: data.description || '',
    price: Number(data.price) || 0,
    spiceLevel: data.spiceLevel || 'None',
    badge: data.badge || 'None',
    photoUrl: data.photoUrl || undefined,
    available: data.available !== false,
    sortOrder: Number(data.sortOrder) || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function addMenuItem(input: MenuItemInput): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', input.restaurantId, 'menuItems'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMenuItem(
  restaurantId: string,
  itemId: string,
  input: Partial<MenuItemInput>
): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'menuItems', itemId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'restaurants', restaurantId, 'menuItems', itemId));
}

export async function addCategory(
  restaurantId: string,
  category: Omit<MenuCategory, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'menuCategories'), category);
  return ref.id;
}

export function subscribeToMenu(
  restaurantId: string,
  onItems: (items: MenuItem[]) => void,
  onCategories: (categories: MenuCategory[]) => void,
  onError?: (error: Error) => void
): () => void {
  const unsubItems = onSnapshot(
    collection(db, 'restaurants', restaurantId, 'menuItems'),
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => itemFromSnapshot(item.id, item.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      onItems(items);
    },
    (error) => onError?.(error)
  );
  const unsubCategories = onSnapshot(
    collection(db, 'restaurants', restaurantId, 'menuCategories'),
    (snapshot) => {
      const categories = snapshot.docs
        .map((category) => ({ id: category.id, ...category.data() } as MenuCategory))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      onCategories(categories);
    },
    (error) => onError?.(error)
  );
  return () => {
    unsubItems();
    unsubCategories();
  };
}

import type { Timestamp } from 'firebase/firestore';

export type SpiceLevel = 'None' | 'Mild' | 'Medium' | 'Hot' | 'Extra Hot';
export type MenuBadge = 'None' | 'Must Try' | 'Vegan Delight' | "Chef's Special" | 'New';

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  tagline: string;
  categoryId: string;
  description: string;
  price: number;
  spiceLevel: SpiceLevel;
  badge: MenuBadge;
  photoUrl?: string;
  available: boolean;
  sortOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MenuCategory {
  id: string;
  name: string;
  subtitle: string;
  sortOrder: number;
}

export type MenuItemInput = Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>;

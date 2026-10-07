/**
 * Restaurant Firestore Service
 * Handles all restaurant CRUD operations and real-time subscriptions
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  GeoPoint,
  Timestamp 
} from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import { db } from '@/firebaseConfig';

export interface Restaurant {
  id: string;
  name: string;
  nameLower: string;
  category: string;
  tags: string[];
  signatureDish: string;
  description: string;
  coverPhotoUrl?: string;
  photos: string[];
  address: string;
  city: string;
  location?: GeoPoint;
  geohash?: string;
  phone: string;
  website?: string;
  openTime: string;
  closeTime: string;
  openAllDays: boolean;
  status: 'draft' | 'active';
  rating: number;
  reviewCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateRestaurantData = Omit<Restaurant, 'id' | 'nameLower' | 'geohash' | 'createdAt' | 'updatedAt'>;
export type UpdateRestaurantData = Partial<Omit<Restaurant, 'id' | 'createdBy' | 'createdAt'>>;

/**
 * Creates a new restaurant document in Firestore
 */
export async function createRestaurant(data: CreateRestaurantData): Promise<string> {
  try {
    // Clean undefined values and prepare document
    const cleanData = removeUndefinedValues({
      ...data,
      nameLower: data.name.toLowerCase(),
      geohash: data.location ? geohashForLocation([data.location.latitude, data.location.longitude], 10) : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, 'restaurants'), cleanData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw new Error(`Failed to create restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing restaurant document
 */
export async function updateRestaurant(id: string, data: UpdateRestaurantData): Promise<void> {
  try {
    const updateData = removeUndefinedValues({
      ...data,
      nameLower: data.name ? data.name.toLowerCase() : undefined,
      geohash: data.location ? geohashForLocation([data.location.latitude, data.location.longitude], 10) : undefined,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'restaurants', id), updateData);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    throw new Error(`Failed to update restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets a single restaurant by ID
 */
export async function getRestaurant(id: string): Promise<Restaurant | null> {
  try {
    const docRef = doc(db, 'restaurants', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Ensure required fields have default values
      const restaurant: Restaurant = {
        id: docSnap.id,
        name: data.name || 'Untitled Restaurant',
        nameLower: data.nameLower || (data.name || '').toLowerCase(),
        category: data.category || 'Unknown',
        tags: data.tags || [],
        signatureDish: data.signatureDish || '',
        description: data.description || '',
        coverPhotoUrl: data.coverPhotoUrl,
        photos: data.photos || [],
        address: data.address || '',
        city: data.city || '',
        location: data.location,
        geohash: data.geohash,
        phone: data.phone || '',
        website: data.website,
        openTime: data.openTime || '09:00',
        closeTime: data.closeTime || '21:00',
        openAllDays: data.openAllDays || false,
        status: data.status || 'draft',
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        createdBy: data.createdBy || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      return restaurant;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting restaurant:', error);
    throw new Error(`Failed to get restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a restaurant document
 */
export async function deleteRestaurant(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'restaurants', id));
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    throw new Error(`Failed to delete restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Subscribes to real-time updates of all restaurants
 * Orders by createdAt descending (newer first)
 */
export function subscribeToRestaurants(
  callback: (restaurants: Restaurant[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    // Create query with orderBy - if this needs a composite index, we'll sort client-side instead
    const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const restaurants: Restaurant[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Ensure required fields have default values
          const restaurant: Restaurant = {
            id: doc.id,
            name: data.name || 'Untitled Restaurant',
            nameLower: data.nameLower || (data.name || '').toLowerCase(),
            category: data.category || 'Unknown',
            tags: data.tags || [],
            signatureDish: data.signatureDish || '',
            description: data.description || '',
            coverPhotoUrl: data.coverPhotoUrl,
            photos: data.photos || [],
            address: data.address || '',
            city: data.city || '',
            location: data.location,
            geohash: data.geohash,
            phone: data.phone || '',
            website: data.website,
            openTime: data.openTime || '09:00',
            closeTime: data.closeTime || '21:00',
            openAllDays: data.openAllDays || false,
            status: data.status || 'draft',
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            createdBy: data.createdBy || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          restaurants.push(restaurant);
        });
        callback(restaurants);
      },
      (error) => {
        console.error('Error in restaurants subscription:', error);
        
        // If it's an index error, try without ordering and sort client-side
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.warn('Firestore index missing, falling back to client-side sorting');
          return subscribeToRestaurantsClientSort(callback, onError);
        }
        
        if (onError) {
          onError(new Error(`Failed to subscribe to restaurants: ${error.message}`));
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up restaurants subscription:', error);
    if (onError) {
      onError(new Error(`Failed to setup subscription: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Fallback subscription without server-side ordering (client-side sort)
 */
function subscribeToRestaurantsClientSort(
  callback: (restaurants: Restaurant[]) => void,
  onError?: (error: Error) => void
): () => void {
  const unsubscribe = onSnapshot(
    collection(db, 'restaurants'),
    (snapshot) => {
      const restaurants: Restaurant[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure required fields have default values
        const restaurant: Restaurant = {
          id: doc.id,
          name: data.name || 'Untitled Restaurant',
          nameLower: data.nameLower || (data.name || '').toLowerCase(),
          category: data.category || 'Unknown',
          tags: data.tags || [],
          signatureDish: data.signatureDish || '',
          description: data.description || '',
          coverPhotoUrl: data.coverPhotoUrl,
          photos: data.photos || [],
          address: data.address || '',
          city: data.city || '',
          location: data.location,
          geohash: data.geohash,
          phone: data.phone || '',
          website: data.website,
          openTime: data.openTime || '09:00',
          closeTime: data.closeTime || '21:00',
          openAllDays: data.openAllDays || false,
          status: data.status || 'draft',
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          createdBy: data.createdBy || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        restaurants.push(restaurant);
      });
      
      // Sort client-side by createdAt descending
      restaurants.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
      
      callback(restaurants);
    },
    (error) => {
      console.error('Error in fallback restaurants subscription:', error);
      if (onError) {
        onError(new Error(`Failed to subscribe to restaurants: ${error.message}`));
      }
    }
  );

  return unsubscribe;
}

/**
 * Utility function to remove undefined values from objects
 * Firestore rejects undefined values, so we need to clean them
 */
function removeUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key as keyof T] = value;
    }
  }
  
  return cleaned;
}
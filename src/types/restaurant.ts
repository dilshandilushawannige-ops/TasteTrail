/**
 * Restaurant types and interfaces for the admin dashboard
 */

import { GeoPoint, Timestamp } from 'firebase/firestore';

/**
 * Restaurant category options
 */
export type RestaurantCategory = 
  | 'Traditional Sri Lankan'
  | 'Street Food'
  | 'Seafood'
  | 'Bakery & Sweets'
  | 'Cafe'
  | 'Fine Dining'
  | 'Vegetarian'
  | 'Fast Food';

/**
 * Restaurant status
 */
export type RestaurantStatus = 'draft' | 'active';

/**
 * Restaurant form data for creating/editing
 */
export interface RestaurantFormData {
  // Step 1: Restaurant Details
  name: string;
  category: RestaurantCategory | '';
  tags: string[];
  signatureDish: string;
  description: string;
  coverPhotoUri?: string; // Local URI before upload
  coverPhotoUrl?: string; // Cloud URL after upload
  additionalPhotosUris: string[]; // Local URIs before upload
  additionalPhotosUrls: string[]; // Cloud URLs after upload

  // Step 2: Location & Contact
  address: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  website?: string;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  openAllDays: boolean;
}

/**
 * Restaurant document in Firestore
 */
export interface Restaurant {
  id: string;
  name: string;
  nameLower: string; // For case-insensitive search
  category: RestaurantCategory;
  tags: string[];
  signatureDish: string;
  description: string;
  coverPhotoUrl: string;
  photos: string[]; // Additional photos URLs
  address: string;
  city: string;
  location: GeoPoint; // Firestore GeoPoint
  geohash: string; // For proximity queries
  phone: string; // E.164 format (+94XXXXXXXXX)
  website?: string;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  openAllDays: boolean;
  status: RestaurantStatus;
  rating: number; // Default 0
  reviewCount: number; // Default 0
  createdBy: string; // Admin UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Form validation errors
 */
export interface RestaurantFormErrors {
  name?: string;
  category?: string;
  signatureDish?: string;
  description?: string;
  coverPhoto?: string;
  address?: string;
  city?: string;
  coordinates?: string;
  phone?: string;
  website?: string;
  openTime?: string;
  closeTime?: string;
}

/**
 * Photo upload progress tracking
 */
export interface PhotoUpload {
  uri: string;
  progress: number;
  uploading: boolean;
  error?: string;
  url?: string;
}
/**
 * Constants for restaurant management
 */

import { RestaurantCategory } from '@/types/restaurant';

/**
 * Available restaurant categories
 */
export const RESTAURANT_CATEGORIES: RestaurantCategory[] = [
  'Traditional Sri Lankan',
  'Street Food', 
  'Seafood',
  'Bakery & Sweets',
  'Cafe',
  'Fine Dining',
  'Vegetarian',
  'Fast Food',
];

/**
 * Pre-defined cuisine/tag options
 */
export const CUISINE_TAGS = [
  'Southern Sri Lankan',
  'Claypot Cooking',
  'Spicy',
  'Authentic Heritage',
  'Organic',
  'Family Recipes',
  'Coconut-based',
  'Curry Specialties',
];

/**
 * Maximum number of additional photos allowed
 */
export const MAX_ADDITIONAL_PHOTOS = 8;

/**
 * Image upload constraints
 */
export const IMAGE_CONSTRAINTS = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
  compress: 0.7,
} as const;

/**
 * Cover photo aspect ratio (16:9)
 */
export const COVER_PHOTO_ASPECT_RATIO = 16 / 9;

/**
 * Phone number validation
 */
export const PHONE_VALIDATION = {
  minDigits: 9,
  maxDigits: 9,
  prefix: '+94',
} as const;

/**
 * Form validation messages
 */
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  invalidPhone: 'Please enter a valid Sri Lankan phone number (9 digits)',
  invalidUrl: 'Please enter a valid URL',
  invalidTime: 'Please enter a valid time (HH:mm)',
  maxTags: 'Maximum 10 tags allowed',
  tagLength: 'Tag must be between 2-30 characters',
  nameLength: 'Restaurant name must be between 2-100 characters',
  descriptionLength: 'Description must be between 10-500 characters',
  addressLength: 'Address must be between 5-200 characters',
  cityLength: 'City must be between 2-50 characters',
  signatureDishLength: 'Signature dish must be between 2-100 characters',
} as const;

/**
 * Default form values
 */
export const DEFAULT_RESTAURANT_FORM: {
  name: string;
  category: '';
  tags: string[];
  signatureDish: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  openTime: string;
  closeTime: string;
  openAllDays: boolean;
  additionalPhotosUris: string[];
  additionalPhotosUrls: string[];
} = {
  name: '',
  category: '',
  tags: [],
  signatureDish: '',
  description: '',
  address: '',
  city: '',
  phone: '',
  website: '',
  openTime: '09:00',
  closeTime: '22:00',
  openAllDays: true,
  additionalPhotosUris: [],
  additionalPhotosUrls: [],
};
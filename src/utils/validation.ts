/**
 * Validation utilities for restaurant forms
 */

import { RestaurantFormData, RestaurantFormErrors } from '@/types/restaurant';
import { VALIDATION_MESSAGES } from '@/constants/restaurant';

/**
 * Validate restaurant name
 */
export function validateRestaurantName(name: string): string | undefined {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return VALIDATION_MESSAGES.required;
  }
  
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return VALIDATION_MESSAGES.nameLength;
  }
  
  return undefined;
}

/**
 * Validate category selection
 */
export function validateCategory(category: string): string | undefined {
  if (!category || category.trim() === '') {
    return VALIDATION_MESSAGES.required;
  }
  
  return undefined;
}

/**
 * Validate description
 */
export function validateDescription(description: string): string | undefined {
  const trimmedDescription = description.trim();
  
  if (!trimmedDescription) {
    return VALIDATION_MESSAGES.required;
  }
  
  if (trimmedDescription.length < 10 || trimmedDescription.length > 500) {
    return VALIDATION_MESSAGES.descriptionLength;
  }
  
  return undefined;
}

/**
 * Validate cover photo
 */
export function validateCoverPhoto(coverPhotoUri?: string, coverPhotoUrl?: string): string | undefined {
  if (!coverPhotoUri && !coverPhotoUrl) {
    return 'Cover photo is required';
  }
  
  return undefined;
}

/**
 * Validate address
 */
export function validateAddress(address: string): string | undefined {
  const trimmedAddress = address.trim();
  
  if (!trimmedAddress) {
    return VALIDATION_MESSAGES.required;
  }
  
  if (trimmedAddress.length < 5 || trimmedAddress.length > 200) {
    return VALIDATION_MESSAGES.addressLength;
  }
  
  return undefined;
}

/**
 * Validate city
 */
export function validateCity(city: string): string | undefined {
  const trimmedCity = city.trim();
  
  if (!trimmedCity) {
    return VALIDATION_MESSAGES.required;
  }
  
  if (trimmedCity.length < 2 || trimmedCity.length > 50) {
    return VALIDATION_MESSAGES.cityLength;
  }
  
  return undefined;
}

/**
 * Validate coordinates
 */
export function validateCoordinates(coordinates?: { latitude: number; longitude: number }): string | undefined {
  if (!coordinates) {
    return 'Please select location on map';
  }
  
  // Basic coordinate validation
  if (coordinates.latitude < -90 || coordinates.latitude > 90) {
    return 'Invalid latitude value';
  }
  
  if (coordinates.longitude < -180 || coordinates.longitude > 180) {
    return 'Invalid longitude value';
  }
  
  return undefined;
}

/**
 * Validate Sri Lankan phone number
 */
export function validatePhoneNumber(phone: string): string | undefined {
  const trimmedPhone = phone.trim();
  
  if (!trimmedPhone) {
    return VALIDATION_MESSAGES.required;
  }
  
  // Remove spaces, hyphens, parentheses
  const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
  
  // Remove +94 prefix if present, or leading 0
  let phoneDigits = cleanPhone;
  if (phoneDigits.startsWith('+94')) {
    phoneDigits = phoneDigits.slice(3);
  } else if (phoneDigits.startsWith('0')) {
    phoneDigits = phoneDigits.slice(1);
  }
  
  // Should be exactly 9 digits after normalization
  if (!/^\d{9}$/.test(phoneDigits)) {
    return VALIDATION_MESSAGES.invalidPhone;
  }
  
  return undefined;
}

/**
 * Format phone number to E.164 format (+94XXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  let phoneDigits = cleanPhone;
  if (phoneDigits.startsWith('+94')) {
    phoneDigits = phoneDigits.slice(3);
  } else if (phoneDigits.startsWith('0')) {
    phoneDigits = phoneDigits.slice(1);
  }
  
  return `+94${phoneDigits}`;
}

/**
 * Validate website URL
 */
export function validateWebsiteUrl(website: string): string | undefined {
  const trimmedWebsite = website.trim();
  
  if (!trimmedWebsite) {
    return undefined; // Optional field
  }
  
  try {
    // Auto-prefix with https:// if no protocol
    const url = trimmedWebsite.startsWith('http') ? trimmedWebsite : `https://${trimmedWebsite}`;
    new URL(url);
    return undefined;
  } catch {
    return VALIDATION_MESSAGES.invalidUrl;
  }
}

/**
 * Normalize website URL (add https:// if missing)
 */
export function normalizeWebsiteUrl(website: string): string {
  const trimmedWebsite = website.trim();
  
  if (!trimmedWebsite) {
    return '';
  }
  
  if (trimmedWebsite.startsWith('http://') || trimmedWebsite.startsWith('https://')) {
    return trimmedWebsite;
  }
  
  return `https://${trimmedWebsite}`;
}

/**
 * Validate time format (HH:mm)
 */
export function validateTimeFormat(time: string): string | undefined {
  if (!time || !time.trim()) {
    return VALIDATION_MESSAGES.required;
  }
  
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    return VALIDATION_MESSAGES.invalidTime;
  }
  
  return undefined;
}

/**
 * Validate opening and closing times
 */
export function validateOpeningHours(openTime: string, closeTime: string): { openTime?: string; closeTime?: string } {
  const errors: { openTime?: string; closeTime?: string } = {};
  
  const openError = validateTimeFormat(openTime);
  if (openError) {
    errors.openTime = openError;
  }
  
  const closeError = validateTimeFormat(closeTime);
  if (closeError) {
    errors.closeTime = closeError;
  }
  
  // Note: We allow overnight hours (e.g., 18:00 - 02:00)
  // Additional business logic validation can be added here if needed
  
  return errors;
}

/**
 * Validate Step 1 fields for navigation
 */
export function validateStep1(formData: RestaurantFormData): RestaurantFormErrors {
  const errors: RestaurantFormErrors = {};
  
  const nameError = validateRestaurantName(formData.name);
  if (nameError) {
    errors.name = nameError;
  }
  
  return errors;
}

/**
 * Validate Step 2 fields for draft save (minimal requirements)
 */
export function validateStep2ForDraft(formData: RestaurantFormData): RestaurantFormErrors {
  const errors: RestaurantFormErrors = {};
  
  // Only name is required for draft
  const nameError = validateRestaurantName(formData.name);
  if (nameError) {
    errors.name = nameError;
  }
  
  return errors;
}

/**
 * Validate Step 2 fields for publish (full requirements)
 */
export function validateStep2ForPublish(formData: RestaurantFormData): RestaurantFormErrors {
  const errors: RestaurantFormErrors = {};
  
  // Step 1 required fields
  const nameError = validateRestaurantName(formData.name);
  if (nameError) {
    errors.name = nameError;
  }
  
  const categoryError = validateCategory(formData.category);
  if (categoryError) {
    errors.category = categoryError;
  }
  
  const descriptionError = validateDescription(formData.description);
  if (descriptionError) {
    errors.description = descriptionError;
  }
  
  const coverPhotoError = validateCoverPhoto(formData.coverPhotoUri, formData.coverPhotoUrl);
  if (coverPhotoError) {
    errors.coverPhoto = coverPhotoError;
  }
  
  // Step 2 required fields
  const addressError = validateAddress(formData.address);
  if (addressError) {
    errors.address = addressError;
  }
  
  const cityError = validateCity(formData.city);
  if (cityError) {
    errors.city = cityError;
  }
  
  const coordinatesError = validateCoordinates(formData.coordinates);
  if (coordinatesError) {
    errors.coordinates = coordinatesError;
  }
  
  const phoneError = validatePhoneNumber(formData.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }
  
  const websiteError = validateWebsiteUrl(formData.website || '');
  if (websiteError) {
    errors.website = websiteError;
  }
  
  const timeErrors = validateOpeningHours(formData.openTime, formData.closeTime);
  if (timeErrors.openTime) {
    errors.openTime = timeErrors.openTime;
  }
  if (timeErrors.closeTime) {
    errors.closeTime = timeErrors.closeTime;
  }
  
  return errors;
}
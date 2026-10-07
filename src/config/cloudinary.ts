/**
 * Shared Cloudinary configuration
 * Extracted from existing addRecipe.tsx to reuse across the app
 */

/**
 * Cloudinary configuration
 * Uses the same cloud name and preset as the existing addRecipe feature
 */
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dknhx6ap7',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'taste_trail_recipes',
  
  // Upload folders for organization
  folders: {
    recipes: 'recipes',
    restaurants: 'restaurants',
  },
  
  // Upload URL
  uploadUrl: (cloudName: string) => `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
} as const;
/**
 * Image Upload Service
 * Handles image compression, resizing, and Cloudinary uploads for restaurants
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CLOUDINARY_CONFIG } from '@/config/cloudinary';

export interface ImageUploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ImageUploadResult {
  url: string;
  publicId: string;
}

/**
 * Compresses and resizes an image before upload
 */
async function processImage(
  uri: string, 
  options: ImageUploadOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 0.8,
  } = options;

  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error processing image:', error);
    // Return original URI if processing fails
    return uri;
  }
}

/**
 * Uploads an image to Cloudinary with progress tracking
 */
export async function uploadImageToCloudinary(
  imageUri: string,
  options: ImageUploadOptions = {},
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> {
  try {
    // Skip upload if it's already a remote URL
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      // Extract public ID from Cloudinary URL if possible
      const publicId = extractPublicIdFromUrl(imageUri);
      return {
        url: imageUri,
        publicId: publicId || 'existing-image',
      };
    }

    // Process the image (compress/resize)
    const processedUri = await processImage(imageUri, options);

    // Prepare form data
    const formData = new FormData();
    formData.append('file', {
      uri: processedUri,
      type: 'image/jpeg',
      name: 'restaurant-image.jpg',
    } as any);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    // Add folder if specified
    if (options.folder) {
      formData.append('folder', options.folder);
    }

    // Create the upload request
    const uploadUrl = CLOUDINARY_CONFIG.uploadUrl(CLOUDINARY_CONFIG.cloudName);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.secure_url,
              publicId: response.public_id,
            });
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'));
      });

      xhr.open('POST', uploadUrl);
      xhr.timeout = 30000; // 30 second timeout
      xhr.send(formData);
    });

  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Uploads multiple images with individual progress tracking
 */
export async function uploadMultipleImages(
  imageUris: string[],
  options: ImageUploadOptions = {},
  onImageProgress?: (index: number, progress: UploadProgress) => void,
  onImageComplete?: (index: number, result: ImageUploadResult) => void
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = [];
  const errors: string[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    try {
      const result = await uploadImageToCloudinary(
        imageUris[i],
        options,
        (progress) => onImageProgress?.(i, progress)
      );
      results.push(result);
      onImageComplete?.(i, result);
    } catch (error) {
      const errorMessage = `Image ${i + 1}: ${error instanceof Error ? error.message : 'Upload failed'}`;
      errors.push(errorMessage);
      console.error(`Error uploading image ${i}:`, error);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Some uploads failed:\n${errors.join('\n')}`);
  }

  return results;
}

/**
 * Picks an image from gallery or camera
 */
export async function pickImage(
  source: 'gallery' | 'camera' = 'gallery'
): Promise<string | null> {
  try {
    // Request permissions
    if (source === 'camera') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        throw new Error('Camera permission is required to take photos');
      }
    } else {
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!galleryPermission.granted) {
        throw new Error('Gallery permission is required to select photos');
      }
    }

    // Launch picker
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9], // 16:9 aspect ratio for restaurant photos
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9], // 16:9 aspect ratio for restaurant photos
          quality: 0.9,
          allowsMultipleSelection: false,
        });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('Error picking image:', error);
    throw new Error(`Failed to pick image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts Cloudinary public ID from a URL
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Match Cloudinary URL pattern: .../image/upload/.../public_id.ext
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(?:[^/]+\/)*([^/.]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import type { ImagePickerAsset } from 'expo-image-picker';
import { CLOUDINARY_CONFIG } from '@/config/cloudinary';
import type { ReviewMedia } from '@/types/review';

// Review uploads support both image and video assets without changing restaurant uploads.
export async function uploadReviewMedia(asset: ImagePickerAsset): Promise<ReviewMedia> {
  const type = asset.type === 'video' ? 'video' : 'image';
  const form = new FormData();
  if (Platform.OS === 'web') {
    const file = asset.file || await (await expoFetch(asset.uri)).blob();
    form.append('file', file, asset.fileName || `review.${type === 'video' ? 'mp4' : 'jpg'}`);
  } else {
    // Expo SDK 57 fetch accepts a File/Blob, not React Native's { uri } part.
    form.append('file', new File(asset.uri));
  }
  form.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  form.append('folder', 'reviews');
  const response = await expoFetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`, {
    method: 'POST', body: form,
  });
  const data = await response.json();
  if (!response.ok || typeof data.secure_url !== 'string') {
    throw new Error(data.error?.message || 'Media upload failed. Your draft is still here; please try again.');
  }
  return { url: data.secure_url, type };
}

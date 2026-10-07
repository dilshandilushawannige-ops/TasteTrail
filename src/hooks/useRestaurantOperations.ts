/**
 * Restaurant Operations Hook
 * Handles create, update, delete operations with image uploads
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { GeoPoint } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { 
  createRestaurant, 
  updateRestaurant, 
  deleteRestaurant,
  type CreateRestaurantData,
  type UpdateRestaurantData 
} from '@/services/restaurantService';
import { uploadImageToCloudinary, uploadMultipleImages } from '@/services/imageUploadService';
import { CLOUDINARY_CONFIG } from '@/config/cloudinary';
import type { RestaurantFormData } from '@/types/restaurant';

export interface UploadProgress {
  coverPhoto: number;
  additionalPhotos: { [index: number]: number };
}

export interface UseRestaurantOperationsResult {
  isSubmitting: boolean;
  uploadProgress: UploadProgress;
  saveRestaurant: (formData: RestaurantFormData, isDraft: boolean) => Promise<string>;
  updateRestaurantData: (id: string, formData: RestaurantFormData, isDraft: boolean) => Promise<void>;
  deleteRestaurantData: (id: string) => Promise<void>;
}

/**
 * Hook for restaurant CRUD operations with image upload
 */
export function useRestaurantOperations(): UseRestaurantOperationsResult {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    coverPhoto: 0,
    additionalPhotos: {},
  });

  /**
   * Uploads images and saves restaurant to Firestore
   */
  const saveRestaurant = async (formData: RestaurantFormData, isDraft: boolean): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setIsSubmitting(true);
    resetProgress();

    try {
      // Upload cover photo if needed
      let coverPhotoUrl = formData.coverPhotoUrl;
      if (formData.coverPhotoUri && !formData.coverPhotoUri.startsWith('http')) {
        const result = await uploadImageToCloudinary(
          formData.coverPhotoUri,
          { folder: CLOUDINARY_CONFIG.folders.restaurants },
          (progress) => {
            setUploadProgress(prev => ({ ...prev, coverPhoto: progress.percentage }));
          }
        );
        coverPhotoUrl = result.url;
      }

      // Upload additional photos if needed
      let additionalPhotoUrls = [...(formData.additionalPhotosUrls || [])];
      if (formData.additionalPhotosUris && formData.additionalPhotosUris.length > 0) {
        const newPhotos = formData.additionalPhotosUris.filter(uri => !uri.startsWith('http'));
        if (newPhotos.length > 0) {
          const results = await uploadMultipleImages(
            newPhotos,
            { folder: CLOUDINARY_CONFIG.folders.restaurants },
            (index, progress) => {
              setUploadProgress(prev => ({
                ...prev,
                additionalPhotos: { ...prev.additionalPhotos, [index]: progress.percentage }
              }));
            }
          );
          additionalPhotoUrls = [
            ...additionalPhotoUrls,
            ...results.map(result => result.url)
          ];
        }
      }

      // Prepare restaurant data for Firestore
      const restaurantData: CreateRestaurantData = {
        name: formData.name.trim(),
        category: formData.category as any,
        tags: formData.tags || [],
        signatureDish: formData.signatureDish.trim(),
        description: formData.description.trim(),
        coverPhotoUrl: coverPhotoUrl || '',
        photos: additionalPhotoUrls,
        address: formData.address.trim(),
        city: formData.city.trim(),
        location: formData.coordinates ? 
          new GeoPoint(formData.coordinates.latitude, formData.coordinates.longitude) : 
          undefined,
        phone: `+94${formData.phone.replace(/\s+/g, '')}`, // Format with country code
        website: formData.website?.trim() || undefined,
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        openAllDays: formData.openAllDays,
        status: isDraft ? 'draft' : 'active',
        rating: 0,
        reviewCount: 0,
        createdBy: user.uid,
      };

      const restaurantId = await createRestaurant(restaurantData);
      return restaurantId;

    } catch (error) {
      console.error('Error saving restaurant:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      resetProgress();
    }
  };

  /**
   * Updates an existing restaurant
   */
  const updateRestaurantData = async (id: string, formData: RestaurantFormData, isDraft: boolean): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setIsSubmitting(true);
    resetProgress();

    try {
      // Upload cover photo if changed
      let coverPhotoUrl = formData.coverPhotoUrl;
      if (formData.coverPhotoUri && !formData.coverPhotoUri.startsWith('http')) {
        const result = await uploadImageToCloudinary(
          formData.coverPhotoUri,
          { folder: CLOUDINARY_CONFIG.folders.restaurants },
          (progress) => {
            setUploadProgress(prev => ({ ...prev, coverPhoto: progress.percentage }));
          }
        );
        coverPhotoUrl = result.url;
      }

      // Upload new additional photos
      let additionalPhotoUrls = [...(formData.additionalPhotosUrls || [])];
      if (formData.additionalPhotosUris && formData.additionalPhotosUris.length > 0) {
        const newPhotos = formData.additionalPhotosUris.filter(uri => !uri.startsWith('http'));
        if (newPhotos.length > 0) {
          const results = await uploadMultipleImages(
            newPhotos,
            { folder: CLOUDINARY_CONFIG.folders.restaurants },
            (index, progress) => {
              setUploadProgress(prev => ({
                ...prev,
                additionalPhotos: { ...prev.additionalPhotos, [index]: progress.percentage }
              }));
            }
          );
          additionalPhotoUrls = [
            ...additionalPhotoUrls,
            ...results.map(result => result.url)
          ];
        }
      }

      // Prepare update data
      const updateData: UpdateRestaurantData = {
        name: formData.name.trim(),
        category: formData.category as any,
        tags: formData.tags || [],
        signatureDish: formData.signatureDish.trim(),
        description: formData.description.trim(),
        coverPhotoUrl: coverPhotoUrl || '',
        photos: additionalPhotoUrls,
        address: formData.address.trim(),
        city: formData.city.trim(),
        location: formData.coordinates ? 
          new GeoPoint(formData.coordinates.latitude, formData.coordinates.longitude) : 
          undefined,
        phone: `+94${formData.phone.replace(/\s+/g, '')}`,
        website: formData.website?.trim() || undefined,
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        openAllDays: formData.openAllDays,
        status: isDraft ? 'draft' : 'active',
      };

      await updateRestaurant(id, updateData);

    } catch (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
      resetProgress();
    }
  };

  /**
   * Deletes a restaurant with confirmation
   */
  const deleteRestaurantData = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Delete Restaurant',
        'Are you sure you want to delete this restaurant? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Cancelled')) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsSubmitting(true);
                await deleteRestaurant(id);
                resolve();
              } catch (error) {
                reject(error);
              } finally {
                setIsSubmitting(false);
              }
            }
          }
        ]
      );
    });
  };

  /**
   * Resets upload progress
   */
  const resetProgress = () => {
    setUploadProgress({
      coverPhoto: 0,
      additionalPhotos: {},
    });
  };

  return {
    isSubmitting,
    uploadProgress,
    saveRestaurant,
    updateRestaurantData,
    deleteRestaurantData,
  };
}
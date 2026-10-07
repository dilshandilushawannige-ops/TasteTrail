/**
 * Cover Photo Uploader Component
 * Handles 16:9 aspect ratio cover photo selection, preview, and removal
 */

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COVER_PHOTO_ASPECT_RATIO } from '@/constants/restaurant';

interface CoverPhotoUploaderProps {
  photoUri?: string;
  onPhotoSelected: (uri: string) => void;
  onPhotoRemoved: () => void;
  error?: string;
}

/**
 * Cover photo uploader with 16:9 aspect ratio constraint
 */
export function CoverPhotoUploader({
  photoUri,
  onPhotoSelected,
  onPhotoRemoved,
  error,
}: CoverPhotoUploaderProps) {

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to select photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleSelectPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Enforce 16:9 aspect ratio
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onPhotoSelected(asset.uri);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onPhotoRemoved },
      ]
    );
  };

  const renderPlaceholder = () => (
    <TouchableOpacity 
      style={[styles.placeholder, error && styles.placeholderError]}
      onPress={handleSelectPhoto}
      activeOpacity={0.7}
    >
      <View style={styles.placeholderContent}>
        <View style={styles.cameraIconContainer}>
          <Ionicons name="camera-outline" size={32} color="#999" />
        </View>
        <Text style={styles.placeholderTitle}>Primary View</Text>
        <Text style={styles.placeholderSubtitle}>Click to upload the restaurant&apos;s main</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Image 
        source={{ uri: photoUri }} 
        style={styles.previewImage}
        resizeMode="cover"
      />
      
      {/* Overlay controls */}
      <View style={styles.previewOverlay}>
        <TouchableOpacity
          style={styles.replaceButton}
          onPress={handleSelectPhoto}
        >
          <Ionicons name="camera" size={16} color="#FFF" />
          <Text style={styles.replaceButtonText}>Replace</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemovePhoto}
        >
          <Ionicons name="trash" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {photoUri ? renderPreview() : renderPlaceholder()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  placeholder: {
    aspectRatio: COVER_PHOTO_ASPECT_RATIO,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 140,
  },
  placeholderError: {
    borderColor: '#E8505B',
    backgroundColor: '#FFF5F5',
  },
  placeholderContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cameraIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  previewContainer: {
    position: 'relative',
    aspectRatio: COVER_PHOTO_ASPECT_RATIO,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  replaceButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: 'rgba(232, 80, 91, 0.8)',
    borderRadius: 8,
    padding: 8,
  },
});
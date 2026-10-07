/**
 * Additional Photos Uploader Component
 * Handles multiple photo selection up to max limit with progress tracking
 */

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MAX_ADDITIONAL_PHOTOS } from '@/constants/restaurant';

interface AdditionalPhotosUploaderProps {
  photoUris: string[];
  onPhotosSelected: (uris: string[]) => void;
  onPhotoRemoved: (index: number) => void;
  maxPhotos?: number;
}

/**
 * Additional photos uploader with grid layout and remove functionality
 */
export function AdditionalPhotosUploader({
  photoUris,
  onPhotosSelected,
  onPhotoRemoved,
  maxPhotos = MAX_ADDITIONAL_PHOTOS,
}: AdditionalPhotosUploaderProps) {

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

  const handleAddPhotos = async () => {
    if (photoUris.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const remainingSlots = maxPhotos - photoUris.length;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(asset => asset.uri);
        onPhotosSelected([...photoUris, ...newUris]);
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onPhotoRemoved(index) },
      ]
    );
  };

  const renderPhotoItem = ({ item: uri, index }: { item: string; index: number }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
      
      {/* Remove button overlay */}
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => handleRemovePhoto(index)}
      >
        <Ionicons name="close" size={14} color="#FFF" />
      </TouchableOpacity>
      
      {/* Photo index */}
      <View style={styles.photoIndex}>
        <Text style={styles.photoIndexText}>{index + 1}</Text>
      </View>
    </View>
  );

  const renderAddButton = () => {
    if (photoUris.length >= maxPhotos) {
      return null;
    }

    return (
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddPhotos}
        activeOpacity={0.7}
      >
        <View style={styles.addButtonContent}>
          <View style={styles.plusIconContainer}>
            <Ionicons name="add" size={14} color="#E8505B" />
          </View>
          <Text style={styles.addButtonText}>Add Photos</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGrid = () => {
    const data = [...photoUris];
    if (photoUris.length < maxPhotos) {
      data.push('add_button');
    }

    return (
      <View style={styles.horizontalGrid}>
        {data.map((item, index) => {
          if (item === 'add_button') {
            return (
              <View key={`add_${index}`} style={styles.smallTileContainer}>
                {renderAddButton()}
              </View>
            );
          }
          return (
            <View key={item as string} style={styles.smallTileContainer}>
              {renderPhotoItem({ item: item as string, index })}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {photoUris.length === 0 ? (
        <View style={styles.smallTileContainer}>
          {renderAddButton()}
        </View>
      ) : (
        renderGrid()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  horizontalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  smallTileContainer: {
    width: 72, // Small square tile like reference (about 70-75dp)
    height: 72,
  },
  photoItem: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndexText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
  },
  addButton: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E8505B',
    borderStyle: 'dashed',
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonContent: {
    alignItems: 'center',
  },
  plusIconContainer: {
    width: 20, // Smaller icon container
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addButtonText: {
    fontSize: 10, // Tiny text like reference
    fontWeight: '600',
    color: '#E8505B',
    textAlign: 'center',
  },
});
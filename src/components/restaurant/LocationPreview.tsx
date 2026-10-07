/**
 * Location Preview Component
 * Shows a small non-interactive map preview of selected location
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';

import { Coordinates } from '@/utils/location';

interface LocationPreviewProps {
  coordinates?: Coordinates;
  onPress?: () => void;
  error?: boolean;
}

/**
 * Small map preview showing selected location
 */
export function LocationPreview({
  coordinates,
  onPress,
  error = false,
}: LocationPreviewProps) {

  const renderPlaceholder = () => (
    <TouchableOpacity 
      style={[styles.placeholder, error && styles.placeholderError]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="location-outline" size={24} color="#999" />
      <Text style={styles.placeholderText}>Tap to select location</Text>
    </TouchableOpacity>
  );

  const renderMapPreview = () => (
    <TouchableOpacity 
      style={styles.mapContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Map
        style={styles.map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        dragPan={false}
        touchZoom={false}
        touchRotate={false}
        touchPitch={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
      >
        <Camera
          center={[coordinates!.longitude, coordinates!.latitude]}
          zoom={15}
        />
        
        {/* Location marker */}
        <Marker
          id="previewLocation"
          lngLat={[coordinates!.longitude, coordinates!.latitude]}
        >
          <View style={styles.markerContainer}>
            <View style={styles.marker}>
              <Ionicons name="location" size={16} color="#FFF" />
            </View>
          </View>
        </Marker>
      </Map>
      
      {/* Overlay to indicate it's tappable */}
      <View style={styles.overlay}>
        <Ionicons name="expand-outline" size={20} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  if (!coordinates) {
    return renderPlaceholder();
  }

  return renderMapPreview();
}

const styles = StyleSheet.create({
  placeholder: {
    height: 120,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderError: {
    borderColor: '#E8505B',
    backgroundColor: '#FFF5F5',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  mapContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8505B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  overlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
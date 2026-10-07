/**
 * Map Picker Modal Component
 * Full-screen modal for selecting location on map using MapLibre
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Map, Camera, type CameraRef, type MapRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import type { NativeSyntheticEvent } from 'react-native';

import { Coordinates, SRI_LANKA_CENTER, reverseGeocode, validateCoordinates } from '@/utils/location';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';

interface MapPickerModalProps {
  visible: boolean;
  initialCoordinates?: Coordinates;
  onLocationSelect: (coordinates: Coordinates, address?: string, city?: string) => void;
  onClose: () => void;
}

/**
 * Map picker modal with MapLibre and location selection
 */
export function MapPickerModal({
  visible,
  initialCoordinates,
  onLocationSelect,
  onClose,
}: MapPickerModalProps) {
  // Initialize coordinates with initialCoordinates or default
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates>(
    () => initialCoordinates || SRI_LANKA_CENTER
  );
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [mapStyleError, setMapStyleError] = useState(false);
  
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  
  const {
    location: currentLocation,
    isLoading: isLoadingCurrentLocation,
    getCurrentLocationAsync,
  } = useCurrentLocation();

  // Memoize camera movement to avoid unnecessary re-renders
  const moveCameraToLocation = useCallback((coordinates: Coordinates) => {
    cameraRef.current?.easeTo({
      center: [coordinates.longitude, coordinates.latitude],
      zoom: 16,
      duration: 1000,
    });
  }, []);

  // Update coordinates when modal opens with different initial coordinates
  useEffect(() => {
    if (visible && initialCoordinates) {
      // This setState is intentional - we're syncing external props to internal state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCoordinates(initialCoordinates);
    }
  }, [visible, initialCoordinates]);

  // Handle current location changes
  useEffect(() => {
    if (currentLocation?.coordinates) {
      // Only auto-set coordinates if we haven't selected a specific location yet
      const isDefaultLocation = selectedCoordinates.latitude === SRI_LANKA_CENTER.latitude && 
                                selectedCoordinates.longitude === SRI_LANKA_CENTER.longitude;
      if (isDefaultLocation) {
        // This setState is intentional - we're syncing external location to internal state
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedCoordinates(currentLocation.coordinates);
      }
      // Always move camera to current location
      moveCameraToLocation(currentLocation.coordinates);
    }
  }, [currentLocation, selectedCoordinates, moveCameraToLocation]);

  const handleMapRegionChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const { center } = event.nativeEvent;
    // center is a LngLat array: [longitude, latitude]
    const [longitude, latitude] = center;
    const newCoordinates: Coordinates = {
      latitude,
      longitude,
    };
    
    if (validateCoordinates(newCoordinates)) {
      setSelectedCoordinates(newCoordinates);
    }
  };

  const handleCurrentLocationPress = () => {
    getCurrentLocationAsync();
  };

  const handleConfirmLocation = async () => {
    if (!validateCoordinates(selectedCoordinates)) {
      Alert.alert('Invalid Location', 'Please select a valid location on the map.');
      return;
    }

    setIsGeocodingAddress(true);
    
    try {
      const geocodeResult = await reverseGeocode(selectedCoordinates);
      onLocationSelect(selectedCoordinates, geocodeResult.address, geocodeResult.city);
      onClose();
    } catch (error) {
      console.error('Error geocoding address:', error);
      // Still return coordinates even if geocoding fails
      onLocationSelect(selectedCoordinates);
      onClose();
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleMapStyleLoadError = () => {
    setMapStyleError(true);
  };

  const handleRetryMapStyle = () => {
    setMapStyleError(false);
  };

  const renderMap = () => {
    if (mapStyleError) {
      return (
        <View style={styles.mapError}>
          <Ionicons name="alert-circle-outline" size={48} color="#E8505B" />
          <Text style={styles.mapErrorTitle}>Map Failed to Load</Text>
          <Text style={styles.mapErrorText}>
            Unable to load the map style. Please check your internet connection.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryMapStyle}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <Map
          ref={mapRef}
          style={styles.map}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onRegionDidChange={handleMapRegionChange}
          onWillStartLoadingMap={() => setMapStyleError(false)}
          onDidFinishLoadingStyle={() => setMapStyleError(false)}
          onDidFailLoadingMap={handleMapStyleLoadError}
        >
          <Camera
            ref={cameraRef}
            center={[selectedCoordinates.longitude, selectedCoordinates.latitude]}
            zoom={initialCoordinates ? 16 : 7}
          />
        </Map>

        {/* Center crosshair pin */}
        <View style={styles.centerPin}>
          <View style={styles.pinIcon}>
            <Ionicons name="location" size={20} color="#E8505B" />
          </View>
          <View style={styles.pinShadow} />
        </View>
      </View>
    );
  };

  const renderControls = () => (
    <View style={styles.controls}>
      {/* Coordinates display */}
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinatesText}>
          {selectedCoordinates.latitude.toFixed(6)}, {selectedCoordinates.longitude.toFixed(6)}
        </Text>
      </View>

      {/* My location button */}
      <TouchableOpacity
        style={[styles.myLocationButton, isLoadingCurrentLocation && styles.buttonDisabled]}
        onPress={handleCurrentLocationPress}
        disabled={isLoadingCurrentLocation}
      >
        <Ionicons 
          name={isLoadingCurrentLocation ? "hourglass-outline" : "navigate-outline"} 
          size={20} 
          color="#E8505B" 
        />
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onClose}
        disabled={isGeocodingAddress}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.confirmButton, isGeocodingAddress && styles.buttonDisabled]}
        onPress={handleConfirmLocation}
        disabled={isGeocodingAddress || mapStyleError}
      >
        {isGeocodingAddress ? (
          <Text style={styles.confirmButtonText}>Getting Address...</Text>
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Location</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Map */}
        {renderMap()}

        {/* Controls overlay */}
        {!mapStyleError && renderControls()}

        {/* Footer */}
        {renderFooter()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50, // Account for status bar
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -30 }],
    alignItems: 'center',
  },
  pinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8505B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinShadow: {
    marginTop: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controls: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinatesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  myLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8505B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 40,
  },
  mapErrorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8505B',
    marginTop: 16,
    marginBottom: 8,
  },
  mapErrorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#E8505B',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
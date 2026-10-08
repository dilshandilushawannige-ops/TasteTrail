/**
 * Discover Map Component with Expo Go fallback
 * Shows MapLibre MapView in dev builds, graceful placeholder in Expo Go
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Restaurant } from '@/services/restaurantService';
import type { Coordinates } from '@/utils/distance';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 280;

export interface DiscoverMapProps {
  searchCenter: Coordinates;
  userLocation: Coordinates | null;
  nearbyRestaurants: Restaurant[];
  radius: number;
  selectedRestaurant: Restaurant | null;
  onRestaurantSelect: (restaurant: Restaurant) => void;
  onRegionChange: (coordinates: Coordinates) => void;
  onMyLocationPress: () => void;
}

// Map component for development builds
const RealMapView: React.FC<DiscoverMapProps> = ({
  searchCenter,
  userLocation,
  nearbyRestaurants,
  radius,
  selectedRestaurant,
  onRestaurantSelect,
  onRegionChange,
  onMyLocationPress,
}) => {
  const mapRef = useRef<any>(null);
  const [MapView, setMapView] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);
  const [Circle, setCircle] = useState<any>(null);

  // Lazy load MapLibre when not in Expo Go
  useEffect(() => {
    const loadMapComponents = async () => {
      try {
        // Load MapLibre components
        const mapModule = require('@maplibre/maplibre-react-native');
        
        setMapView(() => mapModule.Map);
        setMarker(() => mapModule.Marker);
        // MapLibre doesn't have Circle, we'll need to create one differently
        setCircle(() => null);
      } catch (error) {
        console.error('Failed to load MapLibre components:', error);
        // If MapLibre fails to load, the fallback UI will be shown
      }
    };

    loadMapComponents();
  }, []);

  // Animate to restaurant when selected
  useEffect(() => {
    if (selectedRestaurant && selectedRestaurant.location && mapRef.current) {
      mapRef.current.setCamera({
        centerCoordinate: [
          selectedRestaurant.location.longitude,
          selectedRestaurant.location.latitude
        ],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  }, [selectedRestaurant]);

  // Handle long press to set search center
  const handleLongPress = (event: any) => {
    const { longitude, latitude } = event.geometry.coordinates || event.coordinate;
    onRegionChange({ latitude, longitude });
  };

  if (!MapView || !Marker) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading Map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialViewState={{
          longitude: searchCenter.longitude,
          latitude: searchCenter.latitude,
          zoom: 12,
        }}
        onLongPress={handleLongPress}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        {/* Restaurant markers */}
        {nearbyRestaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            coordinate={[
              restaurant.location!.longitude,
              restaurant.location!.latitude,
            ]}
            onPress={() => onRestaurantSelect(restaurant)}
          >
            <View style={[
              styles.markerContainer,
              selectedRestaurant?.id === restaurant.id && styles.selectedMarker
            ]}>
              <View style={styles.marker}>
                <Ionicons 
                  name="restaurant" 
                  size={16} 
                  color="#FFF" 
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={onMyLocationPress}
        >
          <Ionicons name="locate" size={20} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => {
            if (mapRef.current) {
              mapRef.current.setCamera({
                centerCoordinate: [searchCenter.longitude, searchCenter.latitude],
                zoomLevel: 12,
                animationDuration: 1000,
              });
            }
          }}
        >
          <Ionicons name="add" size={20} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => {
            if (mapRef.current) {
              mapRef.current.setCamera({
                centerCoordinate: [searchCenter.longitude, searchCenter.latitude],
                zoomLevel: 10,
                animationDuration: 1000,
              });
            }
          }}
        >
          <Ionicons name="remove" size={20} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Fallback component for Expo Go
const FallbackMapView: React.FC<DiscoverMapProps> = ({
  nearbyRestaurants,
  onMyLocationPress,
}) => {
  return (
    <View style={[styles.container, styles.fallbackContainer]}>
      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapBackground}>
          <Ionicons name="map" size={60} color="rgba(255,255,255,0.7)" />
          <Text style={styles.placeholderText}>Map View</Text>
          <Text style={styles.placeholderSubtext}>Available in development build</Text>
        </View>
        
        {/* Mock markers */}
        <View style={styles.mockMarker1}>
          <View style={styles.marker}>
            <Ionicons name="restaurant" size={12} color="#FFF" />
          </View>
        </View>
        <View style={styles.mockMarker2}>
          <View style={styles.marker}>
            <Ionicons name="restaurant" size={12} color="#FFF" />
          </View>
        </View>
        <View style={styles.mockMarker3}>
          <View style={styles.marker}>
            <Ionicons name="restaurant" size={12} color="#FFF" />
          </View>
        </View>
      </View>

      {/* Fallback controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={onMyLocationPress}
        >
          <Ionicons name="locate" size={20} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main component that chooses between real map and fallback
export const DiscoverMap: React.FC<DiscoverMapProps> = (props) => {
  if (isExpoGo) {
    return <FallbackMapView {...props} />;
  } else {
    return <RealMapView {...props} />;
  }
};

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    width: SCREEN_WIDTH - 32,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  fallbackContainer: {
    backgroundColor: '#E8F5E8',
  },
  mapPlaceholder: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A90A4',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  mockMarker1: {
    position: 'absolute',
    top: '30%',
    left: '40%',
  },
  mockMarker2: {
    position: 'absolute',
    top: '60%',
    right: '30%',
  },
  mockMarker3: {
    position: 'absolute',
    top: '45%',
    left: '70%',
  },
  markerContainer: {
    alignItems: 'center',
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8505B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
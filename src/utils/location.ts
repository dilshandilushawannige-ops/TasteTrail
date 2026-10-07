/**
 * Location utility functions for GPS and geocoding
 */

import * as Location from 'expo-location';
import { Linking, Alert } from 'react-native';
import { geohashForLocation } from 'geofire-common';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coordinates: Coordinates;
  address?: string;
  city?: string;
}

/**
 * Sri Lanka center coordinates for map initialization
 */
export const SRI_LANKA_CENTER: Coordinates = {
  latitude: 7.8731,
  longitude: 80.7718,
};

/**
 * Check if coordinates are within Sri Lanka (approximate bounds)
 */
export function isWithinSriLanka(coordinates: Coordinates): boolean {
  const { latitude, longitude } = coordinates;
  
  // Approximate Sri Lanka bounds
  const bounds = {
    north: 9.835,
    south: 5.916,
    east: 81.879,
    west: 79.652,
  };
  
  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

/**
 * Request location permissions with proper error handling
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      return true;
    } else if (status === 'denied') {
      Alert.alert(
        'Location Permission Required',
        'TasteTrail needs location access to help you set restaurant locations. Please enable location permissions in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Get current GPS location with high accuracy
 */
export async function getCurrentLocation(): Promise<LocationResult | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    // Check if location services are enabled
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    if (!isLocationEnabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services in your device settings to use this feature.',
        [{ text: 'OK' }]
      );
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 15000, // 15 second timeout
    });

    const coordinates: Coordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Warn if location is outside Sri Lanka
    if (!isWithinSriLanka(coordinates)) {
      Alert.alert(
        'Location Outside Sri Lanka',
        'The detected location appears to be outside Sri Lanka. You can still use it, but please verify the restaurant location is correct.',
        [{ text: 'OK' }]
      );
    }

    return { coordinates };
  } catch (error: any) {
    console.error('Error getting current location:', error);
    
    let errorMessage = 'Failed to get current location. Please try again.';
    
    if (error.code === 'E_LOCATION_TIMEOUT') {
      errorMessage = 'Location request timed out. Please ensure GPS is enabled and try again.';
    } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
      errorMessage = 'Location services are not available. Please enable GPS and try again.';
    }
    
    Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address information
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<{ address?: string; city?: string }> {
  try {
    const result = await Location.reverseGeocodeAsync(coordinates);
    
    if (result && result.length > 0) {
      const location = result[0];
      
      // Build address from available components
      const addressParts: string[] = [];
      
      if (location.streetNumber) addressParts.push(location.streetNumber);
      if (location.street) addressParts.push(location.street);
      
      const address = addressParts.length > 0 ? addressParts.join(' ') : undefined;
      
      // Use city, district, or region as city
      const city = location.city || location.district || location.region || location.subregion;
      
      return {
        address: address || undefined,
        city: city || undefined,
      };
    }
    
    return {};
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return {};
  }
}

/**
 * Generate geohash for coordinates (for Firestore proximity queries)
 */
export function generateGeohash(coordinates: Coordinates): string {
  return geohashForLocation([coordinates.latitude, coordinates.longitude]);
}

/**
 * Validate coordinates format
 */
export function validateCoordinates(coordinates: Coordinates): boolean {
  const { latitude, longitude } = coordinates;
  
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude)
  );
}
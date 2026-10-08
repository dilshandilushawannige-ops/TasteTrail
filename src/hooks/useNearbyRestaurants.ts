/**
 * Hook for managing nearby restaurants and location
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { subscribeToRestaurants, Restaurant } from '@/services/restaurantService';
import { calculateDistance, Coordinates } from '@/utils/distance';
import { DISCOVER_RADIUS_KM } from '@/constants/discover';

// Default location (Galle Fort, Sri Lanka)
const DEFAULT_LOCATION: Coordinates = {
  latitude: 6.0329,
  longitude: 80.2168,
};

export interface UseNearbyRestaurantsReturn {
  // Location state
  userLocation: Coordinates | null;
  searchCenter: Coordinates;
  currentArea: string;
  locationPermission: boolean;
  isLoadingLocation: boolean;
  
  // Restaurant data
  restaurants: Restaurant[];
  nearbyRestaurants: (Restaurant & { distance: number })[];
  openRestaurants: (Restaurant & { distance: number })[];
  isLoadingRestaurants: boolean;
  restaurantError: string | null;
  
  // Filters
  sortBy: 'distance' | 'rating';
  searchText: string;
  selectedCategory: string | null;
  
  // Actions
  setSortBy: (sortBy: 'distance' | 'rating') => void;
  setSearchText: (text: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchCenter: (coordinates: Coordinates) => void;
  getCurrentLocation: () => Promise<void>;
  refresh: () => Promise<void>;
  geocodeLocation: (query: string) => Promise<boolean>;
}

export function useNearbyRestaurants(): UseNearbyRestaurantsReturn {
  // Location state
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [searchCenter, setSearchCenter] = useState<Coordinates>(DEFAULT_LOCATION);
  const [currentArea, setCurrentArea] = useState<string>('Galle');
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  // Restaurant data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [restaurantError, setRestaurantError] = useState<string | null>(null);
  
  // Filters
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Request location permission and get current location
  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const coords: Coordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        setUserLocation(coords);
        setSearchCenter(coords);
        
        // Get current area name
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync(coords);
          if (reverseGeocode.length > 0) {
            const area = reverseGeocode[0].city || 
                        reverseGeocode[0].district || 
                        reverseGeocode[0].region || 
                        'Unknown Area';
            setCurrentArea(area);
          }
        } catch (error) {
          console.log('Reverse geocoding failed:', error);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission(false);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Geocode a location query
  const geocodeLocation = useCallback(async (query: string): Promise<boolean> => {
    try {
      const results = await Location.geocodeAsync(query + ', Sri Lanka');
      if (results.length > 0) {
        const coords: Coordinates = {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
        setSearchCenter(coords);
        setCurrentArea(query);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Geocoding error:', error);
      return false;
    }
  }, []);

  // Check if restaurant is currently open
  const isRestaurantOpen = useCallback((restaurant: Restaurant): boolean => {
    if (restaurant.openAllDays) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
    
    const openTime = parseInt(restaurant.openTime.replace(':', ''));
    const closeTime = parseInt(restaurant.closeTime.replace(':', ''));
    
    // Handle overnight restaurants (e.g., 22:00 - 02:00)
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  }, []);

  // Filter and sort nearby restaurants
  const nearbyRestaurants = useMemo(() => {
    let filtered = restaurants
      .filter(restaurant => {
        // Only active/published restaurants
        if (restaurant.status !== 'active') return false;
        
        const latitude = Number(restaurant.location?.latitude);
        const longitude = Number(restaurant.location?.longitude);
        const hasValidCoordinates = Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude !== 0 &&
          longitude !== 0;

        if (
          userLocation &&
          DISCOVER_RADIUS_KM !== null &&
          hasValidCoordinates &&
          calculateDistance(userLocation, { latitude, longitude }) > DISCOVER_RADIUS_KM
        ) return false;
        
        // Category filter
        if (selectedCategory && restaurant.category !== selectedCategory) return false;
        
        // Text search (name, category, tags, city)
        if (searchText) {
          const searchLower = searchText.toLowerCase();
          const matchesName = restaurant.name.toLowerCase().includes(searchLower);
          const matchesCategory = restaurant.category.toLowerCase().includes(searchLower);
          const matchesTags = restaurant.tags.some(tag => 
            tag.toLowerCase().includes(searchLower)
          );
          const matchesCity = restaurant.city.toLowerCase().includes(searchLower);
          
          if (!matchesName && !matchesCategory && !matchesTags && !matchesCity) {
            return false;
          }
        }
        
        return true;
      })
      .map(restaurant => {
        const latitude = Number(restaurant.location?.latitude);
        const longitude = Number(restaurant.location?.longitude);
        const hasValidCoordinates = Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude !== 0 &&
          longitude !== 0;
        return {
        ...restaurant,
        distance: userLocation && hasValidCoordinates
          ? calculateDistance(userLocation, { latitude, longitude })
          : Number.POSITIVE_INFINITY,
        };
      });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'distance' && userLocation) {
        return a.distance - b.distance;
      } else if (sortBy === 'distance') {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      } else {
        // Sort by rating, then by review count
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        return b.reviewCount - a.reviewCount;
      }
    });

    return filtered;
  }, [restaurants, searchCenter, userLocation, selectedCategory, searchText, sortBy]);

  // Get currently open restaurants
  const openRestaurants = useMemo(() => {
    return nearbyRestaurants.filter(isRestaurantOpen);
  }, [nearbyRestaurants, isRestaurantOpen]);

  // Refresh data
  const refresh = useCallback(async () => {
    setRestaurantError(null);
    if (locationPermission || !userLocation) {
      await getCurrentLocation();
    }
  }, [getCurrentLocation, locationPermission, userLocation]);

  // Subscribe to restaurant updates
  useEffect(() => {
    setIsLoadingRestaurants(true);
    setRestaurantError(null);
    
    const unsubscribe = subscribeToRestaurants(
      (restaurantList) => {
        setRestaurants(restaurantList);
        setIsLoadingRestaurants(false);
      },
      (error) => {
        setRestaurantError(error.message);
        setIsLoadingRestaurants(false);
      }
    );

    return unsubscribe;
  }, []);

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isLoadingRestaurants && restaurants.length > 0) {
        // Don't refetch immediately, just refresh location
        if (locationPermission) {
          getCurrentLocation();
        }
      }
    }, [getCurrentLocation, locationPermission, isLoadingRestaurants, restaurants.length])
  );

  return {
    // Location state
    userLocation,
    searchCenter,
    currentArea,
    locationPermission,
    isLoadingLocation,
    
    // Restaurant data
    restaurants,
    nearbyRestaurants,
    openRestaurants,
    isLoadingRestaurants,
    restaurantError,
    
    // Filters
    sortBy,
    searchText,
    selectedCategory,
    
    // Actions
    setSortBy,
    setSearchText,
    setSelectedCategory,
    setSearchCenter,
    getCurrentLocation,
    refresh,
    geocodeLocation,
  };
}
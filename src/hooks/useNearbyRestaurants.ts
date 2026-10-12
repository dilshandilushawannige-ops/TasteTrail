/**
 * Hook for managing nearby restaurants and location
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { subscribeToRestaurants, Restaurant } from '@/services/restaurantService';
import { calculateDistance, Coordinates } from '@/utils/distance';
import { DISCOVER_RADIUS_KM, DISCOVER_SHOW_WITHOUT_COORDS } from '@/constants/discover';
import {
  PROVINCE_ANCHORS,
  PROVINCE_KEYWORDS,
  SRI_LANKAN_PROVINCES,
  type LocationChoice,
  type ProvinceId,
} from '@/constants/locations';
import { reverseGeocode } from '@/services/geocodingService';
import { DEFAULT_MAP_CENTER } from '@/constants/map';

// Default location (Galle Fort, Sri Lanka)
const DEFAULT_LOCATION: Coordinates = DEFAULT_MAP_CENTER;

const provinceNames: Record<ProvinceId, string> = {
  western: 'western',
  central: 'central',
  southern: 'southern',
  northern: 'northern',
  eastern: 'eastern',
  northWestern: 'north western',
  northCentral: 'north central',
  uva: 'uva',
  sabaragamuwa: 'sabaragamuwa',
};

const provinceCache = new Map<string, ProvinceId | null>();

function normalizeLocationText(value: unknown): string {
  return String(value ?? '').toLowerCase().trim().replace(/\b(province|district)\b/g, ' ').replace(/\s+/g, ' ');
}

function findTextProvince(value: unknown): ProvinceId | null {
  const text = normalizeLocationText(value);
  if (!text) return null;
  const matches = (Object.keys(PROVINCE_KEYWORDS) as ProvinceId[]).filter((province) => {
    const terms = [provinceNames[province], ...PROVINCE_KEYWORDS[province]];
    return terms.some((term) => text.includes(term));
  });
  return matches.length === 1 ? matches[0] : null;
}

function validRestaurantCoordinates(restaurant: Restaurant): Coordinates | null {
  const latitude = Number(restaurant.location?.latitude);
  const longitude = Number(restaurant.location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude === 0 || longitude === 0) return null;
  return { latitude, longitude };
}

export function getRestaurantProvince(restaurant: Restaurant): ProvinceId | null {
  const cacheKey = `${restaurant.id}:${String((restaurant as Restaurant & { updatedAt?: unknown }).updatedAt ?? '')}`;
  if (provinceCache.has(cacheKey)) return provinceCache.get(cacheKey) ?? null;
  const cityProvince = findTextProvince(restaurant.city);
  const addressProvince = findTextProvince(restaurant.address);
  const textProvince = cityProvince ?? addressProvince;
  if (textProvince) {
    provinceCache.set(cacheKey, textProvince);
    return textProvince;
  }
  const coords = validRestaurantCoordinates(restaurant);
  if (!coords) {
    provinceCache.set(cacheKey, null);
    return null;
  }
  let nearest: ProvinceId | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  (Object.keys(PROVINCE_ANCHORS) as ProvinceId[]).forEach((province) => {
    PROVINCE_ANCHORS[province].forEach((anchor) => {
      const distance = calculateDistance(coords, anchor);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = province;
      }
    });
  });
  provinceCache.set(cacheKey, nearest);
  return nearest;
}

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
  locationFilter: LocationChoice | null;
  
  // Actions
  setSortBy: (sortBy: 'distance' | 'rating') => void;
  setSearchText: (text: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchCenter: (coordinates: Coordinates) => void;
  setLocationFilter: (choice: LocationChoice | null) => void;
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
  const [locationFilter, setLocationFilterState] = useState<LocationChoice | null>(null);
  const setLocationFilter = useCallback((choice: LocationChoice | null) => {
    setLocationFilterState(choice);
    if (choice) setCurrentArea(choice.name);
  }, []);

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
          const place = await reverseGeocode(coords.latitude, coords.longitude);
          if (place?.city) setCurrentArea(place.city);
        } catch {
          // The GPS location remains usable when reverse geocoding is unavailable.
        }
      }
    } catch {
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
        setLocationFilter(null);
        setCurrentArea(query);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setLocationFilter]);

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
  }, [setLocationFilter]);

  // Filter and sort nearby restaurants
  const nearbyRestaurants = useMemo(() => {
    let filtered = restaurants
      .filter(restaurant => {
        // Only active/published restaurants
        if (restaurant.status !== 'active') return false;
        
        const coords = validRestaurantCoordinates(restaurant);
        const hasValidCoordinates = Boolean(coords);

        if (
          !locationFilter &&
          userLocation &&
          DISCOVER_RADIUS_KM !== null &&
          coords &&
          calculateDistance(userLocation, coords) > DISCOVER_RADIUS_KM
        ) return false;
        if (!locationFilter && !hasValidCoordinates && !DISCOVER_SHOW_WITHOUT_COORDS && userLocation) return false;
        
        if (locationFilter) {
          const text = normalizeLocationText(`${restaurant.city} ${restaurant.address}`);
          if (locationFilter.type === 'city') {
            const textProvince = findTextProvince(restaurant.city) ?? findTextProvince(restaurant.address);
            const selectedProvince = findTextProvince(locationFilter.name);
            const withinCity = hasValidCoordinates &&
              calculateDistance(coords!, locationFilter) <= 10;
            if (selectedProvince && textProvince && textProvince !== selectedProvince) return false;
            if (!text.includes(locationFilter.name.toLowerCase()) && !withinCity) return false;
          } else {
            const selectedProvince = findTextProvince(locationFilter.name);
            if (!selectedProvince || getRestaurantProvince(restaurant) !== selectedProvince) return false;
          }
        }

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
        const coords = validRestaurantCoordinates(restaurant);
        return {
        ...restaurant,
        distance: coords
          ? calculateDistance(userLocation ?? searchCenter, coords)
          : Number.POSITIVE_INFINITY,
        };
      });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        return a.distance - b.distance;
      } else {
        // Sort by rating, then by review count
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        return b.reviewCount - a.reviewCount;
      }
    });

    return filtered;
  }, [restaurants, searchCenter, userLocation, locationFilter, selectedCategory, searchText, sortBy]);

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
    locationFilter,
    
    // Actions
    setSortBy,
    setSearchText,
    setSelectedCategory,
    setSearchCenter,
    setLocationFilter,
    getCurrentLocation,
    refresh,
    geocodeLocation,
  };
}
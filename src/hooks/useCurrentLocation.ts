/**
 * Hook for getting current GPS location
 */

import { useState, useCallback } from 'react';
import { getCurrentLocation, LocationResult } from '@/utils/location';

interface UseCurrentLocationResult {
  location: LocationResult | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocationAsync: () => Promise<LocationResult | null>;
  clearLocation: () => void;
}

/**
 * Hook for managing current location state
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocationAsync = useCallback(async (): Promise<LocationResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getCurrentLocation();
      if (result) {
        setLocation(result);
        return result;
      } else {
        setError('Failed to get current location');
        return null;
      }
    } catch (err: any) {
      console.error('Error in useCurrentLocation:', err);
      setError(err.message || 'Failed to get current location');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocationAsync,
    clearLocation,
  };
}
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { getRestaurant, type Restaurant } from '@/services/restaurantService';
import { subscribeToSavedRestaurants, toggleSavedRestaurant } from '@/services/savedRestaurantService';
import { router } from 'expo-router';

export function useSavedRestaurants() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid || null)), []);

  useEffect(() => {
    if (!uid) {
      // Clear the optimistic cache when the authenticated user signs out.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedIds(new Set());
      setSavedRestaurants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToSavedRestaurants(uid, async (ids) => {
      const resolved = await Promise.all(ids.map((id) => getRestaurant(id).catch(() => null)));
      const restaurants = resolved.filter((restaurant): restaurant is Restaurant => Boolean(restaurant && restaurant.status === 'active'));
      setSavedIds(new Set(restaurants.map((restaurant) => restaurant.id)));
      setSavedRestaurants(restaurants);
      setLoading(false);
    }, (error) => {
      console.error('Error loading saved restaurants:', error);
      setLoading(false);
    });
  }, [uid]);

  const toggle = useCallback(async (restaurantId: string): Promise<boolean> => {
    if (!uid) {
      Alert.alert('Sign in required', 'Please sign in to save restaurants.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/login') },
      ]);
      return false;
    }
    const wasSaved = savedIds.has(restaurantId);
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(restaurantId);
      else next.add(restaurantId);
      return next;
    });
    try {
      await toggleSavedRestaurant(restaurantId, wasSaved, uid);
      return true;
    } catch (error) {
      console.error('Error toggling saved restaurant:', error);
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(restaurantId);
        else next.delete(restaurantId);
        return next;
      });
      Alert.alert('Unable to update favourites', 'Please try again.');
      return false;
    }
  }, [savedIds, uid]);

  const isSaved = useCallback((restaurantId: string) => savedIds.has(restaurantId), [savedIds]);
  return { savedIds, isSaved, toggle, savedRestaurants, loading };
}

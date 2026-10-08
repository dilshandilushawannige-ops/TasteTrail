import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '@/firebaseConfig';
import {
  resolveSavedRecipes,
  subscribeToSavedRecipes,
  toggleSavedRecipe,
  type ResolvedSavedRecipe,
  type SavedRecipeRecord,
} from '@/services/savedRecipeService';

export function useSavedRecipes() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<ResolvedSavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<SavedRecipeRecord[]>([]);

  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid || null)), []);

  const resolve = useCallback(async (nextRecords: SavedRecipeRecord[]) => {
    try {
      const recipes = await resolveSavedRecipes(nextRecords);
      setSavedRecipes(recipes);
      setSavedIds(new Set(recipes.map((recipe) => recipe.id)));
      setError(null);
    } catch (resolveError) {
      console.error('Error resolving saved recipes:', resolveError);
      setError(resolveError instanceof Error ? resolveError : new Error('Unable to load saved recipes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      // Clear saved state when the authenticated user signs out.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecords([]);
      setSavedIds(new Set());
      setSavedRecipes([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeToSavedRecipes(uid, (nextRecords) => {
      setRecords(nextRecords);
      void resolve(nextRecords);
    }, (listenerError) => {
      console.error('Error loading saved recipe IDs:', listenerError);
      setError(listenerError);
      setLoading(false);
    });
  }, [resolve, uid]);

  const isSaved = useCallback((recipeId: string) => savedIds.has(recipeId), [savedIds]);

  const toggle = useCallback(async (recipeId: string) => {
    if (!uid) {
      Alert.alert('Sign in required', 'Please sign in to save recipes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/login') },
      ]);
      return false;
    }

    const wasSaved = savedIds.has(recipeId);
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
    if (wasSaved) setSavedRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));

    try {
      await toggleSavedRecipe(recipeId, wasSaved, uid);
      return true;
    } catch (toggleError) {
      console.error('Error toggling saved recipe:', toggleError);
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(recipeId);
        else next.delete(recipeId);
        return next;
      });
      setError(toggleError instanceof Error ? toggleError : new Error('Unable to update saved recipes.'));
      Alert.alert('Unable to update favourites', 'Please try again.');
      return false;
    }
  }, [savedIds, uid]);

  const retry = useCallback(() => {
    if (uid) {
      setLoading(true);
      void resolve(records);
    }
  }, [records, resolve, uid]);

  return { savedIds, isSaved, toggle, savedRecipes, loading, error, retry };
}

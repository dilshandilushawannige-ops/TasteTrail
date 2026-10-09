import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreateReviewData, Review } from '@/types/review';
import * as reviewService from '@/services/reviewService';

export function useRecipeReviews(recipeId: string) {
  const [items, setItems] = useState<Review[]>([]);
  const [loadedRecipe, setLoadedRecipe] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ recipeId: string; message: string } | null>(null);
  const reviews = useMemo(() => items.filter(item => item.recipeId === recipeId), [items, recipeId]);
  const summary = useMemo(() => reviewService.summarizeReviews(reviews), [reviews]);
  const error = failure?.recipeId === recipeId ? failure.message : null;
  const loading = !!recipeId && loadedRecipe !== recipeId && !error;

  useEffect(() => {
    if (!recipeId) return;
    return reviewService.subscribeToRecipeReviews(recipeId, updated => {
      setItems(updated);
      setLoadedRecipe(recipeId);
      setFailure(null);
    }, err => setFailure({ recipeId, message: err.message }));
  }, [recipeId]);

  const refresh = useCallback(async () => {
    try {
      setItems(await reviewService.getReviewsByRecipe(recipeId));
      setLoadedRecipe(recipeId);
      setFailure(null);
    } catch (err) {
      setFailure({ recipeId, message: reviewService.reviewErrorMessage(err) });
    }
  }, [recipeId]);

  const submitReview = useCallback(async (data: CreateReviewData) => {
    await reviewService.addReview(data);
  }, []);

  return { reviews, summary, loading, error, refresh, submitReview };
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Review, CreateReviewData } from '@/types/review';
import * as reviewService from '@/services/reviewService';

export function useRestaurantReviews(restaurantId: string) {
  const [items, setItems] = useState<Review[]>([]);
  const [loadedRestaurant, setLoadedRestaurant] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ restaurantId: string; message: string } | null>(null);
  const reviews = useMemo(() => items.filter(item => item.restaurantId === restaurantId), [items, restaurantId]);
  const summary = useMemo(() => reviewService.summarizeReviews(reviews), [reviews]);
  const error = failure?.restaurantId === restaurantId ? failure.message : null;
  const loading = !!restaurantId && loadedRestaurant !== restaurantId && !error;
  useEffect(() => {
    if (!restaurantId) return;
    return reviewService.subscribeToReviews(restaurantId, updated => {
      setItems(updated); setLoadedRestaurant(restaurantId); setFailure(null);
    }, err => { setFailure({ restaurantId, message: err.message }); });
  }, [restaurantId]);
  const refresh = useCallback(async () => {
    try {
      setItems(await reviewService.getReviewsByRestaurant(restaurantId));
      setLoadedRestaurant(restaurantId); setFailure(null);
    } catch (err) { setFailure({ restaurantId, message: reviewService.reviewErrorMessage(err) }); }
  }, [restaurantId]);
  const submitReview = useCallback(async (data: CreateReviewData) => {
    await reviewService.addReview(data);
    // The live subscription supplies the saved review and its uploaded media.
  }, []);
  return { reviews, summary, loading, error, refresh, submitReview };
}

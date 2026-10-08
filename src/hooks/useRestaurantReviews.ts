/**
 * Hook for managing restaurant reviews
 */

import { useState, useEffect, useCallback } from 'react';
import { Review, RatingSummary, CreateReviewData } from '@/types/review';
import * as reviewService from '@/services/reviewService';

export interface UseRestaurantReviewsReturn {
  reviews: Review[];
  summary: RatingSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submitReview: (review: CreateReviewData) => Promise<void>;
}

export function useRestaurantReviews(restaurantId: string): UseRestaurantReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load reviews and summary
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load reviews and summary in parallel
      const [reviewsData, summaryData] = await Promise.all([
        reviewService.getReviewsByRestaurant(restaurantId),
        reviewService.getRatingSummary(restaurantId),
      ]);

      setReviews(reviewsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Submit a new review
  const submitReview = useCallback(async (reviewData: CreateReviewData) => {
    try {
      await reviewService.addReview(reviewData);
      // Refresh data after successful submission
      await loadData();
    } catch (err) {
      console.error('Error submitting review:', err);
      throw err;
    }
  }, [loadData]);

  // Refresh data
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Load data on mount and subscribe to updates
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = reviewService.subscribeToReviews(restaurantId, (updatedReviews) => {
      setReviews(updatedReviews);
      setLoading(false);
    });

    // Load summary separately (not real-time)
    reviewService.getRatingSummary(restaurantId)
      .then(setSummary)
      .catch((err) => {
        console.error('Error loading summary:', err);
        setError('Failed to load rating summary');
      });

    return unsubscribe;
  }, [restaurantId]);

  return {
    reviews,
    summary,
    loading,
    error,
    refresh,
    submitReview,
  };
}
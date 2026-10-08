/**
 * Review types and interfaces
 */

export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingsBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export type CreateReviewData = Omit<Review, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateReviewData = Partial<Pick<Review, 'rating' | 'comment'>>;
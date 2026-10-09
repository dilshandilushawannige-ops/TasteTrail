import {
  collection, doc, getDoc, getDocs, onSnapshot, query, where,
  runTransaction, serverTimestamp, writeBatch, addDoc,
  type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { Review, ReviewMedia, RatingSummary, CreateReviewData, UpdateReviewData } from '@/types/review';

const COLLECTION_NAME = 'reviews';
const reviewQuery = (targetId: string, targetType: 'restaurant' | 'recipe') =>
  query(collection(db, COLLECTION_NAME), where(`${targetType}Id`, '==', targetId));
const fromDocument = (snapshot: QueryDocumentSnapshot<DocumentData>): Review => {
  const data = snapshot.data();
  return { ...data, id: snapshot.id, createdAt: data.createdAt?.toDate?.() || new Date(),
    ...(data.updatedAt ? { updatedAt: data.updatedAt.toDate() } : {}) } as Review;
};
const newestFirst = (reviews: Review[]) => reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
export function reviewErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') return 'Reviews are currently unavailable. Please try again later. Your draft has not been discarded.';
  if (code === 'unavailable') return 'Unable to reach the review server. Check your connection and try again.';
  return error instanceof Error ? error.message : 'Unable to load reviews. Please try again.';
}
export async function getReviewsByRestaurant(restaurantId: string): Promise<Review[]> {
  return newestFirst((await getDocs(reviewQuery(restaurantId, 'restaurant'))).docs.map(fromDocument));
}
export function subscribeToReviews(restaurantId: string, callback: (reviews: Review[]) => void, onError?: (error: Error) => void): () => void {
  return onSnapshot(reviewQuery(restaurantId, 'restaurant'), snapshot => callback(newestFirst(snapshot.docs.map(fromDocument))),
    error => onError?.(new Error(reviewErrorMessage(error))));
}
export async function getReviewsByRecipe(recipeId: string): Promise<Review[]> {
  return newestFirst((await getDocs(reviewQuery(recipeId, 'recipe'))).docs.map(fromDocument));
}
export function subscribeToRecipeReviews(recipeId: string, callback: (reviews: Review[]) => void, onError?: (error: Error) => void): () => void {
  return onSnapshot(reviewQuery(recipeId, 'recipe'), snapshot => callback(newestFirst(snapshot.docs.map(fromDocument))),
    error => onError?.(new Error(reviewErrorMessage(error))));
}
export function subscribeToRecipeRatingSummaries(
  callback: (summaries: Record<string, RatingSummary>) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(collection(db, COLLECTION_NAME), snapshot => {
    const reviewsByRecipe = new Map<string, Review[]>();
    snapshot.docs.map(fromDocument).forEach(review => {
      if (!review.recipeId) return;
      const reviews = reviewsByRecipe.get(review.recipeId) || [];
      reviews.push(review);
      reviewsByRecipe.set(review.recipeId, reviews);
    });
    const summaries: Record<string, RatingSummary> = {};
    reviewsByRecipe.forEach((reviews, recipeId) => {
      summaries[recipeId] = summarizeReviews(reviews);
    });
    callback(summaries);
  }, error => onError?.(new Error(reviewErrorMessage(error))));
}
export async function addReview(data: CreateReviewData): Promise<string> {
  const user = auth.currentUser;
  if (!user || user.uid !== data.userId) throw new Error('Please sign in before submitting your review.');
  const targetType = data.recipeId ? 'recipe' : data.restaurantId ? 'restaurant' : null;
  const targetId = data.recipeId || data.restaurantId;
  if (!targetId || !targetType || !Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5 || data.comment.trim().length < 10 || data.comment.length > 580) {
    throw new Error('Select a rating and write a review between 10 and 580 characters.');
  }
  if ((data.media?.length || 0) > 6 || data.media?.some(item => !item.url.startsWith('https://'))) throw new Error('Please upload up to six photos or videos.');
  const profile = data.anonymous ? null : await getDoc(doc(db, 'users', user.uid));
  const userName = data.anonymous ? 'Anonymous' : user.displayName || profile?.data()?.name || 'TasteTrail member';
  const ref = doc(db, COLLECTION_NAME, `${targetId}_${user.uid}`);
  try {
    await runTransaction(db, async transaction => {
      const existing = await transaction.get(ref);
      if (existing.exists()) throw new Error(`You have already reviewed this ${targetType}.`);
      transaction.set(ref, {
        ...(targetType === 'recipe' ? { recipeId: targetId } : { restaurantId: targetId }),
        userId: user.uid, userName,
        userAvatar: data.anonymous ? '' : user.photoURL || '',
        rating: data.rating, comment: data.comment.trim(),
        ...(targetType === 'restaurant'
          ? { diningType: data.diningType || 'Dine-in', mealTime: data.mealTime || 'Lunch', visitedWith: data.visitedWith || 'Family' }
          : { mealTime: data.mealTime || 'Lunch', wouldMakeAgain: data.wouldMakeAgain || 'Yes' }),
        anonymous: !!data.anonymous, media: data.media || [], helpfulUserIds: [], createdAt: serverTimestamp(),
      });
    });
    return ref.id;
  } catch (error) { throw new Error(reviewErrorMessage(error)); }
}
export async function updateReview(reviewId: string, data: UpdateReviewData): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to update your review.');
  try {
    const profile = data.anonymous === false ? await getDoc(doc(db, 'users', user.uid)) : null;
    await runTransaction(db, async transaction => {
      const ref = doc(db, COLLECTION_NAME, reviewId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('This review is no longer available.');
      const current = snapshot.data();
      if (current.userId !== user.uid) throw new Error('You can only update your own review.');
      const content = {
        rating: data.rating ?? current.rating,
        comment: (data.comment ?? current.comment).trim(),
        ...(current.recipeId
          ? { mealTime: data.mealTime ?? current.mealTime ?? 'Lunch', wouldMakeAgain: data.wouldMakeAgain ?? current.wouldMakeAgain ?? 'Yes' }
          : {
            diningType: data.diningType ?? current.diningType ?? 'Dine-in',
            mealTime: data.mealTime ?? current.mealTime ?? 'Lunch',
            visitedWith: data.visitedWith ?? current.visitedWith ?? 'Family',
          }),
        anonymous: data.anonymous ?? current.anonymous ?? false,
        media: data.media ?? current.media ?? [],
      };
      if (!Number.isInteger(content.rating) || content.rating < 1 || content.rating > 5 || content.comment.length < 10 || content.comment.length > 580) {
        throw new Error('Select a rating and write a review between 10 and 580 characters.');
      }
      if (content.media.length > 6 || content.media.some((item: ReviewMedia) => !item.url.startsWith('https://') || !['image', 'video'].includes(item.type))) {
        throw new Error('Please upload up to six photos or videos.');
      }
      transaction.update(ref, {
        ...content,
        userName: content.anonymous ? 'Anonymous' : user.displayName || profile?.data()?.name || (current.anonymous ? 'TasteTrail member' : current.userName),
        userAvatar: content.anonymous ? '' : user.photoURL || (current.anonymous ? '' : current.userAvatar || ''),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) { throw new Error(reviewErrorMessage(error)); }
}
export async function deleteReview(reviewId: string): Promise<void> {
  // Remove replies too, so replacing a deleted review cannot inherit old comments.
  const replies = (await getDocs(collection(db, COLLECTION_NAME, reviewId, 'comments'))).docs;
  for (let offset = 0; offset < replies.length; offset += 450) {
    const batch = writeBatch(db);
    replies.slice(offset, offset + 450).forEach(reply => batch.delete(reply.ref));
    await batch.commit();
  }
  const batch = writeBatch(db);
  batch.delete(doc(db, COLLECTION_NAME, reviewId));
  await batch.commit();
}
export function summarizeReviews(reviews: Review[]): RatingSummary {
  const ratingsBreakdown: RatingSummary['ratingsBreakdown'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => { if (review.rating in ratingsBreakdown) ratingsBreakdown[review.rating as keyof typeof ratingsBreakdown]++; });
  return { totalReviews: reviews.length, averageRating: reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0, ratingsBreakdown };
}
export async function getRatingSummary(restaurantId: string): Promise<RatingSummary> {
  return summarizeReviews(await getReviewsByRestaurant(restaurantId));
}
export async function toggleReviewHelpful(reviewId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in to mark a review helpful.');
  await runTransaction(db, async transaction => {
    const ref = doc(db, COLLECTION_NAME, reviewId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This review is no longer available.');
    const voters: string[] = snapshot.data().helpfulUserIds || [];
    transaction.update(ref, { helpfulUserIds: voters.includes(uid) ? voters.filter(id => id !== uid) : [...voters, uid] });
  });
}
export interface ReviewComment { id: string; userName: string; text: string; }
export function subscribeToReviewComments(reviewId: string, callback: (comments: ReviewComment[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(collection(db, COLLECTION_NAME, reviewId, 'comments'), snapshot => {
    const comments = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    comments.sort((a, b) => ((a as DocumentData).createdAt?.toMillis?.() || 0) - ((b as DocumentData).createdAt?.toMillis?.() || 0));
    callback(comments as ReviewComment[]);
  }, error => onError(new Error(reviewErrorMessage(error))));
}
export async function addReviewComment(reviewId: string, text: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to comment.');
  if (!text.trim() || text.trim().length > 500) throw new Error('Write a comment between 1 and 500 characters.');
  const profile = await getDoc(doc(db, 'users', user.uid));
  await addDoc(collection(db, COLLECTION_NAME, reviewId, 'comments'), {
    userId: user.uid, userName: user.displayName || profile.data()?.name || 'TasteTrail member', text: text.trim(), createdAt: serverTimestamp(),
  });
}

/**
 * Rating Summary Component
 * Shows average rating, star breakdown, and total count
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingSummary as RatingSummaryType } from '@/types/review';

interface RatingSummaryProps {
  summary: RatingSummaryType;
}

export function RatingSummary({ summary }: RatingSummaryProps) {
  const { averageRating, totalReviews, ratingsBreakdown } = summary;

  // Calculate percentage for each star rating
  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return (count / totalReviews) * 100;
  };

  return (
    <View style={styles.container}>
      {/* Average Rating */}
      <View style={styles.averageSection}>
        <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
        <View style={styles.starsContainer}>
          {Array.from({ length: 5 }, (_, index) => (
            <Ionicons
              key={index}
              name={index < Math.floor(averageRating) ? 'star' : 'star-outline'}
              size={16}
              color="#FCD34D"
            />
          ))}
        </View>
        <Text style={styles.totalCount}>{totalReviews} reviews</Text>
      </View>

      {/* Rating Breakdown */}
      <View style={styles.breakdownSection}>
        {[5, 4, 3, 2, 1].map((rating) => (
          <View key={rating} style={styles.breakdownRow}>
            <Text style={styles.ratingNumber}>{rating}</Text>
            <Ionicons name="star" size={12} color="#FCD34D" />
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getPercentage(ratingsBreakdown[rating as keyof typeof ratingsBreakdown])}%` }
                ]} 
              />
            </View>
            <Text style={styles.countText}>
              {ratingsBreakdown[rating as keyof typeof ratingsBreakdown]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  averageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B2236',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  totalCount: {
    fontSize: 14,
    color: '#6B7488',
  },
  breakdownSection: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B2236',
    width: 12,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FCD34D',
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    color: '#6B7488',
    width: 20,
    textAlign: 'right',
  },
});
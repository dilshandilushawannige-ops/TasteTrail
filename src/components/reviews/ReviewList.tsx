/**
 * Review List Component
 * Shows list of reviews with loading and empty states
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Review } from '@/types/review';
import { ReviewCard } from './ReviewCard';
import { ReviewEmptyState } from './ReviewEmptyState';

interface ReviewListProps {
  reviews: Review[];
  loading?: boolean;
}

export function ReviewList({ reviews, loading = false }: ReviewListProps) {
  if (reviews.length === 0) {
    return <ReviewEmptyState />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewCard review={item} />}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
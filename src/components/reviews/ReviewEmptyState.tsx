/**
 * Review Empty State Component
 * Shows when no reviews are available
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function ReviewEmptyState() {
  return (
    <View style={styles.container}>
      <Ionicons name="chatbubble-outline" size={48} color="#6B7488" />
      <Text style={styles.title}>No reviews yet</Text>
      <Text style={styles.subtitle}>Be the first to review this restaurant</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7488',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7488',
    textAlign: 'center',
  },
});
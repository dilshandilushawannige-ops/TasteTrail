/**
 * Review Card Component
 * Shows individual review with user info, rating, and comment
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '@/types/review';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  // Format relative date
  const getRelativeDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  // Get user initial for avatar
  const getUserInitial = () => {
    return review.userName.charAt(0).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* User Info */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.userAvatar ? (
            <Image source={{ uri: review.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getUserInitial()}</Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.userName}</Text>
            <Text style={styles.reviewDate}>{getRelativeDate(review.createdAt)}</Text>
          </View>
        </View>
        
        {/* Rating Stars */}
        <View style={styles.ratingContainer}>
          {Array.from({ length: 5 }, (_, index) => (
            <Ionicons
              key={index}
              name={index < review.rating ? 'star' : 'star-outline'}
              size={14}
              color="#FCD34D"
            />
          ))}
        </View>
      </View>

      {/* Review Comment */}
      {review.comment && (
        <Text style={styles.comment}>{review.comment}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8505B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2236',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7488',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontSize: 14,
    color: '#6B7488',
    lineHeight: 20,
  },
});
/**
 * Write Review Sheet Component
 * Bottom sheet/modal for writing new reviews
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreateReviewData } from '@/types/review';

interface WriteReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (review: CreateReviewData) => Promise<void>;
  restaurantId: string;
  restaurantName: string;
}

export function WriteReviewSheet({ 
  visible, 
  onClose, 
  onSubmit, 
  restaurantId, 
  restaurantName 
}: WriteReviewSheetProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal closes
  const resetForm = React.useCallback(() => {
    setRating(0);
    setComment('');
    setSubmitting(false);
  }, []);

  React.useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  // Handle star rating tap
  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Comment Too Short', 'Please write at least 10 characters.');
      return;
    }

    if (comment.length > 500) {
      Alert.alert('Comment Too Long', 'Please keep your review under 500 characters.');
      return;
    }

    try {
      setSubmitting(true);

      const reviewData: CreateReviewData = {
        restaurantId,
        userId: 'current-user-id', // TODO: Get from auth context
        userName: 'Current User', // TODO: Get from auth context
        rating,
        comment: comment.trim(),
      };

      await onSubmit(reviewData);
      onClose();
      Alert.alert('Review Submitted', 'Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1B2236" />
          </TouchableOpacity>
          <Text style={styles.title}>Write a Review</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Restaurant Name */}
          <Text style={styles.restaurantName}>{restaurantName}</Text>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.starsContainer}>
              {Array.from({ length: 5 }, (_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleStarPress(index + 1)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={index < rating ? 'star' : 'star-outline'}
                    size={32}
                    color="#FCD34D"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              maxLength={500}
              placeholder="Share your experience at this restaurant..."
              placeholderTextColor="#6B7488"
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {comment.length}/500 characters
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B2236',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B2236',
    textAlign: 'center',
    marginBottom: 32,
  },
  ratingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2236',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  commentSection: {
    marginBottom: 32,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1B2236',
    minHeight: 120,
    backgroundColor: '#FAFAFA',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7488',
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitButton: {
    backgroundColor: '#E8505B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
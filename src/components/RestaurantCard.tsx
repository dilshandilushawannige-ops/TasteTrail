/**
 * Restaurant Card Component for Discover screen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '@/services/restaurantService';
import { formatDistance } from '@/utils/distance';

export interface RestaurantCardProps {
  restaurant: Restaurant & { distance: number };
  onPress: () => void;
  onFavoritePress: () => void;
  isFavorited: boolean;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
  onFavoritePress,
  isFavorited,
}) => {
  const renderBadge = () => {
    if (restaurant.reviewCount === 0) {
      return (
        <View style={[styles.badge, styles.newBadge]}>
          <Text style={styles.newBadgeText}>New</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.badge}>
        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
        <Text style={styles.badgeText}>Verified Authentic</Text>
      </View>
    );
  };

  const renderRating = () => {
    if (restaurant.reviewCount === 0) {
      return (
        <View style={styles.ratingContainer}>
          <Text style={styles.newText}>New</Text>
        </View>
      );
    }

    return (
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={14} color="#FFA500" />
        <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
        <Text style={styles.reviewCount}>({restaurant.reviewCount})</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardContent}>
        {/* Restaurant Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: restaurant.coverPhotoUrl || 'https://via.placeholder.com/100x100/E8505B/FFFFFF?text=No+Image'
            }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Favorite button */}
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={onFavoritePress}
          >
            <Ionicons 
              name={isFavorited ? "bookmark" : "bookmark-outline"} 
              size={16} 
              color={isFavorited ? "#E8505B" : "#999"} 
            />
          </TouchableOpacity>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {renderRating()}
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#E8505B" />
            <Text style={styles.location} numberOfLines={1}>
              {formatDistance(restaurant.distance)} • {restaurant.city}
            </Text>
          </View>

          {renderBadge()}

          <Text style={styles.signatureDish} numberOfLines={2}>
            {restaurant.signatureDish || restaurant.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  newBadge: {
    backgroundColor: '#FFF7ED',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#10B981',
    marginLeft: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#F59E0B',
  },
  signatureDish: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 11,
    color: '#999',
    marginLeft: 2,
  },
  newText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
});
/**
 * Restaurant Details Screen - Exact match to reference UI
 * Shows restaurant details with hero, tabs, and actions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  StatusBar as NativeStatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Restaurant, getRestaurantFromCache } from '@/services/restaurantService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RestaurantDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'reviews'>('overview');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('auto');
    }, [])
  );

  // Get all photos (cover + additional)
  const allPhotos = useMemo(() => {
    if (!restaurant) return [];
    const photos = [];
    if (restaurant.coverPhotoUrl) photos.push(restaurant.coverPhotoUrl);
    if (restaurant.photos) photos.push(...restaurant.photos);
    return photos;
  }, [restaurant]);

  // Load restaurant with real-time updates
  useEffect(() => {
    if (!id) {
      setError('No restaurant ID provided');
      setLoading(false);
      return;
    }

    // Check cache first for instant loading
    const cachedRestaurant = getRestaurantFromCache(id as string);
    if (cachedRestaurant) {
      setRestaurant(cachedRestaurant);
      setLoading(false);
    }

    let unsubscribe: (() => void) | undefined;
    
    const loadRestaurant = async () => {
      try {
        if (!cachedRestaurant) {
          setLoading(true);
        }
        setError(null);

        // Set up real-time listener
        unsubscribe = onSnapshot(
          doc(db, 'restaurants', id as string),
          (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              const restaurantData: Restaurant = {
                id: doc.id,
                name: data?.name || 'Untitled Restaurant',
                nameLower: data?.nameLower || (data?.name || '').toLowerCase(),
                category: data?.category || 'Unknown',
                tags: data?.tags || [],
                signatureDish: data?.signatureDish || '',
                description: data?.description || '',
                coverPhotoUrl: data?.coverPhotoUrl,
                photos: data?.photos || [],
                address: data?.address || '',
                city: data?.city || '',
                location: data?.location,
                geohash: data?.geohash,
                phone: data?.phone || '',
                website: data?.website,
                openTime: data?.openTime || '09:00',
                closeTime: data?.closeTime || '22:00',
                openAllDays: data?.openAllDays || false,
                status: data?.status || 'draft',
                rating: data?.rating || 0,
                reviewCount: data?.reviewCount || 0,
                createdBy: data?.createdBy || '',
                createdAt: data?.createdAt,
                updatedAt: data?.updatedAt,
              } as Restaurant;
              setRestaurant(restaurantData);
            } else {
              setError('Restaurant not found');
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error loading restaurant:', err);
            setError('Failed to load restaurant');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up listener:', err);
        setError('Failed to load restaurant');
        setLoading(false);
      }
    };

    loadRestaurant();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id]);
  // Calculate open/closed status
  const getRestaurantStatus = () => {
    if (!restaurant) return { isOpen: false, text: 'Closed', color: '#EF4444' };
    
    if (restaurant.openAllDays) {
      return { isOpen: true, text: 'Open', color: '#1E7B45' };
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const openTime = parseInt(restaurant.openTime.replace(':', ''));
    const closeTime = parseInt(restaurant.closeTime.replace(':', ''));

    let isOpen = false;
    if (closeTime < openTime) {
      // Overnight hours (e.g., 22:00-02:00)
      isOpen = currentTime >= openTime || currentTime <= closeTime;
    } else {
      // Normal hours
      isOpen = currentTime >= openTime && currentTime <= closeTime;
    }

    return {
      isOpen,
      text: isOpen ? 'Open' : 'Closed',
      color: isOpen ? '#1E7B45' : '#EF4444',
    };
  };

  // Handle phone call
  const handleCall = async () => {
    if (!restaurant?.phone) {
      Alert.alert('No Phone Number', 'This restaurant has no phone number listed.');
      return;
    }

    try {
      const phoneUrl = `tel:${restaurant.phone}`;
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Cannot Make Call', 'Phone calls are not supported on this device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to make phone call.');
    }
  };

  // Handle directions
  const handleDirections = async () => {
    if (!restaurant?.location) {
      Alert.alert('No Location', 'This restaurant has no location coordinates.');
      return;
    }

    try {
      const { latitude, longitude } = restaurant.location;
      let mapUrl = '';

      // Create platform-specific URLs
      if (Platform.OS === 'ios') {
        mapUrl = `maps.apple.com/?daddr=${latitude},${longitude}`;
      } else {
        mapUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(restaurant.name)})`;
      }

      // Fallback to Google Maps web
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      
      const supported = await Linking.canOpenURL(mapUrl);
      await Linking.openURL(supported ? mapUrl : fallbackUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open directions.');
    }
  };
  // Handle share
  const handleShare = async () => {
    if (!restaurant) return;

    try {
      const message = `Check out ${restaurant.name}${restaurant.address ? ` at ${restaurant.address}` : ''}`;
      await Share.share({
        message,
        title: restaurant.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle website
  const handleWebsite = async () => {
    if (!restaurant?.website) {
      Alert.alert('No Website', 'This restaurant has no website listed.');
      return;
    }

    try {
      let websiteUrl = restaurant.website;
      if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${websiteUrl}`;
      }

      const supported = await Linking.canOpenURL(websiteUrl);
      if (supported) {
        await Linking.openURL(websiteUrl);
      } else {
        Alert.alert('Invalid URL', 'Cannot open this website.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open website.');
    }
  };

  // Format hours for display
  const formatHours = () => {
    if (!restaurant) return '';
    
    if (restaurant.openAllDays) {
      return '24 Hours';
    }

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(restaurant.openTime)} - ${formatTime(restaurant.closeTime)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8505B" />
        <Text style={styles.loadingText}>Loading restaurant...</Text>
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Restaurant Not Found</Text>
        <Text style={styles.errorText}>
          {error || 'The restaurant you are looking for does not exist.'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/map');
            }
          }}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getRestaurantStatus();
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <StatusBar style={isFocused ? 'light' : 'auto'} />
        <NativeStatusBar
          translucent
          backgroundColor="transparent"
          barStyle={isFocused ? 'light-content' : 'default'}
        />

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: restaurant.coverPhotoUrl || allPhotos[0] || '' }} style={styles.heroImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            style={[styles.heroGradient, { height: insets.top + 90 }]}
            pointerEvents="none"
          />

          {/* Hero Controls */}
          <TouchableOpacity 
            style={[styles.backButton, { top: insets.top + 8 }]} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/map');
              }
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={[styles.heroTopRight, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.heroButton} onPress={handleShare}>
              <Feather name="share-2" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setIsBookmarked(!isBookmarked)}
            >
              <Ionicons 
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={20} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>

        </View>

        {/* Content Sheet */}
        <View style={styles.contentSheet}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text style={styles.restaurantName} numberOfLines={2}>
                {restaurant.name}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${status.color}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>

          {/* Rating & Meta */}
          <View style={styles.ratingRow}>
            {(restaurant?.reviewCount ?? 0) > 0 ? (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FCD34D" />
                <Text style={styles.ratingText}>{(restaurant?.rating ?? 0).toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({restaurant?.reviewCount ?? 0} reviews)</Text>
              </View>
            ) : (
              <View style={styles.ratingContainer}>
                <Text style={styles.noReviewsText}>No reviews yet</Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {restaurant?.tags && restaurant.tags.length > 0 && (
            <View style={styles.tagsRow}>
              <Text style={styles.tagsText}>
                {restaurant.tags.join(' • ')}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, !restaurant.phone && styles.actionButtonDisabled]}
              onPress={handleCall}
              disabled={!restaurant.phone}
            >
              <View style={[styles.actionIconContainer, !restaurant.phone && styles.actionIconDisabled]}>
                <Feather name="phone" size={20} color={restaurant.phone ? "#1B2236" : "#999"} />
              </View>
              <Text style={[styles.actionLabel, !restaurant.phone && styles.actionLabelDisabled]}>
                Call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, !restaurant.location && styles.actionButtonDisabled]}
              onPress={handleDirections}
              disabled={!restaurant.location}
            >
              <View style={[styles.actionIconContainer, !restaurant.location && styles.actionIconDisabled]}>
                <Feather name="map-pin" size={20} color={restaurant.location ? "#1B2236" : "#999"} />
              </View>
              <Text style={[styles.actionLabel, !restaurant.location && styles.actionLabelDisabled]}>
                Directions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <View style={styles.actionIconContainer}>
                <Feather name="share-2" size={20} color="#1B2236" />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, !restaurant.website && styles.actionButtonDisabled]}
              onPress={handleWebsite}
              disabled={!restaurant.website}
            >
              <View style={[styles.actionIconContainer, !restaurant.website && styles.actionIconDisabled]}>
                <Feather name="globe" size={20} color={restaurant.website ? "#1B2236" : "#999"} />
              </View>
              <Text style={[styles.actionLabel, !restaurant.website && styles.actionLabelDisabled]}>
                Website
              </Text>
            </TouchableOpacity>
          </View>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
              onPress={() => setActiveTab('photos')}
            >
              <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
                Photos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
                Reviews
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* Description */}
              {restaurant.description && (
                <Text style={styles.description}>{restaurant.description}</Text>
              )}

              {/* Address Card */}
              <TouchableOpacity style={styles.infoCard} onPress={handleDirections}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location" size={20} color="#1B2236" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>
                    {restaurant.address && restaurant.city 
                      ? `${restaurant.address}, ${restaurant.city}`
                      : restaurant.city || restaurant.address || 'Address not available'
                    }
                  </Text>
                  {restaurant.signatureDish && (
                    <Text style={styles.infoSubtitle}>
                      Signature dish: {restaurant.signatureDish}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7488" />
              </TouchableOpacity>

              {/* Hours Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="time" size={20} color="#1B2236" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>
                    {status.isOpen ? 'Open Now' : 'Closed Now'}
                  </Text>
                  <Text style={styles.infoSubtitle}>
                    {formatHours()}{restaurant.openAllDays ? ' • Open all days' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7488" />
              </View>
              <TouchableOpacity
                style={[styles.menuButton, { marginBottom: insets.bottom + 24 }]}
                onPress={() => {
                  router.push({ pathname: '/restaurant/[id]/menu', params: { id: restaurant.id } });
                }}
              >
                <Text style={styles.menuButtonText}>View Menu</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'photos' && (
            <View style={styles.tabContent}>
              {allPhotos.length > 0 ? (
                <View style={styles.photosGrid}>
                  {allPhotos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoTile}
                      onPress={() => {
                        setImageModalIndex(index);
                        setImageModalVisible(true);
                      }}
                    >
                      <Image source={{ uri: photo }} style={styles.photoTileImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="camera-outline" size={48} color="#6B7488" />
                  <Text style={styles.emptyStateText}>No photos yet</Text>
                </View>
              )}
            </View>
          )}
          {activeTab === 'reviews' && (
            <View style={styles.tabContent}>
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={48} color="#6B7488" />
                <Text style={styles.emptyStateText}>No reviews yet</Text>
                <Text style={styles.emptyStateSubtext}>Be the first to review</Text>
              </View>
              <TouchableOpacity style={styles.writeReviewButton}>
                <Text style={styles.writeReviewText}>Write a review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: imageModalIndex * SCREEN_WIDTH, y: 0 }}
          >
            {allPhotos.map((photo, index) => (
              <View key={index} style={styles.modalImageContainer}>
                <Image source={{ uri: photo }} style={styles.modalImage} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7488',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B2236',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7488',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#E8505B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Hero Section
  heroContainer: {
    height: 260,
    position: 'relative',
  },
  heroImageContainer: {
    width: SCREEN_WIDTH,
    height: 260,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    position: 'absolute',
    top: 8,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroTopRight: {
    position: 'absolute',
    top: 8,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content Sheet
  contentSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 5,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleLeft: {
    flex: 1,
    marginRight: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B2236',
    lineHeight: 30,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Rating & Meta
  ratingRow: {
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B2236',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6B7488',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#6B7488',
  },

  // Tags
  tagsRow: {
    marginTop: 6,
    marginBottom: 18,
  },
  tagsText: {
    fontSize: 13,
    color: '#6B7488',
    lineHeight: 20,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconDisabled: {
    backgroundColor: '#F5F5F5',
  },
  actionLabel: {
    fontSize: 12,
    color: '#1B2236',
    fontWeight: '500',
  },
  actionLabelDisabled: {
    color: '#999',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#E8505B',
  },
  tabText: {
    fontSize: 15,
    color: '#6B7488',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#E8505B',
    fontWeight: '600',
  },

  // Tab Content
  tabContent: {
    gap: 10,
  },
  description: {
    fontSize: 14,
    color: '#6B7488',
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 4,
  },

  // Info Cards
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1B2236',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#6B7488',
  },

  // Photos Grid
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: (SCREEN_WIDTH - 56) / 3, // 3 columns with gaps
    height: (SCREEN_WIDTH - 56) / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7488',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7488',
  },
  writeReviewButton: {
    backgroundColor: '#E8505B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  writeReviewText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    backgroundColor: '#E8505B',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 20,
  },
  menuButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Image Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    resizeMode: 'contain',
  },
});
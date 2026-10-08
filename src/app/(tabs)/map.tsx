/**
 * Discover Screen - Exact replica of reference UI
 * Static map card with real restaurant data
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { useSavedRestaurants } from '@/hooks/useSavedRestaurants';
import { RESTAURANT_CATEGORIES } from '@/constants/restaurant';
import type { Restaurant } from '@/services/restaurantService';

// Get category icon function (defined outside component for performance)
const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    'Traditional Sri Lankan': 'restaurant',
    'Street Food': 'storefront',
    'Seafood': 'fish',
    'Bakery & Sweets': 'cafe',
    'Cafe': 'cafe',
    'Fine Dining': 'wine',
    'Vegetarian': 'leaf',
    'Fast Food': 'fast-food',
    all: 'grid',
  };
  return iconMap[category] || 'restaurant';
};

export default function DiscoverScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [toast, setToast] = useState('');
  const { isSaved, toggle } = useSavedRestaurants();

  const {
    nearbyRestaurants,
    openRestaurants,
    currentArea,
    sortBy,
    setSortBy,
    setSearchText: setGlobalSearchText,
    setSelectedCategory: setGlobalSelectedCategory,
  } = useNearbyRestaurants();

  // Create dynamic category chips from real restaurant categories
  const categoryChips = useMemo(() => {
    const allCategories = ['all', ...RESTAURANT_CATEGORIES];
    
    return allCategories.map(category => ({
      id: category,
      label: category === 'all' ? 'All Hearths' : 
             category === 'Traditional Sri Lankan' ? 'Traditional' :
             category === 'Street Food' ? 'Street Food' :
             category === 'Bakery & Sweets' ? 'Bakery' :
             category,
      icon: getCategoryIcon(category),
      selected: category === selectedCategory
    }));
  }, [selectedCategory]);

  // Handle search text change
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setGlobalSearchText(text);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setGlobalSelectedCategory(categoryId === 'all' ? null : categoryId);
  };

  // Handle bookmark toggle
  const handleBookmark = async (restaurant: Restaurant) => {
    const wasSaved = isSaved(restaurant.id);
    const updated = await toggle(restaurant.id);
    if (updated) {
      setToast(wasSaved ? 'Removed from favourites' : 'Saved to favourites');
      setTimeout(() => setToast(''), 1600);
    }
  };

  // Render search row with functional search input
  const renderSearchRow = () => (
    <View style={styles.searchRow}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          numberOfLines={1}
        />
        <View style={styles.locationChip}>
          <Ionicons name="location" size={12} color="#E8505B" />
          <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
            {currentArea}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#666" />
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => {
          // Filter options would go here
          console.log('Filter options');
        }}
      >
        <Ionicons name="options" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  // Render category chips from real restaurant categories
  const renderCategoryChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryContainer}
      style={styles.categoryScrollView}
    >
      {categoryChips.map((category, index) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            category.selected && styles.categoryChipSelected,
            index === categoryChips.length - 1 && styles.lastCategoryChip
          ]}
          onPress={() => handleCategorySelect(category.id)}
        >
          <Ionicons 
            name={category.icon as any} 
            size={16} 
            color={category.selected ? "#FFF" : "#1E293B"} 
            style={styles.categoryIcon}
          />
          <Text style={[
            styles.categoryText,
            category.selected && styles.categoryTextSelected
          ]}>
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
  // Render static map card with overlays
  const renderMapCard = () => (
    <View style={styles.mapCard}>
      {/* Background map image or fallback */}
      <View style={styles.mapBackground}>
        {/* Fallback map design with shapes */}
        <View style={styles.mapSea} />
        <View style={styles.mapCoast1} />
        <View style={styles.mapCoast2} />
        <View style={styles.mapCoast3} />
      </View>

      {/* Top-left: Open kitchens pill */}
      <View style={styles.openKitchensPill}>
        <Ionicons name="flame" size={14} color="#E8505B" />
        <Text style={styles.openKitchensText}>{openRestaurants.length} Hearth Kitchens Open</Text>
      </View>

      {/* Right column controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapControlButton}>
          <Ionicons name="add" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlButton}>
          <Ionicons name="remove" size={20} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.targetButton}>
          <Ionicons name="locate" size={20} color="#E8505B" />
        </TouchableOpacity>
      </View>

      {/* Restaurant markers with labels */}
      {nearbyRestaurants.slice(0, 2).map((restaurant, index) => (
        <View key={restaurant.id} style={[
          styles.restaurantMarker,
          index === 0 ? styles.marker1Position : styles.marker2Position
        ]}>
          <View style={styles.markerLabel}>
            <Text style={styles.markerLabelText}>{restaurant.name}</Text>
          </View>
          <View style={[styles.markerCircle, { backgroundColor: index === 0 ? '#E8505B' : '#10B981' }]}>
            <Ionicons name="restaurant" size={12} color="#FFF" />
          </View>
        </View>
      ))}

      {/* Bottom-left: Location pill */}
      <View style={styles.locationPill}>
        <View style={styles.greenDot} />
        <Text style={styles.locationPillText}>You are near {currentArea}</Text>
      </View>
    </View>
  );
  // Render section header with dynamic sort
  const renderSectionHeader = () => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <View style={styles.redDot} />
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Authentic Hearths Nearby ({nearbyRestaurants.length})
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.sortButton}
        onPress={() => setSortBy(sortBy === 'distance' ? 'rating' : 'distance')}
      >
        <Text style={styles.sortText}>Sort: {sortBy === 'distance' ? 'Distance' : 'Rating'}</Text>
        <Ionicons name="chevron-down" size={12} color="#E8505B" />
      </TouchableOpacity>
    </View>
  );

  // Render restaurant card with simplified layout
  const renderRestaurantCard = ({ item: restaurant }: { item: Restaurant & { distance: number } }) => {
    // Format address properly - show full address instead of just distance
    const addressText = restaurant.address && restaurant.city 
      ? `${restaurant.address}, ${restaurant.city}`
      : restaurant.city || restaurant.address || 'Location unavailable';

    // Get signature dish or show "N/A" exactly as saved by admin
    const signatureDishText = restaurant.signatureDish && restaurant.signatureDish.trim() !== '' 
      ? restaurant.signatureDish 
      : 'N/A';

    // Format cuisine tags as green pills (first 2 tags max)
    const cuisineTags = restaurant.tags.slice(0, 2);

    return (
      <TouchableOpacity 
        style={styles.restaurantCard}
        activeOpacity={0.7}
        onPress={() => {
          // Prevent double taps within 600ms
          const now = Date.now();
          if (now - lastTapTime < 600) {
            return;
          }
          setLastTapTime(now);
          
          router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } });
        }}
      >
        {/* Restaurant photo with category icon */}
        <View style={styles.photoContainer}>
          <Image
            source={{ 
              uri: restaurant.coverPhotoUrl || 'https://via.placeholder.com/96x96/F5F5F5/E8505B?text=No+Image'
            }}
            style={styles.restaurantPhoto}
          />
          <View style={styles.categoryIconContainer}>
            <Ionicons name="restaurant" size={12} color="#666" />
          </View>
        </View>

        {/* Restaurant info */}
        <View style={styles.restaurantInfo}>
          {/* Top row: name and bookmark */}
          <View style={styles.restaurantTopRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <TouchableOpacity 
              onPress={(event) => {
                event.stopPropagation();
                void handleBookmark(restaurant);
              }}
              style={styles.bookmarkButton}
            >
              <Ionicons name={isSaved(restaurant.id) ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved(restaurant.id) ? '#E8505B' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Address row */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={12} color="#E8505B" />
            <Text style={styles.locationAddress} numberOfLines={1}>
              {addressText}
            </Text>
          </View>

          {/* Single label with tick and cuisine tags */}
          <View style={styles.singleLabel}>
            <Ionicons name="checkmark-circle" size={12} color="#1E7B45" />
            <Text style={styles.singleLabelText}>
              {cuisineTags.length > 0 ? cuisineTags.join(', ') : 'Authentic cuisine'}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Bottom row: signature dish and rating */}
          <View style={styles.bottomRow}>
            <Text style={styles.signatureDish} numberOfLines={1}>
              {signatureDishText}
            </Text>
            <View style={styles.ratingContainer}>
              {restaurant.reviewCount > 0 ? (
                <>
                  <Ionicons name="star" size={12} color="#FCD34D" />
                  <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>({restaurant.reviewCount})</Text>
                </>
              ) : (
                <Text style={styles.newText}>New</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSearchRow()}
        {renderCategoryChips()}
        {renderMapCard()}
        {renderSectionHeader()}
        
        {/* Restaurant list */}
        <ScrollView 
          style={styles.restaurantList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {nearbyRestaurants.slice(0, 5).map((restaurant) => (
            <View key={restaurant.id} style={styles.restaurantCardWrapper}>
              {renderRestaurantCard({ item: restaurant })}
            </View>
          ))}
          
          {/* Show "no results" message if filtered list is empty */}
          {nearbyRestaurants.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noResultsTitle}>No restaurants found</Text>
              <Text style={styles.noResultsSubtitle}>
                Try adjusting your search or category filter
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      {toast ? <View style={styles.toast}><Ionicons name="bookmark" size={15} color="#FFF" /><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  toast: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#1F2937', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10 },
  toastText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  scrollView: {
    flex: 1,
  },

  // Search row with native header
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    height: 38,      // Reduced from 44dp
    backgroundColor: '#EEF2F7',
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: '100%',
    paddingVertical: 0,
  },
  searchTextContainer: {
    flex: 1,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    maxWidth: 120,
  },
  filterButton: {
    width: 38,       // Match search height
    height: 38,
    backgroundColor: '#E8505B',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Category chips with smaller font and no bold
  categoryScrollView: {
    marginTop: 14,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#E8505B',
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lastCategoryChip: {
    marginRight: -100, // Extends beyond screen edge as in reference
  },
  categoryIcon: {
    marginRight: 0,
  },
  categoryText: {
    fontSize: 12,      // Smaller font size
    fontWeight: 'normal', // Remove bold
    color: '#1E293B',
  },
  categoryTextSelected: {
    color: '#FFF',
  },
  // Map card closer to categories
  mapCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#C7D2CC',
  },
  mapSea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '30%',
    backgroundColor: '#7FB3D3',
  },
  mapCoast1: {
    position: 'absolute',
    bottom: '25%',
    left: '10%',
    right: '20%',
    height: '35%',
    backgroundColor: '#E8E2D4',
    borderRadius: 20,
  },
  mapCoast2: {
    position: 'absolute',
    bottom: '15%',
    left: '30%',
    right: '10%',
    height: '25%',
    backgroundColor: '#D4C7B9',
    borderRadius: 15,
  },
  mapCoast3: {
    position: 'absolute',
    bottom: 0,
    left: '5%',
    right: '5%',
    height: '20%',
    backgroundColor: '#F0EAD6',
    borderRadius: 10,
  },

  // Map overlays
  openKitchensPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  openKitchensText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },

  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 12,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  targetButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Restaurant markers
  restaurantMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  marker1Position: {
    top: 80,
    left: '35%',
  },
  marker2Position: {
    top: 120,
    right: '25%',
  },
  markerLabel: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  markerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  locationPill: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },

  // Section header closer to map
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8505B',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E8505B',
  },
  // Restaurant cards
  restaurantList: {
    paddingHorizontal: 16,
  },
  restaurantCardWrapper: {
    marginBottom: 12,
  },
  restaurantCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    padding: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },

  // Photo section
  photoContainer: {
    position: 'relative',
  },
  restaurantPhoto: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  categoryIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Restaurant info
  restaurantInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  restaurantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  bookmarkButton: {
    padding: 4, // Increase tap area
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  locationAddress: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  locationDistance: {
    fontSize: 13,
    color: '#64748B',
  },
  singleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F6EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  singleLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E7B45',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signatureDish: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewCount: {
    fontSize: 13,
    color: '#64748B',
  },
  newText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F59E0B',
  },

  // No results state
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomPadding: {
    height: 100,
  },
});
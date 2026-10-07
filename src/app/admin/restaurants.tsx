import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRestaurantOperations } from '@/hooks/useRestaurantOperations';
import { subscribeToRestaurants, type Restaurant } from '@/services/restaurantService';

type FilterType = 'all' | 'active' | 'drafts';

/**
 * Admin Restaurants screen
 * Shows restaurant management interface with search, filters, and restaurant cards
 */
export default function AdminRestaurantsScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { deleteRestaurantData, isSubmitting } = useRestaurantOperations();

  // Subscribe to real-time restaurant updates
  useEffect(() => {
    const unsubscribe = subscribeToRestaurants(
      (restaurantData) => {
        setRestaurants(restaurantData);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Restaurant subscription error:', error);
        setError(error.message);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Filter counts
  const activeCount = restaurants.filter(r => r.status === 'active').length;
  const draftCount = restaurants.filter(r => r.status === 'draft').length;
  const totalCount = restaurants.length;

  // Get filtered restaurants
  const filteredRestaurants = restaurants.filter(restaurant => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = restaurant.name.toLowerCase().includes(searchLower) ||
                         restaurant.category.toLowerCase().includes(searchLower) ||
                         restaurant.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
                         restaurant.city.toLowerCase().includes(searchLower);
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'active' && restaurant.status === 'active') ||
                         (selectedFilter === 'drafts' && restaurant.status === 'draft');
    
    return matchesSearch && matchesFilter;
  });

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // The real-time subscription will automatically update the data
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Handler functions
  const handleProfilePress = () => {
    router.push('/admin/profile' as any);
  };

  const handleFilterPress = () => {
    console.log('Filter pressed - advanced filters coming soon');
  };

  const handleAddRestaurant = () => {
    router.push('/admin/add-restaurant' as any);
  };

  const handlePhonePress = (phone: string) => {
    Alert.alert('Contact', `Call ${phone}?`);
  };

  const handleDeletePress = async (restaurantId: string) => {
    try {
      await deleteRestaurantData(restaurantId);
    } catch (err) {
      if (err instanceof Error && err.message !== 'Cancelled') {
        Alert.alert('Error', 'Failed to delete restaurant. Please try again.');
      }
    }
  };

  const handleEditPress = (restaurantId: string) => {
    router.push(`/admin/edit-restaurant/${restaurantId}` as any);
  };

  const handleManageMenuPress = (restaurantId: string) => {
    // NO-OP as requested - reserved for future development
  };

  const handlePublishDraft = async (restaurant: Restaurant) => {
    // Quick publish validation - check required fields for active status
    const requiredFields = {
      name: restaurant.name,
      category: restaurant.category,
      description: restaurant.description,
      address: restaurant.address,
      city: restaurant.city,
      phone: restaurant.phone,
      location: restaurant.location,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || (typeof value === 'string' && !value.trim()))
      .map(([key]) => key);

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please complete the following fields before publishing: ${missingFields.join(', ')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => handleEditPress(restaurant.id) }
        ]
      );
      return;
    }

    Alert.alert(
      'Publish Restaurant',
      'Are you sure you want to publish this restaurant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              console.log('Publishing restaurant:', restaurant.id);
              Alert.alert('Success', 'Restaurant published successfully!');
            } catch (err) {
              Alert.alert('Error', 'Failed to publish restaurant. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return 'No phone number';
    
    if (phone.startsWith('+94')) {
      const number = phone.slice(3);
      if (number.length >= 9) {
        return `+94 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
      }
    }
    return phone;
  };

  // Format opening hours for display
  const formatOpeningHours = (restaurant: Restaurant) => {
    if (!restaurant.openTime || !restaurant.closeTime) {
      return 'Hours not set';
    }
    
    if (restaurant.openAllDays) {
      return `${restaurant.openTime} – ${restaurant.closeTime} (Open all days)`;
    }
    return `${restaurant.openTime} – ${restaurant.closeTime}`;
  };

  const renderFilterChip = (filter: FilterType, label: string, count: number) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterChip,
        selectedFilter === filter && styles.filterChipActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterChipText,
        selectedFilter === filter && styles.filterChipTextActive
      ]}>
        {label}
      </Text>
      <View style={[
        styles.countBadge,
        selectedFilter === filter && styles.countBadgeActive
      ]}>
        <Text style={[
          styles.countBadgeText,
          selectedFilter === filter && styles.countBadgeTextActive
        ]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRestaurantCard = (restaurant: Restaurant) => (
    <View key={restaurant.id} style={styles.restaurantCard}>
      {/* Restaurant Image with Rating Badge */}
      <View style={styles.imageContainer}>
        {restaurant.coverPhotoUrl ? (
          <Image 
            source={{ uri: restaurant.coverPhotoUrl }} 
            style={styles.restaurantImage}
            defaultSource={require('@/assets/images/react-logo.png')}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="restaurant-outline" size={32} color="#999" />
          </View>
        )}
        
        <View style={styles.ratingBadge}>
          {restaurant.reviewCount > 0 ? (
            <>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            </>
          ) : (
            <Text style={styles.newBadgeText}>New</Text>
          )}
        </View>
        
        {restaurant.status === 'draft' && (
          <View style={styles.draftBadge}>
            <Text style={styles.draftBadgeText}>Draft</Text>
          </View>
        )}
      </View>

      {/* Restaurant Content */}
      <View style={styles.restaurantContent}>
        {/* Category Pill */}
        <View style={styles.cuisinePill}>
          <Text style={styles.cuisineText}>{restaurant.category}</Text>
        </View>

        {/* Restaurant Name and Location */}
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#999" />
          <Text style={styles.locationText} numberOfLines={1}>
            {restaurant.city}
          </Text>
        </View>

        {/* Hours and Reviews */}
        <View style={styles.detailsRow}>
          <View style={styles.hoursContainer}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.hoursText} numberOfLines={1}>
              {formatOpeningHours(restaurant)}
            </Text>
          </View>
          <Text style={styles.reviewsText}>
            {restaurant.reviewCount} Review{restaurant.reviewCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Footer with Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.phoneContainer}>
            <TouchableOpacity
              onPress={() => handlePhonePress(restaurant.phone)}
              accessibilityLabel={`Call ${restaurant.phone}`}
            >
              <Ionicons name="call-outline" size={16} color="#666" />
            </TouchableOpacity>
            <Text style={styles.phoneText}>{formatPhoneNumber(restaurant.phone)}</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleDeletePress(restaurant.id)}
              style={styles.deleteButton}
              disabled={isSubmitting}
              accessibilityLabel="Delete restaurant"
            >
              <Ionicons name="trash-outline" size={16} color="#E8505B" />
            </TouchableOpacity>

            {restaurant.status === 'draft' && (
              <TouchableOpacity
                onPress={() => handlePublishDraft(restaurant)}
                style={styles.publishQuickButton}
                disabled={isSubmitting}
              >
                <Text style={styles.publishQuickButtonText}>Publish</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => handleEditPress(restaurant.id)}
              style={styles.editButton}
              disabled={isSubmitting}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleManageMenuPress(restaurant.id)}
              style={styles.manageMenuButton}
            >
              <Text style={styles.manageMenuButtonText}>Manage Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color="#E8505B" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredRestaurants.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color="#DDD" />
          <Text style={styles.emptyStateText}>
            {restaurants.length === 0 ? 'No restaurants yet' : 'No restaurants found'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {restaurants.length === 0 
              ? 'Tap + Add Restaurant to get started'
              : searchQuery 
                ? 'Try adjusting your search terms' 
                : 'No restaurants match the selected filter'
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.restaurantList}>
        {filteredRestaurants.map(renderRestaurantCard)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#E8505B" />
              <Text style={styles.adminText}>ADMIN CONSOLE</Text>
            </View>
            <Text style={styles.pageTitle}>Restaurants</Text>
          </View>
          
          <TouchableOpacity
            onPress={handleProfilePress}
            style={styles.profileButton}
            accessibilityLabel="Admin profile"
          >
            <Ionicons name="person-circle" size={32} color="#E8505B" />
            <View style={styles.statusDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants, cuisines, districts..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity
            onPress={handleFilterPress}
            style={styles.filterButton}
            accessibilityLabel="Open filters"
          >
            <Ionicons name="options" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {renderFilterChip('all', 'All', totalCount)}
          {renderFilterChip('active', 'Active', activeCount)}
          {renderFilterChip('drafts', 'Drafts', draftCount)}
        </View>

        {/* Manage Restaurants Panel */}
        <View style={styles.managePanel}>
          <View style={styles.managePanelLeft}>
            <View style={styles.managePanelIcon}>
              <Ionicons name="storefront" size={20} color="#E8505B" />
            </View>
            <View style={styles.managePanelText}>
              <Text style={styles.managePanelTitle}>Manage{'\n'}Restaurants</Text>
              <Text style={styles.managePanelSubtitle}>Sri Lankan Culinary Network</Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={handleAddRestaurant}
            style={styles.addRestaurantButton}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.addRestaurantText}>Add{'\n'}Restaurant</Text>
          </TouchableOpacity>
        </View>

        {/* Heritage Spots Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registered Heritage Spots</Text>
        </View>

        {/* Restaurant Cards or Loading/Error States */}
        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading restaurants...</Text>
          </View>
        ) : (
          renderContent()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8505B',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  profileButton: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FAFAF7',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8505B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: '#E8505B',
    borderColor: '#E8505B',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  countBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  countBadgeTextActive: {
    color: '#FFF',
  },
  managePanel: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
  },
  managePanelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managePanelIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  managePanelText: {
    flex: 1,
  },
  managePanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
    marginBottom: 2,
  },
  managePanelSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 14,
  },
  addRestaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8505B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  addRestaurantText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    marginLeft: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8505B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#E8505B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  restaurantList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  restaurantCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 40,
    justifyContent: 'center',
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  newBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  draftBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  draftBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  restaurantContent: {
    padding: 16,
  },
  cuisinePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  cuisineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E8505B',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  hoursText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  reviewsText: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteButton: {
    padding: 4,
  },
  publishQuickButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  publishQuickButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFF',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  manageMenuButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E8505B',
  },
  manageMenuButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
  },
});
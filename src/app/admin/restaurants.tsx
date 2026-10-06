import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock data for restaurants
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  reviewCount: number;
  hours: string;
  phone: string;
  image: any; // Using require() for local images
  status: 'active' | 'draft';
}

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Menike Traditional Claypot',
    cuisine: 'Southern Claypot',
    location: 'Ambalangoda Heritage Trail, Ga...',
    rating: 4.9,
    reviewCount: 96,
    hours: '11:00 AM - 9:00 PM',
    phone: '+94 91 225 8901',
    image: require('@/assets/images/react-logo.png'), // Placeholder
    status: 'active',
  },
  {
    id: '2',
    name: 'Kandy Highlands Pantry',
    cuisine: 'Upcountry Organic',
    location: 'Paradeniya Road, Kandy',
    rating: 4.8,
    reviewCount: 54,
    hours: '8:00 AM - 7:30 PM',
    phone: '+94 81 223 6412',
    image: require('@/assets/images/react-logo.png'), // Placeholder
    status: 'active',
  },
  {
    id: '3',
    name: 'Nallur Lagoon Crab Shop',
    cuisine: 'Jaffna Seafood',
    location: 'Point Pedro Road, Jaffna',
    rating: 4.95,
    reviewCount: 142,
    hours: '12:00 PM - 10:00 PM',
    phone: '+94 21 222 4110',
    image: require('@/assets/images/react-logo.png'), // Placeholder
    status: 'active',
  },
  {
    id: '4',
    name: 'Colombo Hearth & Home',
    cuisine: 'Colombo Hearth',
    location: 'Cinnamon Gardens, Colombo...',
    rating: 4.7,
    reviewCount: 88,
    hours: '4:30 PM - 11:30 PM',
    phone: '+94 11 257 8640',
    image: require('@/assets/images/react-logo.png'), // Placeholder
    status: 'draft',
  },
];

type FilterType = 'all' | 'active' | 'drafts';

/**
 * Admin Restaurants screen
 * Shows restaurant management interface with search, filters, and restaurant cards
 */
export default function AdminRestaurantsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Filter counts
  const activeCount = mockRestaurants.filter(r => r.status === 'active').length;
  const draftCount = mockRestaurants.filter(r => r.status === 'draft').length;
  const totalCount = mockRestaurants.length;

  // Get filtered restaurants
  const filteredRestaurants = mockRestaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'active' && restaurant.status === 'active') ||
                         (selectedFilter === 'drafts' && restaurant.status === 'draft');
    
    return matchesSearch && matchesFilter;
  });

  // Placeholder handlers (TODO: Implement actual functionality)
  const handleProfilePress = () => {
    // TODO: Navigate to admin profile or show profile options
    console.log('Profile pressed');
  };

  const handleFilterPress = () => {
    // TODO: Open advanced filter modal
    console.log('Filter pressed');
  };

  const handleAddRestaurant = () => {
    // TODO: Navigate to add restaurant form
    console.log('Add restaurant pressed');
  };

  const handlePhonePress = (phone: string) => {
    // TODO: Launch phone call or show contact options
    console.log('Phone pressed:', phone);
  };

  const handleDeletePress = (restaurantId: string) => {
    // TODO: Show delete confirmation and remove restaurant
    console.log('Delete pressed:', restaurantId);
  };

  const handleEditPress = (restaurantId: string) => {
    // TODO: Navigate to edit restaurant form
    console.log('Edit pressed:', restaurantId);
  };

  const handleManageMenuPress = (restaurantId: string) => {
    // TODO: Navigate to menu management screen
    console.log('Manage Menu pressed:', restaurantId);
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
        <Image source={restaurant.image} style={styles.restaurantImage} />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{restaurant.rating}</Text>
        </View>
      </View>

      {/* Restaurant Content */}
      <View style={styles.restaurantContent}>
        {/* Cuisine Pill */}
        <View style={styles.cuisinePill}>
          <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
        </View>

        {/* Restaurant Name and Location */}
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#999" />
          <Text style={styles.locationText} numberOfLines={1}>
            {restaurant.location}
          </Text>
        </View>

        {/* Hours and Reviews */}
        <View style={styles.detailsRow}>
          <View style={styles.hoursContainer}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.hoursText}>{restaurant.hours}</Text>
          </View>
          <Text style={styles.reviewsText}>{restaurant.reviewCount} Reviews</Text>
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
            <Text style={styles.phoneText}>{restaurant.phone}</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleDeletePress(restaurant.id)}
              style={styles.deleteButton}
              accessibilityLabel="Delete restaurant"
            >
              <Ionicons name="trash-outline" size={16} color="#E8505B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleEditPress(restaurant.id)}
              style={styles.editButton}
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        {/* Restaurant Cards */}
        <View style={styles.restaurantList}>
          {filteredRestaurants.map(renderRestaurantCard)}
        </View>

        {/* Empty State */}
        {filteredRestaurants.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#DDD" />
            <Text style={styles.emptyStateText}>No restaurants found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search terms' : 'Add your first restaurant to get started'}
            </Text>
          </View>
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
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
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
  },
  hoursText: {
    fontSize: 12,
    color: '#666',
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
    gap: 8,
  },
  deleteButton: {
    padding: 4,
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
});
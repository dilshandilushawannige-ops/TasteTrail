import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  collection, 
  collectionGroup,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { subscribeToRestaurants } from '@/services/restaurantService';

type TimestampValue = { toMillis?: () => number; seconds?: number } | Date | number;
type DatedRecord = { createdAt?: TimestampValue };

/**
 * Admin Overview screen
 */
export default function AdminOverviewScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'30 Days' | '3 Months' | 'This Year'>('30 Days');
  const [restaurants, setRestaurants] = useState<{ status: string; createdAt?: TimestampValue }[]>([]);
  const [recipes, setRecipes] = useState<DatedRecord[]>([]);
  const [menuItems, setMenuItems] = useState<DatedRecord[]>([]);
  const [users, setUsers] = useState<DatedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeRestaurants = subscribeToRestaurants((restaurants) => {
      setRestaurants(restaurants);
    }, (subscriptionError) => setError(subscriptionError.message));

    const unsubscribeRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map((item) => item.data()));
    }, (snapshotError) => setError(snapshotError.message));

    const unsubscribeMenu = onSnapshot(collectionGroup(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map((item) => item.data()));
    }, (snapshotError) => setError(snapshotError.message));

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map((item) => item.data()));
    }, (snapshotError) => setError(snapshotError.message));

    return () => {
      unsubscribeRestaurants();
      unsubscribeRecipes();
      unsubscribeMenu();
      unsubscribeUsers();
    };
  }, []);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'This Year') return new Date(now.getFullYear(), 0, 1).getTime();
    if (selectedPeriod === '3 Months') {
      now.setMonth(now.getMonth() - 3);
      return now.getTime();
    }
    now.setDate(now.getDate() - 30);
    return now.getTime();
  }, [selectedPeriod]);

  const getTimestamp = (value?: TimestampValue) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    return (value.seconds || 0) * 1000;
  };

  const countInPeriod = (items: DatedRecord[]) =>
    items.filter((item) => getTimestamp(item.createdAt) >= periodStart).length;

  const cards = [
    { label: 'Active Restaurants', count: countInPeriod(restaurants.filter((restaurant) => restaurant.status === 'active')), icon: 'restaurant' as const, footer: `${selectedPeriod} published kitchens` },
    { label: 'Total Recipes', count: countInPeriod(recipes), icon: 'book' as const, footer: `${selectedPeriod} recipes added` },
    { label: 'Menu Items', count: countInPeriod(menuItems), icon: 'fast-food' as const, footer: `${selectedPeriod} menu items added` },
    { label: 'Registered Users', count: countInPeriod(users), icon: 'people' as const, footer: `${selectedPeriod} new members` },
  ];
  const chartValues = cards.map((card) => card.count ?? 0);
  const chartMax = Math.max(...chartValues, 1);

  const handleProfilePress = () => {
    router.push('/admin/profile' as any);
  };

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
            <Text style={styles.pageTitle}>Overview</Text>
            <Text style={styles.pageSubtitle}>
              Track restaurants, recipes and members{'\n'}across Taste Trail.
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIcon} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={23} color="#71829D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton} accessibilityLabel="Admin profile">
              <Ionicons name="person-circle" size={32} color="#E8505B" />
              <View style={styles.statusDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Control */}
        <View style={styles.segmentedControl}>
          {(['30 Days', '3 Months', 'This Year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.segmentButton,
                selectedPeriod === period && styles.segmentButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  selectedPeriod === period && styles.segmentButtonTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          {cards.map((card) => (
            <View style={styles.statCard} key={card.label}>
              <View style={styles.statCardIcon}>
                <Ionicons name={card.icon} size={20} color="#E8505B" />
              </View>
              <Text style={styles.statCardCount}>{card.count ?? '—'}</Text>
              <Text style={styles.statCardLabel}>{card.label}</Text>
              <View style={styles.statCardFooter}>
                <Ionicons name="analytics-outline" size={12} color="#999" />
                <Text style={styles.statCardFooterText}>{card.footer}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Taste Trail activity</Text>
              <Text style={styles.chartSubtitle}>Current content overview</Text>
            </View>
            <Ionicons name="bar-chart-outline" size={22} color="#E8505B" />
          </View>
          <View style={styles.chart}>
            {cards.map((card, index) => (
              <View style={styles.chartColumn} key={card.label}>
                <Text style={styles.chartValue}>{card.count ?? '—'}</Text>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { height: `${Math.max((chartValues[index] / chartMax) * 100, 4)}%` }]} />
                </View>
                <Text style={styles.chartLabel} numberOfLines={1}>{card.label.replace('Active ', '')}</Text>
              </View>
            ))}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <Text style={styles.quickActionsSubtitle}>Manage your Taste Trail content</Text>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/admin/add-restaurant' as any)}>
            <View style={styles.quickActionIcon}><Ionicons name="restaurant-outline" size={20} color="#E8505B" /></View>
            <View style={styles.quickActionCopy}><Text style={styles.quickActionTitle}>Add restaurant</Text><Text style={styles.quickActionDetail}>Create a new restaurant listing</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#9AA4B2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/admin/restaurants' as any)}>
            <View style={styles.quickActionIcon}><Ionicons name="fast-food-outline" size={20} color="#E8505B" /></View>
            <View style={styles.quickActionCopy}><Text style={styles.quickActionTitle}>Add menu item</Text><Text style={styles.quickActionDetail}>Choose a restaurant to manage its menu</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#9AA4B2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/admin/users' as any)}>
            <View style={styles.quickActionIcon}><Ionicons name="people-outline" size={20} color="#E8505B" /></View>
            <View style={styles.quickActionCopy}><Text style={styles.quickActionTitle}>User dashboard</Text><Text style={styles.quickActionDetail}>View registered Taste Trail members</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#9AA4B2" />
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacing} />
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
    paddingBottom: 24,
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
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  profileButton: {
    position: 'relative',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 4,
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 25,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#E8505B',
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  segmentButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8505B',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 26,
    paddingVertical: 16,
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statCardCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 8,
    gap: 4,
  },
  statCardFooterText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  bottomSpacing: {
    height: 20,
  },
  chartCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chart: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 12,
  },
  chartColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  chartTrack: {
    width: '75%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBar: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#E8505B',
  },
  chartLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    color: '#777',
    marginTop: 8,
  },
  errorText: {
    color: '#C54852',
    fontSize: 12,
    marginTop: 14,
  },
  quickActionsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  quickActionsSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickActionCopy: {
    flex: 1,
  },
  quickActionTitle: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionDetail: {
    color: '#999',
    fontSize: 12,
    marginTop: 3,
  },
});
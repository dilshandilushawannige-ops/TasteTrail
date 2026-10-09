import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRestaurant, getRestaurantFromCache, type Restaurant } from '@/services/restaurantService';
import { subscribeToMenu } from '@/services/menuService';
import type { MenuCategory, MenuItem } from '@/types/menu';

const RED = '#E8505B';
const NAVY = '#1F2937';
const MUTED = '#7B8798';
const NONE = 'none';
const CARD_WIDTH = Dimensions.get('window').width - 40;

function displayValue(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === NONE) return '';
  return normalized
    .split(' ')
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function formatPrice(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-US')}`;
}

function categoryIcon(label: string): keyof typeof Ionicons.glyphMap {
  const normalized = label.toLowerCase();
  if (normalized === 'all') return 'grid-outline';
  if (normalized.includes('seafood') || normalized.includes('fish')) return 'fish-outline';
  if (normalized.includes('curry') || normalized.includes('spicy')) return 'flame-outline';
  if (normalized.includes('rice')) return 'restaurant-outline';
  if (normalized.includes('sweet') || normalized.includes('dessert')) return 'ice-cream-outline';
  if (normalized.includes('drink') || normalized.includes('beverage')) return 'cafe-outline';
  return 'leaf-outline';
}

function timestampValue(value: MenuItem['createdAt']) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

function getRestaurantStatus(restaurant: Restaurant | null) {
  if (!restaurant) return { label: 'Closed', color: '#D0444F' };
  if (restaurant.openAllDays) return { label: 'Open', color: '#1E7B45' };
  const now = new Date();
  const current = now.getHours() * 100 + now.getMinutes();
  const open = Number(restaurant.openTime.replace(':', ''));
  const close = Number(restaurant.closeTime.replace(':', ''));
  const isOpen = close < open ? current >= open || current <= close : current >= open && current <= close;
  return { label: isOpen ? 'Open' : 'Closed', color: isOpen ? '#1E7B45' : '#D0444F' };
}

export default function CustomerRestaurantMenu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(() => id ? getRestaurantFromCache(id) : null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransition] = useState(() => new Animated.Value(1));
  const [loadingRestaurant, setLoadingRestaurant] = useState(Boolean(id) && !restaurant);
  const [loadingMenu, setLoadingMenu] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(id ? null : 'Restaurant not found');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const cached = getRestaurantFromCache(id);
    void getRestaurant(id)
      .then((value) => {
        if (mounted) setRestaurant(value);
      })
      .catch((loadError) => {
        console.error('Error loading restaurant menu details:', loadError);
        if (mounted && !cached) setError('Failed to load restaurant');
      })
      .finally(() => {
        if (mounted) setLoadingRestaurant(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeToMenu(
      id,
      (nextItems) => {
        setItems(nextItems);
        setLoadingMenu(false);
      },
      (nextCategories) => {
        setCategories(nextCategories);
        setLoadingMenu(false);
      },
      (subscriptionError) => {
        console.error('Error loading customer menu:', subscriptionError);
        setError('Failed to load menu');
        setLoadingMenu(false);
      }
    );
  }, [id]);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const availableItems = useMemo(() => items.filter((item) => item.available === true), [items]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    availableItems.forEach((item) => counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1));
    return counts;
  }, [availableItems]);
  const availableCategories = useMemo(() => {
    const categoryIds = Array.from(categoryCounts.keys());
    return categoryIds
      .map((categoryId) => categoryById.get(categoryId) || {
        id: categoryId,
        name: categoryId || 'Menu',
        subtitle: '',
        sortOrder: Number.MAX_SAFE_INTEGER,
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [categoryById, categoryCounts]);

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = availableItems.filter((item) => {
      if (selectedCategory && item.categoryId !== selectedCategory) return false;
      const category = categoryById.get(item.categoryId);
      const haystack = [item.name, item.tagline, item.description, category?.name].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    });
    const grouped = new Map<string, MenuItem[]>();
    filtered.forEach((item) => {
      const list = grouped.get(item.categoryId) || [];
      list.push(item);
      grouped.set(item.categoryId, list);
    });
    return Array.from(grouped.entries())
      .map(([categoryId, sectionItems]) => ({
        categoryId,
        category: categoryById.get(categoryId) || {
          id: categoryId,
          name: categoryId || 'Menu',
          subtitle: '',
          sortOrder: Number.MAX_SAFE_INTEGER,
        },
        items: sectionItems.sort((a, b) => a.sortOrder - b.sortOrder || timestampValue(a.createdAt) - timestampValue(b.createdAt)),
      }))
      .sort((a, b) => (a.category?.sortOrder ?? 0) - (b.category?.sortOrder ?? 0) || (a.category?.name || a.categoryId).localeCompare(b.category?.name || b.categoryId));
  }, [availableItems, categoryById, search, selectedCategory]);

  const status = getRestaurantStatus(restaurant);
  const clearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
  };

  const selectCategory = (categoryId: string | null) => {
    const nextCategory = selectedCategory === categoryId ? null : categoryId;
    if (nextCategory === selectedCategory) return;

    Animated.timing(categoryTransition, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;

      setSelectedCategory(nextCategory);
      Animated.spring(categoryTransition, {
        toValue: 1,
        damping: 18,
        stiffness: 180,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    });
  };

  if (loadingRestaurant || (loadingMenu && !restaurant)) {
    return <LoadingState insetsTop={insets.top} insetsBottom={insets.bottom} />;
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.topContent}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/restaurant/[id]', params: { id } })}
              accessibilityRole="button"
              accessibilityLabel="Back to restaurant details"
            >
              <Feather name="arrow-left" size={22} color={NAVY} />
            </TouchableOpacity>
            <View style={styles.headerButton}><Ionicons name="person-circle" size={25} color={RED} /><View style={styles.onlineDot} /></View>
          </View>

          <Text style={styles.overline}>{restaurant?.category || restaurant?.tags?.[0] || 'Restaurant'}</Text>
          <Text style={styles.restaurantName} numberOfLines={2}>{restaurant?.name || 'Restaurant Menu'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={MUTED} />
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="tail">{[restaurant?.address, restaurant?.city].filter(Boolean).join(', ') || 'Location unavailable'}</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, status.label === 'Open' ? styles.openPill : styles.closedPill]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {restaurant?.reviewCount ? (
              <View style={styles.reviewSummary}><Ionicons name="star" size={14} color="#F5B83D" /><Text style={styles.metaText}>{`${restaurant.rating.toFixed(1)} (${restaurant.reviewCount})`}</Text></View>
            ) : <Text style={styles.metaText}>No reviews yet</Text>}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#7B8798" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search dishes, spices, ingredients..."
              placeholderTextColor="#8D99A9"
              numberOfLines={1}
              returnKeyType="search"
            />
            {!!search && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#9AA4B2" /></TouchableOpacity>}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <CategoryChip label="All" count={availableItems.length} selected={!selectedCategory} onPress={() => selectCategory(null)} />
            {availableCategories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.name}
                count={categoryCounts.get(category.id) || 0}
                selected={selectedCategory === category.id}
                onPress={() => selectCategory(category.id)}
              />
            ))}
          </ScrollView>
        </View>

        {error ? (
          <StateBlock icon="alert-circle-outline" title={error} action="Retry" onAction={() => setError(null)} />
        ) : loadingMenu ? (
          <LoadingCards />
        ) : availableItems.length === 0 ? (
          <StateBlock icon="restaurant-outline" title="Menu coming soon" subtitle="This restaurant hasn't added dishes yet." action="Go back" onAction={() => router.back()} />
        ) : sections.length === 0 ? (
          <StateBlock icon="search-outline" title="No dishes found" action="Clear filters" onAction={clearFilters} />
        ) : (
          <Animated.View
            style={{
              opacity: categoryTransition,
              transform: [{
                translateY: categoryTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              }],
            }}
          >
            {sections.map((section) => (
              <View key={section.categoryId} style={styles.section}>
                {section.category?.subtitle ? <Text style={styles.categorySubtitle}>{section.category.subtitle}</Text> : null}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.category?.name || section.categoryId || 'Menu'}</Text>
                  <Text style={styles.recipeCount}>{section.items.length} {section.items.length === 1 ? 'ITEM' : 'ITEMS'}</Text>
                </View>
                <View style={styles.carouselWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardCarousel}
                    decelerationRate="fast"
                    snapToInterval={CARD_WIDTH + 14}
                    nestedScrollEnabled
                    directionalLockEnabled
                  >
                    {section.items.map((item) => <MenuCard key={item.id} item={item} />)}
                  </ScrollView>
                  {section.items.length > 1 ? (
                    <View style={styles.scrollHint} pointerEvents="none">
                      <Ionicons name="chevron-forward" size={17} color="#FFF" />
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CategoryChip({ label, count, selected, onPress }: { label: string; count?: number; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.categoryChip, selected ? styles.categoryChipSelected : styles.categoryChipUnselected]} onPress={onPress} activeOpacity={0.9}>
    <Ionicons name={categoryIcon(label)} size={16} color={selected ? '#FFF' : NAVY} />
    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]} numberOfLines={1}>{label}</Text>
    {count !== undefined && <View style={[styles.countBadge, selected && styles.countBadgeSelected]}><Text style={[styles.countBadgeText, selected && styles.countBadgeTextSelected]}>{count}</Text></View>}
  </TouchableOpacity>;
}

function MenuCard({ item }: { item: MenuItem }) {
  const spice = displayValue(item.spiceLevel);
  const badge = displayValue(item.badge);
  const [expanded, setExpanded] = useState(false);
  const [descriptionLines, setDescriptionLines] = useState(0);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
      {item.photoUrl ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri: item.photoUrl }} style={styles.photo} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={styles.photoGradient} pointerEvents="none" />
          {badge ? <View style={styles.photoBadge}><Text style={styles.photoBadgeText}>{badge}</Text></View> : null}
          {spice ? <View style={styles.photoSpice}><Ionicons name="flame-outline" size={14} color="#FFF" /><Text style={styles.photoSpiceText}>{spice}</Text></View> : null}
        </View>
      ) : (
        badge ? <View style={styles.inlineBadge}><Text style={styles.inlineBadgeText}>{badge}</Text></View> : null
      )}
      <View style={styles.cardBody}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        {item.tagline ? <Text style={styles.tagline} numberOfLines={1}>{item.tagline}</Text> : null}
        {item.description ? <Text
          style={styles.description}
          numberOfLines={expanded ? undefined : 4}
          ellipsizeMode="tail"
          textBreakStrategy="simple"
          onTextLayout={(event) => setDescriptionLines(event.nativeEvent.lines.length)}
        >{item.description}</Text> : null}
        {item.description && descriptionLines > 4 ? <TouchableOpacity onPress={() => setExpanded((value) => !value)}><Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text></TouchableOpacity> : null}
        <View style={styles.cardDivider} />
        <View style={styles.cardBottomRow}>
          {!item.photoUrl && spice ? <View style={styles.bottomSpice}><Ionicons name="flame-outline" size={14} color="#B45309" /><Text style={styles.bottomSpiceText}>{spice}</Text></View> : <View />}
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StateBlock({ icon, title, subtitle, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; action: string; onAction: () => void }) {
  return <View style={styles.stateBlock}><View style={styles.stateIcon}><Ionicons name={icon} size={28} color={RED} /></View><Text style={styles.stateTitle}>{title}</Text>{subtitle ? <Text style={styles.stateSubtitle}>{subtitle}</Text> : null}<TouchableOpacity onPress={onAction}><Text style={styles.stateAction}>{action}</Text></TouchableOpacity></View>;
}

function LoadingState({ insetsTop, insetsBottom }: { insetsTop: number; insetsBottom: number }) {
  return <View style={[styles.screen, styles.loadingScreen, { paddingTop: insetsTop + 40, paddingBottom: insetsBottom }]}><StatusBar style="dark" /><View style={styles.loadingLineShort} /><View style={styles.loadingLineLong} /><LoadingCards /></View>;
}

function LoadingCards() {
  return <View style={styles.loadingCards}><View style={styles.skeletonPhoto} /><View style={styles.skeletonLine} /><View style={styles.skeletonSmall} /><View style={styles.skeletonPhoto} /><View style={styles.skeletonLine} /><ActivityIndicator color={RED} style={styles.loadingIndicator} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF7' },
  topContent: { backgroundColor: '#FFF', marginHorizontal: -20, paddingHorizontal: 20, paddingBottom: 14 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEF0F4', shadowColor: '#1F2937', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  onlineDot: { position: 'absolute', right: 1, bottom: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: '#36A269', borderWidth: 2, borderColor: '#FFF' },
  overline: { color: RED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  restaurantName: { color: NAVY, fontSize: 26, lineHeight: 32, fontWeight: 'bold', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  metaText: { color: MUTED, fontSize: 12, flexShrink: 1 },
  addressText: { color: MUTED, fontSize: 13, flex: 1, lineHeight: 17 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  openPill: { backgroundColor: '#E6F6EC' },
  closedPill: { backgroundColor: '#FDECEE' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  searchBox: { height: 44, borderRadius: 22, backgroundColor: '#F5F5F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 9 },
  searchInput: { flex: 1, minWidth: 0, color: NAVY, fontSize: 14 },
  chipsRow: { gap: 10, paddingTop: 12, paddingBottom: 4 },
  categoryChip: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  categoryChipSelected: { backgroundColor: RED },
  categoryChipUnselected: { backgroundColor: '#F5F5F5' },
  categoryChipText: { color: NAVY, fontSize: 12, fontWeight: 'normal' },
  categoryChipTextSelected: { color: '#FFF' },
  countBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  countBadgeSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countBadgeText: { color: NAVY, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  countBadgeTextSelected: { color: '#FFF' },
  section: { marginTop: 20, marginBottom: 6 },
  categorySubtitle: { alignSelf: 'flex-start', color: RED, backgroundColor: '#FCECEF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: NAVY, fontSize: 18, fontWeight: '600', flex: 1 },
  recipeCount: { color: RED, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginLeft: 12 },
  carouselWrap: { position: 'relative' },
  cardCarousel: { gap: 14, paddingRight: 20, paddingBottom: 4 },
  scrollHint: { position: 'absolute', right: 10, top: '50%', width: 32, height: 32, marginTop: -16, borderRadius: 16, backgroundColor: 'rgba(31,41,55,0.72)', alignItems: 'center', justifyContent: 'center' },
  card: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#EEF0F4', overflow: 'hidden', shadowColor: '#1F2937', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  photoWrap: { width: '100%', height: 132, position: 'relative' },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  photoBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  photoBadgeText: { color: RED, fontSize: 12, fontWeight: '600' },
  photoSpice: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(27,34,54,0.75)' },
  photoSpiceText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  inlineBadge: { alignSelf: 'flex-start', backgroundColor: '#FCECEF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12, marginHorizontal: 14 },
  inlineBadgeText: { color: RED, fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14 },
  itemName: { color: NAVY, fontSize: 17, lineHeight: 22, fontWeight: '600', width: '100%' },
  tagline: { color: '#6B7488', fontSize: 13, marginTop: 2, fontWeight: '400' },
  description: { color: '#586579', fontSize: 13.5, lineHeight: 19, marginTop: 6, width: '100%', flexShrink: 1 },
  readMore: { color: RED, fontSize: 12, fontWeight: '700', marginTop: 5 },
  cardDivider: { height: 1, backgroundColor: '#EEF0F4', marginTop: 12 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, minHeight: 30 },
  bottomSpice: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  bottomSpiceText: { color: '#B45309', fontSize: 12, fontWeight: '500' },
  price: { color: RED, fontSize: 17, fontWeight: '600', paddingVertical: 3 },
  stateBlock: { alignItems: 'center', paddingVertical: 58, paddingHorizontal: 24 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCECEF', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  stateTitle: { color: NAVY, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateSubtitle: { color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 7 },
  stateAction: { color: RED, fontWeight: '700', fontSize: 13, marginTop: 15 },
  loadingScreen: { paddingHorizontal: 20 },
  loadingLineShort: { width: 100, height: 12, borderRadius: 6, backgroundColor: '#E9E5E2', marginTop: 70 },
  loadingLineLong: { width: '70%', height: 26, borderRadius: 8, backgroundColor: '#E9E5E2', marginTop: 12, marginBottom: 24 },
  loadingCards: { gap: 12 },
  skeletonPhoto: { height: 170, borderRadius: 16, backgroundColor: '#E9E5E2' },
  skeletonLine: { width: '65%', height: 16, borderRadius: 8, backgroundColor: '#E9E5E2' },
  skeletonSmall: { width: '42%', height: 12, borderRadius: 6, backgroundColor: '#E9E5E2' },
  loadingIndicator: { marginTop: 8 },
});

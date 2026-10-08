import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { getRestaurant, type Restaurant } from '@/services/restaurantService';
import { deleteMenuItem, subscribeToMenu, updateMenuItem } from '@/services/menuService';
import type { MenuBadge, MenuCategory, MenuItem, SpiceLevel } from '@/types/menu';

const restaurantsRoute = '/admin/restaurants' as any;

function isNone(value: unknown) {
  return typeof value !== 'string' || value.trim() === '' || value.trim().toLowerCase() === 'none';
}

function displaySpice(value: unknown): SpiceLevel | null {
  if (isNone(value)) return null;
  const normalized = String(value).trim().toLowerCase();
  return ({ mild: 'Mild', medium: 'Medium', hot: 'Hot', 'extra hot': 'Extra Hot' } as Record<string, SpiceLevel>)[normalized] || String(value).trim() as SpiceLevel;
}

function displayBadge(value: unknown): MenuBadge | null {
  if (isNone(value)) return null;
  const normalized = String(value).trim().toLowerCase();
  return ({ new: 'New', 'must try': 'Must Try', 'vegan delight': 'Vegan Delight', "chef's special": "Chef's Special" } as Record<string, MenuBadge>)[normalized] || String(value).trim() as MenuBadge;
}

export default function ManageMenuScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsubscribeRestaurant = onSnapshot(
      doc(db, 'restaurants', id),
      (snapshot) => snapshot.exists() && setRestaurant({ id: snapshot.id, ...snapshot.data() } as Restaurant),
      (subscriptionError) => { setError(subscriptionError.message); setLoading(false); }
    );
    const unsubscribeMenu = subscribeToMenu(
      id,
      (nextItems) => { setItems(nextItems); setLoading(false); },
      setCategories,
      (subscriptionError) => { setError(subscriptionError.message); setLoading(false); }
    );
    return () => { unsubscribeRestaurant(); unsubscribeMenu(); };
  }, [id]);

  const usedCategoryCount = new Set(items.map((item) => item.categoryId).filter(Boolean)).size;
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const categoryName = categories.find((category) => category.id === item.categoryId)?.name || 'Uncategorized';
      return !query || [item.name, item.tagline, categoryName].some((value) => value.toLowerCase().includes(query));
    });
  }, [categories, items, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, MenuItem[]>();
    filteredItems.forEach((item) => {
      const category = categories.find((candidate) => candidate.id === item.categoryId)?.name || 'Uncategorized';
      groups.set(category, [...(groups.get(category) || []), item]);
    });
    return [...groups.entries()];
  }, [categories, filteredItems]);

  const openAdd = () => router.push({ pathname: '/admin/restaurant/[id]/menu-item', params: { id, mode: 'add', key: `new-${Date.now()}` } } as any);
  const categoryName = (categoryId: string) => categories.find((category) => category.id === categoryId)?.name || 'Uncategorized';
  const clearFilters = () => setSearchQuery('');
  const confirmDelete = (item: MenuItem) => Alert.alert('Delete this item?', item.name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await deleteMenuItem(item.restaurantId, item.id); }
      catch (deleteError) { Alert.alert('Error', deleteError instanceof Error ? deleteError.message : 'Failed to delete item'); }
    } },
  ]);
  const toggleAvailability = async (item: MenuItem, available: boolean) => {
    try { await updateMenuItem(item.restaurantId, item.id, { available }); }
    catch (updateError) { Alert.alert('Error', updateError instanceof Error ? updateError.message : 'Failed to update availability'); }
  };
  const retry = () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    getRestaurant(id).catch((retryError) => { setError(retryError instanceof Error ? retryError.message : 'Failed to load menu'); setLoading(false); });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(restaurantsRoute)} style={styles.backButton} accessibilityLabel="Back to restaurants">
            <Ionicons name="arrow-back" size={24} color="#1B2236" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}><Ionicons name="shield-checkmark" size={16} color="#E8505B" /><Text style={styles.adminText}>MENU MANAGER</Text></View>
            <Text style={styles.pageTitle}>Manage Menu</Text>
            <Text style={styles.restaurantSubtitle} numberOfLines={1}>{restaurant?.name || 'Restaurant menu'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/admin/profile' as any)} style={styles.profileButton} accessibilityLabel="Admin profile">
            <Ionicons name="person-circle" size={32} color="#E8505B" /><View style={styles.statusDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}><Ionicons name="search" size={20} color="#999" style={styles.searchIcon} /><TextInput style={styles.searchInput} placeholder="Search dishes, categories..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} /></View>
        </View>

        <View style={styles.managePanel}>
          <View style={styles.managePanelLeft}><View style={styles.managePanelIcon}><Ionicons name="restaurant" size={20} color="#E8505B" /></View><View style={styles.managePanelText}><Text style={styles.managePanelTitle}>Menu Items</Text><Text style={styles.managePanelSubtitle}>{items.length} {items.length === 1 ? 'dish' : 'dishes'} in {usedCategoryCount} {usedCategoryCount === 1 ? 'category' : 'categories'}</Text></View></View>
          <TouchableOpacity onPress={openAdd} style={styles.addButton}><Ionicons name="add" size={16} color="#FFF" /><Text style={styles.addButtonText}>Add{'\n'}Item</Text></TouchableOpacity>
        </View>

        {loading ? <View style={styles.list}>{[1, 2].map((key) => <SkeletonCard key={key} />)}</View>
          : error ? <State icon="alert-circle-outline" title="Failed to Load" detail={error} action="Retry" onPress={retry} />
          : filteredItems.length === 0 ? <State icon="restaurant-outline" title={items.length ? 'No dishes match your search' : 'No menu items yet'} detail={items.length ? 'Clear your search or filters to see more dishes.' : 'Tap + Add Item to get started'} action={items.length ? 'Clear filters' : 'Add Item'} linkAction={!!items.length} onPress={items.length ? clearFilters : openAdd} />
          : <View style={styles.list}>{groupedItems.map(([category, categoryItems]) => <View key={category} style={styles.group}><View style={styles.groupHeader}><Text style={styles.groupTitle}>{category}</Text><Text style={styles.groupCount}>{categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}</Text></View>{categoryItems.map((item) => <MenuCard key={item.id} item={item} category={categoryName(item.categoryId)} onDelete={() => confirmDelete(item)} onToggle={(value) => toggleAvailability(item, value)} onEdit={() => router.push({ pathname: '/admin/restaurant/[id]/menu-item', params: { id, itemId: item.id, mode: 'edit' } } as any)} />)}</View>)}</View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({ item, category, onDelete, onToggle, onEdit }: { item: MenuItem; category: string; onDelete: () => void; onToggle: (value: boolean) => void; onEdit: () => void }) {
  const spice = displaySpice(item.spiceLevel);
  const badge = displayBadge(item.badge);
  const badgeStyle = badge === "Chef's Special" ? styles.purplePill : badge === 'Must Try' ? styles.redPill : styles.greenPill;
  return <View style={styles.card}><View style={styles.imageContainer}>{item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.itemImage} /> : <View style={styles.placeholderImage}><Ionicons name="restaurant-outline" size={42} color="#C9B49E" /></View>}{badge && <Text style={[styles.imageBadge, badgeStyle]}>{badge}</Text>}</View><View style={styles.cardBody}><View style={styles.cardCategoryRow}><Text style={styles.categoryPill}>{category}</Text></View><View style={styles.nameRow}><Text style={styles.itemName} numberOfLines={1}>{item.name}</Text><Text style={styles.price}>Rs. {item.price.toLocaleString('en-US')}</Text></View>{item.tagline ? <View style={styles.taglineRow}><Ionicons name="pricetag-outline" size={13} color="#8993A1" /><Text style={styles.tagline} numberOfLines={1}>{item.tagline}</Text></View> : null}<View style={styles.metaRow}>{spice ? <View style={styles.spiceRow}><Ionicons name="flame-outline" size={13} color="#A56B2C" /><Text style={styles.metaText}>{spice}</Text></View> : <View />}</View><View style={styles.cardFooter}><View style={styles.footerAvailability}><Switch value={item.available} onValueChange={onToggle} trackColor={{ false: '#D7DCE4', true: '#F2A0A7' }} thumbColor={item.available ? '#E8505B' : '#FFF'} /></View><View style={styles.actions}><TouchableOpacity style={styles.deleteButton} onPress={onDelete}><Ionicons name="trash-outline" size={17} color="#E8505B" /></TouchableOpacity><TouchableOpacity style={styles.editButton} onPress={onEdit}><Text style={styles.editText}>Edit</Text></TouchableOpacity></View></View></View></View>;
}

function SkeletonCard() {
  return <View style={styles.skeletonCard}><View style={styles.skeletonImage} /><View style={styles.skeletonLineWide} /><View style={styles.skeletonLineShort} /></View>;
}

function State({ icon, title, detail, action, linkAction, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; action: string; linkAction?: boolean; onPress: () => void }) {
  return <View style={styles.state}><View style={styles.stateIcon}><Ionicons name={icon} size={42} color="#D1BBA5" /></View><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateText}>{detail}</Text><TouchableOpacity style={linkAction ? styles.clearLink : styles.stateButton} onPress={onPress}><Text style={linkAction ? styles.clearLinkText : styles.stateButtonText}>{action}</Text></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' }, scrollView: { flex: 1 }, content: { paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }, backButton: { marginTop: 4, marginRight: 12 }, headerLeft: { flex: 1 }, adminBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, adminText: { fontSize: 12, fontWeight: '600', color: '#E8505B', marginLeft: 6, letterSpacing: 0.5 }, pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' }, restaurantSubtitle: { color: '#7B8493', fontSize: 13, marginTop: 3 }, profileButton: { position: 'relative', marginLeft: 10 }, statusDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FAFAF7' },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 }, searchInputContainer: { flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 26, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E5E5' }, searchIcon: { marginRight: 10 }, searchInput: { flex: 1, fontSize: 14, color: '#333' }, filterButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8505B', justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 12 }, filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E5E5', gap: 8 }, filterChipActive: { backgroundColor: '#E8505B', borderColor: '#E8505B' }, filterChipText: { fontSize: 14, fontWeight: '500', color: '#666' }, filterChipTextActive: { color: '#FFF' }, countBadge: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' }, countBadgeActive: { backgroundColor: 'rgba(255,255,255,.2)' }, countBadgeText: { fontSize: 12, fontWeight: '600', color: '#666' }, countBadgeTextActive: { color: '#FFF' },
  managePanel: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 24, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: .1, shadowRadius: 4, elevation: 3, minHeight: 80 }, managePanelLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 }, managePanelIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', marginRight: 12 }, managePanelText: { flex: 1 }, managePanelTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 }, managePanelSubtitle: { fontSize: 12, color: '#666' }, addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8505B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minWidth: 80, justifyContent: 'center' }, addButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 14, marginLeft: 4 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 22, fontWeight: '600', color: '#333' }, sectionCount: { color: '#666', fontSize: 13 }, list: { paddingHorizontal: 20 }, group: { marginBottom: 4 }, groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, groupTitle: { color: '#333', fontSize: 16, fontWeight: '700' }, groupCount: { color: '#666', fontSize: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: .1, shadowRadius: 4, elevation: 3 }, imageContainer: { height: 138, position: 'relative' }, itemImage: { width: '100%', height: '100%', resizeMode: 'cover' }, placeholderImage: { width: '100%', height: '100%', backgroundColor: '#F5EFEA', alignItems: 'center', justifyContent: 'center' }, imageBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: '700' }, cardBody: { padding: 8 }, cardCategoryRow: { marginBottom: 4 }, categoryPill: { alignSelf: 'flex-start', color: '#C43E4A', backgroundColor: '#FFF0F1', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: '600' }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, itemName: { flex: 1, color: '#1B2236', fontSize: 14, fontWeight: '700' }, price: { color: '#E8505B', fontSize: 12, fontWeight: '700' }, taglineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }, tagline: { flex: 1, color: '#7B8493', fontSize: 10 }, metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }, spiceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, metaText: { color: '#7B8493', fontSize: 10 }, cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF0F4', marginTop: 6, paddingTop: 6 }, footerAvailability: { flexDirection: 'row', alignItems: 'center' }, actions: { flexDirection: 'row', alignItems: 'center', gap: 5 }, deleteButton: { padding: 4 }, editButton: { backgroundColor: '#F1F2F4', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }, editText: { color: '#68707D', fontSize: 10, fontWeight: '600' }, badgePill: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, fontWeight: '700' }, redPill: { color: '#C43E4A', backgroundColor: '#FFF0F1' }, greenPill: { color: '#28744A', backgroundColor: '#E7F6EC' }, purplePill: { color: '#7250A5', backgroundColor: '#F0EAFE' },
  skeletonCard: { height: 310, borderRadius: 20, backgroundColor: '#ECEEF2', marginBottom: 16, overflow: 'hidden' }, skeletonImage: { height: 190, backgroundColor: '#E1E4E9' }, skeletonLineWide: { width: '55%', height: 16, borderRadius: 8, backgroundColor: '#E1E4E9', margin: 16 }, skeletonLineShort: { width: '35%', height: 12, borderRadius: 6, backgroundColor: '#E1E4E9', marginHorizontal: 16 },
  state: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }, stateIcon: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#F5EFEA', alignItems: 'center', justifyContent: 'center' }, stateTitle: { color: '#333', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }, stateText: { color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 }, stateButton: { backgroundColor: '#E8505B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 }, stateButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' }, clearLink: { marginTop: 16, padding: 6 }, clearLinkText: { color: '#E8505B', fontSize: 14, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.35)' }, filterSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '82%' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, sheetTitle: { color: '#333', fontSize: 20, fontWeight: '700' }, sheetLabel: { color: '#333', fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 10 }, sheetOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, sheetOption: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }, sheetOptionActive: { backgroundColor: '#FFF0F1', borderColor: '#E8505B' }, sheetOptionText: { color: '#666', fontSize: 13 }, sheetOptionTextActive: { color: '#E8505B', fontWeight: '600' }, sortOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 8 }, sortText: { color: '#555', fontSize: 14 }, applyButton: { alignItems: 'center', backgroundColor: '#E8505B', borderRadius: 9, paddingVertical: 13, marginTop: 16 }, applyText: { color: '#FFF', fontWeight: '700' },
});

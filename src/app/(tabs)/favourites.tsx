import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { SavedRecipe } from '@/services/savedRecipes';
import { useSavedRestaurants } from '@/hooks/useSavedRestaurants';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import type { Restaurant } from '@/services/restaurantService';

type Tab = 'recipes' | 'restaurants';
type Sort = 'recent' | 'name';
let lastTab: Tab = 'recipes';

function restaurantStatus(restaurant: Restaurant) {
  if (restaurant.openAllDays) return { label: 'Open', color: '#1E7B45', background: '#E6F6EC' };
  const now = new Date();
  const current = now.getHours() * 100 + now.getMinutes();
  const open = Number(restaurant.openTime.replace(':', ''));
  const close = Number(restaurant.closeTime.replace(':', ''));
  const openNow = close < open ? current >= open || current <= close : current >= open && current <= close;
  return openNow
    ? { label: 'Open', color: '#1E7B45', background: '#E6F6EC' }
    : { label: 'Closed', color: '#C54852', background: '#FDECEE' };
}

export default function FavouritesScreen() {
  const [tab, setTab] = useState<Tab>(lastTab);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [searchVisible, setSearchVisible] = useState(false);
  const [menu, setMenu] = useState<{ type: Tab; id: string; title: string } | null>(null);
  const { savedRestaurants, loading: loadingRestaurants, toggle } = useSavedRestaurants();
  const { savedRecipes: recipes, loading: loadingRecipes, error: recipeError, retry: retryRecipes, toggle: toggleRecipeSaved } = useSavedRecipes();

  const selectTab = (next: Tab) => {
    lastTab = next;
    setTab(next);
    setSearch('');
  };

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes
      .filter((recipe) => !query || `${recipe.name} ${recipe.creator} ${recipe.region}`.toLowerCase().includes(query))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : 0);
  }, [recipes, search, sort]);

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return savedRestaurants
      .filter((restaurant) => !query || `${restaurant.name} ${restaurant.category} ${restaurant.address} ${restaurant.city}`.toLowerCase().includes(query))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : 0);
  }, [savedRestaurants, search, sort]);

  const removeSelected = () => {
    if (!menu) return;
    Alert.alert('Remove from favourites?', 'This saved item will be removed.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setMenu(null) },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const selected = menu;
          setMenu(null);
          if (selected.type === 'restaurants') {
            await toggle(selected.id);
          } else {
            await toggleRecipeSaved(selected.id);
          }
        },
      },
    ]);
  };

  const isLoading = tab === 'recipes' ? loadingRecipes : loadingRestaurants;
  const data = tab === 'recipes' ? filteredRecipes : filteredRestaurants;

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        {searchVisible ? <TextInput autoFocus style={styles.searchInput} placeholder="Search saved items..." placeholderTextColor="#9AA4B2" value={search} onChangeText={setSearch} /> : <View style={styles.headingCopy}><Text style={styles.title}>Saved recipes and restaurants</Text><Text style={styles.subtitle}>Your personal culinary treasury</Text></View>}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => { setSearchVisible((value) => !value); if (searchVisible) setSearch(''); }}><Ionicons name={searchVisible ? 'close' : 'search-outline'} size={21} color="#1F2937" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setSort(sort === 'recent' ? 'name' : 'recent')}><Ionicons name="options-outline" size={21} color="#1F2937" /></TouchableOpacity>
        </View>
      </View>
      <View style={styles.segmented}>
        <TouchableOpacity style={[styles.segment, tab === 'recipes' && styles.segmentSelected]} onPress={() => selectTab('recipes')}>
          <Ionicons name="book-outline" size={16} color={tab === 'recipes' ? '#FFF' : '#506078'} />
          <Text style={[styles.segmentText, tab === 'recipes' && styles.segmentTextSelected]}>Recipes ({recipes.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segment, tab === 'restaurants' && styles.segmentSelected]} onPress={() => selectTab('restaurants')}>
          <Ionicons name="restaurant-outline" size={16} color={tab === 'restaurants' ? '#FFF' : '#506078'} />
          <Text style={[styles.segmentText, tab === 'restaurants' && styles.segmentTextSelected]}>Restaurants ({savedRestaurants.length})</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? <SkeletonList /> : recipeError && tab === 'recipes' ? <ErrorState onRetry={retryRecipes} /> : (
        <FlatList<any>
          data={data}
          keyExtractor={(item) => tab === 'recipes' ? (item as SavedRecipe).id : (item as Restaurant).id}
          renderItem={({ item }) => tab === 'recipes'
            ? <RecipeCard recipe={item as SavedRecipe} onMenu={() => setMenu({ type: 'recipes', id: (item as SavedRecipe).id, title: (item as SavedRecipe).name })} />
            : <RestaurantCard restaurant={item as Restaurant} onMenu={() => setMenu({ type: 'restaurants', id: (item as Restaurant).id, title: (item as Restaurant).name })} onOpen={() => router.push({ pathname: '/restaurant/[id]', params: { id: (item as Restaurant).id } })} />}
          contentContainerStyle={data.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor="#E8505B" />}
          ListEmptyComponent={<EmptyState tab={tab} filtered={Boolean(search)} onDiscover={() => router.push('/(tabs)/map')} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Modal visible={Boolean(menu)} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle} numberOfLines={1}>{menu?.title}</Text>
            <TouchableOpacity style={styles.menuOption} onPress={removeSelected}><Ionicons name="trash-outline" size={20} color="#E8505B" /><Text style={styles.removeOption}>Remove from saved</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setMenu(null); if (menu?.type === 'restaurants') router.push({ pathname: '/restaurant/[id]', params: { id: menu.id } }); else router.push({ pathname: '/cooking', params: { recipeId: menu?.id } }); }}><Ionicons name="open-outline" size={20} color="#506078" /><Text style={styles.menuOptionText}>View details</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function RecipeCard({ recipe, onMenu }: { recipe: SavedRecipe; onMenu: () => void }) {
  return <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => router.push({ pathname: '/cooking', params: { recipeId: recipe.id } })}>
    <View style={styles.imageWrap}><Image source={recipe.image ? { uri: recipe.image } : undefined} style={styles.cardImage} /><TouchableOpacity style={styles.savedBookmark} onPress={onMenu}><Ionicons name="bookmark" size={17} color="#FFF" /></TouchableOpacity></View>
    <View style={styles.cardBody}>
      <View style={styles.cardTitleRow}><Text style={styles.cardTitle} numberOfLines={2}>{recipe.name}</Text><TouchableOpacity style={styles.moreButton} onPress={onMenu}><Ionicons name="ellipsis-vertical" size={20} color="#8A95A5" /></TouchableOpacity></View>
      <View style={styles.authorRow}><View style={styles.initialAvatar}><Text style={styles.initialText}>{recipe.creator.slice(0, 2).toUpperCase()}</Text></View><Text style={styles.authorText} numberOfLines={1}>By {recipe.creator}{recipe.region ? ` • ${recipe.region}` : ''}</Text></View>
    </View>
  </TouchableOpacity>;
}

function RestaurantCard({ restaurant, onMenu, onOpen }: { restaurant: Restaurant; onMenu: () => void; onOpen: () => void }) {
  const status = restaurantStatus(restaurant);
  return <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onOpen}>
    <View style={styles.imageWrap}>{restaurant.coverPhotoUrl ? <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.cardImage} /> : <View style={[styles.cardImage, styles.placeholderImage]}><Ionicons name="restaurant-outline" size={42} color="#E8505B" /></View>}<TouchableOpacity style={styles.savedBookmark} onPress={onMenu}><Ionicons name="bookmark" size={17} color="#FFF" /></TouchableOpacity></View>
    <View style={styles.cardBody}>
      <View style={styles.cardTitleRow}><Text style={styles.cardTitle} numberOfLines={2}>{restaurant.name}</Text><TouchableOpacity style={styles.moreButton} onPress={onMenu}><Ionicons name="ellipsis-vertical" size={20} color="#8A95A5" /></TouchableOpacity></View>
      <View style={styles.restaurantMeta}><Text style={styles.categoryPill}>{restaurant.category}</Text><View style={[styles.statusPill, { backgroundColor: status.background }]}><View style={[styles.statusDot, { backgroundColor: status.color }]} /><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View></View>
      <View style={styles.addressRow}><Ionicons name="location-outline" size={14} color="#7B8798" /><Text style={styles.address} numberOfLines={1}>{[restaurant.address, restaurant.city].filter(Boolean).join(', ') || 'Location unavailable'}</Text></View>
    </View>
  </TouchableOpacity>;
}

function SkeletonList() {
  return <View style={styles.list}>{[1, 2].map((item) => <View key={item} style={styles.skeleton}><View style={styles.skeletonImage} /><View style={styles.skeletonLine} /><View style={styles.skeletonSmall} /></View>)}</View>;
}

function EmptyState({ tab, filtered, onDiscover }: { tab: Tab; filtered: boolean; onDiscover: () => void }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name={filtered ? 'search-outline' : 'bookmark-outline'} size={30} color="#E8505B" /></View><Text style={styles.emptyTitle}>{filtered ? 'No saved items found' : tab === 'recipes' ? 'No saved recipes yet' : 'No saved restaurants yet'}</Text><Text style={styles.emptyHint}>{filtered ? 'Try a different search.' : tab === 'recipes' ? 'Tap the bookmark on any recipe to save it' : 'Tap the bookmark on a restaurant to save it'}</Text>{!filtered && tab === 'restaurants' ? <TouchableOpacity style={styles.discoverButton} onPress={onDiscover}><Text style={styles.discoverText}>Discover restaurants</Text></TouchableOpacity> : null}</View>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="alert-circle-outline" size={30} color="#E8505B" /></View><Text style={styles.emptyTitle}>Unable to load saved recipes</Text><Text style={styles.emptyHint}>Please check your connection and try again.</Text><TouchableOpacity style={styles.discoverButton} onPress={onRetry}><Text style={styles.discoverText}>Retry</Text></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  pageHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingCopy: { flex: 1 }, title: { color: '#1A1A1A', fontSize: 26, lineHeight: 32, fontWeight: 'bold' }, subtitle: { color: '#7B8798', fontSize: 14, marginTop: 3 }, searchInput: { flex: 1, height: 44, color: '#1F2937', fontSize: 15, backgroundColor: '#FFF', borderRadius: 22, paddingHorizontal: 15 },
  headerActions: { flexDirection: 'row', gap: 10 }, headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEF0F4', alignItems: 'center', justifyContent: 'center' },
  segmented: { marginHorizontal: 20, padding: 4, borderRadius: 24, backgroundColor: '#E8E7E7', flexDirection: 'row', marginBottom: 14 }, segment: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, segmentSelected: { backgroundColor: '#E8505B' }, segmentText: { color: '#506078', fontSize: 13, fontWeight: '600' }, segmentTextSelected: { color: '#FFF' },
  list: { paddingHorizontal: 20, paddingBottom: 110 }, emptyList: { flexGrow: 1 },
  card: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 14, overflow: 'hidden', shadowColor: '#1F2937', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  imageWrap: { position: 'relative' }, cardImage: { width: '100%', height: 150, resizeMode: 'cover' }, savedBookmark: { position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8505B', alignItems: 'center', justifyContent: 'center' }, placeholderImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCECEF' }, cardBody: { padding: 12 }, cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start' }, cardTitle: { color: '#1F2937', fontSize: 16, lineHeight: 21, fontWeight: '600', flex: 1 }, moreButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }, initialAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FCECEF', alignItems: 'center', justifyContent: 'center' }, initialText: { color: '#E8505B', fontSize: 9, fontWeight: '700' }, authorText: { flex: 1, color: '#7B8798', fontSize: 12 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }, categoryPill: { color: '#E8505B', backgroundColor: '#FCECEF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '600' }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, statusDot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontSize: 11, fontWeight: '600' }, addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 }, address: { color: '#7B8798', fontSize: 13, flex: 1 },
  skeleton: { backgroundColor: '#FFF', borderRadius: 18, paddingBottom: 16, marginBottom: 14, overflow: 'hidden' }, skeletonImage: { height: 150, backgroundColor: '#E9E5E2' }, skeletonLine: { width: '65%', height: 16, borderRadius: 8, backgroundColor: '#E9E5E2', margin: 14 }, skeletonSmall: { width: '42%', height: 12, borderRadius: 6, backgroundColor: '#E9E5E2', marginHorizontal: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 70 }, emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FCECEF', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700', marginTop: 14 }, emptyHint: { color: '#7B8798', fontSize: 13, textAlign: 'center', marginTop: 7 }, discoverButton: { backgroundColor: '#E8505B', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 }, discoverText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.22)', justifyContent: 'flex-end' }, menuSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32 }, menuTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700', marginBottom: 8 }, menuOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 }, removeOption: { color: '#E8505B', fontSize: 15, fontWeight: '600' }, menuOptionText: { color: '#506078', fontSize: 15, fontWeight: '600' },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type RecipeType = 'video' | 'recipe';

type SavedRecipe = {
  id: string;
  name: string;
  creator: string;
  region: string;
  type: RecipeType;
  duration: string;
  image: string;
};

// Demo content only.
// Replace these illustrative photos with your own recipe images later.
const SAMPLE_RECIPES: SavedRecipe[] = [
  {
    id: 'demo-1',
    name: 'Traditional Fish Ambul Thiyal',
    creator: 'Amma’s Kitchen',
    region: 'Southern Province',
    type: 'video',
    duration: '25:00',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop',
  },
  {
    id: 'demo-2',
    name: 'Creamy Village Parippu',
    creator: 'Village Kitchen',
    region: 'Central Province',
    type: 'video',
    duration: '18:20',
    image:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=900&auto=format&fit=crop',
  },
  {
    id: 'demo-3',
    name: 'Homemade Coconut Roti',
    creator: 'Nimali’s Kitchen',
    region: 'Western Province',
    type: 'recipe',
    duration: '30 min',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&auto=format&fit=crop',
  },
  {
    id: 'demo-4',
    name: 'Traditional Sri Lankan Chicken Curry',
    creator: 'Heritage Kitchen',
    region: 'Southern Province',
    type: 'recipe',
    duration: '45 min',
    image:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=900&auto=format&fit=crop',
  },
];

const COLORS = {
  primary: '#E8505B',
  background: '#FAFAF7',
  white: '#FFFFFF',
  text: '#202536',
  muted: '#767B87',
  border: '#E8E8E3',
};

// Separate component so each image can handle its own loading error.
function RecipePhoto({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.photo, styles.photoFallback]}>
        <Ionicons
          name="restaurant-outline"
          size={40}
          color={COLORS.muted}
        />
        <Text style={styles.mutedText}>Recipe photo unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.photo}
      resizeMode="cover"
      accessibilityLabel="Illustrative food photo"
      onError={() => setFailed(true)}
    />
  );
}

export default function FavouritesScreen() {
  const [recipes, setRecipes] =
    useState<SavedRecipe[]>(SAMPLE_RECIPES);

  const [activeTab, setActiveTab] =
    useState<RecipeType>('video');

  const [search, setSearch] = useState('');
  const [sortByName, setSortByName] = useState(false);

  const [lastRemoved, setLastRemoved] = useState<{
    recipe: SavedRecipe;
    index: number;
  } | null>(null);

  const videoCount = recipes.filter(
    (recipe) => recipe.type === 'video'
  ).length;

  const recipeCount = recipes.filter(
    (recipe) => recipe.type === 'recipe'
  ).length;

  const query = search.trim().toLowerCase();

  // Search only inside the currently selected tab.
  const visibleRecipes = recipes.filter((recipe) => {
    const matchesTab = recipe.type === activeTab;

    const searchableText =
      `${recipe.name} ${recipe.creator} ${recipe.region}`
        .toLowerCase();

    return matchesTab && searchableText.includes(query);
  });

  if (sortByName) {
    visibleRecipes.sort((a, b) => a.name.localeCompare(b.name));
  }

  function removeRecipe(recipe: SavedRecipe) {
    const index = recipes.findIndex(
      (item) => item.id === recipe.id
    );

    setLastRemoved({ recipe, index });

    setRecipes((current) =>
      current.filter((item) => item.id !== recipe.id)
    );
  }

  function undoRemove() {
    if (!lastRemoved) return;

    const { recipe, index } = lastRemoved;

    setRecipes((current) => {
      if (current.some((item) => item.id === recipe.id)) {
        return current;
      }

      const restored = [...current];
      restored.splice(Math.min(index, restored.length), 0, recipe);
      return restored;
    });

    setLastRemoved(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <Ionicons
              name="restaurant-outline"
              size={21}
              color={COLORS.primary}
            />
            <Text style={styles.brandText}>Taste Trail</Text>
          </View>

          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>LAYOUT DEMO</Text>
          </View>
        </View>

        {/* The existing navigator already displays "Saved Recipes". */}
        <Text style={styles.subtitle}>
          Your personal culinary treasury
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={20}
              color={COLORS.muted}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search your saved recipes"
              placeholderTextColor={COLORS.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search saved recipes"
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.muted}
                />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setSortByName((current) => !current)}
            style={[
              styles.sortButton,
              sortByName && styles.sortButtonActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sort recipes alphabetically"
            accessibilityState={{ selected: sortByName }}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={22}
              color={
                sortByName ? COLORS.white : COLORS.primary
              }
            />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab('video')}
            style={[
              styles.tab,
              activeTab === 'video' && styles.activeTab,
            ]}
            accessibilityRole="tab"
            accessibilityState={{
              selected: activeTab === 'video',
            }}
          >
            <Ionicons
              name="play-circle-outline"
              size={19}
              color={
                activeTab === 'video'
                  ? COLORS.white
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.tabText,
                activeTab === 'video' && styles.activeTabText,
              ]}
            >
              Video ({videoCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('recipe')}
            style={[
              styles.tab,
              activeTab === 'recipe' && styles.activeTab,
            ]}
            accessibilityRole="tab"
            accessibilityState={{
              selected: activeTab === 'recipe',
            }}
          >
            <Ionicons
              name="book-outline"
              size={18}
              color={
                activeTab === 'recipe'
                  ? COLORS.white
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.tabText,
                activeTab === 'recipe' && styles.activeTabText,
              ]}
            >
              Recipe ({recipeCount})
            </Text>
          </Pressable>
        </View>

        <View style={styles.resultsRow}>
          <Text style={styles.mutedText}>
            {visibleRecipes.length}{' '}
            {visibleRecipes.length === 1 ? 'item' : 'items'}
          </Text>

          <Text style={styles.mutedText}>
            {sortByName ? 'Name: A–Z' : 'Saved order'}
          </Text>
        </View>
      </View>

      <FlatList
        data={visibleRecipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.photoContainer}>
              <RecipePhoto uri={item.image} />

              <View style={styles.typeBadge}>
                <Ionicons
                  name={
                    item.type === 'video'
                      ? 'videocam-outline'
                      : 'book-outline'
                  }
                  size={14}
                  color={COLORS.text}
                />
                <Text style={styles.typeText}>
                  {item.type === 'video' ? 'Video' : 'Recipe'}
                </Text>
              </View>

              <Pressable
                onPress={() => removeRecipe(item)}
                style={({ pressed }) => [
                  styles.bookmarkButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name} from saved recipes`}
              >
                <Ionicons
                  name="bookmark"
                  size={21}
                  color={COLORS.primary}
                />
              </Pressable>

              {/* Decorative preview indicator; playback comes later. */}
              {item.type === 'video' && (
                <View
                  pointerEvents="none"
                  style={styles.playOverlay}
                >
                  <View style={styles.playCircle}>
                    <Ionicons
                      name="play"
                      size={25}
                      color={COLORS.text}
                    />
                  </View>
                </View>
              )}

              <View style={styles.durationBadge}>
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={COLORS.white}
                />
                <Text style={styles.durationText}>
                  {item.duration}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.recipeName}>
                {item.name}
              </Text>

              <View style={styles.creatorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.creator.charAt(0)}
                  </Text>
                </View>

                <View style={styles.creatorDetails}>
                  <Text style={styles.creatorName}>
                    By {item.creator}
                  </Text>
                  <Text style={styles.region}>
                    {item.region}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  query ? 'search-outline' : 'bookmark-outline'
                }
                size={34}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {query
                ? 'No matching recipes'
                : 'Nothing saved here yet'}
            </Text>

            <Text style={styles.emptyDescription}>
              {query
                ? 'Try another name, creator, or region.'
                : 'Your saved items will appear in this tab.'}
            </Text>

            {query.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                style={styles.emptyAction}
                accessibilityRole="button"
              >
                <Text style={styles.emptyActionText}>
                  Clear search
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListFooterComponent={
          <Text style={styles.demoFooter}>
            Sample content · Video playback and Firebase
            saving will be connected later.
          </Text>
        }
      />

      {lastRemoved && (
        <View style={styles.undoBar}>
          <Text
            style={styles.undoMessage}
            accessibilityLiveRegion="polite"
          >
            Removed from your saved list
          </Text>

          <Pressable
            onPress={undoRemove}
            style={styles.undoButton}
            accessibilityRole="button"
            accessibilityLabel="Undo removing the last recipe"
          >
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  demoBadge: {
    backgroundColor: '#F1F1EC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  demoText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
    marginTop: 12,
    marginBottom: 18,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 9,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  clearButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EEEDE9',
    padding: 4,
    borderRadius: 25,
    marginTop: 18,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 22,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
    marginBottom: 12,
  },
  mutedText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 18,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    aspectRatio: 1.65,
    backgroundColor: '#E9E6DE',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  bookmarkButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  playOverlay: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  alignItems: 'center',
  justifyContent: 'center',
},
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  durationBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  durationText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    padding: 14,
  },
  recipeName: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDE9EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    color: '#565D69',
    fontSize: 12,
    fontWeight: '500',
  },
  region: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FDE9EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
  },
  emptyActionText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  demoFooter: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginVertical: 10,
  },
  undoBar: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingLeft: 14,
    paddingRight: 5,
    backgroundColor: COLORS.text,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoMessage: {
    flex: 1,
    color: COLORS.white,
    fontSize: 13,
    paddingVertical: 12,
  },
  undoButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  undoText: {
    color: '#FFB4BB',
    fontSize: 14,
    fontWeight: '700',
  },
});
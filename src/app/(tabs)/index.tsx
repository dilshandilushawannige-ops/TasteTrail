import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { RatingSummary } from '@/types/review';
import { subscribeToRecipeRatingSummaries } from '@/services/reviewService';

interface Recipe {
  id: string;
  category?: string;
  name: string;
  ingredients: string;
  steps: string[];
  imageUrl?: string;
  createdByName: string;
  createdBy?: string;
  createdAt: any;
  likes: number;
  saves: number;
}

function timestampMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' ? value : 0;
}

interface Creator {
  uid: string;
  name: string;
  email: string;
}

const categories = [
  { id: 'all', name: 'All' },
  { id: 'curries', name: 'Curries & Sambols' },
  { id: 'hoppers', name: 'Hoppers & Roti' },
  { id: 'coastal', name: 'Coastal Seafood' },
  { id: 'heritage', name: 'Heritage Specialties' },
  { id: 'sweets', name: 'Village Sweets' },
];

export default function HomeScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState('');
  const [recipeRatings, setRecipeRatings] = useState<Record<string, RatingSummary>>({});
  const [rankingTime] = useState(() => Date.now());
  const { isSaved, toggle } = useSavedRecipes();

  const toggleRecipe = async (recipeId: string) => {
    const wasSaved = isSaved(recipeId);
    const updated = await toggle(recipeId);
    if (updated) {
      setSaveToast(wasSaved ? 'Removed from favourites' : 'Saved to favourites');
      setTimeout(() => setSaveToast(''), 1600);
    }
  };

  const fetchRecipes = async () => {
    try {
      const recipesQuery = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(recipesQuery);

      const fetchedRecipes: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRecipes.push({ id: doc.id, ...doc.data() } as Recipe);
      });

      setRecipes(fetchedRecipes);

      // Get unique creators
      const uniqueCreators = new Map<string, Creator>();
      fetchedRecipes.forEach((recipe) => {
        if (recipe.createdBy && !uniqueCreators.has(recipe.createdBy)) {
          uniqueCreators.set(recipe.createdBy, {
            uid: recipe.createdBy,
            name: recipe.createdByName,
            email: '',
          });
        }
      });
      setCreators(Array.from(uniqueCreators.values()).slice(0, 5));

    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial recipe loading synchronizes the screen with Firestore.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipes();
  }, []);

  useEffect(() => {
    return subscribeToRecipeRatingSummaries(setRecipeRatings, error => {
      console.error('Error loading recipe ratings:', error);
    });
  }, []);

  const ratingFor = (recipe: Recipe) => recipeRatings[recipe.id];

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes();
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      recipe.category === categories.find((c) => c.id === selectedCategory)?.name;
    const matchesSearch =
      searchQuery === '' ||
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const trendingRecipe = (() => {
    const ranked = recipes.map(recipe => {
      const summary = ratingFor(recipe);
      const reviewCount = summary?.totalReviews || 0;
      const averageRating = summary?.averageRating || 0;
      const saves = Number(recipe.saves) || 0;
      const cooks = Number(recipe.likes) || 0;
      const ageInDays = Math.max(0, (rankingTime - timestampMillis(recipe.createdAt)) / 86400000);
      const freshnessBonus = Math.max(0, 10 - ageInDays / 3);
      const activity = saves + cooks + reviewCount;
      const score = saves * 3 + cooks * 2 + reviewCount * 4 + averageRating * 5 + freshnessBonus;
      return { recipe, activity, score };
    });
    const activeRecipes = ranked.filter(item => item.activity > 0);
    return (activeRecipes.length ? activeRecipes : ranked)
      .sort((a, b) => b.score - a.score)[0]?.recipe;
  })();
  const recentRecipes = filteredRecipes.slice(0, 6);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E8505B" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E8505B']} />
      }
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Find best recipes for{'\n'}cooking</Text>
        <Text style={styles.heroSubtitle}>Ayubowan! Discover Sri Lankan culinary heritage</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trending Now */}
      {trendingRecipe && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Trending now</Text>
              <Ionicons name="flame" size={18} color="#E8505B" />
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.trendingCard}
            onPress={() => router.push({ pathname: '/cooking', params: { recipeId: trendingRecipe.id } })}
          >
            {trendingRecipe.imageUrl ? (
              <Image source={{ uri: trendingRecipe.imageUrl }} style={styles.trendingImage} />
            ) : (
              <View style={[styles.trendingImage, styles.placeholderImage]}>
                <Ionicons name="restaurant" size={48} color="#E8505B" />
              </View>
            )}

            <View style={styles.trendingOverlay}>
              <View style={styles.trendingBadges}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{ratingFor(trendingRecipe)?.totalReviews ? ratingFor(trendingRecipe)!.averageRating.toFixed(1) : 'New'}</Text>
                  {!!ratingFor(trendingRecipe)?.totalReviews && <Text style={styles.ratingCount}>({ratingFor(trendingRecipe)!.totalReviews})</Text>}
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.bookmarkButtonWhite}
              onPress={(event) => {
                event.stopPropagation();
                void toggleRecipe(trendingRecipe.id);
              }}
            >
              <Ionicons 
                name={isSaved(trendingRecipe.id) ? 'bookmark' : 'bookmark-outline'}
                size={22} 
                color={isSaved(trendingRecipe.id) ? '#E8505B' : '#333'}
              />
            </TouchableOpacity>

            <View style={styles.timeOverlayBottom}>
              <Ionicons name="time-outline" size={14} color="#FFF" />
              <Text style={styles.timeText}>45 Mins</Text>
            </View>

            <View style={styles.trendingContent}>
              <Text style={styles.trendingTitle} numberOfLines={2}>
                {trendingRecipe.name}
              </Text>
              <Text style={styles.trendingDescription} numberOfLines={2}>
                {trendingRecipe.ingredients}
              </Text>

              <View style={styles.trendingFooter}>
                <View style={styles.authorBadge}>
                  <Text style={styles.authorInitial}>{trendingRecipe.createdByName?.charAt(0) || 'M'}</Text>
                  <View>
                    <Text style={styles.authorName}>By {trendingRecipe.createdByName}</Text>
                    <Text style={styles.authorLocation}>Ambalangoda Heritage</Text>
                  </View>
                </View>

                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>Traditional</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Popular Category */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular category</Text>
          <Text style={styles.dishCount}>{filteredRecipes.length} dishes</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                selectedCategory === category.id && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === category.id && styles.categoryPillTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryCards}>
          {recentRecipes.slice(0, 3).map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.categoryCard}
              onPress={() => router.push({ pathname: '/cooking', params: { recipeId: recipe.id } })}
            >
              {recipe.imageUrl ? (
                <Image source={{ uri: recipe.imageUrl }} style={styles.categoryCardImage} />
              ) : (
                <View style={[styles.categoryCardImage, styles.placeholderCategoryImage]}>
                  <Ionicons name="restaurant" size={32} color="#E8505B" />
                </View>
              )}
              <Text style={styles.categoryCardTitle} numberOfLines={2}>
                {recipe.name}
              </Text>
              <View style={styles.categoryCardFooter}>
                <Text style={styles.categoryCardTime}>TIME</Text>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    void toggleRecipe(recipe.id);
                  }}
                >
                  <Ionicons name={isSaved(recipe.id) ? 'bookmark' : 'bookmark-outline'} size={16} color={isSaved(recipe.id) ? '#E8505B' : '#999'} />
                </TouchableOpacity>
              </View>
              <Text style={styles.categoryCardDuration}>25 Mins</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Recipe */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent recipe</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentGrid}>
          {recentRecipes.slice(0, 3).map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.recentCard}
              onPress={() => router.push({ pathname: '/cooking', params: { recipeId: recipe.id } })}
            >
              {recipe.imageUrl ? (
                <Image source={{ uri: recipe.imageUrl }} style={styles.recentImage} />
              ) : (
                <View style={[styles.recentImage, styles.placeholderRecentImage]}>
                  <Ionicons name="restaurant" size={32} color="#E8505B" />
                </View>
              )}
              <View style={styles.recentRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.recentRatingText}>{ratingFor(recipe)?.totalReviews ? ratingFor(recipe)!.averageRating.toFixed(1) : 'New'}</Text>
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {recipe.name}
                </Text>
                <Text style={styles.recentAuthor}>By {recipe.createdByName}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Popular Creators */}
      {creators.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular creators</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.creatorsScroll}>
            {creators.map((creator) => (
              <TouchableOpacity key={creator.uid} style={styles.creatorCard}>
                <View style={styles.creatorAvatar}>
                  <Ionicons name="person" size={32} color="#E8505B" />
                </View>
                <Text style={styles.creatorName} numberOfLines={1}>
                  {creator.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Heritage Kitchen Tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Ionicons name="restaurant" size={20} color="#E8505B" />
          <Text style={styles.tipLabel}>HERITAGE KITCHEN TIP</Text>
        </View>
        <Text style={styles.tipTitle}>Curing a new unglazed claypot (Walanda)</Text>
        <Text style={styles.tipDescription} numberOfLines={3}>
          Boil rice kanji (congee water) inside your fresh earthen pot three times before the first spiced
          curry to eliminate raw clay tannins and lock in natural heat retention.
        </Text>
        <TouchableOpacity>
          <Text style={styles.tipLink}>Read step-by-step guide →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
      </ScrollView>
      {saveToast ? <View style={styles.saveToast}><Ionicons name="bookmark" size={15} color="#FFF" /><Text style={styles.saveToastText}>{saveToast}</Text></View> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
  },

  // Hero Section
  heroSection: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#E8505B',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  dishCount: {
    fontSize: 14,
    color: '#999',
  },
  seeAllText: {
    fontSize: 14,
    color: '#E8505B',
    fontWeight: '600',
  },

  // Trending Card
  trendingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  trendingImage: {
    width: '100%',
    height: 200,
  },
  placeholderImage: {
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
  },
  trendingBadges: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  ratingCount: {
    color: '#FFF',
    fontSize: 12,
  },
  bookmarkButtonWhite: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timeOverlayBottom: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  trendingContent: {
    padding: 16,
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  trendingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  trendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8505B',
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  authorLocation: {
    fontSize: 12,
    color: '#999',
  },
  categoryTag: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8505B',
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8505B',
  },

  // Categories
  categoriesScroll: {
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#E8505B',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryPillTextActive: {
    color: '#FFF',
  },
  categoryCards: {
    marginTop: 8,
  },
  categoryCard: {
    width: 140,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryCardImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    marginBottom: 12,
  },
  placeholderCategoryImage: {
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryCardTime: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  categoryCardDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },

  // Recent Grid
  recentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  recentCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentImage: {
    width: '100%',
    height: 120,
  },
  placeholderRecentImage: {
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentRating: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recentRatingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  recentContent: {
    padding: 10,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  recentAuthor: {
    fontSize: 11,
    color: '#999',
  },

  // Creators
  creatorsScroll: {
    marginTop: 8,
  },
  creatorCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E8505B',
  },
  creatorName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },

  // Tip Card
  tipCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E8505B',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E8505B',
    letterSpacing: 0.5,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tipLink: {
    fontSize: 14,
    color: '#E8505B',
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 20,
  },
  saveToast: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1F2937',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  saveToastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

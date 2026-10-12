import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/firebaseConfig';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { useRecipeReviews } from '@/hooks/useRecipeReviews';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { WriteReviewSheet } from '@/components/reviews/WriteReviewSheet';

type Recipe = {
  id: string;
  name: string;
  ingredients: string | Ingredient[];
  steps: string[];
  imageUrl?: string;
  category?: string;
  createdByName?: string;
};

type Ingredient = {
  name: string;
  amount: string;
  unit: string;
};

type DisplayUnit = 'Metric' | 'Hunduwa' | 'Imperial';

function parseIngredients(value: unknown): Ingredient[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const data = item as Record<string, unknown>;
      return [{
        name: typeof data.name === 'string' ? data.name : '',
        amount: typeof data.amount === 'string' ? data.amount : String(data.amount ?? ''),
        unit: typeof data.unit === 'string' ? data.unit : 'g',
      }];
    }).filter((item) => item.name.trim());
  }

  if (typeof value !== 'string') return [];
  return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).map((item) => ({
    name: item,
    amount: '',
    unit: '',
  }));
}

function convertedAmount(ingredient: Ingredient, displayUnit: DisplayUnit) {
  const amount = Number.parseFloat(ingredient.amount);
  const unit = ingredient.unit.trim().toLowerCase();
  if (!Number.isFinite(amount) || displayUnit === 'Metric') {
    return `${ingredient.amount} ${ingredient.unit}`.trim();
  }

  const grams: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, kilograms: 1000 };
  const millilitres: Record<string, number> = { ml: 1, millilitre: 1, millilitres: 1, l: 1000, litre: 1000, litres: 1000 };
  if (displayUnit === 'Imperial' && grams[unit]) {
    const ounces = amount * grams[unit] / 28.3495;
    return `${ounces >= 16 ? (ounces / 16).toFixed(1) : ounces.toFixed(1)} ${ounces >= 16 ? 'lb' : 'oz'}`;
  }
  if (displayUnit === 'Imperial' && millilitres[unit]) {
    return `${(amount * millilitres[unit] / 29.5735).toFixed(1)} fl oz`;
  }
  if (displayUnit === 'Hunduwa' && grams[unit]) {
    return `${(amount * grams[unit] / 15).toFixed(1)} handuwa`;
  }
  return `${ingredient.amount} ${ingredient.unit}`.trim();
}

function getRecipeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function RecipeDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = getRecipeId(params.id);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('Metric');
  const [writeReviewVisible, setWriteReviewVisible] = useState(false);
  const { isSaved, toggle } = useSavedRecipes();
  const { reviews, loading: reviewsLoading, error: reviewsError, refresh: refreshReviews, submitReview } = useRecipeReviews(recipeId || '');
  const invalidRecipeId = !recipeId || recipeId.includes('/');

  useEffect(() => {
    if (invalidRecipeId) return;

    getDoc(doc(db, 'recipes', recipeId))
      .then((snapshot) => {
        if (!snapshot.exists()) {
          setError('This recipe is no longer available.');
          return;
        }
        const data = snapshot.data();
        setRecipe({
          id: snapshot.id,
          name: typeof data.name === 'string' ? data.name : 'Recipe',
          ingredients: parseIngredients(data.ingredients),
          steps: Array.isArray(data.steps)
            ? data.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
            : [],
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          category: typeof data.category === 'string' ? data.category : undefined,
          createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
        });
      })
      .catch((reason: unknown) => {
        console.error('Error loading recipe details:', reason);
        setError('Unable to load this recipe. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [invalidRecipeId, recipeId]);

  const ingredients = useMemo(
    () => parseIngredients(recipe?.ingredients),
    [recipe?.ingredients],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#E8505B" />
      </SafeAreaView>
    );
  }

  if (invalidRecipeId || error || !recipe) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#E8505B" />
        <Text style={styles.errorText}>{error || 'This recipe could not be opened.'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Recipe</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved(recipe.id) ? 'Remove from saved recipes' : 'Save recipe'}
          onPress={() => void toggle(recipe.id)}
        >
          <Ionicons name={isSaved(recipe.id) ? 'bookmark' : 'bookmark-outline'} size={23} color="#E8505B" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{recipe.name}</Text>
        <Text style={styles.subtitle}>
          {recipe.category || 'Traditional'} Sri Lankan recipe • TasteTrail Heritage
        </Text>
        {recipe.imageUrl ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} />
            <View style={styles.recipeIconOverlay}>
              <Ionicons name="restaurant-outline" size={24} color="#FFF" />
            </View>
            <View style={styles.imageTag}>
              <View style={styles.tagDot} />
              <Text style={styles.imageTagText}>{recipe.category || 'Traditional'}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.heroImage, styles.imagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={52} color="#E8505B" />
          </View>
        )}
        <View style={styles.ratingRow}>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>New</Text>
            <Text style={styles.reviewText}>({ingredients.length} ingredients)</Text>
          </View>
          <View style={styles.authenticBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#16A36A" />
            <Text style={styles.authenticText}>Community Authentic</Text>
          </View>
        </View>
        <View style={styles.creatorRow}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorInitial}>{(recipe.createdByName || 'T').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.creatorDetails}>
            <Text style={styles.creatorName}>{recipe.createdByName || 'TasteTrail community'}</Text>
            <Text style={styles.creatorLocation}>⌖ Sri Lanka</Text>
          </View>
          <Pressable style={styles.followButton}>
            <Text style={styles.followText}>Follow</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.unitSelector}>
          <Text style={styles.unitLabel}>Portion units</Text>
          {(['Metric', 'Hunduwa', 'Imperial'] as DisplayUnit[]).map((unit) => (
            <Pressable
              key={unit}
              style={[styles.unitOption, displayUnit === unit && styles.unitOptionActive]}
              onPress={() => setDisplayUnit(unit)}
            >
              <Text style={[styles.unitOptionText, displayUnit === unit && styles.unitOptionTextActive]}>{unit}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.card}>
          {ingredients.length ? ingredients.map((ingredient, index) => (
            <View style={styles.listRow} key={`${ingredient}-${index}`}>
              <View style={styles.dot} />
              <Text style={styles.listText}>{ingredient.name}</Text>
              {!!ingredient.amount && <Text style={styles.amountText}>{convertedAmount(ingredient, displayUnit)}</Text>}
            </View>
          )) : <Text style={styles.mutedText}>No ingredients listed.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipe reviews</Text>
          {reviewsLoading && <ActivityIndicator size="small" color="#E8505B" />}
          {!!reviewsError && (
            <>
              <Text style={styles.mutedText}>{reviewsError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void refreshReviews()}>
                <Text style={styles.retryButtonText}>Retry reviews</Text>
              </Pressable>
            </>
          )}
          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <Text style={styles.mutedText}>No reviews yet. Share how this recipe turned out.</Text>
          )}
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              restaurantName={recipe.name}
              restaurantPhoto={recipe.imageUrl}
            />
          ))}
          <Pressable style={styles.reviewButton} onPress={() => setWriteReviewVisible(true)}>
            <Text style={styles.reviewButtonText}>Write a review</Text>
          </Pressable>
        </View>
        <WriteReviewSheet
          key={recipe.id}
          visible={writeReviewVisible}
          onClose={() => setWriteReviewVisible(false)}
          onSubmit={submitReview}
          recipeId={recipe.id}
          restaurantName={recipe.name}
          restaurantPhoto={recipe.imageUrl}
          targetLabel="recipe"
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          style={styles.startButton}
          onPress={() => router.push({ pathname: '/cooking', params: { recipeId: recipe.id } })}
        >
          <Text style={styles.startButtonText}>Start cooking</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF7', padding: 24 },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, backgroundColor: '#FFF' },
  headerTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  heroWrap: { position: 'relative', marginTop: 12 },
  heroImage: { width: '100%', height: 190, borderRadius: 18, backgroundColor: '#F3E7E8' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recipeIconOverlay: { position: 'absolute', top: '50%', left: '50%', width: 42, height: 42, marginTop: -21, marginLeft: -21, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  imageTag: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFF' },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8505B' },
  imageTagText: { color: '#1F2937', fontSize: 10, fontWeight: '700' },
  title: { color: '#111827', fontSize: 22, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#6B7280', fontSize: 11, marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  reviewText: { color: '#9CA3AF', fontSize: 11 },
  authenticBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E9F8F0', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  authenticText: { color: '#168653', fontSize: 10, fontWeight: '700' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  creatorAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#D9B58C', alignItems: 'center', justifyContent: 'center' },
  creatorInitial: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  creatorDetails: { flex: 1, marginLeft: 9 },
  creatorName: { color: '#1F2937', fontSize: 12, fontWeight: '700' },
  creatorLocation: { color: '#9CA3AF', fontSize: 10, marginTop: 2 },
  followButton: { backgroundColor: '#E8505B', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  followText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  unitSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 5, marginBottom: 10, gap: 4 },
  unitLabel: { flex: 1, color: '#374151', fontSize: 12, fontWeight: '700', paddingLeft: 7 },
  unitOption: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  unitOptionActive: { backgroundColor: '#1F2937' },
  unitOptionText: { color: '#6B7280', fontSize: 11 },
  unitOptionTextActive: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 15 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8505B' },
  listText: { flex: 1, color: '#374151', fontSize: 14, lineHeight: 21 },
  amountText: { color: '#6B7280', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  mutedText: { color: '#9CA3AF', fontSize: 14 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#FFF0F1', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10 },
  retryButtonText: { color: '#E8505B', fontSize: 12, fontWeight: '700' },
  reviewButton: { alignItems: 'center', backgroundColor: '#E8505B', borderRadius: 22, paddingVertical: 11, marginTop: 14 },
  reviewButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  startButton: { height: 52, borderRadius: 26, backgroundColor: '#E8505B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#374151', fontSize: 16, textAlign: 'center', marginTop: 14 },
  backButton: { backgroundColor: '#E8505B', borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  backButtonText: { color: '#FFF', fontWeight: '700' },
});

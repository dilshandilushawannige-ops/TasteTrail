import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Recipe {
  id: string;
  category?: string;
  name: string;
  ingredients: string;
  steps: string[];
  imageUrl?: string;
  createdByName: string;
  createdAt: any;
  likes: number;
  saves: number;
}

/**
 * Home Screen - Main feed of traditional Sri Lankan recipes
 * Displays all recipes saved by users from Firestore
 */
export default function HomeScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recipes from Firestore
  const fetchRecipes = async () => {
    try {
      const recipesQuery = query(
        collection(db, 'recipes'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(recipesQuery);
      
      const fetchedRecipes: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRecipes.push({
          id: doc.id,
          ...doc.data(),
        } as Recipe);
      });
      
      setRecipes(fetchedRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load recipes on mount and set up auto-refresh
  useEffect(() => {
    fetchRecipes();
    
    // Set up interval to refresh every 5 seconds when app is active
    const interval = setInterval(() => {
      fetchRecipes();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes();
  };

  const renderRecipeCard = ({ item }: { item: Recipe }) => (
    <TouchableOpacity style={styles.recipeCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.recipeImage} />
      ) : (
        <View style={styles.recipeImagePlaceholder}>
          <Ionicons name="restaurant" size={48} color="#E8505B" />
        </View>
      )}
      
      <View style={styles.recipeContent}>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
        
        <Text style={styles.recipeTitle} numberOfLines={2}>
          {item.name}
        </Text>
        
        <Text style={styles.recipeIngredients} numberOfLines={2}>
          {item.ingredients}
        </Text>

        <View style={styles.recipeFooter}>
          <View style={styles.authorContainer}>
            <Ionicons name="person-circle-outline" size={16} color="#999" />
            <Text style={styles.authorText}>{item.createdByName}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={16} color="#999" />
              <Text style={styles.statText}>{item.likes || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="bookmark-outline" size={16} color="#999" />
              <Text style={styles.statText}>{item.saves || 0}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E8505B" />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Discover Authentic</Text>
        <Text style={styles.headerTitle}>Sri Lankan Recipes</Text>
      </View>

      {/* Recipe List */}
      <FlatList
        data={recipes}
        renderItem={renderRecipeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={recipes.length === 0 ? styles.emptyListContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E8505B']}
            tintColor="#E8505B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#DDD" />
            <Text style={styles.emptyText}>No recipes yet</Text>
            <Text style={styles.emptySubtext}>
              Start adding recipes to see them here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  header: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8505B',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImagePlaceholder: {
    height: 180,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  recipeContent: {
    padding: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#E8505B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8505B',
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  recipeIngredients: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
  },
});

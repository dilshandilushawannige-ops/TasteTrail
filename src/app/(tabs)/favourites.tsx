import { auth, db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FavouriteRecipe {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeImage: string | null;
  savedAt: any;
}

export default function FavouritesScreen() {
  const [favourites, setFavourites] = useState<FavouriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.currentUser;

  const fetchFavourites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const favouritesQuery = query(collection(db, 'users', user.uid, 'favourites'));
      const querySnapshot = await getDocs(favouritesQuery);

      const fetchedFavourites: FavouriteRecipe[]= [];
      querySnapshot.forEach((doc) => {
        fetchedFavourites.push({
          id: doc.id,
          ...doc.data(),
        } as FavouriteRecipe);
      });

      setFavourites(fetchedFavourites);
    } catch (error) {
      console.error('Error fetching favourites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavourites();
  };

  const removeFromFavourites = async (favouriteId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'favourites', favouriteId));
      setFavourites((prev) => prev.filter((fav) => fav.id !== favouriteId));
      Alert.alert('Removed', 'Recipe removed from favourites');
    } catch (error) {
      console.error('Error removing favourite:', error);
      Alert.alert('Error', 'Failed to remove from favourites');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E8505B" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="person-outline" size={64} color="#DDD" />
        <Text style={styles.emptyText}>Please login to view favourites</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favourites}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recipeCard}
            onPress={() => router.push({ pathname: '/cooking', params: { recipeId: item.recipeId } })}
          >
            {item.recipeImage ? (
              <Image source={{ uri: item.recipeImage }} style={styles.recipeImage} />
            ) : (
              <View style={[styles.recipeImage, styles.placeholderImage]}>
                <Ionicons name="restaurant" size={48} color="#E8505B" />
              </View>
            )}

            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle} numberOfLines={2}>
                {item.recipeName}
              </Text>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromFavourites(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={favourites.length === 0 ? styles.emptyListContent : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E8505B']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#DDD" />
            <Text style={styles.emptyText}>No favourites yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the bookmark icon on recipes to save them here
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
  recipeImage: {
    width: '100%',
    height: 180,
  },
  placeholderImage: {
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeContent: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  removeText: {
    fontSize: 14,
    color: '#FF5252',
    fontWeight: '600',
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

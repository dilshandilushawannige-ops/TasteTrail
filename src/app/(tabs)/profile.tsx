import { auth, db } from '@/firebaseConfig';
import AccountSettingsButton from '@/components/AccountSettingsButton';
import { CLOUDINARY_CONFIG } from '@/config/cloudinary';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Tabs } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { subscribeToRecipeRatingSummaries } from '@/services/reviewService';
import { RatingSummary } from '@/types/review';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ActionSheetIOS,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Metro resolves bundled image assets through static require calls.
const cameraIcon = require('@/assets/images/tabIcons/camera.png');

interface UserRecipe {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  createdAt: any;
  likes: number;
  saves: number;
}

interface UserProfile {
  name: string;
  email: string;
  bio?: string;
  location?: string;
}

export default function ProfileScreen() {
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(auth.currentUser?.photoURL || null);
  const [recipeRatings, setRecipeRatings] = useState<Record<string, RatingSummary>>({});

  const user = auth.currentUser;

  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching recipes for user:', user.uid);
      
      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }

      // Fetch user's recipes
      const recipesQuery = query(
        collection(db, 'recipes'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(recipesQuery);

      console.log('Found recipes:', querySnapshot.size);

      const fetchedRecipes: UserRecipe[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Recipe data:', { id: doc.id, createdBy: data.createdBy, name: data.name });
        fetchedRecipes.push({ id: doc.id, ...data } as UserRecipe);
      });

      setUserRecipes(fetchedRecipes);
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // If the error is about missing index, try without orderBy
      try {
        console.log('Retrying without orderBy...');
        const recipesQuery = query(
          collection(db, 'recipes'),
          where('createdBy', '==', user.uid)
        );
        const querySnapshot = await getDocs(recipesQuery);

        console.log('Found recipes (no order):', querySnapshot.size);

        const fetchedRecipes: UserRecipe[] = [];
        querySnapshot.forEach((doc) => {
          fetchedRecipes.push({ id: doc.id, ...doc.data() } as UserRecipe);
        });

        // Sort manually by createdAt
        fetchedRecipes.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setUserRecipes(fetchedRecipes);
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  useEffect(() => {
    return subscribeToRecipeRatingSummaries(setRecipeRatings, error => {
      console.error('Error loading profile recipe ratings:', error);
    });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const handleRecipeMenu = (recipe: UserRecipe) => {
    const deleteRecipe = () => Alert.alert(
      'Delete recipe?',
      `"${recipe.name}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'recipes', recipe.id));
              setUserRecipes(current => current.filter(item => item.id !== recipe.id));
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Delete failed', 'Could not delete this recipe. Please try again.');
            }
          },
        },
      ],
    );
    const actions = [
      () => router.push({ pathname: '/(tabs)/addRecipe', params: { recipeId: recipe.id } }),
      deleteRecipe,
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: recipe.name, options: ['Edit Recipe', 'Delete Recipe', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        index => actions[index]?.(),
      );
    } else {
      Alert.alert(recipe.name, undefined, [
        { text: 'Edit Recipe', onPress: actions[0] },
        { text: 'Delete Recipe', style: 'destructive', onPress: deleteRecipe },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleUploadPhoto = async () => {
    if (!user || uploadingPhoto) return;

    setUploadingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;
      const image = result.assets[0];
      if (!image.base64) throw new Error('Could not read the selected photo');

      const response = await fetch(
        CLOUDINARY_CONFIG.uploadUrl(CLOUDINARY_CONFIG.cloudName),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: `data:image/jpeg;base64,${image.base64}`,
            upload_preset: CLOUDINARY_CONFIG.uploadPreset,
            folder: 'profile-photos',
          }),
        }
      );
      const uploaded = await response.json();
      if (!response.ok || !uploaded.secure_url) {
        throw new Error(uploaded.error?.message || 'Photo upload failed');
      }

      // Persist the photo on the authenticated account so it survives app restarts.
      await updateProfile(user, { photoURL: uploaded.secure_url });
      if (auth.currentUser?.uid === user.uid) setPhotoUrl(uploaded.secure_url);
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Upload failed', 'Could not save your profile photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
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
        <Text style={styles.emptyText}>Please login to view profile</Text>
      </View>
    );
  }

  const totalSaves = userRecipes.reduce((sum, recipe) => sum + (recipe.saves || 0), 0);
  const ratingTotals = userRecipes.reduce((totals, recipe) => {
    const summary = recipeRatings[recipe.id];
    if (!summary) return totals;
    return {
      totalPoints: totals.totalPoints + summary.averageRating * summary.totalReviews,
      totalReviews: totals.totalReviews + summary.totalReviews,
    };
  }, { totalPoints: 0, totalReviews: 0 });
  const averageRating = ratingTotals.totalReviews > 0
    ? ratingTotals.totalPoints / ratingTotals.totalReviews
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E8505B']} />
      }
    >
      {/* Profile Section */}
      <Tabs.Screen options={{ headerRight: () => <AccountSettingsButton onProfileUpdated={fetchUserData} /> }} />
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={48} color="#E8505B" />
            )}
          </View>
          <TouchableOpacity
            style={styles.uploadBadge}
            onPress={handleUploadPhoto}
            disabled={uploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel="Upload profile photo"
            accessibilityState={{ disabled: uploadingPhoto, busy: uploadingPhoto }}
            hitSlop={8}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#1A1A1A" />
            ) : (
              <Image source={cameraIcon} style={styles.uploadIcon} resizeMode="contain" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{userProfile?.name || 'User'}</Text>
        <Text style={styles.userBio}>
          {userProfile?.bio || 'Southern Heritage Home Cook'} • {userProfile?.location || 'Galle, Sri Lanka'}
        </Text>

        <View style={styles.badge}>
          <Ionicons name="trophy" size={14} color="#E8505B" />
          <Text style={styles.badgeText}>Master Recipe Keeper</Text>
          <Text style={styles.badgeCount}>14 Preserved</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userRecipes.length}</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalSaves}</Text>
            <Text style={styles.statLabel}>Saves</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.statNumber}>{averageRating.toFixed(1)}</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* My Recipes Section */}
      <View style={styles.recipesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My recipes ({userRecipes.length})</Text>
          <TouchableOpacity
            style={styles.newRecipeButton}
            onPress={() => router.push('/(tabs)/addRecipe')}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.newRecipeText}>New Recipe</Text>
          </TouchableOpacity>
        </View>

        {/* Recipe List */}
        {userRecipes.map((recipe) => (
          <TouchableOpacity
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => router.push({ pathname: '/cooking', params: { recipeId: recipe.id } })}
          >
            {recipe.imageUrl ? (
              <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
            ) : (
              <View style={[styles.recipeImage, styles.placeholderImage]}>
                <Ionicons name="restaurant" size={32} color="#E8505B" />
              </View>
            )}

            <View style={styles.recipeRating}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.recipeRatingText}>
                {recipeRatings[recipe.id]?.totalReviews
                  ? recipeRatings[recipe.id].averageRating.toFixed(1)
                  : 'New'}
              </Text>
            </View>

            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {recipe.name}
              </Text>

              <View style={styles.recipeStatus}>
                <Ionicons name="earth" size={12} color="#4CAF50" />
                <Text style={styles.statusText}>Public, credited</Text>
              </View>

              <View style={styles.recipeStats}>
                <Text style={styles.recipeStat}>{recipe.category || 'Traditional'}</Text>
                <Text style={styles.recipeStat}>• {recipe.saves || 0} saves</Text>
                <Text style={styles.recipeStat}>• {recipe.likes || 0} cooks</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={(event) => {
                event.stopPropagation();
                handleRecipeMenu(recipe);
              }}
              accessibilityLabel={`Manage ${recipe.name}`}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {userRecipes.length === 0 && (
          <View style={styles.emptyRecipes}>
            <Ionicons name="document-text-outline" size={48} color="#DDD" />
            <Text style={styles.emptyText}>No recipes yet</Text>
            <Text style={styles.emptySubtext}>
              Share your culinary heritage by adding your first recipe
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => router.push('/(tabs)/addRecipe')}
            >
              <Text style={styles.addFirstText}>Add Your First Recipe</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
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

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E8505B',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
  },
  uploadIcon: {
    width: 24,
    height: 24,
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8505B',
  },
  badgeCount: {
    fontSize: 12,
    color: '#999',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
    borderRadius: 12,
    padding: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },

  // Recipes Section
  recipesSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  newRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8505B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newRecipeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Recipe Card
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  placeholderImage: {
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeRating: {
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
  recipeRatingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  recipeContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  recipeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  recipeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recipeStat: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  moreButton: {
    padding: 12,
    justifyContent: 'center',
  },

  // Empty State
  emptyRecipes: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#E8505B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addFirstText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

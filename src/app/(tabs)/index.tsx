import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * Home Screen - Main feed of traditional Sri Lankan recipes
 * Future: Will fetch recipes from Firestore and display them
 */
export default function HomeScreen() {
  // Placeholder data structure - will be replaced with Firestore data
  const placeholderRecipes = [
    { id: '1', title: 'Recipe 1' },
    { id: '2', title: 'Recipe 2' },
    { id: '3', title: 'Recipe 3' },
  ];

  const renderRecipeCard = ({ item }: { item: { id: string; title: string } }) => (
    <TouchableOpacity style={styles.recipeCard}>
      <View style={styles.recipeImagePlaceholder}>
        <Text style={styles.placeholderText}>📷</Text>
      </View>
      <Text style={styles.recipeTitle}>{item.title}</Text>
      <Text style={styles.recipeSubtitle}>Traditional Sri Lankan</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Discover Authentic</Text>
        <Text style={styles.headerTitle}>Sri Lankan Recipes</Text>
      </View>

      {/* Recipe List - Will be populated from Firestore later */}
      <FlatList
        data={placeholderRecipes}
        renderItem={renderRecipeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
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
    color: '#C4693A',
  },
  listContent: {
    padding: 16,
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 12,
    paddingBottom: 4,
  },
  recipeSubtitle: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 12,
    paddingBottom: 12,
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
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
  },
});

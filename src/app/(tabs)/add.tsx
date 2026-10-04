import { StyleSheet, Text, View } from 'react-native';

/**
 * Add Recipe Screen
 * Future: Will allow users to add new recipes to Firestore
 */
export default function AddRecipeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Add New Recipe</Text>
      <Text style={styles.subtext}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C4693A',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#999',
  },
});

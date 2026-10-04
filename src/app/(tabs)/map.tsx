import { StyleSheet, Text, View } from 'react-native';

/**
 * Discovery Map Screen
 * Future: Will show restaurants and food spots on a map
 */
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Discovery Map</Text>
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
    color: '#E8505B',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#999',
  },
});

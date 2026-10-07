import { StyleSheet, Text, View } from 'react-native';

/**
 * Admin Users screen
 * Shows user management interface
 */
export default function AdminUsersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.comingSoon}>Coming Soon</Text>
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
  comingSoon: {
    fontSize: 24,
    color: '#666',
    fontWeight: '500',
  },
});
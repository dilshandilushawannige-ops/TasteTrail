import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '@/firebaseConfig';

/**
 * Admin Profile screen
 * Shows admin profile with logout functionality
 */
export default function AdminProfileScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await signOut(auth);
              // Navigation will be handled automatically by _layout.tsx
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.logoutButton, loading && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FAFAF7" />
        ) : (
          <Text style={styles.logoutButtonText}>Logout</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoutButton: {
    backgroundColor: '#E8505B',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#FAFAF7',
    fontSize: 18,
    fontWeight: '600',
  },
});
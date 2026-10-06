import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { auth } from '@/firebaseConfig';

SplashScreen.preventAutoHideAsync();

interface AdminClaims {
  admin?: boolean;
  [key: string]: any; // Allow other claims
}

/**
 * Root layout component that handles authentication state,
 * admin claims checking, and navigation between auth screens,
 * admin dashboard, and main app
 */
export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Check admin claims
  const checkAdminClaims = async (currentUser: User) => {
    try {
      setClaimsLoading(true);
      setClaimsError(null);
      
      // Refresh token to get latest claims
      await currentUser.getIdToken(true);
      const idTokenResult = await currentUser.getIdTokenResult();
      const claims = idTokenResult.claims as AdminClaims;
      
      // Check for admin claim in various possible formats
      const isAdminUser = claims.admin === true || 
                         String(claims.admin) === 'true' || 
                         claims.isAdmin === true ||
                         claims.role === 'admin' ||
                         (claims.roles && Array.isArray(claims.roles) && claims.roles.includes('admin'));
      
      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error('Error checking admin claims:', error);
      setIsAdmin(false);
      setClaimsError('Failed to verify admin permissions');
    } finally {
      setClaimsLoading(false);
    }
  };

  // Retry claims check
  const retryClaimsCheck = () => {
    if (user) {
      checkAdminClaims(user);
    }
  };

  // Listen to Firebase authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Small delay to ensure auth is fully settled
        setTimeout(async () => {
          await checkAdminClaims(currentUser);
        }, 100);
      } else {
        setIsAdmin(null);
        setClaimsError(null);
      }
      
      setInitializing(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Handle navigation based on authentication state and admin status
  useEffect(() => {
    if (initializing || claimsLoading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
    const inAdminGroup = segments[0] === 'admin';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // User is not logged in and not on auth screens, redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // User is logged in but still on auth screens, redirect based on admin status
      if (isAdmin) {
        router.replace('/admin/' as any);
      } else {
        router.replace('/(tabs)');
      }
    } else if (user && isAdmin && !inAdminGroup) {
      // Admin user not in admin area, redirect to admin
      router.replace('/admin/' as any);
    } else if (user && !isAdmin && inAdminGroup) {
      // Non-admin user trying to access admin area, redirect to tabs
      router.replace('/(tabs)');
    } else if (user && !isAdmin && !inTabsGroup && !inAuthGroup) {
      // Regular user not in tabs area, redirect to tabs
      router.replace('/(tabs)');
    }
  }, [user, segments, initializing, isAdmin, claimsLoading]);

  // Show loading screen while checking authentication state and claims
  if (initializing || claimsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8505B" />
        {claimsLoading && (
          <Text style={styles.loadingText}>Verifying permissions...</Text>
        )}
      </View>
    );
  }

  // Show error screen if claims check failed for logged in user
  if (user && claimsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Permission Error</Text>
        <Text style={styles.errorMessage}>{claimsError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={retryClaimsCheck}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.continueButtonText}>Continue as Regular User</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Slot />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8505B',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#E8505B',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FAFAF7',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E8505B',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  continueButtonText: {
    color: '#E8505B',
    fontSize: 16,
    fontWeight: '600',
  },
});

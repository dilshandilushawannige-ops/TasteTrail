import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { AppLoader } from '@/components/AppLoader';
import AccountBlockGate from '@/components/AccountBlockGate';
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
  const appLoading = initializing || claimsLoading;

  useEffect(() => {
    if (!appLoading) {
      try {
        SplashScreen.setOptions({ fade: true, duration: 200 });
      } catch {
        // Older native clients may not expose splash options.
      }
      void SplashScreen.hideAsync();
    }
  }, [appLoading]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      try {
        SplashScreen.setOptions({ fade: true, duration: 200 });
      } catch {
        // Older native clients may not expose splash options.
      }
      void SplashScreen.hideAsync();
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Check admin claims
  const checkAdminClaims = async (currentUser: User, forceRefresh = false) => {
    try {
      setClaimsLoading(true);
      setClaimsError(null);
      
      // Use the cached token during normal auth checks to avoid repeated Auth requests.
      if (forceRefresh) {
        await currentUser.getIdToken(true);
      }
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
      checkAdminClaims(user, true);
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
    const inAllowedRoute = segments[0] === 'cooking' || segments[0] === 'explore' || segments[0] === 'restaurant' || inTabsGroup;

    if (!user && !inAuthGroup) {
      // User is not logged in and not on auth screens, redirect to login
      console.log('Redirecting to login - no user');
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
    } else if (user && isAdmin === false && inAdminGroup) {
      // Non-admin user trying to access admin area, redirect to tabs
      router.replace('/(tabs)');
    } else if (user && !isAdmin && !inAllowedRoute && !inAuthGroup) {
      // Regular user not in allowed routes, redirect to tabs
      router.replace('/(tabs)');
    }
  }, [user, segments, initializing, isAdmin, claimsLoading]);

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
      <View style={[styles.root, !appLoading && styles.appReady]}>
        <AccountBlockGate><Slot /></AccountBlockGate>
        <AppLoader loading={appLoading} />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appReady: {
    backgroundColor: '#FFFFFF',
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

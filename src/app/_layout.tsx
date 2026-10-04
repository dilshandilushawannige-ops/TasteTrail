import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { auth } from '@/firebaseConfig';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout component that handles authentication state
 * and navigation between auth screens and main app
 */
export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Listen to Firebase authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Handle navigation based on authentication state
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

    if (!user && !inAuthGroup) {
      // User is not logged in and not on auth screens, redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // User is logged in but still on auth screens, redirect to home
      router.replace('/(tabs)');
    }
  }, [user, segments, initializing]);

  // Show loading screen while checking authentication state
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF7' }}>
        <ActivityIndicator size="large" color="#C4693A" />
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

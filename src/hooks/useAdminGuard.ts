/**
 * Admin guard hook to protect admin-only routes
 * Reuses the existing admin claims logic from _layout.tsx
 */

import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

interface AdminClaims {
  admin?: boolean;
  isAdmin?: boolean;
  role?: string;
  roles?: string[];
  [key: string]: any;
}

interface UseAdminGuardResult {
  isAdmin: boolean | null;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

/**
 * Hook to check if current user has admin privileges
 * Uses the same logic as RootLayout for consistency
 */
export function useAdminGuard(): UseAdminGuardResult {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Check admin claims (same logic as _layout.tsx)
  const checkAdminClaims = async (currentUser: User): Promise<boolean> => {
    try {
      setError(null);
      
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
      
      return isAdminUser || false;
    } catch (err) {
      console.error('Error checking admin claims:', err);
      setError('Failed to verify admin permissions');
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
        const adminStatus = await checkAdminClaims(currentUser);
        setIsAdmin(adminStatus);
        
        // If not admin and trying to access admin routes, redirect
        const inAdminGroup = segments[0] === 'admin';
        if (!adminStatus && inAdminGroup) {
          router.replace('/(tabs)');
        }
      } else {
        setIsAdmin(null);
        // If not logged in and trying to access admin routes, redirect to login
        const inAdminGroup = segments[0] === 'admin';
        if (inAdminGroup) {
          router.replace('/login');
        }
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, [segments, router]);

  return {
    isAdmin,
    isLoading,
    user,
    error,
  };
}
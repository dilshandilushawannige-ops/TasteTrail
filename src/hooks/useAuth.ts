/**
 * Auth hook for accessing current user
 * Provides authentication state and current user information
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

export interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for accessing current authentication state
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
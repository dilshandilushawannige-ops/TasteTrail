/**
 * Restaurant Form Context
 * Provides shared form state across all restaurant form components
 */

import React, { createContext, useContext } from 'react';
import { useRestaurantForm, UseRestaurantFormResult } from '@/hooks/useRestaurantForm';

const RestaurantFormContext = createContext<UseRestaurantFormResult | null>(null);

/**
 * Restaurant Form Provider component
 */
export function RestaurantFormProvider({ children }: { children: React.ReactNode }) {
  const formState = useRestaurantForm();

  return (
    <RestaurantFormContext.Provider value={formState}>
      {children}
    </RestaurantFormContext.Provider>
  );
}

/**
 * Hook to use restaurant form context
 */
export function useRestaurantFormContext(): UseRestaurantFormResult {
  const context = useContext(RestaurantFormContext);
  
  if (!context) {
    throw new Error('useRestaurantFormContext must be used within a RestaurantFormProvider');
  }
  
  return context;
}
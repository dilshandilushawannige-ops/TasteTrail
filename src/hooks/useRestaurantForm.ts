/**
 * Restaurant form state management hook
 * Handles form data, validation, and step navigation
 */

import { useState, useCallback } from 'react';
import { RestaurantFormData, RestaurantFormErrors } from '@/types/restaurant';
import { DEFAULT_RESTAURANT_FORM } from '@/constants/restaurant';
import { validateStep1, validateStep2ForDraft, validateStep2ForPublish } from '@/utils/validation';

export interface UseRestaurantFormResult {
  formData: RestaurantFormData;
  errors: RestaurantFormErrors;
  isDirty: boolean;
  currentStep: number;
  updateField: <K extends keyof RestaurantFormData>(field: K, value: RestaurantFormData[K]) => void;
  validateStep1: () => boolean;
  validateStep2ForDraft: () => boolean;
  validateStep2ForPublish: () => boolean;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  resetForm: () => void;
  loadRestaurant: (restaurant: Partial<RestaurantFormData>) => void;
  clearErrors: () => void;
}

/**
 * Hook for managing restaurant form state across multiple steps
 */
export function useRestaurantForm(): UseRestaurantFormResult {
  const [formData, setFormData] = useState<RestaurantFormData>({
    ...DEFAULT_RESTAURANT_FORM,
    additionalPhotosUris: [],
    additionalPhotosUrls: [],
  });
  
  const [errors, setErrors] = useState<RestaurantFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Update a single field
  const updateField = useCallback(<K extends keyof RestaurantFormData>(
    field: K, 
    value: RestaurantFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
    
    // Clear error for this field when user starts typing
    if (errors[field as keyof RestaurantFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  }, [errors]);

  // Validate Step 1 (Restaurant Details)
  const validateStep1Form = useCallback((): boolean => {
    const newErrors = validateStep1(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Validate Step 2 for Draft save (minimal requirements)
  const validateStep2ForDraftForm = useCallback((): boolean => {
    const newErrors = validateStep2ForDraft(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Validate Step 2 for Publish (full requirements)
  const validateStep2ForPublishForm = useCallback((): boolean => {
    const newErrors = validateStep2ForPublish(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Navigation
  const nextStep = useCallback(() => {
    if (currentStep === 1 && validateStep1Form()) {
      setCurrentStep(2);
    }
  }, [currentStep, validateStep1Form]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const setStep = useCallback((step: number) => {
    if (step >= 1 && step <= 2) {
      setCurrentStep(step);
    }
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      ...DEFAULT_RESTAURANT_FORM,
      additionalPhotosUris: [],
      additionalPhotosUrls: [],
    });
    setErrors({});
    setIsDirty(false);
    setCurrentStep(1);
  }, []);

  // Load existing restaurant for editing
  const loadRestaurant = useCallback((restaurant: Partial<RestaurantFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...restaurant,
    }));
    setIsDirty(false);
    setErrors({});
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    isDirty,
    currentStep,
    updateField,
    validateStep1: validateStep1Form,
    validateStep2ForDraft: validateStep2ForDraftForm,
    validateStep2ForPublish: validateStep2ForPublishForm,
    nextStep,
    prevStep,
    setStep,
    resetForm,
    loadRestaurant,
    clearErrors,
  };
}
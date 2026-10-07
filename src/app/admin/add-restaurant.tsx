/**
 * Add Restaurant Screen - Step 1 & 2
 * Multi-step form for adding new restaurants
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useRestaurantOperations } from '@/hooks/useRestaurantOperations';
import { RestaurantFormProvider, useRestaurantFormContext } from '@/contexts/RestaurantFormContext';
import { RestaurantDetailsStep } from '@/components/restaurant/RestaurantDetailsStep';
import { LocationContactStep } from '@/components/restaurant/LocationContactStep';

/**
 * Add Restaurant Screen with multi-step form
 */
/**
 * Add Restaurant Screen Content (wrapped by provider)
 */
function AddRestaurantContent() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    formData,
    errors,
    isDirty,
    currentStep,
    validateStep1,
    validateStep2ForDraft,
    validateStep2ForPublish,
    nextStep,
    prevStep,
    resetForm,
  } = useRestaurantFormContext();

  const { isSubmitting, saveRestaurant } = useRestaurantOperations();

  // Handle back button / cancel
  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => {
              resetForm();
              router.replace('/admin/restaurants');
            }
          },
        ]
      );
    } else {
      router.replace('/admin/restaurants');
    }
  };

  // Handle next button (Step 1 -> Step 2)
  const handleNext = () => {
    if (validateStep1()) {
      nextStep();
    } else {
      // Scroll to top to show errors
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Handle save as draft
  const handleSaveAsDraft = async () => {
    if (!validateStep2ForDraft()) {
      // Scroll to top to show errors
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    try {
      await saveRestaurant(formData, true);
      Alert.alert('Success', 'Restaurant saved as draft successfully');
      resetForm();
      router.replace('/admin/restaurants');
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert(
        'Error', 
        'Failed to save restaurant. Please try again.',
        [
          { text: 'OK' }
        ]
      );
    }
  };

  // Handle publish restaurant
  const handlePublish = async () => {
    if (!validateStep2ForPublish()) {
      // Check which step has errors to navigate appropriately
      const step1Fields = ['name', 'category', 'description', 'coverPhoto'];
      const hasStep1Errors = step1Fields.some(field => errors[field as keyof typeof errors]);
      
      if (hasStep1Errors && currentStep === 2) {
        // Navigate back to Step 1 if current errors are in Step 1 fields
        prevStep();
        // Small delay to ensure step transition completes before scrolling
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
      } else {
        // Stay on current step and scroll to first error
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
      return;
    }

    try {
      await saveRestaurant(formData, false);
      Alert.alert('Success', 'Restaurant published successfully');
      resetForm();
      router.replace('/admin/restaurants');
    } catch (error) {
      console.error('Error publishing restaurant:', error);
      Alert.alert(
        'Error', 
        'Failed to publish restaurant. Please try again.',
        [
          { text: 'Retry', onPress: handlePublish },
          { text: 'Cancel' }
        ]
      );
    }
  };

  const renderProgressBar = () => {
    const progress = currentStep === 1 ? 50 : 100;
    
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.stepIndicator}>STEP {currentStep} OF 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}% Completed</Text>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <RestaurantDetailsStep />;
      case 2:
        return <LocationContactStep />;
      default:
        return null;
    }
  };

  const renderFooter = () => {
    if (currentStep === 1) {
      return (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSaveAsDraft}
          style={[styles.draftButton, isSubmitting && styles.buttonDisabled]}
          disabled={isSubmitting}
        >
          <Text style={styles.draftButtonText}>Save as Draft</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handlePublish}
          style={[styles.publishButton, isSubmitting && styles.buttonDisabled]}
          disabled={isSubmitting}
        >
          <Text style={styles.publishButtonText}>Publish Restaurant</Text>
          <Ionicons name="checkmark" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: currentStep === 1 ? 'Step 1 of 2: Restaurant Details' : 'Step 2 of 2: Location & Contact',
          headerLeft: () => (
            <TouchableOpacity onPress={currentStep === 1 ? handleCancel : prevStep}>
              <Ionicons name="chevron-back" size={24} color="#E8505B" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity>
              <Ionicons name="settings-outline" size={24} color="#E8505B" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#FAFAF7',
          },
          headerTintColor: '#333',
        }}
      />

      <View style={styles.content}>
        {renderProgressBar()}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {renderFooter()}
      </View>
    </SafeAreaView>
  );
}

/**
 * Add Restaurant Screen with Form Provider
 */
export default function AddRestaurantScreen() {
  const { isAdmin, isLoading } = useAdminGuard();
  const router = useRouter();

  // Redirect if not admin
  if (!isLoading && !isAdmin) {
    router.replace('/(tabs)');
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <RestaurantFormProvider>
      <AddRestaurantContent />
    </RestaurantFormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8505B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E8505B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 32,
    backgroundColor: '#FAFAF7',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  draftButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  publishButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
/**
 * Edit Restaurant Screen - Step 1 & 2
 * Multi-step form for editing existing restaurants
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
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
import { getRestaurant } from '@/services/restaurantService';
import { RestaurantFormProvider, useRestaurantFormContext } from '@/contexts/RestaurantFormContext';
import { RestaurantDetailsStep } from '@/components/restaurant/RestaurantDetailsStep';
import { LocationContactStep } from '@/components/restaurant/LocationContactStep';
import type { Restaurant } from '@/services/restaurantService';

/**
 * Edit Restaurant Screen Content (wrapped by provider)
 */
function EditRestaurantContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    loadRestaurant,
  } = useRestaurantFormContext();

  const { isSubmitting, updateRestaurantData } = useRestaurantOperations();

  // Load existing restaurant data
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!id) {
        setLoadError('Restaurant ID is missing');
        return;
      }

      try {
        setIsLoading(true);
        const restaurant = await getRestaurant(id);
        
        if (!restaurant) {
          setLoadError('Restaurant not found');
          return;
        }

        // Convert restaurant data to form data
        const formData = {
          name: restaurant.name,
          category: restaurant.category as any,
          tags: restaurant.tags,
          signatureDish: restaurant.signatureDish,
          description: restaurant.description,
          coverPhotoUrl: restaurant.coverPhotoUrl,
          additionalPhotosUrls: restaurant.photos || [],
          additionalPhotosUris: [],
          address: restaurant.address,
          city: restaurant.city,
          coordinates: restaurant.location ? {
            latitude: restaurant.location.latitude,
            longitude: restaurant.location.longitude,
          } : undefined,
          phone: restaurant.phone ? restaurant.phone.replace('+94', '') : '', // Remove country code for display
          website: restaurant.website,
          openTime: restaurant.openTime,
          closeTime: restaurant.closeTime,
          openAllDays: restaurant.openAllDays,
        };

        loadRestaurant(formData);
      } catch (error) {
        console.error('Error loading restaurant:', error);
        setLoadError('Failed to load restaurant data');
      } finally {
        setIsLoading(false);
      }
    };

    loadRestaurantData();
  }, [id, loadRestaurant]);

  // Handle back button (Step 2 -> Step 1)
  const handlePrevStep = () => {
    prevStep();
    // Reset scroll position to top when going back to Step 1
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);
  };
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
      // Reset scroll position to top when navigating to Step 2
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    } else {
      // Scroll to top to show errors
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Handle save as draft
  const handleSaveAsDraft = async () => {
    if (!id || !validateStep2ForDraft()) {
      // Scroll to top to show errors
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    try {
      await updateRestaurantData(id, formData, true);
      Alert.alert('Success', 'Restaurant updated and saved as draft');
      resetForm();
      router.replace('/admin/restaurants');
    } catch (error) {
      console.error('Error updating restaurant:', error);
      Alert.alert(
        'Error', 
        'Failed to update restaurant. Please try again.',
        [
          { text: 'OK' }
        ]
      );
    }
  };

  // Handle publish restaurant
  const handlePublish = async () => {
    if (!id || !validateStep2ForPublish()) {
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
      await updateRestaurantData(id, formData, false);
      Alert.alert('Success', 'Restaurant updated and published successfully');
      resetForm();
      router.replace('/admin/restaurants');
    } catch (error) {
      console.error('Error updating restaurant:', error);
      Alert.alert(
        'Error', 
        'Failed to update restaurant. Please try again.',
        [
          { text: 'Retry', onPress: handlePublish },
          { text: 'Cancel' }
        ]
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Loading Restaurant...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.replace('/admin/restaurants')}>
                <Ionicons name="chevron-back" size={24} color="#E8505B" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading restaurant data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Error',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.replace('/admin/restaurants')}>
                <Ionicons name="chevron-back" size={24} color="#E8505B" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E8505B" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace('/admin/restaurants')}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
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
          <Text style={styles.publishButtonText}>Update Restaurant</Text>
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
          headerTitle: currentStep === 1 ? 'Step 1 Of 2: Restaurant Details' : 'Step 2 Of 2: Location & Contact',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: 'normal', // Removed bold - using normal weight
            color: '#333',
          },
          headerTitleAlign: 'left', // Align title to left to work with marginLeft
          headerLeft: () => (
            <TouchableOpacity onPress={currentStep === 1 ? handleCancel : prevStep} style={{ marginLeft: 20, marginRight: 15 }}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
          headerRight: undefined, // Remove settings icons completely
          headerStyle: {
            backgroundColor: '#FAFAF7',
            shadowOpacity: 0, // Remove shadow on iOS
            borderBottomWidth: 0, // Remove bottom border
          } as any, // Type assertion for elevation on Android
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
 * Edit Restaurant Screen with Form Provider
 */
export default function EditRestaurantScreen() {
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
      <EditRestaurantContent />
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
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E8505B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#E8505B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 4, // Further reduced bottom padding
    marginTop: -12, // Increased negative margin to pull even closer to header
    // Remove bottom border that creates divider line
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
    paddingVertical: 16, // Slightly reduced padding
    paddingBottom: 28,
    backgroundColor: '#FAFAF7',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0', // Thin top border only
    gap: 12,
  },
  cancelButton: {
    flex: 0.8, // Narrower button (about 1/3 width)
    paddingVertical: 12, // Reduced height (48dp)
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15, // Slightly smaller font
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 1.5, // Wider button (about 2/3 width)
    paddingVertical: 12, // Reduced height (48dp)
    borderRadius: 12,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6, // Slightly smaller gap
  },
  nextButtonText: {
    fontSize: 15, // Slightly smaller font
    fontWeight: '600',
    color: '#FFF',
  },
  draftButton: {
    flex: 0.8, // Narrower button
    paddingVertical: 12, // Reduced height
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonText: {
    fontSize: 15, // Slightly smaller font
    fontWeight: '600',
    color: '#666',
  },
  publishButton: {
    flex: 1.5, // Wider button
    paddingVertical: 12, // Reduced height
    borderRadius: 12,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  publishButtonText: {
    fontSize: 15, // Slightly smaller font
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
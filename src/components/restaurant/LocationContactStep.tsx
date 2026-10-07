/**
 * Step 2: Location & Contact Form Component
 * Handles address, location selection, and contact information
 */

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRestaurantFormContext } from '@/contexts/RestaurantFormContext';
import { TimeInput } from '@/components/restaurant/TimeInput';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { reverseGeocode, Coordinates, validateCoordinates } from '@/utils/location';

/**
 * Location & Contact Step Component (Step 2 of 2)
 */
export function LocationContactStep() {
  const {
    formData,
    errors,
    updateField,
  } = useRestaurantFormContext();

  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const { getCurrentLocationAsync, isLoading: isLoadingLocation } = useCurrentLocation();

  const handleCurrentLocationPress = async () => {
    try {
      const location = await getCurrentLocationAsync();
      if (location?.coordinates) {
        // Reverse geocode to get address
        const geocodeResult = await reverseGeocode(location.coordinates);
        
        // Ask user before overwriting existing address/city data
        const hasExistingData = formData.address.trim() || formData.city.trim();
        
        if (hasExistingData) {
          Alert.alert(
            'Update Address Fields?',
            'Do you want to update the address and city fields with the detected location?',
            [
              { text: 'Keep Current', style: 'cancel' },
              {
                text: 'Update',
                onPress: () => {
                  updateField('coordinates', location.coordinates);
                  if (geocodeResult.address) {
                    updateField('address', geocodeResult.address);
                  }
                  if (geocodeResult.city) {
                    updateField('city', geocodeResult.city);
                  }
                },
              },
            ]
          );
        } else {
          // No existing data, update directly
          updateField('coordinates', location.coordinates);
          if (geocodeResult.address) {
            updateField('address', geocodeResult.address);
          }
          if (geocodeResult.city) {
            updateField('city', geocodeResult.city);
          }
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleGeocodeAddress = async () => {
    const address = formData.address.trim();
    const city = formData.city.trim();
    
    if (!address || !city) {
      Alert.alert('Missing Information', 'Please enter both address and city before setting location.');
      return;
    }
    
    setIsGeocodingLocation(true);
    
    try {
      const fullAddress = `${address}, ${city}, Sri Lanka`;
      const geocodeResult = await Location.geocodeAsync(fullAddress);
      
      if (geocodeResult && geocodeResult.length > 0) {
        const { latitude, longitude } = geocodeResult[0];
        const coordinates: Coordinates = { latitude, longitude };
        
        if (validateCoordinates(coordinates)) {
          updateField('coordinates', coordinates);
          Alert.alert(
            'Location Found',
            `Successfully found location for "${address}, ${city}"`
          );
        } else {
          Alert.alert(
            'Invalid Location',
            'The found coordinates are outside Sri Lanka. Please verify your address.'
          );
        }
      } else {
        Alert.alert(
          'Location Not Found',
          'Could not find coordinates for this address. Please check the spelling and try again.'
        );
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert(
        'Geocoding Error',
        'Failed to find location. Please check your internet connection and try again.'
      );
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const renderLocationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Restaurant Location</Text>
      <Text style={styles.introText}>
        Help food lovers find your restaurant.
      </Text>
    </View>
  );

  const renderAddressField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Address <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputContainer, errors.address && styles.inputError]}>
        <Ionicons name="location-outline" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="No. 42 Light House Street"
          placeholderTextColor="#999"
          value={formData.address}
          onChangeText={(value) => updateField('address', value)}
          maxLength={200}
        />
      </View>
      {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
    </View>
  );

  const renderCityField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        City / Area <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputContainer, errors.city && styles.inputError]}>
        <Ionicons name="business-outline" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Colombo, Galle, Kandy"
          placeholderTextColor="#999"
          value={formData.city}
          onChangeText={(value) => updateField('city', value)}
          maxLength={50}
        />
      </View>
      {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
    </View>
  );

  const renderCoordinatesPreview = () => {
    if (!formData.coordinates) {
      return null;
    }

    return (
      <View style={styles.coordinatesPreview}>
        <View style={styles.coordinatesHeader}>
          <Ionicons name="location" size={16} color="#E8505B" />
          <Text style={styles.coordinatesTitle}>Location Set</Text>
          <TouchableOpacity 
            style={styles.clearLocationButton}
            onPress={() => updateField('coordinates', undefined)}
          >
            <Text style={styles.clearLocationText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.coordinatesText}>
          Latitude: {formData.coordinates.latitude.toFixed(6)}
        </Text>
        <Text style={styles.coordinatesText}>
          Longitude: {formData.coordinates.longitude.toFixed(6)}
        </Text>
      </View>
    );
  };

  const renderMapLocationField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Map Location <Text style={styles.required}>*</Text>
      </Text>
      <Text style={styles.fieldHint}>
        Set your restaurant&apos;s exact location coordinates
      </Text>
      
      {/* Coordinates Preview */}
      {renderCoordinatesPreview()}

      {/* Location Action Buttons */}
      <View style={styles.locationButtons}>
        <TouchableOpacity 
          style={[styles.currentLocationButton, isLoadingLocation && styles.buttonDisabled]}
          onPress={handleCurrentLocationPress}
          disabled={isLoadingLocation}
        >
          <Ionicons 
            name={isLoadingLocation ? "hourglass-outline" : "navigate-outline"} 
            size={16} 
            color="#E8505B" 
          />
          <Text style={styles.currentLocationText}>
            {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.chooseLocationButton, isGeocodingLocation && styles.buttonDisabled]}
          onPress={handleGeocodeAddress}
          disabled={isGeocodingLocation}
        >
          <Ionicons 
            name={isGeocodingLocation ? "hourglass-outline" : "search-outline"} 
            size={16} 
            color="#FFF" 
          />
          <Text style={styles.chooseLocationText}>
            {isGeocodingLocation ? 'Finding...' : 'Find Location from Address'}
          </Text>
        </TouchableOpacity>
      </View>

      {!formData.coordinates && (
        <View style={styles.locationError}>
          <Ionicons name="alert-circle" size={16} color="#E8505B" />
          <Text style={styles.locationErrorText}>No location selected</Text>
        </View>
      )}
      
      {errors.coordinates && <Text style={styles.errorText}>{errors.coordinates}</Text>}
    </View>
  );

  const renderContactSection = () => (
    <View style={[styles.section, styles.subsequentSection]}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
    </View>
  );

  const renderPhoneField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Phone Number <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.phoneContainer, errors.phone && styles.inputError]}>
        <View style={styles.phonePrefix}>
          <Text style={styles.phoneFlagText}>🇱🇰</Text>
          <Text style={styles.phonePrefixText}>+94</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="71 234 5678"
          placeholderTextColor="#999"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>
      {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
    </View>
  );

  const renderWebsiteField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Website URL (optional)</Text>
      <View style={[styles.inputContainer, errors.website && styles.inputError]}>
        <Ionicons name="globe-outline" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="https://example.lk"
          placeholderTextColor="#999"
          value={formData.website}
          onChangeText={(value) => updateField('website', value)}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {errors.website && <Text style={styles.errorText}>{errors.website}</Text>}
    </View>
  );

  const renderOpeningHoursSection = () => (
    <View style={[styles.section, styles.subsequentSection]}>
      <Text style={styles.sectionTitle}>Opening Hours</Text>
    </View>
  );

  const renderTimeFields = () => (
    <View style={styles.timeFieldsContainer}>
      {/* Opening Time */}
      <TimeInput
        label="Opening Time"
        value={formData.openTime || '09:00'}
        onChangeTime={(time) => updateField('openTime', time)}
        error={errors.openTime}
      />

      {/* Separator */}
      <View style={styles.timeSeparator}>
        <Text style={styles.timeSeparatorText}>to</Text>
      </View>

      {/* Closing Time */}
      <TimeInput
        label="Closing Time"
        value={formData.closeTime || '22:00'}
        onChangeTime={(time) => updateField('closeTime', time)}
        error={errors.closeTime}
      />
    </View>
  );

  const renderTimeHint = () => (
    <View style={styles.timeHint}>
      <Text style={styles.timeHintText}>
        Use 24-hour format, e.g. 09:00 – 22:30. Overnight supported.
      </Text>
    </View>
  );

  const renderOpenAllDaysToggle = () => (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>Open All Days</Text>
      <Switch
        value={formData.openAllDays}
        onValueChange={(value) => updateField('openAllDays', value)}
        trackColor={{ false: '#E0E0E0', true: '#E8505B' }}
        thumbColor="#FFF"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderLocationSection()}
      {renderAddressField()}
      {renderCityField()}
      {renderMapLocationField()}
      
      {renderContactSection()}
      {renderPhoneField()}
      {renderWebsiteField()}
      
      {renderOpeningHoursSection()}
      {renderTimeFields()}
      {renderTimeHint()}
      {renderOpenAllDaysToggle()}
      
      {/* Bottom padding for footer */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 10, // Reduced bottom padding
    marginTop: -4, // Negative margin to pull closer to progress bar
  },
  subsequentSection: {
    marginTop: 8, // Small gap between sections instead of negative margin
    paddingTop: 12, // Small top padding for subsequent sections
  },
  sectionTitle: {
    fontSize: 22, // Reduced from 24 to 22
    fontWeight: '600', // Reduced boldness to match Step 1
    color: '#333',
    marginBottom: 4, // Further reduced margin
  },
  introText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  fieldContainer: {
    paddingHorizontal: 20,
    marginBottom: 18, // Further reduced for more compact layout to match Step 1
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#E8505B',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputError: {
    borderColor: '#E8505B',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 15,
  },
  errorText: {
    fontSize: 12,
    color: '#E8505B',
    marginTop: 4,
    marginLeft: 4,
  },
  locationButtons: {
    flexDirection: 'column', // Changed to column for better fit
    gap: 10, // Reduced gap
    marginTop: 12,
    marginBottom: 12,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8505B',
    paddingVertical: 12, // Slightly reduced padding
    paddingHorizontal: 16, // Added horizontal padding
    gap: 8,
  },
  currentLocationText: {
    fontSize: 13, // Slightly smaller font
    fontWeight: '500',
    color: '#E8505B',
  },
  chooseLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8505B',
    borderRadius: 12,
    paddingVertical: 12, // Slightly reduced padding
    paddingHorizontal: 16, // Added horizontal padding
    gap: 8,
  },
  chooseLocationText: {
    fontSize: 13, // Slightly smaller font
    fontWeight: '500',
    color: '#FFF',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationErrorText: {
    fontSize: 12,
    color: '#E8505B',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 15,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    gap: 8,
  },
  phoneFlagText: {
    fontSize: 16,
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  timeFieldsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 16,
  },
  timeSeparator: {
    paddingTop: 45, // Align with input fields after label
    alignItems: 'center',
  },
  timeSeparatorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeHint: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  timeHintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  coordinatesPreview: {
    backgroundColor: '#F0F8F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5E1C5',
    padding: 16,
    marginBottom: 12,
  },
  coordinatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
    marginLeft: 6,
    flex: 1,
  },
  clearLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearLocationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#2D5016',
    marginBottom: 2,
  },
  bottomPadding: {
    height: 20,
  },
});
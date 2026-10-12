/**
 * Step 2: Location & Contact Form Component
 * Handles address, location selection, and contact information
 */

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
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
import { searchPlaces } from '@/services/geocodingService';
import { DEFAULT_MAP_CENTER, MAP_STYLE_URL, OPEN_STREET_MAP_RASTER_STYLE } from '@/constants/map';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function AdminLocationMap({ coordinates, onChange, setScrollEnabled }: {
  coordinates?: Coordinates;
  onChange: (coordinates: Coordinates) => void;
  setScrollEnabled: (enabled: boolean) => void;
}) {
  const [mapModule, setMapModule] = React.useState<any>(null);
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<Awaited<ReturnType<typeof searchPlaces>>>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchAttempted, setSearchAttempted] = React.useState(false);
  const [styleFailed, setStyleFailed] = React.useState(false);
  const cameraRef = React.useRef<any>(null);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreCameraUntil = useRef(0);
  const [camera, setCamera] = useState({
    center: [coordinates?.longitude ?? DEFAULT_MAP_CENTER.longitude, coordinates?.latitude ?? DEFAULT_MAP_CENTER.latitude] as [number, number],
    zoom: coordinates ? 16 : 11,
  });

  React.useEffect(() => {
    if (!isExpoGo) {
      const timer = setTimeout(() => {
        try {
          setMapModule(require('@maplibre/maplibre-react-native'));
        } catch {
          setMapModule(null);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const moveTo = React.useCallback((next: Coordinates) => {
    const rounded = { latitude: Number(next.latitude.toFixed(6)), longitude: Number(next.longitude.toFixed(6)) };
    ignoreCameraUntil.current = Date.now() + 900;
    onChange(rounded);
    setCamera({ center: [rounded.longitude, rounded.latitude], zoom: 16 });
    cameraRef.current?.easeTo({ center: [rounded.longitude, rounded.latitude], zoom: 16, duration: 500 });
  }, [onChange]);

  React.useEffect(() => {
    if (!coordinates) return;
    const nextCenter: [number, number] = [coordinates.longitude, coordinates.latitude];
    if (camera.center[0] !== nextCenter[0] || camera.center[1] !== nextCenter[1]) {
      ignoreCameraUntil.current = Date.now() + 900;
      setCamera({ center: nextCenter, zoom: 16 });
      cameraRef.current?.easeTo({ center: nextCenter, zoom: 16, duration: 500 });
    }
  }, [coordinates, camera.center]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      const timer = setTimeout(() => setSuggestions([]), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(trimmed);
      setSuggestions(results);
      setSearchAttempted(true);
      setIsSearching(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => () => {
    if (regionTimer.current) clearTimeout(regionTimer.current);
  }, []);

  const searchNow = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    setIsSearching(true);
    const results = await searchPlaces(trimmed);
    setSuggestions(results);
    setSearchAttempted(true);
    setIsSearching(false);
  };

  const handleRegionDidChange = (event: any) => {
    const viewState = event.nativeEvent;
    if (!viewState?.userInteraction || Date.now() < ignoreCameraUntil.current) return;
    const centerPoint = viewState.center;
    if (!Array.isArray(centerPoint)) return;
    if (regionTimer.current) clearTimeout(regionTimer.current);
    regionTimer.current = setTimeout(() => {
      const [longitude, latitude] = centerPoint;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        onChange({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) });
      }
    }, 300);
  };

  if (isExpoGo) {
    return <Text style={styles.mapBuildNote}>Map picker available in the development build.</Text>;
  }
  if (!mapModule) return <View style={styles.adminMapLoading}><Text style={styles.mapBuildNote}>Loading map...</Text></View>;
  const Map = mapModule.Map;
  const Camera = mapModule.Camera;
  return (
    <View
      style={styles.adminMapContainer}
      onTouchStart={() => setScrollEnabled(false)}
      onTouchEnd={() => setScrollEnabled(true)}
      onTouchCancel={() => setScrollEnabled(true)}
    >
      <Map
        style={styles.adminMap}
        mapStyle={styleFailed ? OPEN_STREET_MAP_RASTER_STYLE : MAP_STYLE_URL}
        attribution
        logoEnabled={false}
        onPress={(event: any) => {
          const point = event.nativeEvent?.lngLat || event.lngLat;
          const [longitude, latitude] = Array.isArray(point) ? point : [point?.longitude, point?.latitude];
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) moveTo({ latitude, longitude });
        }}
        onRegionDidChange={handleRegionDidChange}
        onDidFailLoadingMap={() => setStyleFailed(true)}
      >
        <Camera ref={cameraRef} center={camera.center} zoom={camera.zoom} />
      </Map>
      <View pointerEvents="none" style={styles.centerPin}><Ionicons name="location" size={42} color="#E8505B" /></View>
      <View pointerEvents="box-none" style={styles.adminMapOverlays}>
        <View style={styles.adminMapSearch}>
        <Ionicons name="search" size={16} color="#64748B" />
        <TextInput
          style={styles.adminMapSearchInput}
          placeholder="Search address or place"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => { void searchNow(); }}
          returnKeyType="search"
        />
        {isSearching && <Text style={styles.searchingText}>...</Text>}
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.slice(0, 6).map((place) => (
              <TouchableOpacity key={`${place.latitude}:${place.longitude}`} style={styles.suggestion} onPress={() => {
                moveTo(place);
                setQuery(place.displayName);
                setSuggestions([]);
                Keyboard.dismiss();
              }}>
                <Text numberOfLines={1} style={styles.suggestionText}>{place.displayName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {searchAttempted && !isSearching && suggestions.length === 0 && query.trim().length >= 3 && (
          <View style={styles.noResults}>
            <Text style={styles.suggestionText}>No results. Try a nearby town name</Text>
            <TouchableOpacity onPress={() => { void searchNow(); }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

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
  const [scrollEnabled, setScrollEnabled] = useState(true);
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
    } catch {
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
      const places = await searchPlaces(fullAddress);
      const geocodeResult = places[0] ? [places[0]] : [];
      
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
        Alert.alert('Location Not Found', 'Could not find this address. Try a nearby town or drop the pin on the map.');
      }
    } catch {
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
      <AdminLocationMap
        coordinates={formData.coordinates}
        onChange={(coordinates) => updateField('coordinates', coordinates)}
        setScrollEnabled={setScrollEnabled}
      />
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
    <ScrollView style={styles.container} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
  adminMapContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    position: 'relative',
  },
  adminMap: { flex: 1 },
  adminMapLoading: {
    height: 240,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapBuildNote: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
  adminMapSearch: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    elevation: 3,
  },
  adminMapOverlays: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  searchingText: { color: '#64748B', fontSize: 12 },
  suggestions: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    elevation: 4,
  },
  suggestion: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionText: { color: '#1F2937', fontSize: 12 },
  noResults: { marginTop: 6, padding: 12, borderRadius: 12, backgroundColor: '#FFF', elevation: 4 },
  retryText: { marginTop: 6, color: '#E8505B', fontWeight: '600', fontSize: 12 },
  adminMapSearchInput: { flex: 1, color: '#1F2937', fontSize: 13 },
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
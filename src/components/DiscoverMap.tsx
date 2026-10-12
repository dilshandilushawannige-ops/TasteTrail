import React, { memo, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Restaurant } from '@/services/restaurantService';
import type { Coordinates } from '@/utils/distance';
import { MAP_STYLE_URL, OPEN_STREET_MAP_RASTER_STYLE } from '@/constants/map';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 220;

export interface DiscoverMapProps {
  searchCenter: Coordinates;
  userLocation: Coordinates | null;
  nearbyRestaurants: Restaurant[];
  openCount: number;
  currentArea: string;
  selectedRestaurant: Restaurant | null;
  onRestaurantSelect: (restaurant: Restaurant) => void;
  onMyLocationPress: () => void;
}

const validLocation = (restaurant: Restaurant) => {
  const latitude = Number(restaurant.location?.latitude);
  const longitude = Number(restaurant.location?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0;
};

const FallbackMapView = memo(function FallbackMapView({ currentArea, onMyLocationPress, openCount }: DiscoverMapProps) {
  return (
    <View style={[styles.container, styles.fallbackContainer]}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={48} color="rgba(255,255,255,0.7)" />
        <Text style={styles.placeholderText}>Map View</Text>
        <Text style={styles.placeholderSubtext}>Available in development build</Text>
      </View>
      <View style={styles.openPill}><Ionicons name="flame" size={14} color="#E8505B" /><Text style={styles.pillText}>{openCount} Hearth Kitchens Open</Text></View>
      <TouchableOpacity style={styles.targetButton} onPress={onMyLocationPress}><Ionicons name="locate" size={20} color="#E8505B" /></TouchableOpacity>
      <View style={styles.locationPill}><View style={styles.greenDot} /><Text style={styles.pillText}>You are near {currentArea}</Text></View>
    </View>
  );
});

const RealMapView = memo(function RealMapView(props: DiscoverMapProps) {
  const { searchCenter, userLocation, nearbyRestaurants, openCount, currentArea, selectedRestaurant, onRestaurantSelect, onMyLocationPress } = props;
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [mapModule, setMapModule] = useState<any>(null);
  const [styleFailed, setStyleFailed] = useState(false);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setMapModule(require('@maplibre/maplibre-react-native'));
      } catch {
        setMapModule(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    cameraRef.current?.easeTo({
      center: [searchCenter.longitude, searchCenter.latitude],
      zoom,
      duration: 500,
    });
  }, [searchCenter, zoom]);

  useEffect(() => {
    if (!cameraRef.current || !nearbyRestaurants.length) return;
    const points = nearbyRestaurants.filter(validLocation).slice(0, 100);
    if (points.length > 1) {
      const longitudes = points.map((item) => Number(item.location!.longitude));
      const latitudes = points.map((item) => Number(item.location!.latitude));
      cameraRef.current.fitBounds(
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
        { top: 48, right: 48, bottom: 48, left: 48 },
        600,
      );
    } else if (points[0]) {
      cameraRef.current.easeTo({
        center: [Number(points[0].location!.longitude), Number(points[0].location!.latitude)],
        zoom: 14,
        duration: 600,
      });
    }
  }, [nearbyRestaurants]);

  if (!mapModule) {
    return <View style={[styles.container, styles.loadingContainer]}><Text style={styles.loadingText}>Loading map...</Text></View>;
  }

  const Map = mapModule.Map;
  const Camera = mapModule.Camera;
  const Marker = mapModule.Marker;
  const markers = nearbyRestaurants.filter(validLocation).slice(0, 100);
  const style = styleFailed ? OPEN_STREET_MAP_RASTER_STYLE : MAP_STYLE_URL;

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={style}
        attribution
        logoEnabled={false}
        onDidFinishLoadingStyle={() => setStyleFailed(false)}
        onDidFailLoadingMap={() => setStyleFailed(true)}
      >
        <Camera ref={cameraRef} center={[searchCenter.longitude, searchCenter.latitude]} zoom={zoom} />
        {userLocation && (
          <Marker lngLat={[userLocation.longitude, userLocation.latitude]} anchor="center">
            <View style={styles.userHalo}><View style={styles.userDot} /></View>
          </Marker>
        )}
        {markers.map((restaurant) => (
          <Marker
            key={restaurant.id}
            lngLat={[Number(restaurant.location!.longitude), Number(restaurant.location!.latitude)]}
            anchor="bottom"
            onPress={() => onRestaurantSelect(restaurant)}
          >
            <View style={styles.restaurantMarker}>
              {selectedRestaurant?.id === restaurant.id && <View style={styles.markerLabel}><Text numberOfLines={1} style={styles.markerLabelText}>{restaurant.name}</Text></View>}
              <View style={[styles.markerCircle, selectedRestaurant?.id === restaurant.id && styles.selectedMarkerCircle]}>
                <Ionicons name="restaurant" size={selectedRestaurant?.id === restaurant.id ? 15 : 12} color="#FFF" />
              </View>
            </View>
          </Marker>
        ))}
      </Map>
      <View style={styles.openPill}><Ionicons name="flame" size={14} color="#E8505B" /><Text style={styles.pillText}>{openCount} Hearth Kitchens Open</Text></View>
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={() => { setZoom((value) => value + 1); cameraRef.current?.zoomTo(zoom + 1, { duration: 250 }); }}><Ionicons name="add" size={20} color="#333" /></TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => { setZoom((value) => value - 1); cameraRef.current?.zoomTo(zoom - 1, { duration: 250 }); }}><Ionicons name="remove" size={20} color="#333" /></TouchableOpacity>
        <TouchableOpacity style={styles.targetButton} onPress={onMyLocationPress}><Ionicons name="locate" size={20} color="#E8505B" /></TouchableOpacity>
      </View>
      <View style={styles.locationPill}><View style={styles.greenDot} /><Text style={styles.pillText}>You are near {currentArea}</Text></View>
      {styleFailed && <TouchableOpacity style={styles.retryPill} onPress={() => setStyleFailed(false)}><Text style={styles.retryText}>Map unavailable · Retry</Text></TouchableOpacity>}
    </View>
  );
});

export const DiscoverMap = memo(function DiscoverMap(props: DiscoverMapProps) {
  return isExpoGo ? <FallbackMapView {...props} /> : <RealMapView {...props} />;
});

const styles = StyleSheet.create({
  container: { height: MAP_HEIGHT, width: SCREEN_WIDTH - 32, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  map: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { color: '#666', fontSize: 13 },
  fallbackContainer: { backgroundColor: '#4A90A4' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 17, fontWeight: '600', color: '#FFF', marginTop: 6 },
  placeholderSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  openPill: { position: 'absolute', top: 10, left: 10, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { color: '#333', fontSize: 11, fontWeight: '600' },
  mapControls: { position: 'absolute', top: 10, right: 10, gap: 7 },
  controlButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  targetButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  locationPill: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  userHalo: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(59,130,246,0.22)', justifyContent: 'center', alignItems: 'center' },
  userDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#FFF' },
  restaurantMarker: { alignItems: 'center' },
  markerCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8505B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  selectedMarkerCircle: { width: 36, height: 36, borderRadius: 18 },
  markerLabel: { maxWidth: 150, backgroundColor: '#1F2937', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  markerLabelText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  retryPill: { position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  retryText: { color: '#E8505B', fontSize: 11, fontWeight: '600' },
});

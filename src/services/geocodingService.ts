import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { Coordinates } from '@/utils/distance';

export interface PlaceResult extends Coordinates {
  name: string;
  displayName: string;
  address?: string;
  city?: string;
}

const cache = new Map<string, PlaceResult[]>();
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

async function waitForRateLimit(): Promise<void> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  const previous = requestQueue;
  requestQueue = previous.then(async () => {
    const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
    release();
  });
  await next;
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  await waitForRateLimit();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const nominatimHeaders = (): Record<string, string> => ({
  'Accept-Language': 'en',
  ...(Platform.OS === 'web' ? {} : { 'User-Agent': 'TasteTrail/1.0' }),
});

function inSriLanka(place: Coordinates): boolean {
  return place.latitude >= 5.8 && place.latitude <= 9.9 && place.longitude >= 79.4 && place.longitude <= 82;
}

function fromNominatim(item: Record<string, unknown>): PlaceResult {
  const address = (item.address ?? {}) as Record<string, string>;
  const displayName = String(item.display_name ?? '');
  return {
    name: String(item.name ?? address.city ?? address.town ?? displayName.split(',')[0] ?? ''),
    displayName,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    address: address.road || address.suburb || address.neighbourhood,
    city: address.city || address.town || address.municipality || address.county,
  };
}

function fromPhoton(feature: Record<string, unknown>): PlaceResult {
  const geometry = (feature.geometry ?? {}) as Record<string, unknown>;
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  const properties = (feature.properties ?? {}) as Record<string, string>;
  const displayName = [properties.name, properties.street, properties.city, properties.state, properties.country]
    .filter(Boolean)
    .join(', ');
  return {
    name: properties.name || properties.city || '',
    displayName,
    latitude: Number(coordinates[1]),
    longitude: Number(coordinates[0]),
    address: properties.street,
    city: properties.city || properties.town,
  };
}

function fallbackPlaces(results: Location.LocationGeocodedLocation[], query: string): PlaceResult[] {
  return results.map((result) => ({
    name: query,
    displayName: query,
    latitude: result.latitude,
    longitude: result.longitude,
  })).filter(inSriLanka);
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const cached = cache.get(`search:${normalized}`);
  if (cached) return cached;

  try {
    const values = await fetchJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=lk&addressdetails=1&q=${encodeURIComponent(query.trim())}`,
      nominatimHeaders(),
    ) as Record<string, unknown>[];
    const results = values.map(fromNominatim).filter((place) => inSriLanka(place) && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
    if (results.length) {
      cache.set(`search:${normalized}`, results);
      return results;
    }
  } catch {
    // Try Photon and then expo-location below.
  }

  try {
    const photonQuery = /sri\s*lanka/i.test(query) ? query.trim() : `${query.trim()}, Sri Lanka`;
    const data = await fetchJson(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&limit=6&lang=en`,
      { 'Accept-Language': 'en' },
    ) as { features?: Record<string, unknown>[] };
    const results = (data.features ?? []).map(fromPhoton).filter((place) => inSriLanka(place) && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
    if (results.length) {
      cache.set(`search:${normalized}`, results);
      return results;
    }
  } catch {
    // Use the device geocoder as the final fallback.
  }

  try {
    const results = fallbackPlaces(await Location.geocodeAsync(`${query.trim()}, Sri Lanka`), query.trim());
    if (results.length) cache.set(`search:${normalized}`, results);
    return results;
  } catch {
    return [];
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<PlaceResult | null> {
  const key = `reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached?.[0]) return cached[0];

  try {
    const result = fromNominatim(await fetchJson(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      nominatimHeaders(),
    ) as Record<string, unknown>);
    if (inSriLanka(result)) {
      cache.set(key, [result]);
      return result;
    }
  } catch {
    // Try Photon and then expo-location below.
  }

  try {
    const data = await fetchJson(
      `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&lang=en`,
      { 'Accept-Language': 'en' },
    ) as { features?: Record<string, unknown>[] };
    const result = data.features?.[0] ? fromPhoton(data.features[0]) : null;
    if (result && inSriLanka(result)) {
      cache.set(key, [result]);
      return result;
    }
  } catch {
    // Use the device reverse geocoder as the final fallback.
  }

  try {
    const item = (await Location.reverseGeocodeAsync({ latitude, longitude }))[0];
    if (!item) return null;
    const result: PlaceResult = {
      name: item.city || item.district || item.region || '',
      displayName: [item.street, item.city, item.region].filter(Boolean).join(', '),
      latitude,
      longitude,
      address: [item.streetNumber, item.street].filter(Boolean).join(' ') || undefined,
      city: item.city || item.district || item.region || undefined,
    };
    cache.set(key, [result]);
    return result;
  } catch {
    return null;
  }
}

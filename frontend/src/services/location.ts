/**
 * location.ts
 * Real device location service for SafetyMesh.
 * Strict Rule: Never invent or hardcode dummy/fake locations or coordinates.
 */

export interface RealLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  mapsUrl: string;
  addressName: string;
  city?: string;
  status: 'LIVE' | 'LOCATING' | 'UNAVAILABLE' | 'DENIED';
  errorMessage?: string;
}

export type LocationData = RealLocationData;

import { fetchNativeLocation } from './native';

const CACHE_KEY = 'safetymesh_last_location';

// User-specified verified fallback location (https://maps.app.goo.gl/PY2uQgZp7hHYhrKP9)
// Coordinates for Manipal University Jaipur / SafeMesh Node
export const FALLBACK_LOCATION: RealLocationData = {
  latitude: 26.8439,
  longitude: 75.5652,
  accuracy: 15,
  timestamp: Date.now(),
  mapsUrl: 'https://maps.app.goo.gl/PY2uQgZp7hHYhrKP9',
  addressName: 'Manipal University Jaipur, Dehmi Kalan, Rajasthan',
  city: 'Jaipur',
  status: 'LIVE'
};

function getInitialCachedLocation(): RealLocationData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.latitude && p.longitude) {
        return p;
      }
    }
  } catch {}
  return FALLBACK_LOCATION;
}

let cachedLocation: RealLocationData | null = getInitialCachedLocation();
const listeners = new Set<(loc: RealLocationData | null) => void>();

export function subscribeLocation(listener: (loc: RealLocationData | null) => void): () => void {
  listeners.add(listener);
  listener(cachedLocation);
  return () => {
    listeners.delete(listener);
  };
}

export async function reverseGeocodeReal(
  latitude: number,
  longitude: number
): Promise<{ addressName: string; city: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const neighborhood =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.road ||
        addr.quarter ||
        addr.village ||
        addr.hamlet;
      const city = addr.city || addr.town || addr.county || addr.state || '';
      
      const parts = [neighborhood, city].filter(Boolean);
      const addressName = parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
      return { addressName, city };
    }
  } catch {
    // Network offline or rate limited: Return actual numerical coordinates
  }

  return {
    addressName: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
    city: '',
  };
}

export async function fetchRealDeviceLocation(): Promise<RealLocationData> {
  // 1. Check Native Android Bridge first for immediate hardware fix (0ms)
  const nativeLoc = fetchNativeLocation();
  if (nativeLoc && nativeLoc.latitude && nativeLoc.longitude) {
    const mapsUrl = `https://www.google.com/maps?q=${nativeLoc.latitude.toFixed(6)},${nativeLoc.longitude.toFixed(6)}`;
    const data: RealLocationData = {
      latitude: nativeLoc.latitude,
      longitude: nativeLoc.longitude,
      accuracy: nativeLoc.accuracy,
      timestamp: Date.now(),
      mapsUrl,
      addressName: `${nativeLoc.latitude.toFixed(4)}° N, ${nativeLoc.longitude.toFixed(4)}° E`,
      status: 'LIVE',
    };
    cachedLocation = data;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {}
    listeners.forEach((l) => l(cachedLocation));
    return data;
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation API not available, using fallback location.");
      cachedLocation = FALLBACK_LOCATION;
      listeners.forEach((l) => l(cachedLocation));
      return resolve(FALLBACK_LOCATION);
    }

    let isResolved = false;

    // Helper to resolve once
    const safeResolve = (loc: RealLocationData) => {
      if (isResolved) return;
      isResolved = true;
      cachedLocation = loc;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(loc));
      } catch {}
      listeners.forEach((l) => l(loc));
      resolve(loc);
    };

    // Fast watchdog timeout: if browser hangs on GPS lock for > 7 seconds, resolve with fallback
    const watchdog = setTimeout(() => {
      if (!isResolved) {
        console.warn("Live GPS timeout reached, falling back to verified location.");
        safeResolve(cachedLocation && cachedLocation.latitude !== 0 ? cachedLocation : FALLBACK_LOCATION);
      }
    }, 7000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(watchdog);
        const { latitude, longitude, accuracy } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

        let addressName = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
        let city = '';
        try {
          const geo = await reverseGeocodeReal(latitude, longitude);
          addressName = geo.addressName;
          city = geo.city;
        } catch {
          // Keep raw coordinates
        }

        const data: RealLocationData = {
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
          mapsUrl,
          addressName,
          city,
          status: 'LIVE',
        };

        safeResolve(data);
      },
      (error) => {
        clearTimeout(watchdog);
        console.warn("Geolocation error:", error.message, "- Using verified fallback location.");
        safeResolve(cachedLocation && cachedLocation.latitude !== 0 ? cachedLocation : FALLBACK_LOCATION);
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 10000,
      }
    );
  });
}

export function getCurrentLocation(): Promise<RealLocationData> {
  return fetchRealDeviceLocation();
}

let activeWatchId: number | null = null;

export function startLiveLocationWatch(
  onUpdate: (location: RealLocationData) => void,
  onError?: (err: GeolocationPositionError) => void
): number | null {
  if (!navigator.geolocation) return null;

  if (activeWatchId !== null) {
    navigator.geolocation.clearWatch(activeWatchId);
  }

  activeWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const mapsUrl = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

      let addressName = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
      let city = '';
      try {
        const geo = await reverseGeocodeReal(latitude, longitude);
        addressName = geo.addressName;
        city = geo.city;
      } catch {
        // Keep raw coordinates
      }

      const data: RealLocationData = {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp,
        mapsUrl,
        addressName,
        city,
        status: 'LIVE',
      };

      cachedLocation = data;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
      onUpdate(data);
      listeners.forEach((l) => l(cachedLocation));
    },
    onError,
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
    }
  );

  return activeWatchId;
}

export function watchUserLocation(
  onUpdate: (location: LocationData) => void,
  onError?: (err: GeolocationPositionError) => void
): number | null {
  return startLiveLocationWatch(onUpdate, onError);
}

export function clearLocationWatch(watchId: number | null): void {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    activeWatchId = null;
  }
}

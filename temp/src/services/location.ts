/**
 * location.ts
 * Real device location service for SafeMesh.
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

let cachedLocation: RealLocationData | null = null;
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
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const errData: RealLocationData = {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: Date.now(),
        mapsUrl: '',
        addressName: '—',
        status: 'UNAVAILABLE',
        errorMessage: 'Geolocation is not supported on this device.',
      };
      cachedLocation = errData;
      listeners.forEach((l) => l(cachedLocation));
      reject(new Error(errData.errorMessage));
      return;
    }

    navigator.geolocation.getCurrentPosition(
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
        listeners.forEach((l) => l(cachedLocation));
        resolve(data);
      },
      (error) => {
        const isDenied = error.code === 1;
        const errData: RealLocationData = {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: Date.now(),
          mapsUrl: '',
          addressName: '—',
          status: isDenied ? 'DENIED' : 'UNAVAILABLE',
          errorMessage: isDenied
            ? 'Location access required'
            : 'Unable to determine your location.',
        };
        cachedLocation = errData;
        listeners.forEach((l) => l(cachedLocation));
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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

/**
 * permissions.ts
 * Centralized Permission Manager for SafetyMesh v4.0
 * Handles Location, Bluetooth, Notifications, SMS, and Background Location with reactive state and persistent caching.
 */

export type PermissionStatus = 'GRANTED' | 'DENIED' | 'BLOCKED' | 'UNKNOWN' | 'PROMPT';

export interface SafetyMeshPermissionsState {
  location: PermissionStatus;
  background_location: PermissionStatus;
  bluetooth: PermissionStatus;
  notifications: PermissionStatus;
  sms: PermissionStatus;
  battery: PermissionStatus;
  isInitialFlowCompleted: boolean;
}

const STORAGE_KEY_ONBOARDING = 'safetymesh_permission_flow_completed';
const STORAGE_KEY_LOCATION = 'safetymesh_location_granted';
const STORAGE_KEY_BG_LOC = 'safetymesh_bg_loc_granted';
const STORAGE_KEY_BT = 'safetymesh_bt_granted';
const STORAGE_KEY_SMS = 'safetymesh_sms_granted';
const STORAGE_KEY_BATTERY = 'safetymesh_battery_granted';

function getInitialLocationStatus(): PermissionStatus {
  if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_LOCATION) === 'true') {
    return 'GRANTED';
  }
  return 'UNKNOWN';
}

let cachedState: SafetyMeshPermissionsState = {
  location: getInitialLocationStatus(),
  background_location: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_BG_LOC) === 'true' ? 'GRANTED' : 'UNKNOWN',
  bluetooth: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_BT) === 'true' ? 'GRANTED' : 'UNKNOWN',
  notifications: 'UNKNOWN',
  sms: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_SMS) === 'true' ? 'GRANTED' : 'UNKNOWN',
  battery: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_BATTERY) === 'true' ? 'GRANTED' : 'UNKNOWN',
  isInitialFlowCompleted: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_ONBOARDING) === 'true',
};

const listeners = new Set<(state: SafetyMeshPermissionsState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...cachedState }));
}

export function subscribePermissions(listener: (state: SafetyMeshPermissionsState) => void): () => void {
  listeners.add(listener);
  listener({ ...cachedState });
  return () => {
    listeners.delete(listener);
  };
}

export function getPermissionsState(): SafetyMeshPermissionsState {
  return { ...cachedState };
}

export function setInitialFlowCompleted(completed: boolean): void {
  cachedState.isInitialFlowCompleted = completed;
  localStorage.setItem(STORAGE_KEY_ONBOARDING, completed ? 'true' : 'false');
  notifyListeners();
}

/**
 * Check Location Permission state
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.hasLocationPermission === 'function') {
    if (bridge.hasLocationPermission()) {
      cachedState.location = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
      notifyListeners();
      return 'GRANTED';
    }
  }

  if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_LOCATION) === 'true') {
    cachedState.location = 'GRANTED';
    notifyListeners();
    return 'GRANTED';
  }

  if (!navigator.geolocation) {
    cachedState.location = 'DENIED';
    notifyListeners();
    return 'DENIED';
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (result.state === 'granted') {
        cachedState.location = 'GRANTED';
        localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
        notifyListeners();
        return 'GRANTED';
      } else if (result.state === 'denied') {
        cachedState.location = 'DENIED';
        notifyListeners();
        return 'DENIED';
      } else {
        cachedState.location = 'PROMPT';
        notifyListeners();
        return 'PROMPT';
      }
    } catch {
      // Ignore query errors in mobile webviews
    }
  }

  return cachedState.location;
}

/**
 * Request Location Permission directly
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.requestLocationPermission === 'function') {
    bridge.requestLocationPermission();
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      cachedState.location = 'DENIED';
      notifyListeners();
      resolve('DENIED');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        cachedState.location = 'GRANTED';
        localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
        notifyListeners();
        resolve('GRANTED');
      },
      (err) => {
        // If bridge already granted it, prioritize that over webview GPS timeout
        if (bridge && typeof bridge.hasLocationPermission === 'function' && bridge.hasLocationPermission()) {
          cachedState.location = 'GRANTED';
          localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
          notifyListeners();
          resolve('GRANTED');
          return;
        }
        const status: PermissionStatus = err.code === 1 ? 'DENIED' : 'BLOCKED';
        cachedState.location = status;
        notifyListeners();
        resolve(status);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Check Notifications Permission state
 */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  if (!('Notification' in window)) {
    cachedState.notifications = 'DENIED';
    notifyListeners();
    return 'DENIED';
  }

  const perm = Notification.permission;
  const status: PermissionStatus =
    perm === 'granted' ? 'GRANTED' : perm === 'denied' ? 'DENIED' : 'PROMPT';

  cachedState.notifications = status;
  notifyListeners();
  return status;
}

/**
 * Request Notification Permission
 */
export async function requestNotificationPermission(): Promise<PermissionStatus> {
  if (!('Notification' in window)) {
    cachedState.notifications = 'DENIED';
    notifyListeners();
    return 'DENIED';
  }

  try {
    const result = await Notification.requestPermission();
    const status: PermissionStatus =
      result === 'granted' ? 'GRANTED' : result === 'denied' ? 'DENIED' : 'PROMPT';

    cachedState.notifications = status;
    notifyListeners();
    return status;
  } catch {
    cachedState.notifications = 'DENIED';
    notifyListeners();
    return 'DENIED';
  }
}

/**
 * Check Bluetooth Permission / Availability
 */
export async function checkBluetoothPermission(): Promise<PermissionStatus> {
  const isAndroidGranted = localStorage.getItem(STORAGE_KEY_BT);
  if (isAndroidGranted === 'true') {
    cachedState.bluetooth = 'GRANTED';
    notifyListeners();
    return 'GRANTED';
  }

  if ('bluetooth' in navigator && (navigator as any).bluetooth?.getAvailability) {
    try {
      const available = await (navigator as any).bluetooth.getAvailability();
      if (available) {
        cachedState.bluetooth = 'PROMPT';
      }
    } catch {}
  }

  if (cachedState.bluetooth === 'UNKNOWN') {
    cachedState.bluetooth = 'PROMPT';
  }

  notifyListeners();
  return cachedState.bluetooth;
}

/**
 * Request Bluetooth Permission
 */
export async function requestBluetoothPermission(): Promise<PermissionStatus> {
  if (window.location.protocol.startsWith('http')) {
    try {
      window.location.href =
        'intent://bluetooth#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {}
  }

  if ('bluetooth' in navigator && (navigator as any).bluetooth?.requestDevice) {
    try {
      await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      cachedState.bluetooth = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_BT, 'true');
      notifyListeners();
      return 'GRANTED';
    } catch (e: any) {
      if (e.name === 'NotFoundError') {
        cachedState.bluetooth = 'PROMPT';
      } else {
        cachedState.bluetooth = 'DENIED';
      }
      notifyListeners();
      return cachedState.bluetooth;
    }
  }

  cachedState.bluetooth = 'GRANTED';
  localStorage.setItem(STORAGE_KEY_BT, 'true');
  notifyListeners();
  return 'GRANTED';
}

/**
 * Check SMS Permission
 */
export async function checkSmsPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.hasSmsPermission === 'function') {
    const granted = bridge.hasSmsPermission();
    cachedState.sms = granted ? 'GRANTED' : 'PROMPT';
    localStorage.setItem(STORAGE_KEY_SMS, granted ? 'true' : 'false');
    notifyListeners();
    return cachedState.sms;
  }

  const isAndroidGranted = localStorage.getItem(STORAGE_KEY_SMS);
  if (isAndroidGranted === 'true') {
    cachedState.sms = 'GRANTED';
  } else {
    cachedState.sms = 'PROMPT';
  }
  notifyListeners();
  return cachedState.sms;
}

/**
 * Request SMS Permission via Native Android Bridge
 */
export async function requestSmsPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.requestEmergencyPermissions === 'function') {
    bridge.requestEmergencyPermissions();
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 400));
      if (typeof bridge.hasSmsPermission === 'function' && bridge.hasSmsPermission()) {
        cachedState.sms = 'GRANTED';
        localStorage.setItem(STORAGE_KEY_SMS, 'true');
        notifyListeners();
        return 'GRANTED';
      }
    }
  }

  if (window.location.protocol.startsWith('http')) {
    try {
      window.location.href = 'intent://sms#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {}
  }

  cachedState.sms = 'PROMPT';
  notifyListeners();
  return 'PROMPT';
}

export async function checkBackgroundLocationPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.hasBackgroundLocationPermission === 'function') {
    if (bridge.hasBackgroundLocationPermission()) {
      cachedState.background_location = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_BG_LOC, 'true');
      notifyListeners();
      return 'GRANTED';
    }
  }

  const isAndroidGranted = localStorage.getItem(STORAGE_KEY_BG_LOC);
  if (isAndroidGranted === 'true') {
    cachedState.background_location = 'GRANTED';
  } else {
    cachedState.background_location = 'PROMPT';
  }
  notifyListeners();
  return cachedState.background_location;
}

export async function requestBackgroundLocationPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.requestBackgroundLocationPermission === 'function') {
    bridge.requestBackgroundLocationPermission();
  } else if (window.location.protocol.startsWith('http')) {
    try {
      window.location.href = 'intent://background_location#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {}
  }
  cachedState.background_location = 'PROMPT';
  notifyListeners();
  return 'PROMPT';
}

export async function checkBatteryOptimizationPermission(): Promise<PermissionStatus> {
  const isAndroidGranted = localStorage.getItem(STORAGE_KEY_BATTERY);
  if (isAndroidGranted === 'true') {
    cachedState.battery = 'GRANTED';
  } else {
    cachedState.battery = 'PROMPT';
  }
  notifyListeners();
  return cachedState.battery;
}

export async function requestBatteryOptimizationPermission(): Promise<PermissionStatus> {
  if (window.location.protocol.startsWith('http')) {
    try {
      window.location.href = 'intent://battery_optimization#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {}
  }
  cachedState.battery = 'PROMPT';
  notifyListeners();
  return 'PROMPT';
}

/**
 * Re-check all permissions (called on startup and whenever app returns to foreground)
 */
export async function refreshAllPermissions(): Promise<SafetyMeshPermissionsState> {
  await Promise.allSettled([
    checkLocationPermission(),
    checkBackgroundLocationPermission(),
    checkBatteryOptimizationPermission(),
    checkBluetoothPermission(),
    checkNotificationPermission(),
    checkSmsPermission(),
  ]);
  return { ...cachedState };
}

// Auto-register foreground listener
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    refreshAllPermissions();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshAllPermissions();
    }
  });

  // Listen for hashchange returned by Android Permission Activities
  window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('bt_result=granted')) {
      cachedState.bluetooth = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_BT, 'true');
      notifyListeners();
    } else if (window.location.hash.includes('bt_result=denied')) {
      cachedState.bluetooth = 'DENIED';
      localStorage.setItem(STORAGE_KEY_BT, 'false');
      notifyListeners();
    } else if (window.location.hash.includes('sms_result=granted')) {
      cachedState.sms = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_SMS, 'true');
      notifyListeners();
    } else if (window.location.hash.includes('sms_result=denied')) {
      cachedState.sms = 'DENIED';
      localStorage.setItem(STORAGE_KEY_SMS, 'false');
      notifyListeners();
    } else if (window.location.hash.includes('bg_loc_result=granted')) {
      cachedState.background_location = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_BG_LOC, 'true');
      notifyListeners();
    } else if (window.location.hash.includes('bg_loc_result=denied')) {
      cachedState.background_location = 'DENIED';
      localStorage.setItem(STORAGE_KEY_BG_LOC, 'false');
      notifyListeners();
    } else if (window.location.hash.includes('battery_result=granted')) {
      cachedState.battery = 'GRANTED';
      localStorage.setItem(STORAGE_KEY_BATTERY, 'true');
      notifyListeners();
    } else if (window.location.hash.includes('battery_result=denied')) {
      cachedState.battery = 'DENIED';
      localStorage.setItem(STORAGE_KEY_BATTERY, 'false');
      notifyListeners();
    }
  });
}

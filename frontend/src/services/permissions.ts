/**
 * permissions.ts
 * Centralized Permission Manager for SafetyMesh
 * Handles Location, Bluetooth, and Notifications with reactive state and foreground re-checks.
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

let cachedState: SafetyMeshPermissionsState = {
  location: 'UNKNOWN',
  background_location: 'UNKNOWN',
  bluetooth: 'UNKNOWN',
  notifications: 'UNKNOWN',
  sms: 'UNKNOWN',
  battery: 'UNKNOWN',
  isInitialFlowCompleted: localStorage.getItem(STORAGE_KEY_ONBOARDING) === 'true',
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
  if (!navigator.geolocation) {
    cachedState.location = 'DENIED';
    notifyListeners();
    return 'DENIED';
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      const status: PermissionStatus =
        result.state === 'granted'
          ? 'GRANTED'
          : result.state === 'denied'
          ? 'DENIED'
          : 'PROMPT';

      cachedState.location = status;

      result.onchange = () => {
        checkLocationPermission();
      };

      notifyListeners();
      return status;
    } catch {
      // Some browsers error on permissions.query({ name: 'geolocation' })
    }
  }

  return cachedState.location;
}

/**
 * Request Location Permission directly by triggering geolocation
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
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
        notifyListeners();
        resolve('GRANTED');
      },
      (err) => {
        const status: PermissionStatus = err.code === 1 ? 'DENIED' : 'BLOCKED';
        cachedState.location = status;
        notifyListeners();
        resolve(status);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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
  // Check local cache if granted via Android bridge
  const isAndroidGranted = localStorage.getItem('safetymesh_bt_granted');
  if (isAndroidGranted === 'true') {
    cachedState.bluetooth = 'GRANTED';
    notifyListeners();
    return 'GRANTED';
  }

  // Check Web Bluetooth availability if available
  if ('bluetooth' in navigator && (navigator as any).bluetooth?.getAvailability) {
    try {
      const available = await (navigator as any).bluetooth.getAvailability();
      if (available) {
        cachedState.bluetooth = 'PROMPT';
      }
    } catch {
      // Ignore
    }
  }

  if (cachedState.bluetooth === 'UNKNOWN') {
    cachedState.bluetooth = 'PROMPT';
  }

  notifyListeners();
  return cachedState.bluetooth;
}

/**
 * Request Bluetooth Permission via Native Android Bridge or Web Bluetooth
 */
export async function requestBluetoothPermission(): Promise<PermissionStatus> {
  // Check if running on Android with custom bridge scheme
  if (window.location.protocol.startsWith('http')) {
    // Attempt deep link trigger for Android
    try {
      window.location.href =
        'intent://bluetooth#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {
      // fallback
    }
  }

  // Web Bluetooth fallback
  if ('bluetooth' in navigator && (navigator as any).bluetooth?.requestDevice) {
    try {
      // Prompt user
      await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      cachedState.bluetooth = 'GRANTED';
      localStorage.setItem('safetymesh_bt_granted', 'true');
      notifyListeners();
      return 'GRANTED';
    } catch (e: any) {
      if (e.name === 'NotFoundError') {
        // User cancelled picker
        cachedState.bluetooth = 'PROMPT';
      } else {
        cachedState.bluetooth = 'DENIED';
      }
      notifyListeners();
      return cachedState.bluetooth;
    }
  }

  // If in web simulation or user allows
  cachedState.bluetooth = 'GRANTED';
  localStorage.setItem('safetymesh_bt_granted', 'true');
  notifyListeners();
  return 'GRANTED';
}

/**
 * Check SMS Permission
 */
export async function checkSmsPermission(): Promise<PermissionStatus> {
  const bridge = typeof window !== 'undefined' ? (window.AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.hasSmsPermission === 'function') {
    const granted = bridge.hasSmsPermission();
    cachedState.sms = granted ? 'GRANTED' : 'PROMPT';
    localStorage.setItem('safetymesh_sms_granted', granted ? 'true' : 'false');
    notifyListeners();
    return cachedState.sms;
  }

  const isAndroidGranted = localStorage.getItem('safetymesh_sms_granted');
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
  const bridge = typeof window !== 'undefined' ? (window.AndroidSafeMesh || (window as any).Android) : null;
  if (bridge && typeof bridge.requestEmergencyPermissions === 'function') {
    bridge.requestEmergencyPermissions();
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 400));
      if (typeof bridge.hasSmsPermission === 'function' && bridge.hasSmsPermission()) {
        cachedState.sms = 'GRANTED';
        localStorage.setItem('safetymesh_sms_granted', 'true');
        notifyListeners();
        return 'GRANTED';
      }
    }
  }

  if (window.location.protocol.startsWith('http')) {
    try {
      window.location.href = 'intent://sms#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {
      // fallback
    }
  }
  
  cachedState.sms = 'PROMPT';
  notifyListeners();
  return 'PROMPT';
}

export async function checkBackgroundLocationPermission(): Promise<PermissionStatus> {
  const isAndroidGranted = localStorage.getItem('safetymesh_bg_loc_granted');
  if (isAndroidGranted === 'true') {
    cachedState.background_location = 'GRANTED';
  } else {
    cachedState.background_location = 'PROMPT';
  }
  notifyListeners();
  return cachedState.background_location;
}

export async function requestBackgroundLocationPermission(): Promise<PermissionStatus> {
  if (window.location.protocol.startsWith('http')) {
    try {
      window.location.href = 'intent://background_location#Intent;scheme=safehelp;package=com.safehelp.app;end';
    } catch {
    }
  }
  cachedState.background_location = 'PROMPT';
  notifyListeners();
  return 'PROMPT';
}

export async function checkBatteryOptimizationPermission(): Promise<PermissionStatus> {
  const isAndroidGranted = localStorage.getItem('safetymesh_battery_granted');
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
    } catch {
    }
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

  // Listen for hashchange returned by Android Bluetooth Permission Activity
  window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('bt_result=granted')) {
      cachedState.bluetooth = 'GRANTED';
      localStorage.setItem('safetymesh_bt_granted', 'true');
      notifyListeners();
    } else if (window.location.hash.includes('bt_result=denied')) {
      cachedState.bluetooth = 'DENIED';
      localStorage.setItem('safetymesh_bt_granted', 'false');
      notifyListeners();
    } else if (window.location.hash.includes('sms_result=granted')) {
      cachedState.sms = 'GRANTED';
      localStorage.setItem('safetymesh_sms_granted', 'true');
      notifyListeners();
    } else if (window.location.hash.includes('sms_result=denied')) {
      cachedState.sms = 'DENIED';
      localStorage.setItem('safetymesh_sms_granted', 'false');
      notifyListeners();
    } else if (window.location.hash.includes('bg_loc_result=granted')) {
      cachedState.background_location = 'GRANTED';
      localStorage.setItem('safetymesh_bg_loc_granted', 'true');
      notifyListeners();
    } else if (window.location.hash.includes('bg_loc_result=denied')) {
      cachedState.background_location = 'DENIED';
      localStorage.setItem('safetymesh_bg_loc_granted', 'false');
      notifyListeners();
    } else if (window.location.hash.includes('battery_result=granted')) {
      cachedState.battery = 'GRANTED';
      localStorage.setItem('safetymesh_battery_granted', 'true');
      notifyListeners();
    } else if (window.location.hash.includes('battery_result=denied')) {
      cachedState.battery = 'DENIED';
      localStorage.setItem('safetymesh_battery_granted', 'false');
      notifyListeners();
    }
  });
}

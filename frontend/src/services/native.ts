/**
 * native.ts
 *
 * Future: Android native bridge.
 * Will expose Android capabilities to the React layer:
 *   - Contacts access
 *   - Bluetooth / BLE
 *   - SMS / calls
 *   - Wake lock
 *
 * Architecture:
 *   React UI → native.ts → Android WebView bridge → Android SDK
 */

export interface BleResult {
  success: boolean;
  running: boolean;
  emergencyId?: string;
  error?: string;
}

let cachedBluetoothStatus: boolean | null = null;
let bluetoothResultResolvers: ((granted: boolean) => void)[] = [];
let bleActionResolvers: ((result: BleResult) => void)[] = [];

// Initialize listener for hash-based bridge
export function initNativeBridge() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    
    if (hash.includes('bt_result=')) {
      const granted = hash.includes('bt_result=granted');
      cachedBluetoothStatus = granted;
      
      bluetoothResultResolvers.forEach(resolve => resolve(granted));
      bluetoothResultResolvers = [];
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } 
    else if (hash.includes('ble_result=')) {
      try {
        const payloadStr = hash.replace('#ble_result=', '');
        const decodedPayload = decodeURIComponent(payloadStr);
        const result = JSON.parse(decodedPayload) as BleResult;
        
        bleActionResolvers.forEach(resolve => resolve(result));
        bleActionResolvers = [];
      } catch (e) {
        console.error("Failed to parse ble_result", e);
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    bluetoothResultResolvers.push(resolve);
    window.location.href = "intent://bluetooth#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export function areBluetoothPermissionsGranted(): boolean | null {
  return cachedBluetoothStatus;
}

export async function startEmergencyBeacon(): Promise<BleResult> {
  return new Promise((resolve) => {
    bleActionResolvers.push(resolve);
    window.location.href = "intent://ble_start#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export async function stopEmergencyBeacon(): Promise<BleResult> {
  return new Promise((resolve) => {
    bleActionResolvers.push(resolve);
    window.location.href = "intent://ble_stop#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}


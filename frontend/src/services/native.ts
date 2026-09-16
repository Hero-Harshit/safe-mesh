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

export interface BleScanEvent {
  type: string;
  emergencyId: string;
  rssi: number;
  proximity: string;
  detectedAt: number;
}

let cachedBluetoothStatus: boolean | null = null;
let bluetoothResultResolvers: ((granted: boolean) => void)[] = [];
let bleActionResolvers: ((result: BleResult) => void)[] = [];
let bleScanEventCallbacks: ((event: BleScanEvent) => void)[] = [];

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
    else if (hash.includes('ble_event=')) {
      try {
        const payloadStr = hash.replace('#ble_event=', '');
        const decodedPayload = decodeURIComponent(payloadStr);
        const event = JSON.parse(decodedPayload) as BleScanEvent;
        
        if (event.type === 'SAFEHELP_EMERGENCY_DETECTED') {
          bleScanEventCallbacks.forEach(cb => cb(event));
        }
      } catch (e) {
        console.error("Failed to parse ble_event", e);
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

export async function startGuardianScanner(): Promise<BleResult> {
  return new Promise((resolve) => {
    bleActionResolvers.push(resolve);
    window.location.href = "intent://ble_scan_start#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export async function stopGuardianScanner(): Promise<BleResult> {
  return new Promise((resolve) => {
    bleActionResolvers.push(resolve);
    window.location.href = "intent://ble_scan_stop#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export function onEmergencyBeaconDetected(callback: (event: BleScanEvent) => void) {
  bleScanEventCallbacks.push(callback);
}


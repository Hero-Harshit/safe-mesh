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
let cachedSmsStatus: boolean | null = null;
let bluetoothResultResolvers: ((granted: boolean) => void)[] = [];
let smsResultResolvers: ((granted: boolean) => void)[] = [];
let contactResultResolvers: ((contact: {name: string, phone: string} | null) => void)[] = [];
let bleActionResolvers: ((result: BleResult) => void)[] = [];
let bleScanEventCallbacks: ((event: BleScanEvent) => void)[] = [];

export interface SmsSendResult {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'ERROR';
  error?: string;
  results?: Array<{name: string, phone: string, success: boolean, error?: string}>;
}

let smsActionResolvers: ((result: SmsSendResult) => void)[] = [];

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
    else if (hash.includes('sms_result=')) {
      const granted = hash.includes('sms_result=granted');
      cachedSmsStatus = granted;
      
      smsResultResolvers.forEach(resolve => resolve(granted));
      smsResultResolvers = [];
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    else if (hash.includes('contact_result=')) {
      try {
        const payloadStr = hash.replace('#contact_result=', '');
        if (payloadStr === 'cancelled' || payloadStr === 'error') {
          contactResultResolvers.forEach(resolve => resolve(null));
        } else {
          const decoded = decodeURIComponent(payloadStr);
          const contactData = JSON.parse(decoded);
          contactResultResolvers.forEach(resolve => resolve(contactData));
        }
      } catch (e) {
        contactResultResolvers.forEach(resolve => resolve(null));
      }
      contactResultResolvers = [];
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    else if (hash.includes('sms_send_result=')) {
      try {
        const payloadStr = hash.replace('#sms_send_result=', '');
        const decoded = decodeURIComponent(payloadStr);
        const resultData = JSON.parse(decoded) as SmsSendResult;
        smsActionResolvers.forEach(resolve => resolve(resultData));
      } catch (e) {
        smsActionResolvers.forEach(resolve => resolve({ status: 'ERROR', error: 'NATIVE_COMMUNICATION_ERROR' }));
      }
      smsActionResolvers = [];
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

export async function requestSmsPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    smsResultResolvers.push(resolve);
    window.location.href = "intent://sms#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export function areSmsPermissionsGranted(): boolean | null {
  return cachedSmsStatus;
}

export async function pickNativeContact(): Promise<{name: string, phone: string} | null> {
  return new Promise((resolve) => {
    contactResultResolvers.push(resolve);
    window.location.href = "intent://contact_picker#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export async function sendEmergencySms(contacts: {name: string, phone: string}[], locationUrl: string | null): Promise<SmsSendResult> {
  return new Promise((resolve) => {
    smsActionResolvers.push(resolve);
    const contactsJson = encodeURIComponent(JSON.stringify(contacts));
    const locString = encodeURIComponent(locationUrl || "Unavailable");
    window.location.href = `intent://send_sms?contacts=${contactsJson}&location=${locString}#Intent;scheme=safehelp;package=com.safehelp.app;end`;
  });
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

export async function startEmergencyCall(_phoneNumber: string, delayMs: number = 0): Promise<void> {
  return new Promise((resolve) => {
    window.location.href = `intent://call?delay=${delayMs}#Intent;scheme=safehelp;package=com.safehelp.app;end`;
    setTimeout(resolve, 500);
  });
}

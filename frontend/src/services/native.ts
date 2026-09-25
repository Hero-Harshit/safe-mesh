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
        
        if (event.type === 'SAFEHELP_EMERGENCY_DETECTED' || event.type === 'SAFEMESH_EMERGENCY_DETECTED') {
          bleScanEventCallbacks.forEach(cb => cb(event));
        }
      } catch (e) {
        console.error("Failed to parse ble_event", e);
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve(false);
    }
    const timer = setTimeout(() => {
      resolve(false);
    }, 2000);
    bluetoothResultResolvers.push((granted) => {
      clearTimeout(timer);
      resolve(granted);
    });
    try {
      window.location.href = "intent://bluetooth#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

export function areBluetoothPermissionsGranted(): boolean | null {
  return cachedBluetoothStatus;
}

export async function requestSmsPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve(false);
    }
    const timer = setTimeout(() => {
      resolve(false);
    }, 2000);
    smsResultResolvers.push((granted) => {
      clearTimeout(timer);
      resolve(granted);
    });
    try {
      window.location.href = "intent://sms#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

export function areSmsPermissionsGranted(): boolean | null {
  return cachedSmsStatus;
}

export async function pickNativeContact(): Promise<{name: string, phone: string} | null> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve(null);
    }
    const timer = setTimeout(() => resolve(null), 5000);
    contactResultResolvers.push((c) => {
      clearTimeout(timer);
      resolve(c);
    });
    try {
      window.location.href = "intent://contact_picker#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

export async function syncEmergencyContactsToNative(contacts: {name: string, phone: string}[]): Promise<void> {
  return new Promise((resolve) => {
    if (!isAndroid()) return resolve();
    const contactsJson = encodeURIComponent(JSON.stringify(contacts));
    try {
      window.location.href = `intent://sync_contacts?contacts=${contactsJson}#Intent;scheme=safehelp;package=com.safehelp.app;end`;
    } catch {
      // ignore
    }
    setTimeout(resolve, 300);
  });
}

export async function sendEmergencySms(contacts: {name: string, phone: string}[], locationUrl: string | null): Promise<SmsSendResult> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve({ status: 'FAILED', error: 'NATIVE_SMS_UNAVAILABLE' });
    }
    const timer = setTimeout(() => resolve({ status: 'ERROR', error: 'TIMEOUT' }), 5000);
    smsActionResolvers.push((res) => {
      clearTimeout(timer);
      resolve(res);
    });
    const contactsJson = encodeURIComponent(JSON.stringify(contacts));
    const locString = encodeURIComponent(locationUrl || "Unavailable");
    try {
      window.location.href = `intent://send_sms?contacts=${contactsJson}&location=${locString}#Intent;scheme=safehelp;package=com.safehelp.app;end`;
    } catch {
      clearTimeout(timer);
      resolve({ status: 'ERROR', error: 'INTENT_LAUNCH_FAILED' });
    }
  });
}

export async function startEmergencyBeacon(): Promise<BleResult> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve({ success: false, running: false, error: 'NOT_ON_ANDROID' });
    }
    const timer = setTimeout(() => resolve({ success: false, running: false, error: 'TIMEOUT' }), 3000);
    bleActionResolvers.push((res) => {
      clearTimeout(timer);
      resolve(res);
    });
    try {
      window.location.href = "intent://ble_start#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve({ success: false, running: false, error: 'INTENT_FAILED' });
    }
  });
}

export async function stopEmergencyBeacon(): Promise<BleResult> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve({ success: true, running: false });
    }
    const timer = setTimeout(() => resolve({ success: true, running: false }), 2000);
    bleActionResolvers.push((res) => {
      clearTimeout(timer);
      resolve(res);
    });
    try {
      window.location.href = "intent://ble_stop#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve({ success: true, running: false });
    }
  });
}

export async function startGuardianScanner(): Promise<BleResult> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve({ success: false, running: false, error: 'NOT_ON_ANDROID' });
    }
    const timer = setTimeout(() => resolve({ success: false, running: false, error: 'TIMEOUT' }), 3000);
    bleActionResolvers.push((res) => {
      clearTimeout(timer);
      resolve(res);
    });
    try {
      window.location.href = "intent://ble_scan_start#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve({ success: false, running: false, error: 'INTENT_FAILED' });
    }
  });
}

export async function stopGuardianScanner(): Promise<BleResult> {
  return new Promise((resolve) => {
    if (!isAndroid()) {
      return resolve({ success: true, running: false });
    }
    const timer = setTimeout(() => resolve({ success: true, running: false }), 2000);
    bleActionResolvers.push((res) => {
      clearTimeout(timer);
      resolve(res);
    });
    try {
      window.location.href = "intent://ble_scan_stop#Intent;scheme=safehelp;package=com.safehelp.app;end";
    } catch {
      clearTimeout(timer);
      resolve({ success: true, running: false });
    }
  });
}

export function onEmergencyBeaconDetected(callback: (event: BleScanEvent) => void) {
  bleScanEventCallbacks.push(callback);
}

export async function startEmergencyCall(phoneNumber: string = '112', delayMs: number = 0): Promise<void> {
  return new Promise((resolve) => {
    const targetNumber = phoneNumber || '112';
    if (!isAndroid()) {
      window.location.href = `tel:${targetNumber}`;
      return resolve();
    }
    try {
      window.location.href = `intent://call?number=${encodeURIComponent(targetNumber)}&delay=${delayMs}#Intent;scheme=safehelp;package=com.safehelp.app;end`;
    } catch {
      window.location.href = `tel:${targetNumber}`;
    }
    setTimeout(resolve, 500);
  });
}

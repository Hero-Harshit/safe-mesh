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
let threatEventCallbacks: ((reason: string) => void)[] = [];

export function onNativeThreatEvent(callback: (reason: string) => void): () => void {
  threatEventCallbacks.push(callback);
  return () => {
    threatEventCallbacks = threatEventCallbacks.filter((cb) => cb !== callback);
  };
}

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
        
        if (event.type === 'SAFEHELP_EMERGENCY_DETECTED' || event.type === 'SAFETYMESH_EMERGENCY_DETECTED') {
          bleScanEventCallbacks.forEach(cb => cb(event));
        }
      } catch (e) {
        console.error("Failed to parse ble_event", e);
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    else if (hash.includes('threat_event=')) {
      try {
        const payloadStr = hash.replace('#threat_event=', '');
        threatEventCallbacks.forEach(cb => cb(payloadStr));
      } catch (e) {
        console.error("Failed to parse threat_event", e);
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

export interface NativeSafeMeshBridge {
  sendSilentSMS: (phone: string, message: string) => boolean;
  makeEmergencyCall: (phone: string) => boolean;
  requestEmergencyPermissions: () => void;
  requestAllPermissions?: () => void;
  hasSmsPermission: () => boolean;
  hasCallPermission: () => boolean;
  vibrate: (ms: number) => void;
  stopVibrate: () => void;
  setFlashlight: (enable: boolean) => void;
  showToast: (msg: string) => void;
  shareText: (title: string, msg: string) => void;
  isNativeApp: () => boolean;
  getAppVersion?: () => string;
}

declare global {
  interface Window {
    AndroidSafeMesh?: NativeSafeMeshBridge;
    Android?: NativeSafeMeshBridge;
  }
}

export function getNativeBridge(): NativeSafeMeshBridge | null {
  if (typeof window === 'undefined') return null;
  return window.AndroidSafeMesh || window.Android || null;
}

export function isNativeSafeMesh(): boolean {
  const bridge = getNativeBridge();
  return !!(bridge && typeof bridge.isNativeApp === 'function' && bridge.isNativeApp());
}

export function hasNativeSmsPermission(): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.hasSmsPermission === 'function') {
    return bridge.hasSmsPermission();
  }
  return false;
}

export function hasNativeCallPermission(): boolean {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.hasCallPermission === 'function') {
    return bridge.hasCallPermission();
  }
  return false;
}

export function requestNativeEmergencyPermissions(): void {
  const bridge = getNativeBridge();
  if (bridge) {
    if (typeof bridge.requestEmergencyPermissions === 'function') {
      bridge.requestEmergencyPermissions();
    } else if (typeof bridge.requestAllPermissions === 'function') {
      bridge.requestAllPermissions();
    }
  }
}

export async function sendEmergencySms(
  contacts: { name: string; phone: string }[],
  locationUrl: string | null,
  listenUrl?: string | null
): Promise<SmsSendResult> {
  const bridge = getNativeBridge();

  if (!isAndroid() && !bridge) {
    return { status: 'FAILED', error: 'NATIVE_SMS_UNAVAILABLE' };
  }

  if (bridge && typeof bridge.sendSilentSMS === 'function') {
    try {
      // 1. Proactively check if SMS permission is granted; if not, request it and wait for user approval
      if (typeof bridge.hasSmsPermission === 'function' && !bridge.hasSmsPermission()) {
        console.warn('SMS permission not yet granted. Triggering native emergency permissions dialog...');
        requestNativeEmergencyPermissions();

        // Wait and poll for user action (up to 4 seconds, checking every 400ms)
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 400));
          if (bridge.hasSmsPermission()) {
            break;
          }
        }
      }

      let userName = "A SafetyMesh user";
      try {
        const profileStr = localStorage.getItem('safetymesh_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.fullName) userName = profile.fullName;
        }
      } catch (e) {}

      const message = `🚨 EMERGENCY ALERT - SAFEMESH 🚨\n${userName} is in danger and triggered the SOS alarm.\n\n📍 Live Location:\n${locationUrl || "Location tracking active - coordinates pending"}${listenUrl ? `\n\n🎙️ Listen Live & Police Evidence:\n${listenUrl}` : ''}\n\nPlease take immediate emergency action.`;

      let allSuccess = true;
      let anySuccess = false;
      const results: Array<{ name: string; phone: string; success: boolean }> = [];

      for (const contact of contacts) {
        // Sanitize phone number (strip whitespace, hyphens, parentheses; keep digits and +)
        const cleanPhone = (contact.phone || '').replace(/[^0-9+]/g, '').trim();
        if (!cleanPhone) {
          results.push({ name: contact.name, phone: contact.phone, success: false });
          allSuccess = false;
          continue;
        }

        // Send silent SMS via native bridge with retry
        let success = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            success = bridge.sendSilentSMS(cleanPhone, message);
          } catch (err) {
            console.error(`Attempt ${attempt} sendSilentSMS failed for ${cleanPhone}:`, err);
            success = false;
          }
          if (success) break;
          // Short pause before retrying in case Android permission just synced
          await new Promise((r) => setTimeout(r, 400));
        }

        results.push({ name: contact.name, phone: cleanPhone, success });
        if (success) {
          anySuccess = true;
        } else {
          allSuccess = false;
        }
      }

      if (allSuccess && results.length > 0) {
        if (typeof bridge.showToast === 'function') {
          bridge.showToast('🚨 Emergency SMS dispatched successfully');
        }
        return { status: 'SUCCESS', results };
      } else if (anySuccess) {
        return { status: 'PARTIAL_SUCCESS', results };
      } else {
        const hasPerm = typeof bridge.hasSmsPermission === 'function' ? bridge.hasSmsPermission() : false;
        return {
          status: 'FAILED',
          error: hasPerm ? 'SEND_SMS_REJECTED' : 'SMS_PERMISSION_DENIED',
          results,
        };
      }
    } catch (e) {
      console.error('sendEmergencySms error:', e);
      return { status: 'ERROR', error: 'BRIDGE_CALL_FAILED' };
    }
  }

  // Fallback for non-bridge environments
  return new Promise((resolve) => {
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

let scheduledCallTimeout: any = null;

export function cancelEmergencyCall(): void {
  if (scheduledCallTimeout) {
    clearTimeout(scheduledCallTimeout);
    scheduledCallTimeout = null;
  }
}

export async function startEmergencyCall(phoneNumber: string = '112', delayMs: number = 0): Promise<void> {
  const bridge = getNativeBridge();
  const cleanPhone = (phoneNumber || '112').replace(/[^0-9+]/g, '').trim() || '112';

  // Request call permission upfront if missing to prevent fallback to dialer keypad
  if (bridge && typeof bridge.hasCallPermission === 'function' && !bridge.hasCallPermission()) {
    console.warn('CALL_PHONE permission not yet granted. Requesting emergency permissions...');
    requestNativeEmergencyPermissions();
  }

  cancelEmergencyCall();

  return new Promise((resolve) => {
    if (!isAndroid() && !bridge) {
      window.location.href = `tel:${cleanPhone}`;
      return resolve();
    }

    if (bridge && typeof bridge.makeEmergencyCall === 'function') {
      scheduledCallTimeout = setTimeout(() => {
        try {
          bridge.makeEmergencyCall(cleanPhone);
          
          // APPROACH A: Stealth Re-Focus sequence
          // Pulls SafeMesh directly to the front over the dialer UI
          const refocusSafeMesh = () => {
            if (typeof window !== 'undefined') {
              try {
                if (window.focus) window.focus();
              } catch (e) {}
              try {
                window.location.href = `intent://refocus#Intent;scheme=safehelp;package=com.safehelp.app;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;flags=0x14000000;end`;
              } catch (e) {}
            }
          };

          setTimeout(refocusSafeMesh, 200);
          setTimeout(refocusSafeMesh, 500);
          setTimeout(refocusSafeMesh, 1000);
        } catch (e) {
          console.error('makeEmergencyCall error:', e);
        }
        scheduledCallTimeout = null;
        resolve();
      }, delayMs);
      return;
    }

    scheduledCallTimeout = setTimeout(() => {
      try {
        window.location.href = `intent://call?number=${encodeURIComponent(cleanPhone)}&delay=0#Intent;scheme=safehelp;package=com.safehelp.app;end`;
      } catch {
        window.location.href = `tel:${cleanPhone}`;
      }
      scheduledCallTimeout = null;
      resolve();
    }, delayMs);
  });
}

export function startSiren() {
  if (!isAndroid()) return;
  try {
    window.location.href = "intent://siren_start#Intent;scheme=safehelp;package=com.safehelp.app;end";
  } catch (e) {
    console.warn("Failed to start siren natively");
  }
}

export function stopSiren() {
  if (!isAndroid()) return;
  try {
    window.location.href = "intent://siren_stop#Intent;scheme=safehelp;package=com.safehelp.app;end";
  } catch (e) {
    console.warn("Failed to stop siren natively");
  }
}

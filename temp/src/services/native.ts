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

let cachedBluetoothStatus: boolean | null = null;
let bluetoothResultResolvers: ((granted: boolean) => void)[] = [];

// Initialize listener for hash-based bridge
export function initNativeBridge() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.includes('bt_result=')) {
      const granted = hash.includes('bt_result=granted');
      cachedBluetoothStatus = granted;
      
      // Resolve any pending requests
      bluetoothResultResolvers.forEach(resolve => resolve(granted));
      bluetoothResultResolvers = [];

      // Clean up hash to keep URL clean (without reloading)
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    bluetoothResultResolvers.push(resolve);
    // Trigger native deep link interceptor
    window.location.href = "intent://bluetooth#Intent;scheme=safehelp;package=com.safehelp.app;end";
  });
}

export function areBluetoothPermissionsGranted(): boolean | null {
  return cachedBluetoothStatus;
}

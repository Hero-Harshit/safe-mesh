import { useState, useEffect } from 'react';
import Home from './pages/Home';
import StartupPermissionFlow from './components/StartupPermissionFlow';
import {
  subscribePermissions,
  getPermissionsState,
  refreshAllPermissions,
} from './services/permissions';
import type { SafetyMeshPermissionsState } from './services/permissions';

// IMPORT NATIVE BRIDGE
import { initNativeBridge, getNativeBridge, requestNativeEmergencyPermissions } from './services/native';

export default function App() {
  const [permissions, setPermissions] = useState<SafetyMeshPermissionsState>(getPermissionsState());

  useEffect(() => {
    // INITIALIZE NATIVE BRIDGE FOR APP ACTIONS AND BLE TO WORK
    initNativeBridge();

    const unsubPerms = subscribePermissions((newPerms) => {
      setPermissions(newPerms);
    });

    refreshAllPermissions();

    // Proactively verify and request native permissions for emergency SOS (SMS & Call)
    const bridge = getNativeBridge();
    if (bridge) {
      const hasSms = typeof bridge.hasSmsPermission === 'function' ? bridge.hasSmsPermission() : false;
      const hasCall = typeof bridge.hasCallPermission === 'function' ? bridge.hasCallPermission() : false;
      if (!hasSms || !hasCall) {
        requestNativeEmergencyPermissions();
      }
    }

    return () => {
      unsubPerms();
    };
  }, []);

  return (
    <div className="app">
      {/* 1. If First Launch: Show Sequential Permission Onboarding */}
      {!permissions.isInitialFlowCompleted ? (
        <StartupPermissionFlow
          initialState={permissions}
          onComplete={() => {
            refreshAllPermissions();
          }}
        />
      ) : (
        /* 2. Main SafetyMesh Application */
        <Home />
      )}
    </div>
  );
}


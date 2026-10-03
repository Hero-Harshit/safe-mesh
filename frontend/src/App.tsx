import { useState, useEffect } from 'react';
import Home from './pages/Home';
import StartupPermissionFlow from './components/StartupPermissionFlow';
import EmergencyListener from './pages/EmergencyListener';
import {
  subscribePermissions,
  getPermissionsState,
  refreshAllPermissions,
} from './services/permissions';
import type { SafetyMeshPermissionsState } from './services/permissions';

// IMPORT NATIVE BRIDGE & ACCESSIBILITY SENSORY ENGINE
import { initNativeBridge, getNativeBridge, requestNativeEmergencyPermissions } from './services/native';
import { initTactileMorse } from './services/tactileMorse';

export default function App() {
  const [permissions, setPermissions] = useState<SafetyMeshPermissionsState>(getPermissionsState());

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const roomParam = urlParams.get('room');
  const isListenPage = typeof window !== 'undefined' && (window.location.pathname.startsWith('/listen') || !!roomParam);

  useEffect(() => {
    if (isListenPage) return; // Don't run native bridge initialization on listener portal

    // INITIALIZE NATIVE BRIDGE FOR APP ACTIONS AND BLE TO WORK
    initNativeBridge();
    // INITIALIZE TACTILE MORSE CODE FOR BLIND & ACCESSIBILITY SENSORY NAVIGATION
    initTactileMorse();

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
  }, [isListenPage]);

  // If this is an emergency contact opening the live audio stream link
  if (isListenPage) {
    return <EmergencyListener room={roomParam || ''} />;
  }

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


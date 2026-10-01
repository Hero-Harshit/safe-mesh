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
import { initNativeBridge } from './services/native';

export default function App() {
  const [permissions, setPermissions] = useState<SafetyMeshPermissionsState>(getPermissionsState());

  useEffect(() => {
    // INITIALIZE NATIVE BRIDGE FOR APP ACTIONS AND BLE TO WORK
    initNativeBridge();

    const unsubPerms = subscribePermissions((newPerms) => {
      setPermissions(newPerms);
    });

    refreshAllPermissions();

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


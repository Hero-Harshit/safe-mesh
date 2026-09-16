import { useState, useEffect } from 'react';
import Home from './pages/Home';
import NearbyGuardianSetup from './pages/NearbyGuardianSetup';
import StartupPermissionFlow from './components/StartupPermissionFlow';
import {
  subscribePermissions,
  getPermissionsState,
  refreshAllPermissions,
} from './services/permissions';
import type { SafeMeshPermissionsState } from './services/permissions';
import { subscribeLocation } from './services/location';
import type { RealLocationData } from './services/location';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [permissions, setPermissions] = useState<SafeMeshPermissionsState>(getPermissionsState());
  const [location, setLocation] = useState<RealLocationData | null>(null);

  useEffect(() => {
    const unsubPerms = subscribePermissions((newPerms) => {
      setPermissions(newPerms);
    });

    const unsubLoc = subscribeLocation((newLoc) => {
      setLocation(newLoc);
    });

    refreshAllPermissions();

    return () => {
      unsubPerms();
      unsubLoc();
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
        /* 2. Main SafeMesh Application */
        <>
          {currentView === 'home' && <Home onNavigate={setCurrentView} />}
          {currentView === 'nearby_guardian' && (
            <NearbyGuardianSetup
              location={location}
              locationPermission={permissions.location}
              bluetoothPermission={permissions.bluetooth}
              onRefreshPermissions={refreshAllPermissions}
              onBack={() => setCurrentView('home')}
            />
          )}
        </>
      )}
    </div>
  );
}

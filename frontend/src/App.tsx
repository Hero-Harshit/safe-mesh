import { useState, useEffect } from 'react';
import Home from './pages/Home';
import NearbyGuardianSetup from './pages/NearbyGuardianSetup';
import UberBookingTest from './pages/UberBookingTest';
import UberSandbox from './pages/UberSandbox';
import StartupPermissionFlow from './components/StartupPermissionFlow';
import {
  subscribePermissions,
  getPermissionsState,
  refreshAllPermissions,
} from './services/permissions';
import type { SafeMeshPermissionsState } from './services/permissions';
import { subscribeLocation } from './services/location';
import type { RealLocationData } from './services/location';

// IMPORT NATIVE BRIDGE
import { initNativeBridge } from './services/native';

function getInitialView(): string {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  if (path.includes('uber-sandbox') || path.includes('uber_sandbox')) return 'uber_sandbox';
  if (path.includes('uber-test') || path.includes('uber_test')) return 'uber_test';
  if (path.includes('nearby-guardian') || path.includes('nearby_guardian')) return 'nearby_guardian';
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  if (viewParam) return viewParam;
  return 'home';
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [permissions, setPermissions] = useState<SafeMeshPermissionsState>(getPermissionsState());
  const [location, setLocation] = useState<RealLocationData | null>(null);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    const newPath = view === 'home' ? '/' : `/${view.replace(/_/g, '-')}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ view }, '', newPath);
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view) {
        setCurrentView(e.state.view);
      } else {
        setCurrentView(getInitialView());
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // INITIALIZE NATIVE BRIDGE FOR APP ACTIONS AND BLE TO WORK
    initNativeBridge();

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
          {currentView === 'home' && <Home onNavigate={handleNavigate} />}
          {currentView === 'nearby_guardian' && (
            <NearbyGuardianSetup
              location={location}
              locationPermission={permissions.location}
              bluetoothPermission={permissions.bluetooth}
              onRefreshPermissions={refreshAllPermissions}
              onBack={() => handleNavigate('home')}
            />
          )}
          {currentView === 'uber_test' && (
            <UberBookingTest onBack={() => handleNavigate('home')} />
          )}
          {currentView === 'uber_sandbox' && (
            <UberSandbox onBack={() => handleNavigate('home')} />
          )}
        </>
      )}
    </div>
  );
}

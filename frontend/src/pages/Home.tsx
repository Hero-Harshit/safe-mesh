import { useState, useEffect, useCallback } from 'react';
import SafetyMeshHeader from '../components/SafetyMeshHeader';
import EmergencySOSButton from '../components/EmergencySOSButton';
import SafetyShortcuts from '../components/SafetyShortcuts';
import SafeRouteModal from '../components/SafeRouteModal';
import EmergencyContactsModal from '../components/EmergencyContactsModal';
import Call112Modal from '../components/Call112Modal';
import SettingsModal from '../components/SettingsModal';
import EmergencyMode from '../components/EmergencyMode';
import SosPermissionWarningModal from '../components/SosPermissionWarningModal';
import SafetyToolkitModal from '../components/SafetyToolkitModal';
import StatusMessage from '../components/StatusMessage';
import NearbyGuardianSetup from './NearbyGuardianSetup';

import type { EmergencyContact } from '../services/emergency';
import {
  getEmergencyContacts,
  saveEmergencyContact,
  deleteEmergencyContact,
  triggerHaptic,
} from '../services/emergency';
import { syncEmergencyContactsToNative } from '../services/native';

import type { RealLocationData } from '../services/location';
import {
  fetchRealDeviceLocation,
  startLiveLocationWatch,
  clearLocationWatch,
} from '../services/location';

import type { SafetyMeshPermissionsState } from '../services/permissions';
import {
  subscribePermissions,
  refreshAllPermissions,
  requestLocationPermission,
} from '../services/permissions';

interface HomeProps {
  onNavigate?: (view: string) => void;
}

export default function Home(_props: HomeProps = {}) {
  // Real permissions state
  const [permissions, setPermissions] = useState<SafetyMeshPermissionsState>({
    location: 'UNKNOWN',
    bluetooth: 'UNKNOWN',
    notifications: 'UNKNOWN',
    sms: 'UNKNOWN',
    isInitialFlowCompleted: true,
  });

  // Real device location state
  const [location, setLocation] = useState<RealLocationData | null>(null);

  // Contacts and UI state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [activeModal, setActiveModal] = useState<'safe_route' | 'contacts' | 'call_112' | 'settings' | 'nearby_guardian' | 'toolkit' | null>(null);
  const [showSosWarning, setShowSosWarning] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 1. Subscribe to permissions
  useEffect(() => {
    const unsub = subscribePermissions((newPerms) => {
      setPermissions(newPerms);
    });
    refreshAllPermissions();
    return () => unsub();
  }, []);

  // 2. Fetch real location if location permission is granted
  const loadLocation = useCallback(async () => {
    try {
      const loc = await fetchRealDeviceLocation();
      setLocation(loc);
    } catch {
      // Error handled by location service
    }
  }, []);

  useEffect(() => {
    if (permissions.location === 'GRANTED') {
      loadLocation();
      const watchId = startLiveLocationWatch((loc) => {
        setLocation(loc);
      });
      return () => {
        clearLocationWatch(watchId);
      };
    } else {
      setLocation(null);
    }
  }, [permissions.location, loadLocation]);

  // 3. Load contacts and sync to native
  useEffect(() => {
    const loaded = getEmergencyContacts();
    setContacts(loaded);
    syncEmergencyContactsToNative(loaded.map(c => ({ name: c.name, phone: c.phone }))).catch(() => { });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Request Location from UI
  const handleRequestLocation = async () => {
    const status = await requestLocationPermission();
    if (status === 'GRANTED') {
      showToast('Location permission granted. Locating…');
      loadLocation();
    } else {
      showToast('Location permission was denied');
    }
  };

  // SOS activation logic
  const handleSosHoldComplete = () => {
    // Check if location is missing
    if (permissions.location !== 'GRANTED' || !location || location.status !== 'LIVE') {
      setShowSosWarning(true);
    } else {
      activateEmergencyWorkflow();
    }
  };

  const activateEmergencyWorkflow = useCallback(() => {
    setShowSosWarning(false);
    setSosActive(true);
    triggerHaptic([300, 100, 300, 100, 500]);
    showToast('🚨 SafetyMesh Emergency SOS Broadcast Active');
  }, [showToast]);

  // 1.5 Check for Voice Auto-SOS
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto_sos') === 'true') {
      // Remove param to avoid re-triggering on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      activateEmergencyWorkflow();
    }
  }, [activateEmergencyWorkflow]);

  const handleDeactivateSos = useCallback(() => {
    setSosActive(false);
    triggerHaptic(100);
    showToast('Emergency mode cancelled. You are safe.');
  }, [showToast]);

  // Contacts management
  const handleAddContact = (contactData: Omit<EmergencyContact, 'id'>) => {
    const updated = saveEmergencyContact(contactData);
    setContacts(updated);
    syncEmergencyContactsToNative(updated.map(c => ({ name: c.name, phone: c.phone }))).catch(() => { });
  };

  const handleDeleteContact = (id: string) => {
    const updated = deleteEmergencyContact(id);
    setContacts(updated);
    syncEmergencyContactsToNative(updated.map(c => ({ name: c.name, phone: c.phone }))).catch(() => { });
  };

  return (
    <div className="safetymesh-dashboard-shell">
      {/* 1. Header with dynamic safety status based on real device state */}
      <SafetyMeshHeader
        onProfileClick={() => setActiveModal('settings')}
      />


      {/* Secondary Action Shortcuts (Moved to Top) */}
      <div style={{ flexShrink: 0, marginTop: '20px' }}>
        <SafetyShortcuts
          onSafeRouteClick={() => setActiveModal('safe_route')}
          onContactsClick={() => setActiveModal('contacts')}
          onGuardianClick={() => setActiveModal('nearby_guardian')}
          onToolkitClick={() => setActiveModal('toolkit')}
        />
      </div>

      {/* Central HERO SOS Button (Anchored to the bottom for thumb reachability) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', minHeight: 0, paddingBottom: '4px', marginBottom: '-10px' }}>
        <EmergencySOSButton onActivate={handleSosHoldComplete} />
      </div>


      {/* Safe Route Modal */}
      {activeModal === 'safe_route' && (
        <SafeRouteModal
          location={location}
          locationPermission={permissions.location}
          onRequestLocationPermission={handleRequestLocation}
          onClose={() => setActiveModal(null)}
          onShowToast={showToast}
        />
      )}

      {/* Emergency Contacts Modal */}
      {activeModal === 'contacts' && (
        <EmergencyContactsModal
          contacts={contacts}
          onAddContact={handleAddContact}
          onDeleteContact={handleDeleteContact}
          currentMapsUrl={location?.mapsUrl}
          onClose={() => setActiveModal(null)}
          onShowToast={showToast}
        />
      )}

      {/* Call 112 Modal */}
      {activeModal === 'call_112' && (
        <Call112Modal
          location={location}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onShowToast={showToast}
        />
      )}

      {/* Nearby Guardian Modal */}
      {activeModal === 'nearby_guardian' && (
        <NearbyGuardianSetup
          location={location}
          locationPermission={permissions.location}
          bluetoothPermission={permissions.bluetooth}
          onRefreshPermissions={refreshAllPermissions}
          onBack={() => setActiveModal(null)}
          onClose={() => setActiveModal(null)}
          onShowToast={showToast}
        />
      )}

      {/* Safety Toolkit Modal */}
      {activeModal === 'toolkit' && (
        <SafetyToolkitModal onClose={() => setActiveModal(null)} />
      )}

      {/* SOS Warning Modal when Location is Missing */}
      {showSosWarning && (
        <SosPermissionWarningModal
          onEnableLocation={async () => {
            setShowSosWarning(false);
            const status = await requestLocationPermission();
            if (status === 'GRANTED') {
              loadLocation();
              activateEmergencyWorkflow();
            } else {
              showToast('Location permission not granted. Activating without location.');
              activateEmergencyWorkflow();
            }
          }}
          onContinueWithoutLocation={() => {
            activateEmergencyWorkflow();
          }}
          onCancel={() => {
            setShowSosWarning(false);
          }}
        />
      )}

      {/* Fullscreen Emergency Mode Screen */}
      {sosActive && (
        <EmergencyMode
          location={location}
          contacts={contacts}
          onDeactivate={handleDeactivateSos}
        />
      )}

      {/* Toast Feedback */}
      <StatusMessage message={toast} />
    </div>
  );
}

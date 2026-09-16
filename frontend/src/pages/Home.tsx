import { useState, useEffect, useCallback } from 'react';
import SafeMeshHeader from '../components/SafeMeshHeader';
import GreetingSection from '../components/GreetingSection';
import LocationContextBar from '../components/LocationContextBar';
import EmergencySOSButton from '../components/EmergencySOSButton';
import SafetyShortcuts from '../components/SafetyShortcuts';
import BottomSafetyStatus from '../components/BottomSafetyStatus';
import SafeRouteModal from '../components/SafeRouteModal';
import EmergencyContactsModal from '../components/EmergencyContactsModal';
import Call112Modal from '../components/Call112Modal';
import SettingsModal from '../components/SettingsModal';
import EmergencyMode from '../components/EmergencyMode';
import SosPermissionWarningModal from '../components/SosPermissionWarningModal';
import StatusMessage from '../components/StatusMessage';

import type { EmergencyContact } from '../services/emergency';
import {
  getEmergencyContacts,
  saveEmergencyContact,
  deleteEmergencyContact,
  triggerHaptic,
} from '../services/emergency';

import type { RealLocationData } from '../services/location';
import {
  fetchRealDeviceLocation,
  startLiveLocationWatch,
  clearLocationWatch,
} from '../services/location';

import type { SafeMeshPermissionsState } from '../services/permissions';
import {
  subscribePermissions,
  refreshAllPermissions,
  requestLocationPermission,
} from '../services/permissions';

interface HomeProps {
  onNavigate: (view: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  // Real permissions state
  const [permissions, setPermissions] = useState<SafeMeshPermissionsState>({
    location: 'UNKNOWN',
    bluetooth: 'UNKNOWN',
    notifications: 'UNKNOWN',
    sms: 'UNKNOWN',
    isInitialFlowCompleted: true,
  });

  // Real device location state
  const [location, setLocation] = useState<RealLocationData | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Contacts and UI state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [activeModal, setActiveModal] = useState<'safe_route' | 'contacts' | 'call_112' | 'settings' | null>(null);
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
    setIsLocating(true);
    try {
      const loc = await fetchRealDeviceLocation();
      setLocation(loc);
    } catch {
      // Error handled by location service
    } finally {
      setIsLocating(false);
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

  // 3. Load contacts
  useEffect(() => {
    setContacts(getEmergencyContacts());
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
    showToast('🚨 SafeMesh Emergency SOS Broadcast Active');
  }, [showToast]);

  // 1.5 Auto-Start Countdown
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(5);

  useEffect(() => {
    if (autoStartCountdown === null) return;
    
    if (autoStartCountdown === 0) {
      setAutoStartCountdown(null);
      activateEmergencyWorkflow();
      return;
    }

    const timer = setTimeout(() => {
      setAutoStartCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoStartCountdown, activateEmergencyWorkflow]);

  const handleDeactivateSos = useCallback(() => {
    setSosActive(false);
    triggerHaptic(100);
    showToast('Emergency mode cancelled. You are safe.');
  }, [showToast]);

  // Contacts management
  const handleAddContact = (contactData: Omit<EmergencyContact, 'id'>) => {
    const updated = saveEmergencyContact(contactData);
    setContacts(updated);
  };

  const handleDeleteContact = (id: string) => {
    const updated = deleteEmergencyContact(id);
    setContacts(updated);
  };

  return (
    <div className="safemesh-dashboard-shell">
      {/* 1. Header with dynamic safety status based on real device state */}
      <SafeMeshHeader
        onProfileClick={() => setActiveModal('settings')}
        locationPermission={permissions.location}
        hasLocationData={location !== null && location.status === 'LIVE'}
        isLocating={isLocating}
        isEmergencyActive={sosActive}
      />

      {/* 2. Greeting Section */}
      <GreetingSection />

      {/* 3. Real Location Context Bar */}
      <LocationContextBar
        location={location}
        permissionStatus={permissions.location}
        isLocating={isLocating}
        onRetry={loadLocation}
        onRequestPermission={handleRequestLocation}
        onLocationClick={() => setActiveModal('safe_route')}
      />

      {/* 4. Central HERO SOS Button */}
      <EmergencySOSButton onActivate={handleSosHoldComplete} />

      {/* 5. Secondary Action Shortcuts */}
      <SafetyShortcuts
        onSafeRouteClick={() => setActiveModal('safe_route')}
        onContactsClick={() => setActiveModal('contacts')}
        onCall112Click={() => setActiveModal('call_112')}
        onGuardianClick={() => onNavigate('nearby_guardian')}
        onSettingsClick={() => setActiveModal('settings')}
      />

      {/* 6. Bottom Safety Status Area (NO FAKE DATA!) */}
      <BottomSafetyStatus
        location={location}
        locationPermission={permissions.location}
        bluetoothPermission={permissions.bluetooth}
        notificationPermission={permissions.notifications}
        realGuardianCount={null} /* Null: waiting for backend / real mesh responders */
      />

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

      {/* Auto-Start 5-Second Countdown Overlay */}
      {autoStartCountdown !== null && !sosActive && (
        <div className="safemesh-emergency-backdrop" style={{ zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
          <h1 style={{ color: '#EF4444', fontSize: '1.8rem', marginBottom: '24px', textAlign: 'center', fontWeight: 'bold' }}>AUTO-STARTING SOS</h1>
          <div style={{ fontSize: '6rem', color: 'white', fontWeight: '800', marginBottom: '48px' }}>{autoStartCountdown}</div>
          <button 
            onClick={() => setAutoStartCountdown(null)}
            style={{ padding: '20px 48px', backgroundColor: '#334155', color: 'white', borderRadius: '32px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            CANCEL (I AM SAFE)
          </button>
        </div>
      )}

      {/* Toast Feedback */}
      <StatusMessage message={toast} />
    </div>
  );
}

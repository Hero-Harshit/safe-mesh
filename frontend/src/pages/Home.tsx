import { useState, useEffect, useCallback, useRef } from 'react';
import SafetyMeshHeader from '../components/SafetyMeshHeader';
import EmergencySOSButton from '../components/EmergencySOSButton';
import SafetyShortcuts from '../components/SafetyShortcuts';
import SafeRouteModal from '../components/SafeRouteModal';
import Call112Modal from '../components/Call112Modal';
import SettingsModal from '../components/SettingsModal';
import EmergencyMode from '../components/EmergencyMode';
import SosPermissionWarningModal from '../components/SosPermissionWarningModal';
import SafetyToolkitModal from '../components/SafetyToolkitModal';
import SafetyTimerModal from '../components/SafetyTimerModal';
import PinValidationModal from '../components/PinValidationModal';
import AmbientGuardCard from '../components/AmbientGuardCard';
import ThreatCountdownModal from '../components/ThreatCountdownModal';
import StatusMessage from '../components/StatusMessage';
import NearbyGuardianSetup from './NearbyGuardianSetup';

import type { EmergencyContact } from '../services/emergency';
import {
  getEmergencyContacts,
  saveEmergencyContact,
  deleteEmergencyContact,
  triggerHaptic,
} from '../services/emergency';
import {
  syncEmergencyContactsToNative,
  onNativeThreatEvent,
  getNativeBridge,
  requestNativeEmergencyPermissions,
} from '../services/native';

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
    background_location: 'UNKNOWN',
    bluetooth: 'UNKNOWN',
    notifications: 'UNKNOWN',
    sms: 'UNKNOWN',
    battery: 'UNKNOWN',
    isInitialFlowCompleted: true,
  });

  // Real device location state
  const [location, setLocation] = useState<RealLocationData | null>(null);

  // Contacts and UI state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [activeModal, setActiveModal] = useState<'safe_route' | 'contacts' | 'call_112' | 'settings' | 'nearby_guardian' | 'toolkit' | 'timer' | 'pin_validation' | null>(null);
  const [showSosWarning, setShowSosWarning] = useState(false);

  const [safeTimerActive, setSafeTimerActive] = useState(false);
  const [safeTimerDuration, setSafeTimerDuration] = useState<number | null>(null);
  const [safeTimerDueTime, setSafeTimerDueTime] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [threatReason, setThreatReason] = useState<string | null>(null);
  const [needsNativePerms, setNeedsNativePerms] = useState(false);

  const checkNativePerms = useCallback(() => {
    const bridge = getNativeBridge();
    if (bridge) {
      const hasSms = typeof bridge.hasSmsPermission === 'function' ? bridge.hasSmsPermission() : true;
      const hasCall = typeof bridge.hasCallPermission === 'function' ? bridge.hasCallPermission() : true;
      setNeedsNativePerms(!hasSms || !hasCall);
    }
  }, []);

  useEffect(() => {
    checkNativePerms();
    const timer = setInterval(checkNativePerms, 2500);
    return () => clearInterval(timer);
  }, [checkNativePerms]);

  const activeModalRef = useRef(activeModal);
  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  const handleThreatDetected = useCallback((reason: string) => {
    if (!sosActive && !threatReason) {
      setThreatReason(reason);
    }
  }, [sosActive, threatReason]);

  const handleCancelThreat = useCallback(() => {
    setThreatReason(null);
    setToast('Threat alert cancelled. You are safe.');
  }, []);

  useEffect(() => {
    const unsubThreat = onNativeThreatEvent((reason) => {
      handleThreatDetected(reason === 'snatch' ? 'Violent Phone Snatch Detected (Native Sensor)' : reason);
    });
    return () => unsubThreat();
  }, [handleThreatDetected]);

  const openModal = useCallback((modal: 'safe_route' | 'contacts' | 'call_112' | 'settings' | 'nearby_guardian' | 'toolkit' | 'timer' | 'pin_validation') => {
    if (window.history.state?.safetymesh_modal !== modal) {
      window.history.pushState({ safetymesh_modal: modal }, '');
    }
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    if (window.history.state && window.history.state.safetymesh_modal) {
      window.history.back();
    } else {
      setActiveModal(null);
    }
  }, []);

  const handleOpenSosWarning = useCallback(() => {
    window.history.pushState({ safetymesh_modal: 'sos_warning' }, '');
    setShowSosWarning(true);
  }, []);

  const handleCloseSosWarning = useCallback(() => {
    if (window.history.state?.safetymesh_modal === 'sos_warning') {
      window.history.back();
    } else {
      setShowSosWarning(false);
    }
  }, []);

  // Listen to Android hardware back button & swipe back gestures via popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Do not allow bypassing the dead man's switch countdown via swipe/back
      if (activeModalRef.current === 'pin_validation') {
        window.history.pushState({ safetymesh_modal: 'pin_validation' }, '');
        return;
      }

      if (e.state && e.state.safetymesh_modal) {
        if (e.state.safetymesh_modal === 'sos_warning') {
          setShowSosWarning(true);
          setActiveModal(null);
        } else {
          setActiveModal(e.state.safetymesh_modal);
          setShowSosWarning(false);
        }
      } else {
        setActiveModal(null);
        setShowSosWarning(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (safeTimerActive && safeTimerDueTime) {
      interval = setInterval(() => {
        if (Date.now() >= safeTimerDueTime) {
          if (activeModal !== 'pin_validation') {
            openModal('pin_validation');
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [safeTimerActive, safeTimerDueTime, activeModal, openModal]);

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
      handleOpenSosWarning();
    } else {
      activateEmergencyWorkflow();
    }
  };

  const handleStartSafeTimer = (minutes: number) => {
    setSafeTimerActive(true);
    setSafeTimerDuration(minutes);
    setSafeTimerDueTime(Date.now() + minutes * 60 * 1000);
    showToast(`Safe Timer active for ${minutes} min(s)`);
  };

  const handleStopSafeTimer = () => {
    setSafeTimerActive(false);
    setSafeTimerDuration(null);
    setSafeTimerDueTime(null);
    showToast('Safe Timer stopped');
  };

  const activateEmergencyWorkflow = useCallback(() => {
    handleCloseSosWarning();
    setSosActive(true);
    triggerHaptic([300, 100, 300, 100, 500]);
    showToast('🚨 SafetyMesh Emergency SOS Broadcast Active');
  }, [showToast, handleCloseSosWarning]);

  const handleConfirmThreat = useCallback(() => {
    setThreatReason(null);
    activateEmergencyWorkflow();
  }, [activateEmergencyWorkflow]);

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
        onProfileClick={() => openModal('settings')}
      />


      {/* Ambient Threat Guard (Acoustic & Snatch Sentinel) */}
      <div style={{ flexShrink: 0, padding: '0 4px', width: '100%' }}>
        <AmbientGuardCard
          onThreatDetected={handleThreatDetected}
        />
      </div>

      {/* Secondary Action Shortcuts (Moved below Ambient Guard) */}
      <div style={{ flexShrink: 0, width: '100%' }}>
        <SafetyShortcuts
          onSafeRouteClick={() => openModal('safe_route')}
          onGuardianClick={() => openModal('nearby_guardian')}
          onTimerClick={() => openModal('timer')}
          onToolkitClick={() => openModal('toolkit')}
        />
      </div>

      {/* Central HERO SOS Button (Anchored to the bottom for thumb reachability) */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', minHeight: 0, width: '100%', marginBottom: '8px' }}>
        {needsNativePerms && (
          <div
            onClick={() => {
              requestNativeEmergencyPermissions();
              setTimeout(checkNativePerms, 1000);
            }}
            style={{
              width: 'calc(100% - 16px)',
              maxWidth: '420px',
              margin: '0 8px 12px',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239,68,68,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991B1B' }}>SMS & Call Permissions Required</div>
                <div style={{ fontSize: '0.74rem', color: '#B91C1C' }}>Tap to allow background emergency SMS & calling</div>
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', textDecoration: 'underline' }}>Allow</span>
          </div>
        )}
        <EmergencySOSButton onActivate={handleSosHoldComplete} />
      </div>


      {/* Safe Route Modal */}
      {activeModal === 'safe_route' && (
        <SafeRouteModal
          location={location}
          locationPermission={permissions.location}
          onRequestLocationPermission={handleRequestLocation}
          onClose={closeModal}
          onShowToast={showToast}
        />
      )}

      {/* Call 112 Modal */}
      {activeModal === 'call_112' && (
        <Call112Modal
          location={location}
          onClose={closeModal}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          onClose={closeModal}
          onShowToast={showToast}
          contacts={contacts}
          onAddContact={handleAddContact}
          onDeleteContact={handleDeleteContact}
          currentMapsUrl={location?.mapsUrl}
        />
      )}

      {/* Nearby Guardian Modal */}
      {activeModal === 'nearby_guardian' && (
        <NearbyGuardianSetup
          location={location}
          locationPermission={permissions.location}
          bluetoothPermission={permissions.bluetooth}
          onRefreshPermissions={refreshAllPermissions}
          onBack={closeModal}
          onClose={closeModal}
          onShowToast={showToast}
        />
      )}

      {/* Safety Toolkit Modal */}
      {activeModal === 'toolkit' && (
        <SafetyToolkitModal onClose={closeModal} />
      )}

      {/* Safety Timer Modal */}
      {activeModal === 'timer' && (
        <SafetyTimerModal 
          onClose={closeModal}
          isActive={safeTimerActive}
          onStartTimer={handleStartSafeTimer}
          onStopTimer={() => {
            handleStopSafeTimer();
            closeModal();
          }}
        />
      )}

      {/* Pin Validation Modal */}
      {activeModal === 'pin_validation' && (
        <PinValidationModal
          onSuccess={() => {
            closeModal();
            if (safeTimerDuration) {
              setSafeTimerDueTime(Date.now() + safeTimerDuration * 60 * 1000);
              showToast('Safe Timer extended');
            }
          }}
          onDuress={() => {
            closeModal();
            setSafeTimerActive(false);
            showToast('Timer Stopped');
            activateEmergencyWorkflow();
          }}
          onTimeout={() => {
            closeModal();
            setSafeTimerActive(false);
            activateEmergencyWorkflow();
          }}
        />
      )}

      {/* Threat Anomaly Countdown Overlay */}
      {threatReason && (
        <ThreatCountdownModal
          reason={threatReason}
          onCancel={handleCancelThreat}
          onConfirmThreat={handleConfirmThreat}
        />
      )}

      {/* SOS Warning Modal when Location is Missing */}
      {showSosWarning && (
        <SosPermissionWarningModal
          onEnableLocation={async () => {
            handleCloseSosWarning();
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
          onCancel={handleCloseSosWarning}
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

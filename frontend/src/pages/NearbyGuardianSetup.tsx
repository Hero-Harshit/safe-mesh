import React, { useState, useEffect } from 'react';
import { GuardianMeshIcon, ShieldCheckIcon } from '../components/Icons';
import type { PermissionStatus } from '../services/permissions';
import type { LocationData } from '../services/location';

// IMPORT NATIVE BRIDGE FUNCTIONS
import { 
  requestBluetoothPermissions, 
  areBluetoothPermissionsGranted, 
  startEmergencyBeacon, 
  stopEmergencyBeacon,
  startGuardianScanner,
  stopGuardianScanner,
  onEmergencyBeaconDetected
} from '../services/native';
import type { BleScanEvent } from '../services/native';

interface NearbyGuardianSetupProps {
  location?: LocationData | null;
  locationPermission?: PermissionStatus;
  bluetoothPermission?: PermissionStatus;
  onRefreshPermissions?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onShowToast?: (msg: string) => void;
}

export const NearbyGuardianSetup: React.FC<NearbyGuardianSetupProps> = ({
  locationPermission,
  bluetoothPermission,
  onBack,
  onClose,
  onShowToast,
}) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  };

  // NATIVE BLUETOOTH STATE (Android Bridge)
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(areBluetoothPermissionsGranted());
  
  // Advertiser state
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [isBeaconStarting, setIsBeaconStarting] = useState(false);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  
  // Scanner state
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isScannerStarting, setIsScannerStarting] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [latestDetection, setLatestDetection] = useState<BleScanEvent | null>(null);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // Register event listener for BLE detections from Android native layer
    onEmergencyBeaconDetected((event) => {
      setDetectedCount(prev => prev + 1);
      setLatestDetection(event);
    });
  }, []);

  // Sync the prop permission to local native state if needed
  useEffect(() => {
    setPermissionsGranted(areBluetoothPermissionsGranted());
  }, [bluetoothPermission]);

  const handleStartBeacon = async () => {
    setStatusMsg(null);
    setIsBeaconStarting(true);

    if (permissionsGranted === false) {
      const granted = await requestBluetoothPermissions();
      setPermissionsGranted(granted);
      if (!granted) {
        const msg = 'Bluetooth permission is required to start the beacon.';
        setStatusMsg(msg);
        if (onShowToast) onShowToast(msg);
        setIsBeaconStarting(false);
        return;
      }
    }

    const result = await startEmergencyBeacon();
    if (result.success) {
      setIsBeaconActive(true);
      setEmergencyId(result.emergencyId || null);
      const msg = 'SafetyMesh Emergency Beacon Active!';
      setStatusMsg(msg);
      if (onShowToast) onShowToast(msg);
    } else {
      if (result.error === 'BLUETOOTH_PERMISSION_DENIED') {
        const granted = await requestBluetoothPermissions();
        setPermissionsGranted(granted);
        if (granted) {
          const retryResult = await startEmergencyBeacon();
          if (retryResult.success) {
            setIsBeaconActive(true);
            setEmergencyId(retryResult.emergencyId || null);
            const msg = 'SafetyMesh Emergency Beacon Active!';
            setStatusMsg(msg);
            if (onShowToast) onShowToast(msg);
          } else {
            setStatusMsg('Failed to start beacon: ' + retryResult.error);
          }
        } else {
          const msg = 'Bluetooth permission is required to start the beacon.';
          setStatusMsg(msg);
          if (onShowToast) onShowToast(msg);
        }
      } else {
        setStatusMsg('Failed to start beacon: ' + result.error);
      }
    }
    setIsBeaconStarting(false);
  };

  const handleStopBeacon = async () => {
    const result = await stopEmergencyBeacon();
    if (result.success) {
      setIsBeaconActive(false);
      setEmergencyId(null);
      const msg = 'Emergency Beacon Stopped.';
      setStatusMsg(msg);
      if (onShowToast) onShowToast(msg);
    } else {
      setStatusMsg('Failed to stop beacon.');
    }
  };

  const handleStartScanner = async () => {
    setStatusMsg(null);
    setIsScannerStarting(true);

    if (permissionsGranted === false) {
      const granted = await requestBluetoothPermissions();
      setPermissionsGranted(granted);
      if (!granted) {
        const msg = 'Bluetooth permission is required for Nearby Guardian.';
        setStatusMsg(msg);
        if (onShowToast) onShowToast(msg);
        setIsScannerStarting(false);
        return;
      }
    }

    const result = await startGuardianScanner();
    if (result.success) {
      setIsScannerActive(true);
      const msg = 'Guardian Scanner Active!';
      setStatusMsg(msg);
      if (onShowToast) onShowToast(msg);
    } else {
      if (result.error === 'BLUETOOTH_PERMISSION_DENIED') {
        const granted = await requestBluetoothPermissions();
        setPermissionsGranted(granted);
        if (granted) {
          const retryResult = await startGuardianScanner();
          if (retryResult.success) {
            setIsScannerActive(true);
            const msg = 'Guardian Scanner Active!';
            setStatusMsg(msg);
            if (onShowToast) onShowToast(msg);
          } else {
            setStatusMsg('Failed to start scanner: ' + retryResult.error);
          }
        } else {
          const msg = 'Bluetooth permission is required for Nearby Guardian.';
          setStatusMsg(msg);
          if (onShowToast) onShowToast(msg);
        }
      } else {
        setStatusMsg('Failed to start scanner: ' + result.error);
      }
    }
    setIsScannerStarting(false);
  };

  const handleStopScanner = async () => {
    const result = await stopGuardianScanner();
    if (result.success) {
      setIsScannerActive(false);
      setDetectedCount(0);
      setLatestDetection(null);
      const msg = 'Scanner Stopped.';
      setStatusMsg(msg);
      if (onShowToast) onShowToast(msg);
    } else {
      setStatusMsg('Failed to stop scanner.');
    }
  };

  return (
    <div className="safetymesh-modal-backdrop" onClick={handleClose}>
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-blue-tint">
              <GuardianMeshIcon size={22} color="#3B82F6" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Nearby Guardian</h2>
              <span className="modal-sheet-subtitle">Offline Bluetooth Mesh</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content">
          {/* Beacon Status Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '18px 16px', boxShadow: '0 2px 10px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '9px', 
                  height: '9px', 
                  borderRadius: '50%', 
                  backgroundColor: isBeaconActive ? '#10B981' : '#CBD5E1', 
                  boxShadow: isBeaconActive ? '0 0 8px rgba(16,185,129,0.7)' : 'none' 
                }}></span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                  {isBeaconStarting ? 'Starting...' : (isBeaconActive ? 'Beacon: Active' : 'Beacon: Idle')}
                </span>
              </div>
              <span style={{ 
                backgroundColor: isBeaconActive ? '#ECFDF5' : '#F1F5F9', 
                color: isBeaconActive ? '#10B981' : '#64748B', 
                padding: '3px 9px', 
                borderRadius: '12px', 
                fontSize: '11px', 
                fontWeight: '700', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                {isBeaconActive ? 'BLE 5.2 SECURE' : 'READY'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 14px 0' }}>
              SafetyMesh forms local peer-to-peer encrypted mesh paths between nearby smartphones. Manually start the broadcast below to test the Android BLE advertiser.
            </p>

            {isBeaconActive && emergencyId && (
              <div style={{ backgroundColor: '#FEF2F2', padding: '10px 14px', borderRadius: '10px', border: '1px dashed #FECACA', marginBottom: '14px' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#EF4444', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px', letterSpacing: '0.5px' }}>Emergency ID</span>
                <div style={{ fontSize: '16px', fontFamily: 'monospace', color: '#DC2626', fontWeight: '700', letterSpacing: '1px' }}>
                  {emergencyId}
                </div>
              </div>
            )}

            {!isBeaconActive ? (
              <button
                onClick={handleStartBeacon}
                disabled={isBeaconStarting}
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  backgroundColor: '#EF4444', 
                  color: 'white', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  cursor: isBeaconStarting ? 'not-allowed' : 'pointer', 
                  boxShadow: '0 4px 14px rgba(239,68,68,0.25)', 
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isBeaconStarting ? 'STARTING...' : 'START EMERGENCY BROADCAST'}
              </button>
            ) : (
              <button
                onClick={handleStopBeacon}
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  backgroundColor: '#F1F5F9', 
                  color: '#475569', 
                  borderRadius: '12px', 
                  border: '1px solid #E2E8F0', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }}
              >
                STOP BROADCAST
              </button>
            )}

            {statusMsg && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#2563EB', textAlign: 'center', fontWeight: '600' }}>
                {statusMsg}
              </div>
            )}
          </div>

          {/* Scanner Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Active Peers In Range
            </span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '700', 
              color: isScannerActive ? '#10B981' : '#94A3B8',
              backgroundColor: isScannerActive ? '#ECFDF5' : '#F1F5F9',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              {isScannerStarting ? 'Starting...' : (isScannerActive ? `${detectedCount} Detected` : 'Idle')}
            </span>
          </div>

          {!isScannerActive ? (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '14px', padding: '18px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Start the scanner to listen for nearby emergency beacons.
              </p>
              <button
                onClick={handleStartScanner}
                disabled={isScannerStarting}
                style={{ 
                  backgroundColor: '#1E293B', 
                  color: 'white', 
                  padding: '12px 20px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  cursor: isScannerStarting ? 'not-allowed' : 'pointer', 
                  transition: 'all 0.2s', 
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(30,41,59,0.15)'
                }}
              >
                {isScannerStarting ? 'STARTING...' : 'START GUARDIAN SCANNER'}
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                <ShieldCheckIcon size={22} color="#10B981" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', textAlign: 'center', margin: '0 0 12px 0' }}>Listening for Safety Nodes</h3>
              
              <button
                onClick={handleStopScanner}
                style={{ width: '100%', padding: '11px', backgroundColor: '#FFFFFF', color: '#475569', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginBottom: '14px', transition: 'all 0.2s' }}
              >
                STOP SCANNER
              </button>

              {latestDetection ? (
                <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1.5px solid #E0E7FF' }}>
                  <span style={{ fontSize: '10px', color: '#8B5CF6', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>Latest Emergency</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Emergency ID</span>
                      <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: '#1E293B' }}>{latestDetection.emergencyId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Proximity</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#3B82F6' }}>{latestDetection.proximity}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', lineHeight: '1.5', margin: 0 }}>
                  Your device is actively listening for peer distress beacons within a 50-meter radius.
                  No active signals detected.
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: '6px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '15px' }}>🔒</span>
            <p style={{ fontSize: '11.5px', color: '#64748B', lineHeight: '1.45', margin: 0 }}>
              <strong style={{ color: '#475569' }}>Zero Knowledge Protection</strong>: No fake devices are simulated. SafetyMesh strictly broadcasts peer SOS packets only when an emergency is explicitly triggered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NearbyGuardianSetup;

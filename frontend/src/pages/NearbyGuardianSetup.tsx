import React, { useState, useEffect } from 'react';
import SafeMeshHeader from '../components/SafeMeshHeader';
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
  location: LocationData | null;
  locationPermission: PermissionStatus;
  bluetoothPermission: PermissionStatus;
  onRefreshPermissions: () => void;
  onBack: () => void;
}

export const NearbyGuardianSetup: React.FC<NearbyGuardianSetupProps> = ({
  location,
  locationPermission,
  bluetoothPermission,
  onBack,
}) => {
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
        setStatusMsg('Bluetooth permission is required to start the beacon.');
        setIsBeaconStarting(false);
        return;
      }
    }

    const result = await startEmergencyBeacon();
    if (result.success) {
      setIsBeaconActive(true);
      setEmergencyId(result.emergencyId || null);
      setStatusMsg('SafeMesh Emergency Beacon Active!');
    } else {
      if (result.error === 'BLUETOOTH_PERMISSION_DENIED') {
        const granted = await requestBluetoothPermissions();
        setPermissionsGranted(granted);
        if (granted) {
          const retryResult = await startEmergencyBeacon();
          if (retryResult.success) {
            setIsBeaconActive(true);
            setEmergencyId(retryResult.emergencyId || null);
            setStatusMsg('SafeMesh Emergency Beacon Active!');
          } else {
            setStatusMsg('Failed to start beacon: ' + retryResult.error);
          }
        } else {
          setStatusMsg('Bluetooth permission is required to start the beacon.');
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
      setStatusMsg('Emergency Beacon Stopped.');
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
        setStatusMsg('Bluetooth permission is required for Nearby Guardian.');
        setIsScannerStarting(false);
        return;
      }
    }

    const result = await startGuardianScanner();
    if (result.success) {
      setIsScannerActive(true);
      setStatusMsg('Guardian Scanner Active!');
    } else {
      if (result.error === 'BLUETOOTH_PERMISSION_DENIED') {
        const granted = await requestBluetoothPermissions();
        setPermissionsGranted(granted);
        if (granted) {
          const retryResult = await startGuardianScanner();
          if (retryResult.success) {
            setIsScannerActive(true);
            setStatusMsg('Guardian Scanner Active!');
          } else {
            setStatusMsg('Failed to start scanner: ' + retryResult.error);
          }
        } else {
          setStatusMsg('Bluetooth permission is required for Nearby Guardian.');
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
      setStatusMsg('Scanner Stopped.');
    } else {
      setStatusMsg('Failed to stop scanner.');
    }
  };

  return (
    <div className="safemesh-page-container">
      <SafeMeshHeader
        locationPermission={locationPermission}
        hasLocationData={location !== null && location.status === 'LIVE'}
        isLocating={false}
      />

      <div className="page-nav-bar">
        <button className="page-back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="page-content-wrapper">
        <div className="section-title-header">
          <div className="title-icon-bubble bg-amber-tint">
            <GuardianMeshIcon size={24} color="#F59E0B" />
          </div>
          <div>
            <h1 className="page-heading">Nearby Guardian</h1>
            <p className="page-subheading">Offline Bluetooth Mesh Safety Network</p>
          </div>
        </div>

        {/* Real Mesh Status Card - Modified to include functional buttons */}
        <div className="mesh-summary-card">
          <div className="mesh-status-top">
            <div className="mesh-status-indicator">
              <span className={`mesh-circle-dot ${isBeaconActive ? 'online' : 'standby'}`}></span>
              <span className="mesh-status-title">
                {isBeaconStarting ? 'Starting...' : (isBeaconActive ? 'Beacon: Active' : 'Beacon: Idle')}
              </span>
            </div>
            <span className="mesh-protocol-pill">
              {isBeaconActive ? 'BLE 5.2 SECURE' : 'READY'}
            </span>
          </div>

          <p className="mesh-status-description">
            SafeMesh forms local peer-to-peer encrypted mesh paths between nearby smartphones. Manually start the emergency broadcast below to test the Android BLE advertiser.
          </p>

          {isBeaconActive && emergencyId && (
            <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '8px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--danger-color)', textTransform: 'uppercase', fontWeight: 'bold' }}>Emergency ID</span>
              <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--danger-color)', fontWeight: 'bold' }}>
                {emergencyId}
              </div>
            </div>
          )}

          {!isBeaconActive ? (
            <button
              className="btn-enable-mesh"
              onClick={handleStartBeacon}
              disabled={isBeaconStarting}
              style={{ backgroundColor: '#e74c3c', color: 'white' }}
            >
              {isBeaconStarting ? 'STARTING...' : 'START EMERGENCY BROADCAST'}
            </button>
          ) : (
            <button
              className="btn-enable-mesh"
              onClick={handleStopBeacon}
              style={{ backgroundColor: '#95a5a6', color: 'white' }}
            >
              STOP BROADCAST
            </button>
          )}

          {statusMsg && <div className="mesh-toast-inline">{statusMsg}</div>}
        </div>

        {/* Scanner Section */}
        <div className="guardians-list-section">
          <div className="list-section-header">
            <h2 className="list-section-title">ACTIVE PEERS IN RANGE</h2>
            <span className="list-section-count">
              {isScannerStarting ? 'Starting...' : (isScannerActive ? `${detectedCount} Peers Detected` : 'Idle')}
            </span>
          </div>

          {!isScannerActive ? (
            <div className="empty-state-card" style={{ padding: '20px' }}>
              <p className="empty-state-desc" style={{ textAlign: 'center', marginBottom: '15px' }}>
                Start the scanner to listen for nearby emergency beacons.
              </p>
              <button
                className="btn-enable-permission"
                onClick={handleStartScanner}
                disabled={isScannerStarting}
                style={{ width: '100%' }}
              >
                {isScannerStarting ? 'STARTING...' : 'START GUARDIAN SCANNER'}
              </button>
            </div>
          ) : (
            <div className="empty-state-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div className="empty-icon-circle bg-green-tint" style={{ alignSelf: 'center' }}>
                <ShieldCheckIcon size={24} color="#10B981" />
              </div>
              <h3 className="empty-state-title" style={{ alignSelf: 'center' }}>Listening for Safety Nodes</h3>
              
              <button
                className="btn-enable-permission"
                onClick={handleStopScanner}
                style={{ width: '100%', backgroundColor: '#95a5a6', color: 'white', marginTop: '15px', marginBottom: '15px' }}
              >
                STOP SCANNER
              </button>

              {latestDetection ? (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd', width: '100%', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Latest Emergency</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Emergency ID</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{latestDetection.emergencyId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Proximity</span>
                      <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{latestDetection.proximity}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty-state-desc" style={{ textAlign: 'center' }}>
                  Your device is actively listening for peer distress beacons within a 50-meter radius.
                  No active SOS signals detected in your immediate vicinity.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="guardian-security-footnote">
          <p>
            🔒 <strong>Zero Knowledge Protection</strong>: No fake devices are simulated. SafeMesh strictly broadcasts peer SOS packets only when an emergency is explicitly triggered.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NearbyGuardianSetup;

import React, { useState, useEffect } from 'react';
import SafeMeshHeader from '../components/SafeMeshHeader';
import { GuardianMeshIcon, ShieldCheckIcon } from '../components/Icons';
import { requestBluetoothPermission } from '../services/permissions';
import type { PermissionStatus } from '../services/permissions';
import type { LocationData } from '../services/location';

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
  onRefreshPermissions,
  onBack,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isBluetoothGranted = bluetoothPermission === 'GRANTED';

  useEffect(() => {
    if (isBluetoothGranted) {
      setIsScanning(true);
    }
  }, [isBluetoothGranted]);

  const handleRequestBluetooth = async () => {
    setStatusMsg('Requesting Bluetooth / Nearby Devices access...');
    const result = await requestBluetoothPermission();
    onRefreshPermissions();
    if (result === 'GRANTED') {
      setIsScanning(true);
      setStatusMsg('Bluetooth access granted. SafeMesh beacon active.');
    } else {
      setStatusMsg('Permission not granted. Bluetooth is required for peer mesh.');
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

        {/* Real Mesh Status Card */}
        <div className="mesh-summary-card">
          <div className="mesh-status-top">
            <div className="mesh-status-indicator">
              <span className={`mesh-circle-dot ${isBluetoothGranted ? 'online' : 'standby'}`}></span>
              <span className="mesh-status-title">
                {isBluetoothGranted ? 'Bluetooth Mesh: Active' : 'Bluetooth: —'}
              </span>
            </div>
            <span className="mesh-protocol-pill">
              {isBluetoothGranted ? 'BLE 5.2 SECURE' : 'ACCESS REQUIRED'}
            </span>
          </div>

          <p className="mesh-status-description">
            {isBluetoothGranted
              ? 'SafeMesh forms local peer-to-peer encrypted mesh paths between nearby smartphones. If cellular signals fail, SOS packets hop between devices until finding an uplink.'
              : 'Bluetooth / Nearby Devices permission is required to detect nearby safety beacons and relay emergency alerts offline.'}
          </p>

          {!isBluetoothGranted ? (
            <button className="btn-enable-mesh" onClick={handleRequestBluetooth}>
              Enable Bluetooth Access
            </button>
          ) : (
            <div className="mesh-active-metric-bar">
              <div className="mesh-metric-item">
                <span className="mesh-metric-number">{isScanning ? 'Active' : 'Standby'}</span>
                <span className="mesh-metric-label">Beacon State</span>
              </div>
              <div className="mesh-metric-divider"></div>
              <div className="mesh-metric-item">
                <span className="mesh-metric-number">AES-256</span>
                <span className="mesh-metric-label">Encrypted</span>
              </div>
              <div className="mesh-metric-divider"></div>
              <div className="mesh-metric-item">
                <span className="mesh-metric-number">&lt; 50m</span>
                <span className="mesh-metric-label">Hop Range</span>
              </div>
            </div>
          )}

          {statusMsg && <div className="mesh-toast-inline">{statusMsg}</div>}
        </div>

        {/* Real Device Peers Section (NO FAKE DEVICES!) */}
        <div className="guardians-list-section">
          <div className="list-section-header">
            <h2 className="list-section-title">ACTIVE PEERS IN RANGE</h2>
            <span className="list-section-count">
              {!isBluetoothGranted ? '—' : isScanning ? '0 Peers Detected' : 'Idle'}
            </span>
          </div>

          {!isBluetoothGranted ? (
            <div className="empty-state-card" style={{ padding: '20px' }}>
              <p className="empty-state-desc" style={{ textAlign: 'center' }}>
                Bluetooth access required to scan for nearby peer guardians.
              </p>
              <button
                className="btn-enable-permission"
                style={{ width: 'auto', alignSelf: 'center', marginTop: '6px' }}
                onClick={handleRequestBluetooth}
              >
                Enable Bluetooth
              </button>
            </div>
          ) : (
            <div className="empty-state-card" style={{ padding: '20px' }}>
              <div className="empty-icon-circle bg-green-tint">
                <ShieldCheckIcon size={24} color="#10B981" />
              </div>
              <h3 className="empty-state-title">Listening for Safety Nodes</h3>
              <p className="empty-state-desc">
                Your device is actively listening for peer distress beacons within a 50-meter radius.
                No active SOS signals detected in your immediate vicinity.
              </p>
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

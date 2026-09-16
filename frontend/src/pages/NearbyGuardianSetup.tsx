import React, { useState, useEffect } from 'react';
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
import Header from '../components/Header';
import StatusMessage from '../components/StatusMessage';

const NearbyGuardianSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    // Register event listener for BLE detections
    onEmergencyBeaconDetected((event) => {
      setDetectedCount(prev => prev + 1);
      setLatestDetection(event);
    });
  }, []);

  const handleStartBeacon = async () => {
    setMessage(null);
    setIsBeaconStarting(true);

    if (permissionsGranted === false) {
      const granted = await requestBluetoothPermissions();
      setPermissionsGranted(granted);
      if (!granted) {
        setMessage({ text: 'Bluetooth permission is required to start the beacon.', type: 'error' });
        setIsBeaconStarting(false);
        return;
      }
    }

    const result = await startEmergencyBeacon();
    if (result.success) {
      setIsBeaconActive(true);
      setEmergencyId(result.emergencyId || null);
    } else {
      if (result.error === 'BLUETOOTH_PERMISSION_DENIED') {
        const granted = await requestBluetoothPermissions();
        setPermissionsGranted(granted);
        if (granted) {
          const retryResult = await startEmergencyBeacon();
          if (retryResult.success) {
            setIsBeaconActive(true);
            setEmergencyId(retryResult.emergencyId || null);
          } else {
            setMessage({ text: 'Failed to start beacon: ' + retryResult.error, type: 'error' });
          }
        } else {
          setMessage({ text: 'Bluetooth permission is required to start the beacon.', type: 'error' });
        }
      } else {
        setMessage({ text: 'Failed to start beacon: ' + result.error, type: 'error' });
      }
    }
    setIsBeaconStarting(false);
  };

  const handleStopBeacon = async () => {
    const result = await stopEmergencyBeacon();
    if (result.success) {
      setIsBeaconActive(false);
      setEmergencyId(null);
    } else {
      setMessage({ text: 'Failed to stop beacon.', type: 'error' });
    }
  };

  const handleStartScanner = async () => {
    setMessage(null);
    setIsScannerStarting(true);

    if (permissionsGranted === false) {
      const granted = await requestBluetoothPermissions();
      setPermissionsGranted(granted);
      if (!granted) {
        setMessage({ text: 'Bluetooth permission is required for Nearby Guardian.', type: 'error' });
        setIsScannerStarting(false);
        return;
      }
    }

    const result = await startGuardianScanner();
    if (result.success) {
      setIsScannerActive(true);
    } else {
      if (result.error === 'BLUETOOTH_PERMISSION_DENIED') {
        const granted = await requestBluetoothPermissions();
        setPermissionsGranted(granted);
        if (granted) {
          const retryResult = await startGuardianScanner();
          if (retryResult.success) {
            setIsScannerActive(true);
          } else {
            setMessage({ text: 'Failed to start scanner: ' + retryResult.error, type: 'error' });
          }
        } else {
          setMessage({ text: 'Bluetooth permission is required for Nearby Guardian.', type: 'error' });
        }
      } else {
        setMessage({ text: 'Failed to start scanner: ' + result.error, type: 'error' });
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
    } else {
      setMessage({ text: 'Failed to stop scanner.', type: 'error' });
    }
  };

  return (
    <div className="app-container">
      <Header />
      <main className="content">
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '1rem', cursor: 'pointer', marginBottom: '15px' }}>
          ← Back to Dashboard
        </button>
        <h2>NEARBY GUARDIAN</h2>
        
        {message && <StatusMessage message={message.text} type={message.type} />}

        {/* Advertiser Section */}
        <div style={{ margin: '20px 0', padding: '15px', background: 'var(--surface-color)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h3>Emergency Beacon</h3>
          
          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</span>
            <div style={{ fontWeight: 'bold', color: isBeaconActive ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
              {isBeaconStarting ? 'STARTING...' : (isBeaconActive ? '🔴 EMERGENCY BEACON ACTIVE' : 'INACTIVE')}
            </div>
          </div>

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
              onClick={handleStartBeacon}
              disabled={isBeaconStarting}
              style={{ marginTop: '15px', width: '100%', padding: '12px', background: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isBeaconStarting ? 'not-allowed' : 'pointer', opacity: isBeaconStarting ? 0.7 : 1 }}
            >
              START EMERGENCY BROADCAST
            </button>
          ) : (
            <button
              onClick={handleStopBeacon}
              style={{ marginTop: '15px', width: '100%', padding: '12px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              STOP BROADCAST
            </button>
          )}
        </div>

        {/* Scanner Section */}
        <div style={{ margin: '20px 0', padding: '15px', background: 'var(--surface-color)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h3>Guardian Scanner</h3>
          
          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</span>
            <div style={{ fontWeight: 'bold', color: isScannerActive ? 'var(--success-color)' : 'var(--text-secondary)' }}>
              {isScannerStarting ? 'STARTING...' : (isScannerActive ? '🟢 SCANNING' : 'INACTIVE')}
            </div>
          </div>

          {isScannerActive && (
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Detected emergencies:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #ddd' }}>{detectedCount}</span>
              </div>
              
              {latestDetection && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Latest Emergency</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Emergency ID</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{latestDetection.emergencyId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Proximity</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{latestDetection.proximity}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isScannerActive ? (
            <button
              onClick={handleStartScanner}
              disabled={isScannerStarting}
              style={{ marginTop: '15px', width: '100%', padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isScannerStarting ? 'not-allowed' : 'pointer', opacity: isScannerStarting ? 0.7 : 1 }}
            >
              START GUARDIAN SCANNER
            </button>
          ) : (
            <button
              onClick={handleStopScanner}
              style={{ marginTop: '15px', width: '100%', padding: '12px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              STOP SCANNER
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default NearbyGuardianSetup;

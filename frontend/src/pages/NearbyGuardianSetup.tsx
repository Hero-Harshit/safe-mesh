import React, { useState, useEffect } from 'react';
import { requestBluetoothPermissions, areBluetoothPermissionsGranted, startEmergencyBeacon, stopEmergencyBeacon } from '../services/native';
import Header from '../components/Header';
import StatusMessage from '../components/StatusMessage';

const NearbyGuardianSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [status, setStatus] = useState<boolean | null>(areBluetoothPermissionsGranted());
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const granted = areBluetoothPermissionsGranted();
    if (granted !== null) {
      setStatus(granted);
    }
  }, []);

  const handleRequestAccess = async () => {
    setMessage({ text: 'Requesting permissions...', type: 'info' });
    try {
      const granted = await requestBluetoothPermissions();
      setStatus(granted);
      if (granted) {
        setMessage({ text: 'Bluetooth access granted. Guardian is ready.', type: 'success' });
      } else {
        setMessage({ text: 'Permission denied. Nearby Guardian requires Bluetooth access.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to request permissions. Are you on Android?', type: 'error' });
    }
  };

  const handleStartBeacon = async () => {
    setIsProcessing(true);
    setMessage({ text: 'Starting beacon...', type: 'info' });
    try {
      const result = await startEmergencyBeacon();
      if (result.success && result.running) {
        setIsBeaconActive(true);
        setEmergencyId(result.emergencyId || null);
        setMessage({ text: 'Beacon successfully started.', type: 'success' });
      } else {
        setMessage({ text: `Failed to start beacon: ${result.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error communicating with native layer.', type: 'error' });
    }
    setIsProcessing(false);
  };

  const handleStopBeacon = async () => {
    setIsProcessing(true);
    setMessage({ text: 'Stopping beacon...', type: 'info' });
    try {
      const result = await stopEmergencyBeacon();
      setIsBeaconActive(result.running);
      if (!result.running) {
        setEmergencyId(null);
        setMessage({ text: 'Beacon stopped.', type: 'info' });
      } else {
        setMessage({ text: 'Failed to stop beacon.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error communicating with native layer.', type: 'error' });
    }
    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <Header />
      <main className="content">
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '1rem', cursor: 'pointer', marginBottom: '15px' }}>
          ← Back to Dashboard
        </button>
        <h2>NEARBY GUARDIAN</h2>
        
        <div style={{ margin: '20px 0', padding: '15px', background: 'var(--surface-color)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h3>Status:</h3>
          {status !== true ? (
             <p style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>⚠ Nearby Devices Not Granted</p>
          ) : isBeaconActive ? (
             <div>
               <p style={{ color: 'var(--danger-color)', fontWeight: 'bold', fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>🔴 EMERGENCY BEACON ACTIVE</p>
               {emergencyId && <p style={{ marginTop: '10px', fontSize: '1.1rem' }}>Emergency ID: <strong style={{ letterSpacing: '2px' }}>{emergencyId}</strong></p>}
             </div>
          ) : (
             <p style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Inactive</p>
          )}
        </div>

        {message && <StatusMessage message={message.text} type={message.type} />}

        {status !== true ? (
          <button 
            className="action-button" 
            onClick={handleRequestAccess}
            style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--border-radius)', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            Allow Bluetooth Access
          </button>
        ) : !isBeaconActive ? (
          <button 
            className="action-button" 
            onClick={handleStartBeacon}
            disabled={isProcessing}
            style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: 'var(--border-radius)', fontSize: '1.1rem', cursor: 'pointer', opacity: isProcessing ? 0.7 : 1 }}
          >
            {isProcessing ? 'Starting...' : 'START EMERGENCY BROADCAST'}
          </button>
        ) : (
          <button 
            className="action-button" 
            onClick={handleStopBeacon}
            disabled={isProcessing}
            style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 'var(--border-radius)', fontSize: '1.1rem', cursor: 'pointer', opacity: isProcessing ? 0.7 : 1 }}
          >
            {isProcessing ? 'Stopping...' : 'STOP EMERGENCY BROADCAST'}
          </button>
        )}
      </main>
    </div>
  );
};

export default NearbyGuardianSetup;

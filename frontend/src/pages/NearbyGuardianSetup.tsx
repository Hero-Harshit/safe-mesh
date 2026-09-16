import React, { useState, useEffect } from 'react';
import { requestBluetoothPermissions, areBluetoothPermissionsGranted } from '../services/native';
import Header from '../components/Header';
import StatusMessage from '../components/StatusMessage';

const NearbyGuardianSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [status, setStatus] = useState<boolean | null>(areBluetoothPermissionsGranted());
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    // If we already know it's granted (from cache), update UI
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

  return (
    <div className="app-container">
      <Header />
      <main className="content">
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '1rem', cursor: 'pointer', marginBottom: '15px' }}>
          ← Back to Dashboard
        </button>
        <h2>NEARBY GUARDIAN</h2>
        <p>Bluetooth access is required for Nearby Guardian.</p>
        
        <div style={{ margin: '20px 0', padding: '15px', background: 'var(--surface-color)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h3>Status:</h3>
          {status === true && (
            <p style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>✓ Nearby Devices Granted</p>
          )}
          {status === false && (
            <p style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>⚠ Nearby Devices Not Granted</p>
          )}
          {status === null && (
            <p style={{ color: 'var(--text-secondary)' }}>Unknown (Tap to check/allow)</p>
          )}
        </div>

        {message && <StatusMessage message={message.text} type={message.type} />}

        {status !== true && (
          <button 
            className="action-button" 
            onClick={handleRequestAccess}
            style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--border-radius)', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            Allow Bluetooth Access
          </button>
        )}
      </main>
    </div>
  );
};

export default NearbyGuardianSetup;

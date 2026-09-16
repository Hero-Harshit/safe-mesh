import { useState, useEffect } from 'react';
import { getUberStatus, disconnectUber } from '../services/uber';
import type { UberStatus } from '../services/uber';
import '../styles.css';

interface Props {
  onBack: () => void;
}

export default function UberSandbox({ onBack }: Props) {
  const [status, setStatus] = useState<UberStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we just returned from OAuth with an error
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setOauthError(`OAuth failed: ${err}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Always check status
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getUberStatus();
      setStatus(res);
    } catch (error) {
      console.error("Error fetching Uber status in component:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to backend OAuth initiation
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/uber/auth`;
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnectUber();
    await fetchStatus();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
          &#8592;
        </button>
        <div className="header-title">UBER SANDBOX</div>
        <div style={{ width: 24 }}></div>
      </header>

      <main className="main-content" style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <span style={{ 
            backgroundColor: '#FEF3C7', 
            color: '#D97706', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            DEVELOPMENT / TESTING ONLY
          </span>
        </div>

        {oauthError && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
            {oauthError}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Checking Uber connection status...</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1F2937', padding: '20px', borderRadius: '12px' }}>
            
            {status?.connected ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#10B981', margin: '0 0 20px 0' }}>✓ CONNECTED</h2>
                
                <div style={{ textAlign: 'left', backgroundColor: '#374151', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block' }}>Environment</span>
                    <strong style={{ color: 'white' }}>{status.environment.toUpperCase()}</strong>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block' }}>Scope</span>
                    <strong style={{ color: 'white' }}>{status.scopes?.join(', ')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block' }}>Token</span>
                    <strong style={{ color: '#10B981' }}>SECURE / SERVER SIDE</strong>
                  </div>
                </div>

                <button 
                  className="secondary-btn" 
                  onClick={handleDisconnect}
                  style={{ width: '100%', borderColor: '#EF4444', color: '#EF4444' }}
                >
                  DISCONNECT
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#9CA3AF', margin: '0 0 20px 0' }}>Not Connected</h2>
                
                <div style={{ textAlign: 'left', backgroundColor: '#374151', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block' }}>Environment</span>
                    <strong style={{ color: 'white' }}>SANDBOX</strong>
                  </div>
                </div>

                <button 
                  className="sos-btn" 
                  onClick={handleConnect}
                  style={{ backgroundColor: '#000000', width: '100%', padding: '12px' }}
                >
                  CONTINUE WITH UBER
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

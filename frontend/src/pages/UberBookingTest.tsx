import { useState, useEffect } from 'react';
import { getUberStatus } from '../services/uber';
import type { UberStatus } from '../services/uber';
import '../styles.css';

interface Props {
  onBack: () => void;
}

export default function UberBookingTest({ onBack }: Props) {
  const [status, setStatus] = useState<UberStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await getUberStatus();
    setStatus(res);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
          &#8592;
        </button>
        <div className="header-title">🚕 BOOK UBER</div>
        <div style={{ width: 24 }}></div> {/* Spacer */}
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
            UBER SANDBOX BOOKING PIPELINE
          </span>
        </div>
        
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading pipeline status...</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1F2937', padding: '20px', borderRadius: '12px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'white' }}>Uber authorization:</span>
              <strong style={{ color: status?.connected ? '#10B981' : '#EF4444' }}>
                {status?.connected ? '✓' : '✗'}
              </strong>
            </div>
            
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'white' }}>Sandbox:</span>
              <strong style={{ color: '#10B981' }}>✓</strong>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', fontStyle: 'italic' }}>
              Ride booking: Coming in Phase 2/3
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

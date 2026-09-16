import { useState } from 'react';
import { getCurrentLocation } from '../services/location';
import '../styles.css'; // Reuse existing styles

type BookingState = 'IDLE' | 'GETTING_LOCATION' | 'PREPARING_BOOKING' | 'READY' | 'ERROR';

interface Props {
  onBack: () => void;
}

export default function UberBookingTest({ onBack }: Props) {
  const [bookingState, setBookingState] = useState<BookingState>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Test destination as per requirements
  const testDestination = {
    latitude: 18.5300,
    longitude: 73.8600,
    name: "Uber Sandbox Test Destination"
  };

  const handleBookUber = async () => {
    setBookingState('GETTING_LOCATION');
    setErrorMsg(null);
    
    try {
      const location = await getCurrentLocation();
      
      if (!location) {
        throw new Error("Unable to determine your current location.");
      }
      
      setBookingState('PREPARING_BOOKING');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/uber/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          destination: testDestination
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (data.error === 'UBER_NOT_CONNECTED') {
          throw new Error("Uber account not connected.");
        } else if (data.error === 'UBER_SCOPE_MISSING') {
          throw new Error("Uber ride-request permission is not available for this account.");
        }
        throw new Error(data.message || "Failed to prepare booking.");
      }
      
      setBookingState('READY');
      
    } catch (error: any) {
      console.error("Uber booking test error:", error);
      setErrorMsg(error.message || "An unexpected error occurred.");
      setBookingState('ERROR');
    }
  };

  const renderContent = () => {
    switch (bookingState) {
      case 'IDLE':
        return (
          <>
            <div className="location-info">
              <div className="location-item">
                <span className="location-label">Current Location</span>
                <span className="location-value">Waiting...</span>
              </div>
              <div className="location-item">
                <span className="location-label">Destination</span>
                <span className="location-value">{testDestination.name}</span>
              </div>
            </div>
            <button className="sos-btn" style={{ backgroundColor: '#000000', marginTop: '20px' }} onClick={handleBookUber}>
              BOOK UBER
            </button>
          </>
        );
      case 'GETTING_LOCATION':
        return (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>📍 Getting current location...</p>
          </div>
        );
      case 'PREPARING_BOOKING':
        return (
          <div className="loading-state">
            <p>✓ Location secured</p>
            <div className="loading-spinner" style={{ marginTop: '10px' }}></div>
            <p>🚕 Preparing Uber Sandbox booking...</p>
          </div>
        );
      case 'READY':
        return (
          <div className="success-state" style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2 style={{ color: '#10B981' }}>✓ Booking pipeline ready.</h2>
            <p style={{ marginTop: '10px', color: '#6B7280' }}>
              The backend has verified the Uber connection, request scope, and sandbox environment.
              (Ride creation is not implemented in this phase).
            </p>
            <button className="secondary-btn" style={{ marginTop: '30px' }} onClick={() => setBookingState('IDLE')}>
              RESET TEST
            </button>
          </div>
        );
      case 'ERROR':
        return (
          <div className="error-state" style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2 style={{ color: '#EF4444' }}>Error</h2>
            <p style={{ marginTop: '10px', color: '#EF4444' }}>{errorMsg}</p>
            
            {errorMsg === "Uber account not connected." && (
              <button className="sos-btn" style={{ backgroundColor: '#000000', marginTop: '20px', padding: '12px' }}>
                CONNECT UBER
              </button>
            )}
            
            <button className="secondary-btn" style={{ marginTop: '20px' }} onClick={() => setBookingState('IDLE')}>
              RETRY
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>
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
            SANDBOX • DEVELOPMENT ONLY
          </span>
        </div>
        
        {renderContent()}
      </main>
    </div>
  );
}

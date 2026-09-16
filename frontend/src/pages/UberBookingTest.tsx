import { useState } from 'react';
import { bookUber } from '../services/uber';
import type { UberBookingResponse } from '../services/uber';
import { getCurrentLocation } from '../services/location';
import '../styles.css';

type BookingState = 'IDLE' | 'GETTING_LOCATION' | 'PREPARING' | 'READY' | 'ERROR';

interface Props {
  onBack: () => void;
}

export default function UberBookingTest({ onBack }: Props) {
  const [bookingState, setBookingState] = useState<BookingState>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<UberBookingResponse | null>(null);

  // Test destination as per requirements
  const testDestination = {
    latitude: 18.5300,
    longitude: 73.8600,
    name: "Uber Sandbox Test Destination"
  };

  const handleBookUber = async () => {
    setBookingState('GETTING_LOCATION');
    setErrorMsg(null);
    setErrorCode(null);
    setBookingResult(null);
    
    try {
      const location = await getCurrentLocation();
      
      if (!location) {
        throw { code: 'LOCATION_UNAVAILABLE', message: 'Unable to determine your current location.' };
      }
      
      setBookingState('PREPARING');
      
      const response = await bookUber(
        { latitude: location.latitude, longitude: location.longitude },
        testDestination
      );
      
      setBookingResult(response);
      setBookingState('READY');
      
    } catch (error: any) {
      console.error("Uber booking test error:", error);
      setErrorCode(error.code || 'UNKNOWN_ERROR');
      
      // Map known error codes to user friendly messages
      let displayMsg = error.message || "An unexpected error occurred.";
      if (error.code === 'UBER_NOT_CONNECTED') {
        displayMsg = "Uber account not connected.";
      } else if (error.code === 'UBER_SCOPE_MISSING') {
        displayMsg = "Uber ride-request permission is missing.";
      } else if (error.code === 'NO_PRODUCTS_AVAILABLE') {
        displayMsg = "No Uber rides available at this location.";
      } else if (error.code === 'FARE_ESTIMATE_FAILED') {
        displayMsg = "Failed to get fare estimate from Uber Sandbox.";
      }
      
      setErrorMsg(displayMsg);
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
                <span className="location-label">📍 Current Location</span>
                <span className="location-value" style={{ color: '#9CA3AF' }}>Waiting...</span>
              </div>
              <div className="location-item">
                <span className="location-label">📍 Destination</span>
                <span className="location-value">{testDestination.name}</span>
              </div>
            </div>
            <button className="sos-btn" style={{ backgroundColor: '#000000', marginTop: '20px', padding: '12px', width: '100%' }} onClick={handleBookUber}>
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
      case 'PREPARING':
        return (
          <div className="loading-state" style={{ textAlign: 'left', margin: '0 auto', maxWidth: '300px' }}>
            <p style={{ color: '#10B981', margin: '10px 0' }}>✓ Location secured</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
              <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }}></div>
              <p style={{ margin: 0 }}>🚕 Finding available Uber...</p>
            </div>
          </div>
        );
      case 'READY':
        if (!bookingResult) return null;
        return (
          <div style={{ backgroundColor: '#1F2937', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
            <div style={{ borderBottom: '1px solid #374151', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block', marginBottom: '4px' }}>Ride option:</span>
              <strong style={{ color: 'white', fontSize: '18px' }}>{bookingResult.product.displayName}</strong>
            </div>

            <div style={{ borderBottom: '1px solid #374151', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block', marginBottom: '4px' }}>Pickup:</span>
              <strong style={{ color: 'white' }}>Current location</strong>
            </div>

            <div style={{ borderBottom: '1px solid #374151', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px', display: 'block', marginBottom: '4px' }}>Destination:</span>
              <strong style={{ color: 'white' }}>{bookingResult.destination.name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px' }}>Estimated fare:</span>
              <strong style={{ color: '#10B981', fontSize: '18px' }}>
                {bookingResult.estimate.fare}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '14px' }}>Estimated trip:</span>
              <strong style={{ color: 'white' }}>
                {Math.ceil(bookingResult.estimate.durationSeconds / 60)} min
              </strong>
            </div>

            {bookingResult.estimate.distanceMeters && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <span style={{ color: '#9CA3AF', fontSize: '14px' }}>Distance:</span>
                <strong style={{ color: 'white' }}>
                  {(bookingResult.estimate.distanceMeters / 1000).toFixed(1)} km
                </strong>
              </div>
            )}

            <div style={{ textAlign: 'center', backgroundColor: '#374151', padding: '12px', borderRadius: '8px', color: '#60A5FA', fontWeight: 'bold', letterSpacing: '1px' }}>
              STATUS: READY TO BOOK
            </div>
            
            <button className="secondary-btn" style={{ marginTop: '20px', width: '100%' }} onClick={() => setBookingState('IDLE')}>
              START OVER
            </button>
          </div>
        );
      case 'ERROR':
        return (
          <div className="error-state" style={{ textAlign: 'center', marginTop: '20px' }}>
            <h2 style={{ color: '#EF4444' }}>Error</h2>
            <p style={{ marginTop: '10px', color: '#EF4444' }}>{errorMsg}</p>
            
            {errorCode === 'UBER_NOT_CONNECTED' && (
              <p style={{ marginTop: '10px', color: '#9CA3AF', fontSize: '14px' }}>
                Go back and tap "TEST UBER SANDBOX" to connect.
              </p>
            )}
            
            <button className="secondary-btn" style={{ marginTop: '30px', width: '100%' }} onClick={() => setBookingState('IDLE')}>
              RETRY
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
          &#8592;
        </button>
        <div className="header-title">🚕 UBER SANDBOX</div>
        <div style={{ width: 24 }}></div>
      </header>
      
      <main className="main-content" style={{ padding: '20px' }}>
        {renderContent()}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { EmergencyContact } from '../services/emergency';
import { generateSmsLink, triggerHaptic } from '../services/emergency';
import type { LocationData } from '../services/location';
import { getCurrentLocation } from '../services/location';

interface ActiveSosModalProps {
  contacts: EmergencyContact[];
  onDeactivate: () => void;
  sirenActive: boolean;
  onToggleSiren: () => void;
}

const ActiveSosModal: React.FC<ActiveSosModalProps> = ({
  contacts,
  onDeactivate,
  sirenActive,
  onToggleSiren,
}) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    // Fetch live location immediately upon SOS trigger
    getCurrentLocation()
      .then((loc) => {
        setLocation(loc);
        setLocLoading(false);
      })
      .catch((err) => {
        setLocError(err.message || 'GPS location unavailable');
        setLocLoading(false);
      });

    // Continuous haptic pulse pattern
    const interval = setInterval(() => {
      triggerHaptic([300, 200, 300]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleBroadcastAll = () => {
    if (contacts.length === 0) {
      window.location.href = 'tel:112';
      return;
    }

    // Open SMS link for primary contact or first contact
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    const smsUrl = generateSmsLink(primary.phone, location?.mapsUrl);
    window.location.href = smsUrl;
    setBroadcastSent(true);
  };

  return (
    <div className="active-sos-overlay" role="dialog" aria-modal="true">
      <div className="active-sos-card">
        {/* Pulsing Alert Banner */}
        <div className="sos-alert-banner">
          <span className="beacon-flashing">🚨</span>
          <div>
            <h2 className="sos-alert-title">EMERGENCY SOS ACTIVE</h2>
            <p className="sos-alert-subtitle">Beacon broadcasting via Safemesh</p>
          </div>
        </div>

        {/* GPS Live Coordinates Display */}
        <div className="location-box">
          <div className="location-box-header">
            <span className="location-pin-icon">📍</span>
            <span className="location-header-title">CURRENT GPS COORDINATES</span>
          </div>

          {locLoading ? (
            <div className="location-loading">
              <span className="spinner"></span> Acquiring high-precision GPS lock...
            </div>
          ) : location ? (
            <div className="location-details">
              <div className="coords-row">
                <span className="coord-badge">LAT: {location.latitude.toFixed(5)}</span>
                <span className="coord-badge">LNG: {location.longitude.toFixed(5)}</span>
                <span className="accuracy-badge">±{Math.round(location.accuracy)}m</span>
              </div>
              <a
                href={location.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-open-link"
              >
                View on Google Maps ↗
              </a>
            </div>
          ) : (
            <div className="location-error">
              <span>⚠️ {locError}</span>
            </div>
          )}
        </div>

        {/* Priority Quick Action Buttons */}
        <div className="active-sos-actions">
          {/* Direct 112 Dial */}
          <a href="tel:112" className="sos-action-btn dial-police">
            <span className="btn-icon">📞</span>
            <div className="btn-text-group">
              <span className="btn-main">CALL 112 POLICE</span>
              <span className="btn-sub">National Emergency Response</span>
            </div>
          </a>

          {/* SMS Broadcast to Primary/All */}
          <button onClick={handleBroadcastAll} className="sos-action-btn send-sms">
            <span className="btn-icon">💬</span>
            <div className="btn-text-group">
              <span className="btn-main">
                {broadcastSent ? '✓ SMS SENT / SEND AGAIN' : 'DISPATCH SOS SMS'}
              </span>
              <span className="btn-sub">Includes live location link</span>
            </div>
          </button>

          {/* Siren Toggle */}
          <button
            onClick={onToggleSiren}
            className={`sos-action-btn siren-btn ${sirenActive ? 'active' : ''}`}
          >
            <span className="btn-icon">{sirenActive ? '🔇' : '📢'}</span>
            <div className="btn-text-group">
              <span className="btn-main">{sirenActive ? 'MUTE LOUD SIREN' : 'SOUND LOUD SIREN'}</span>
              <span className="btn-sub">{sirenActive ? 'Alarm is screaming' : 'Audible panic alarm'}</span>
            </div>
          </button>
        </div>

        {/* Contacts Quick List */}
        {contacts.length > 0 && (
          <div className="sos-contacts-quick">
            <span className="quick-contacts-title">TAP TO CALL DIRECTLY:</span>
            <div className="quick-contacts-grid">
              {contacts.map((c) => (
                <a key={c.id} href={`tel:${c.phone}`} className="quick-contact-pill">
                  <span>📞 {c.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Deactivate SOS */}
        <button onClick={onDeactivate} className="sos-deactivate-btn">
          ✓ I AM SAFE — CANCEL SOS
        </button>
      </div>
    </div>
  );
};

export default ActiveSosModal;

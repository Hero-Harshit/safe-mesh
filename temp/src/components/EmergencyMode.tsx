import React, { useState, useEffect } from 'react';
import { PhoneCallIcon, LocationPinIcon, UsersIcon, ShieldCheckIcon } from './Icons';
import type { EmergencyContact } from '../services/emergency';
import { generateSmsLink, triggerHaptic } from '../services/emergency';
import type { LocationData } from '../services/location';

interface EmergencyModeProps {
  location: LocationData | null;
  contacts: EmergencyContact[];
  onDeactivate: () => void;
}

export const EmergencyMode: React.FC<EmergencyModeProps> = ({
  location,
  contacts,
  onDeactivate,
}) => {
  const [secondsActive, setSecondsActive] = useState(0);
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsActive((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBroadcastSms = () => {
    if (contacts.length === 0) {
      window.location.href = 'tel:112';
      return;
    }
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    const link = generateSmsLink(primary.phone, location?.mapsUrl);
    window.location.href = link;
    setSmsSent(true);
    triggerHaptic([100, 50, 100]);
  };

  const displayAddress = location?.addressName || 'Live GPS Coordinates Broadcasted';
  const displayCoords = location
    ? `${location.latitude.toFixed(5)}° N, ${location.longitude.toFixed(5)}° E (±${Math.round(location.accuracy)}m)`
    : 'Acquiring high-precision lock...';

  return (
    <div className="safemesh-emergency-backdrop" role="alertdialog" aria-modal="true">
      <div className="emergency-fullscreen-sheet">
        {/* Urgent yet Composed Status Banner */}
        <div className="emergency-alert-header">
          <div className="emergency-beacon-ring">
            <span className="beacon-center-dot"></span>
          </div>
          <div className="emergency-title-group">
            <h1 className="emergency-state-title">EMERGENCY SOS ACTIVE</h1>
            <span className="emergency-elapsed-clock">Elapsed: {formatTimer(secondsActive)}</span>
          </div>
          <div className="mesh-broadcast-badge">
            <span className="mesh-dot-pulse"></span>
            <span>Mesh Live</span>
          </div>
        </div>

        {/* Live Location Panel */}
        <div className="emergency-location-card">
          <div className="loc-card-header">
            <LocationPinIcon size={16} color="#EF4444" />
            <span className="loc-card-title">BROADCASTING LIVE COORDINATES</span>
          </div>
          <p className="loc-address-text">{displayAddress}</p>
          <p className="loc-coords-sub">{displayCoords}</p>
          {location && (
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="loc-maps-link"
            >
              Open Live Location in Google Maps ↗
            </a>
          )}
        </div>

        {/* Immediate Emergency Action Shortcuts */}
        <div className="emergency-action-stack">
          {/* Direct 112 Call Button */}
          <a href="tel:112" className="emergency-hero-btn call-112-btn">
            <div className="btn-icon-box bg-white-soft">
              <PhoneCallIcon size={22} color="#FFFFFF" />
            </div>
            <div className="btn-copy">
              <span className="btn-headline">Call 112 Immediately</span>
              <span className="btn-tagline">National Emergency Response Dispatch</span>
            </div>
            <span className="btn-arrow-mark">➔</span>
          </a>

          {/* SMS Broadcast to Primary/All Contacts */}
          <button onClick={handleBroadcastSms} className="emergency-hero-btn sms-broadcast-btn">
            <div className="btn-icon-box bg-white-soft">
              <UsersIcon size={22} color="#FFFFFF" />
            </div>
            <div className="btn-copy">
              <span className="btn-headline">
                {smsSent ? '✓ SOS SMS Sent / Send Again' : 'Dispatch SOS SMS to Contacts'}
              </span>
              <span className="btn-tagline">Sends immediate distress text with live GPS link</span>
            </div>
            <span className="btn-arrow-mark">➔</span>
          </button>
        </div>

        {/* Quick Contact Direct Calling */}
        {contacts.length > 0 && (
          <div className="emergency-contacts-preview">
            <span className="preview-label">DIRECT SPEED-DIAL CONTACTS</span>
            <div className="preview-chips-scroll">
              {contacts.map((c) => (
                <a key={c.id} href={`tel:${c.phone}`} className="emergency-contact-pill">
                  <PhoneCallIcon size={14} color="#10B981" />
                  <span>{c.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Deactivate SOS */}
        <div className="emergency-bottom-actions">
          <button onClick={onDeactivate} className="btn-deactivate-safe">
            <ShieldCheckIcon size={20} color="#10B981" />
            <span>I AM SAFE — CANCEL SOS</span>
          </button>
          <span className="cancel-disclaimer">
            Tap only if you are secure and no longer require assistance
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmergencyMode;

import React, { useState, useEffect } from 'react';
import { PhoneCallIcon, LocationPinIcon, UsersIcon, ShieldCheckIcon } from './Icons';
import type { EmergencyContact } from '../services/emergency';
import { triggerHaptic } from '../services/emergency';
import type { LocationData } from '../services/location';
import { sendEmergencySms, startEmergencyBeacon, startEmergencyCall } from '../services/native';
import { getEscapeRoute } from '../services/safetyRoute';
import type { EscapeRouteResponse } from '../services/safetyRoute';

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
  const [smsStatus, setSmsStatus] = useState<string>('Sending...');
  const [safeRouteState, setSafeRouteState] = useState<{
    loading: boolean;
    data: EscapeRouteResponse | null;
    error: string | null;
  }>({
    loading: false,
    data: null,
    error: null
  });
  
  const [level30Alert, setLevel30Alert] = useState(false);
  const [level60Uber, setLevel60Uber] = useState(false);
  
  const smsTriggeredRef = React.useRef(false);
  const routeTriggeredRef = React.useRef(false);
  const beaconTriggeredRef = React.useRef(false);
  const callTriggeredRef = React.useRef(false);

  useEffect(() => {
    if (secondsActive === 0 && !callTriggeredRef.current) {
      // Fire immediately to bypass Chrome intent restrictions, but tell Android to wait 20s
      startEmergencyCall("9422039955", 20000).catch(console.error);
    }
    if (secondsActive === 10 && !level30Alert) {
      setLevel30Alert(true);
      triggerHaptic([50, 50, 50, 50, 50]);
    }
    if (secondsActive === 20 && !callTriggeredRef.current) {
      callTriggeredRef.current = true;
      setLevel60Uber(true);
      triggerHaptic([100, 100, 100, 100, 100]);
      // Call is already executing on the native side due to the 20s delayed intent
    }
  }, [secondsActive, level30Alert]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsActive((prev) => prev + 1);
    }, 1000);

    if (!smsTriggeredRef.current) {
      smsTriggeredRef.current = true;
      triggerAutomaticSms();
    }

    if (!beaconTriggeredRef.current) {
      beaconTriggeredRef.current = true;
      startEmergencyBeacon().catch(console.error);
    }

    if (!routeTriggeredRef.current && location) {
      routeTriggeredRef.current = true;
      triggerSafeRoute(location.latitude, location.longitude);
    }

    return () => clearInterval(timer);
  }, [location]);

  const triggerSafeRoute = async (lat: number, lon: number) => {
    setSafeRouteState({ loading: true, data: null, error: null });
    try {
      const result = await getEscapeRoute(lat, lon);
      if (result.success) {
        setSafeRouteState({ loading: false, data: result, error: null });
      } else {
        setSafeRouteState({ loading: false, data: null, error: result.reason || 'Failed to find route' });
      }
    } catch (e) {
      setSafeRouteState({ loading: false, data: null, error: 'Network Error' });
    }
  };

  const triggerAutomaticSms = async () => {
    if (contacts.length === 0) {
      setSmsStatus('NO EMERGENCY CONTACTS');
      return;
    }

    setSmsStatus('Sending...');
    try {
      const result = await sendEmergencySms(
        contacts.map(c => ({ name: c.name, phone: c.phone })),
        location?.mapsUrl || null
      );
      
      if (result.status === 'SUCCESS') {
        setSmsStatus('SMS SENT');
        triggerHaptic([100, 50, 100]);
      } else if (result.status === 'PARTIAL_SUCCESS') {
        setSmsStatus('SMS PARTIALLY SENT');
      } else if (result.error === 'SMS_PERMISSION_DENIED') {
        setSmsStatus('SMS PERMISSION DENIED');
      } else {
        setSmsStatus('SMS FAILED');
      }
    } catch (e) {
      setSmsStatus('SMS FAILED');
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Manual SMS button removed as per requirements

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
          {/* Level 3: Auto 112 Call (T=20s) */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#1E293B' }}>
            <div className="btn-icon-box bg-white-soft">
              <PhoneCallIcon size={22} color="#FFFFFF" />
            </div>
            <div className="btn-copy">
              <span className="btn-headline">Auto-Dial 112 (9422039955)</span>
              <span className="btn-tagline">
                {level60Uber ? 'Call Initiated. Connecting...' : 'Will auto-dial in 20s...'}
              </span>
            </div>
          </div>

          {/* Level 3: Uber Simulation (T=20s) */}
          {level60Uber && (
            <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#000000' }}>
              <div className="btn-icon-box" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <ShieldCheckIcon size={22} color="#FFFFFF" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline">Emergency Uber Requested</span>
                <span className="btn-tagline">Driver arriving in ~3 mins. Stay safe.</span>
              </div>
            </div>
          )}

          {/* Level 2: Neighborhood Alert (T=10s) */}
          {level30Alert && (
            <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#EF4444' }}>
              <div className="btn-icon-box" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <ShieldCheckIcon size={22} color="#FFFFFF" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline">Neighborhood Alert</span>
                <span className="btn-tagline">Nearby guardians have been alerted.</span>
              </div>
            </div>
          )}

          {/* SMS Status Indicator */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#2563EB' }}>
            <div className="btn-icon-box bg-white-soft">
              <UsersIcon size={22} color="#FFFFFF" />
            </div>
            <div className="btn-copy">
              <span className="btn-headline">{smsStatus}</span>
              <span className="btn-tagline">
                {smsStatus === 'SMS SENT' ? 'Emergency contacts notified.' : 
                 smsStatus === 'SMS PARTIALLY SENT' ? 'Some contacts notified.' :
                 smsStatus === 'SMS FAILED' ? 'Unable to notify emergency contacts.' :
                 smsStatus === 'NO EMERGENCY CONTACTS' ? 'No emergency contacts are configured.' :
                 smsStatus === 'SMS PERMISSION DENIED' ? 'SMS permission is not available.' :
                 'Notifying emergency contacts...'}
              </span>
            </div>
          </div>

          {/* Safe Route Panel */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', backgroundColor: '#0F172A' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div className="btn-icon-box bg-white-soft" style={{ marginRight: '12px' }}>
                <LocationPinIcon size={22} color="#FFFFFF" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline">SAFE ROUTE</span>
                <span className="btn-tagline">
                  {safeRouteState.loading ? 'Finding the safest nearby place...' :
                   safeRouteState.error ? 'Unable to find nearby safety destinations.' :
                   safeRouteState.data?.destination ? 'Escape Route Ready' : 'Awaiting location...'}
                </span>
              </div>
            </div>

            {safeRouteState.data?.destination && (
              <div style={{ width: '100%', marginTop: '8px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', color: 'white' }}>Recommended Destination:</div>
                <div style={{ color: '#E2E8F0', fontSize: '0.9rem', marginBottom: '4px' }}>{safeRouteState.data.destination.name}</div>
                
                {safeRouteState.data.route && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span>Distance: {safeRouteState.data.route.distanceMeters} m</span>
                    <span>~{Math.round(safeRouteState.data.route.durationSeconds / 60)} min walk</span>
                  </div>
                )}
                
                <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '12px' }}>
                  {safeRouteState.data.reason}
                </div>

                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${location?.latitude},${location?.longitude}&destination=${safeRouteState.data.destination.latitude},${safeRouteState.data.destination.longitude}&travelmode=walking`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-add-contact-pill"
                  style={{ display: 'block', textAlign: 'center', backgroundColor: '#10B981', color: 'white', textDecoration: 'none' }}
                >
                  START ROUTE
                </a>
              </div>
            )}
          </div>
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

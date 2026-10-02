import React, { useState, useEffect } from 'react';
import { PhoneCallIcon, LocationPinIcon, UsersIcon, ShieldCheckIcon } from './Icons';
import type { EmergencyContact } from '../services/emergency';
import { triggerHaptic } from '../services/emergency';
import type { LocationData } from '../services/location';
import { sendEmergencySms, startEmergencyBeacon, cancelEmergencyCall, requestNativeEmergencyPermissions } from '../services/native';
import { getEscapeRoute } from '../services/safetyRoute';
import type { EscapeRouteResponse } from '../services/safetyRoute';
import { startLiveAudioBroadcast } from '../services/evidenceAudio';
import type { AudioBroadcastSession } from '../services/evidenceAudio';

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
  const [audioStreamStatus, setAudioStreamStatus] = useState<string>('Broadcasting live...');
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
  const [isStealthMode, setIsStealthMode] = useState<boolean>(true);
  const lastTapRef = React.useRef<number>(0);

  const handleDoubleTapWake = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 450) {
      setIsStealthMode(false);
      triggerHaptic([60, 60]);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const smsTriggeredRef = React.useRef(false);
  const routeTriggeredRef = React.useRef(false);
  const beaconTriggeredRef = React.useRef(false);

  // Persistent room ID for the emergency broadcast session
  const roomIdRef = React.useRef<string>(
    'sos_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
  );
  const audioSessionRef = React.useRef<AudioBroadcastSession | null>(null);

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

  useEffect(() => {
    // Start silent ambient audio broadcast and evidence recording immediately
    startLiveAudioBroadcast(
      roomIdRef.current,
      location ? { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy } : null,
      (status) => setAudioStreamStatus(status)
    )
      .then((session) => {
        audioSessionRef.current = session;
      })
      .catch((err) => {
        console.warn('Live audio stream failed to start', err);
      });

    return () => {
      cancelEmergencyCall();
      if (audioSessionRef.current) {
        audioSessionRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (secondsActive === 5 && !level30Alert) {
      setLevel30Alert(true);
      triggerHaptic([50, 50, 50, 50, 50]);
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

    if (location && audioSessionRef.current) {
      audioSessionRef.current.updateLocation(location.latitude, location.longitude, location.accuracy);
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
      const listenUrl = `https://safety-mesh.vercel.app/?room=${roomIdRef.current}`;
      const result = await sendEmergencySms(
        contacts.map(c => ({ name: c.name, phone: c.phone })),
        location?.mapsUrl || null,
        listenUrl
      );
      
      if (result.status === 'SUCCESS') {
        setSmsStatus('SMS SENT');
        triggerHaptic([100, 50, 100]);
      } else if (result.status === 'PARTIAL_SUCCESS') {
        setSmsStatus('SMS PARTIALLY SENT');
      } else if (result.error === 'SMS_PERMISSION_DENIED') {
        setSmsStatus('SMS PERMISSION REQUIRED');
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
    <div className="safetymesh-emergency-backdrop" role="alertdialog" aria-modal="true">
      {/* STEALTH BLACK SCREEN OVERLAY (Approach D) */}
      {isStealthMode && (
        <div
          onClick={handleDoubleTapWake}
          onTouchEnd={handleDoubleTapWake}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'manipulation',
            cursor: 'default'
          }}
        >
          {/* Near-invisible hint for the victim; completely unnoticeable to an attacker */}
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.08)',
              fontSize: '0.75rem',
              textAlign: 'center',
              userSelect: 'none',
              letterSpacing: '1px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            Double-tap screen to wake
          </div>
        </div>
      )}

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
          {/* Level 3: Silent Live Audio Streaming & Police Evidence Recording */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', boxShadow: '0 4px 12px rgba(239,68,68,0.06)', color: '#1E293B' }}>
            <div className="btn-icon-box" style={{ backgroundColor: '#FEF2F2' }}>
              <span style={{ fontSize: '20px' }}>🎙️</span>
            </div>
            <div className="btn-copy">
              <span className="btn-headline" style={{ color: '#DC2626' }}>LIVE AUDIO STREAM & EVIDENCE</span>
              <span className="btn-tagline">
                {audioStreamStatus === 'STREAMING_ACTIVE' 
                  ? 'Transmitting ambient audio to contact & logging police evidence.' 
                  : 'Broadcasting live audio beacon to emergency room...'}
              </span>
            </div>
          </div>

          {/* Level 2: Neighborhood Alert (T=5s) */}
          {level30Alert && (
            <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', boxShadow: '0 4px 12px rgba(239,68,68,0.06)', color: '#1E293B' }}>
              <div className="btn-icon-box" style={{ backgroundColor: '#FEE2E2' }}>
                <ShieldCheckIcon size={22} color="#EF4444" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline" style={{ color: '#EF4444' }}>Neighborhood Alert</span>
                <span className="btn-tagline">Nearby guardians have been alerted.</span>
              </div>
            </div>
          )}

          {/* SMS Status Indicator with Retry & Fallback */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#FFFFFF', border: '1px solid #BFDBFE', boxShadow: '0 4px 12px rgba(37,99,235,0.06)', color: '#1E293B', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="btn-icon-box" style={{ backgroundColor: '#DBEAFE', marginRight: '12px' }}>
                <UsersIcon size={22} color="#2563EB" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline" style={{ color: smsStatus === 'SMS SENT' ? '#16A34A' : smsStatus.includes('FAILED') || smsStatus.includes('REQUIRED') ? '#DC2626' : '#2563EB' }}>{smsStatus}</span>
                <span className="btn-tagline">
                  {smsStatus === 'SMS SENT' ? 'Emergency contacts notified silently.' : 
                   smsStatus === 'SMS PARTIALLY SENT' ? 'Some contacts notified.' :
                   smsStatus === 'SMS FAILED' ? 'Silent dispatch failed. Check SIM or retry.' :
                   smsStatus === 'NO EMERGENCY CONTACTS' ? 'No emergency contacts are configured.' :
                   smsStatus === 'SMS PERMISSION REQUIRED' ? 'Android SMS permission required.' :
                   'Notifying emergency contacts silently...'}
                </span>
              </div>
            </div>

            {(smsStatus === 'SMS FAILED' || smsStatus === 'SMS PERMISSION REQUIRED') && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    requestNativeEmergencyPermissions();
                    setTimeout(() => triggerAutomaticSms(), 600);
                  }}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Grant Permissions & Retry
                </button>
                {primaryContact?.phone && (
                  <a
                    href={`sms:${primaryContact.phone.replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(
                      `🚨 EMERGENCY ALERT - SAFEMESH 🚨\nUrgent SOS activated!\nLive Location: ${location?.mapsUrl || 'Active coordinates'}`
                    )}`}
                    style={{
                      backgroundColor: '#F1F5F9',
                      color: '#1E293B',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    Open Device SMS App
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Safe Route Panel */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', color: '#1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div className="btn-icon-box" style={{ backgroundColor: '#F1F5F9', marginRight: '12px' }}>
                <LocationPinIcon size={22} color="#475569" />
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
              <div style={{ width: '100%', marginTop: '8px', padding: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#1E293B' }}>Recommended Destination:</div>
                <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '4px' }}>{safeRouteState.data.destination.name}</div>
                
                {safeRouteState.data.route && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.85rem', marginBottom: '8px' }}>
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

        {/* Stealth Black Mode Re-enter Action */}
        <div style={{ padding: '0 16px 12px', width: '100%' }}>
          <button
            type="button"
            onClick={() => {
              setIsStealthMode(true);
              triggerHaptic(50);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#0F172A',
              color: '#94A3B8',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: '16px' }}>🕶️</span>
            <span>Hide Screen (Stealth Black Mode)</span>
          </button>
        </div>

        {/* Deactivate SOS */}
        <div className="emergency-bottom-actions">
          <button onClick={onDeactivate} className="btn-deactivate-safe">
            <ShieldCheckIcon size={20} color="#10B981" />
            <span>I AM SAFE CANCEL SOS</span>
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

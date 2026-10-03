import React, { useState, useEffect } from 'react';
import { PhoneCallIcon, LocationPinIcon, UsersIcon, ShieldCheckIcon } from './Icons';
import type { EmergencyContact } from '../services/emergency';
import { triggerHaptic } from '../services/emergency';
import type { LocationData } from '../services/location';
import { fetchRealDeviceLocation } from '../services/location';
import { sendEmergencySms, startEmergencyBeacon, cancelEmergencyCall, requestNativeEmergencyPermissions, fetchNativeLocation } from '../services/native';
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
  const [isStealthMode, setIsStealthMode] = useState<boolean>(() => {
    return localStorage.getItem('safetymesh_stealth_mode') === 'true';
  });
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
      let finalMapsUrl: string | null = null;

      // 1. Check passed location prop
      if (location && location.latitude && location.longitude) {
        finalMapsUrl = location.mapsUrl || `https://maps.google.com/?q=${Number(location.latitude).toFixed(6)},${Number(location.longitude).toFixed(6)}`;
      }

      // 2. Check native device location directly from hardware bridge
      if (!finalMapsUrl) {
        const nativeLoc = fetchNativeLocation();
        if (nativeLoc && nativeLoc.latitude && nativeLoc.longitude) {
          finalMapsUrl = `https://maps.google.com/?q=${Number(nativeLoc.latitude).toFixed(6)},${Number(nativeLoc.longitude).toFixed(6)}`;
        }
      }

      // 3. Check persistent localStorage cache
      if (!finalMapsUrl) {
        try {
          const cached = localStorage.getItem('safetymesh_last_location');
          if (cached) {
            const p = JSON.parse(cached);
            if (p.mapsUrl) {
              finalMapsUrl = p.mapsUrl;
            } else if (p.latitude && p.longitude) {
              finalMapsUrl = `https://maps.google.com/?q=${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`;
            }
          }
        } catch {}
      }

      // 4. If still missing, actively query real device location with a 4.5s race timeout
      if (!finalMapsUrl) {
        setSmsStatus('Acquiring GPS location...');
        try {
          const freshLoc = await Promise.race([
            fetchRealDeviceLocation(),
            new Promise<null>((r) => setTimeout(() => r(null), 4500))
          ]);
          if (freshLoc && freshLoc.latitude && freshLoc.longitude) {
            finalMapsUrl = freshLoc.mapsUrl || `https://maps.google.com/?q=${Number(freshLoc.latitude).toFixed(6)},${Number(freshLoc.longitude).toFixed(6)}`;
          }
        } catch {}
      }

      const listenUrl = `https://safety-mesh.vercel.app/?room=${roomIdRef.current}`;
      const result = await sendEmergencySms(
        contacts.map(c => ({ name: c.name, phone: c.phone })),
        finalMapsUrl,
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
      {/* STEALTH BLACK SCREEN OVERLAY (Activated only if user enabled toggle in Settings) */}
      {isStealthMode && (
        <div
          onClick={handleDoubleTapWake}
          onTouchEnd={handleDoubleTapWake}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
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
          {/* Near-invisible hint for the victim; unnoticeable to an attacker */}
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
        <div className="emergency-location-card" style={{ padding: '8px 12px' }}>
          <div className="loc-card-header" style={{ marginBottom: '2px' }}>
            <LocationPinIcon size={14} color="#EF4444" />
            <span className="loc-card-title">BROADCASTING LIVE COORDINATES</span>
          </div>
          <p className="loc-address-text" style={{ fontSize: '0.82rem', margin: '0 0 2px 0' }}>{displayAddress}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="loc-coords-sub" style={{ fontSize: '0.68rem', margin: 0 }}>{displayCoords}</span>
            {location && (
              <a
                href={location.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="loc-maps-link"
                style={{ fontSize: '0.72rem' }}
              >
                Maps ↗
              </a>
            )}
          </div>
        </div>

        {/* Immediate Emergency Action Shortcuts */}
        <div className="emergency-action-stack" style={{ gap: '8px' }}>
          {/* Level 3: Silent Live Audio Streaming & Police Evidence Recording */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', boxShadow: '0 2px 8px rgba(239,68,68,0.06)', color: '#1E293B', padding: '8px 12px', gap: '10px' }}>
            <div className="btn-icon-box" style={{ width: '32px', height: '32px', backgroundColor: '#FEF2F2' }}>
              <span style={{ fontSize: '16px' }}>🎙️</span>
            </div>
            <div className="btn-copy">
              <span className="btn-headline" style={{ fontSize: '0.82rem', color: '#DC2626' }}>LIVE AUDIO & EVIDENCE STREAM</span>
              <span className="btn-tagline" style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>
                {audioStreamStatus === 'STREAMING_ACTIVE' 
                  ? 'Transmitting live ambient audio & logging police evidence.' 
                  : 'Broadcasting live audio beacon to emergency room...'}
              </span>
            </div>
          </div>

          {/* Level 2: Neighborhood Alert (T=5s) */}
          {level30Alert && (
            <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', boxShadow: '0 2px 8px rgba(239,68,68,0.06)', color: '#1E293B', padding: '6px 12px', gap: '10px' }}>
              <div className="btn-icon-box" style={{ width: '28px', height: '28px', backgroundColor: '#FEE2E2' }}>
                <ShieldCheckIcon size={18} color="#EF4444" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline" style={{ fontSize: '0.8rem', color: '#EF4444' }}>Neighborhood Alert Active</span>
                <span className="btn-tagline" style={{ fontSize: '0.65rem' }}>Nearby guardians alerted over BLE mesh.</span>
              </div>
            </div>
          )}

          {/* SMS Status Indicator with Retry & Fallback */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', backgroundColor: '#FFFFFF', border: '1px solid #BFDBFE', boxShadow: '0 2px 8px rgba(37,99,235,0.06)', color: '#1E293B', padding: '8px 12px', gap: '10px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="btn-icon-box" style={{ width: '32px', height: '32px', backgroundColor: '#DBEAFE', marginRight: '10px' }}>
                <UsersIcon size={18} color="#2563EB" />
              </div>
              <div className="btn-copy">
                <span className="btn-headline" style={{ fontSize: '0.82rem', color: smsStatus === 'SMS SENT' ? '#16A34A' : smsStatus.includes('FAILED') || smsStatus.includes('REQUIRED') ? '#DC2626' : '#2563EB' }}>{smsStatus}</span>
                <span className="btn-tagline" style={{ fontSize: '0.68rem', lineHeight: '1.2' }}>
                  {smsStatus === 'SMS SENT' ? 'Emergency contacts notified with live location.' : 
                   smsStatus === 'SMS PARTIALLY SENT' ? 'Some contacts notified.' :
                   smsStatus === 'SMS FAILED' ? 'Silent dispatch failed. Check SIM or retry.' :
                   smsStatus === 'NO EMERGENCY CONTACTS' ? 'No emergency contacts configured.' :
                   smsStatus === 'SMS PERMISSION REQUIRED' ? 'Android SMS permission required.' :
                   'Notifying emergency contacts silently...'}
                </span>
              </div>
            </div>

            {(smsStatus === 'SMS FAILED' || smsStatus === 'SMS PERMISSION REQUIRED') && (
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                    padding: '6px 10px',
                    fontSize: '0.75rem',
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
                      padding: '6px 10px',
                      fontSize: '0.75rem',
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

          {/* Safe Route Panel - Compact */}
          <div className="emergency-hero-btn" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', color: '#1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="btn-icon-box" style={{ width: '32px', height: '32px', backgroundColor: '#F1F5F9', marginRight: '10px' }}>
                  <LocationPinIcon size={18} color="#475569" />
                </div>
                <div className="btn-copy">
                  <span className="btn-headline" style={{ fontSize: '0.82rem' }}>SAFE ROUTE</span>
                  <span className="btn-tagline" style={{ fontSize: '0.68rem' }}>
                    {safeRouteState.loading ? 'Finding safest nearby place...' :
                     safeRouteState.data?.destination ? safeRouteState.data.destination.name :
                     safeRouteState.error ? 'Route unavailable' : 'Calculating safest route...'}
                  </span>
                </div>
              </div>
              {safeRouteState.data?.destination && (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${location?.latitude},${location?.longitude}&destination=${safeRouteState.data.destination.latitude},${safeRouteState.data.destination.longitude}&travelmode=walking`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: '#10B981', color: 'white', textDecoration: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}
                >
                  START ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick Contact Direct Calling */}
        {contacts.length > 0 && (
          <div className="emergency-contacts-preview" style={{ margin: '2px 0' }}>
            <span className="preview-label" style={{ fontSize: '0.65rem' }}>DIRECT SPEED-DIAL CONTACTS</span>
            <div className="preview-chips-scroll" style={{ display: 'flex', overflowX: 'auto', flexWrap: 'nowrap', gap: '6px', paddingBottom: '2px' }}>
              {contacts.map((c) => (
                <a key={c.id} href={`tel:${c.phone}`} className="emergency-contact-pill" style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <PhoneCallIcon size={12} color="#10B981" />
                  <span>{c.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Deactivate SOS */}
        <div className="emergency-bottom-actions" style={{ marginTop: '2px' }}>
          <button onClick={onDeactivate} className="btn-deactivate-safe" style={{ padding: '10px 14px', fontSize: '0.86rem' }}>
            <ShieldCheckIcon size={18} color="#10B981" />
            <span>I AM SAFE · CANCEL SOS</span>
          </button>
          <span className="cancel-disclaimer" style={{ fontSize: '0.65rem' }}>
            Tap only if you are secure and no longer require assistance
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmergencyMode;

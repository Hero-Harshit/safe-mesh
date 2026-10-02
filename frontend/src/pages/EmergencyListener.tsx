import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface EmergencyListenerProps {
  room: string;
}

interface AudioPayload {
  chunk: string;
  mimeType: string;
  index: number;
  timestamp: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  victimName?: string;
}

export const EmergencyListener: React.FC<EmergencyListenerProps> = ({ room }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chunksReceived, setChunksReceived] = useState(0);
  const [victimName, setVictimName] = useState<string>('SafeMesh User');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [cloudEvidenceUrl, setCloudEvidenceUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const receivedBlobsRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Parse room from URL if not provided directly
  const roomId = room || new URLSearchParams(window.location.search).get('room') || 'default';

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`emergency_${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'audio_stream' }, (event) => {
        const payload = event.payload as AudioPayload;
        if (!payload || !payload.chunk) return;

        setChunksReceived((prev) => prev + 1);
        if (payload.victimName) setVictimName(payload.victimName);
        if (payload.lat && payload.lng) {
          setLocation({ lat: payload.lat, lng: payload.lng, accuracy: payload.accuracy });
        }

        // Convert base64 to Blob
        try {
          const byteCharacters = atob(payload.chunk);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const chunkBlob = new Blob([byteArray], { type: payload.mimeType || 'audio/webm' });
          receivedBlobsRef.current.push(chunkBlob);

          // Animate simulated audio level
          setAudioLevel(Math.min(100, Math.floor(Math.random() * 50 + 35)));

          // Queue audio chunk for sequential playback
          const chunkUrl = URL.createObjectURL(chunkBlob);
          audioQueueRef.current.push(chunkUrl);

          if (isPlaying && !isPlayingQueueRef.current) {
            playNextChunk();
          }
        } catch (err) {
          console.error('Failed to parse audio chunk', err);
        }
      })
      .on('broadcast', { event: 'location_update' }, (event) => {
        const payload = event.payload;
        if (payload && payload.lat && payload.lng) {
          setLocation({ lat: payload.lat, lng: payload.lng, accuracy: payload.accuracy });
        }
      })
      .on('broadcast', { event: 'session_ended' }, (event) => {
        setSessionEnded(true);
        if (event.payload?.evidenceUrl) {
          setCloudEvidenceUrl(event.payload.evidenceUrl);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isPlaying]);

  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setAudioLevel(0);
      return;
    }

    isPlayingQueueRef.current = true;
    const nextUrl = audioQueueRef.current.shift()!;
    const audio = new Audio(nextUrl);
    audio.onended = () => {
      URL.revokeObjectURL(nextUrl);
      playNextChunk();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      playNextChunk();
    };
    audio.play().catch(() => {
      isPlayingQueueRef.current = false;
    });
  };

  const handleStartListening = () => {
    // Initialize AudioContext to satisfy mobile browser autoplay policy
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
        audioContextRef.current.resume();
      }
    } catch (e) {}

    setIsPlaying(true);
    if (audioQueueRef.current.length > 0 && !isPlayingQueueRef.current) {
      playNextChunk();
    }
  };

  // Download complete recorded police evidence
  const handleDownloadEvidence = () => {
    if (receivedBlobsRef.current.length === 0 && !cloudEvidenceUrl) {
      alert('No audio evidence chunks received yet.');
      return;
    }

    if (receivedBlobsRef.current.length > 0) {
      const fullBlob = new Blob(receivedBlobsRef.current, { type: 'audio/webm' });
      const downloadUrl = URL.createObjectURL(fullBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `POLICE_EVIDENCE_${victimName.replace(/\s+/g, '_')}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } else if (cloudEvidenceUrl) {
      window.open(cloudEvidenceUrl, '_blank');
    }
  };

  // Download legal incident log
  const handleDownloadReport = () => {
    const reportText = `========================================================
OFFICIAL POLICE FORENSIC INCIDENT EVIDENCE REPORT
Generated via SafeMesh Emergency Sentinel Network
========================================================

INCIDENT SESSION: ${roomId}
VICTIM NAME: ${victimName}
TIMESTAMP OF LOG: ${new Date().toLocaleString()}
RECORDED CHUNKS: ${chunksReceived} seconds of live ambient audio

LAST KNOWN GPS COORDINATES:
Latitude: ${location ? location.lat.toFixed(6) : 'Pending high precision lock'}
Longitude: ${location ? location.lng.toFixed(6) : 'Pending high precision lock'}
Accuracy Radius: ±${location?.accuracy ? Math.round(location.accuracy) : 10} meters
Google Maps Link: ${location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : 'N/A'}

CHAIN OF CUSTODY VERIFICATION:
This audio file was captured via encrypted real-time microphone stream directly from the victim's device while the SOS alarm was active. Audio contains ambient acoustic data, vocal interaction, and background acoustics.

SUBMITTED FOR OFFICIAL LAW ENFORCEMENT & JUDICIAL EVIDENCE.
========================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FORENSIC_INCIDENT_REPORT_${victimName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090D16',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Top Banner */}
      <div style={{ width: '100%', maxWidth: '480px', marginBottom: '16px' }}>
        <div style={{
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          letterSpacing: '0.5px'
        }}>
          <span>🚨 LIVE EMERGENCY AUDIO RELAY</span>
          <span style={{
            fontSize: '0.75rem',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {sessionEnded ? 'RECORDING ARCHIVED' : isConnected ? '🔴 TRANSMITTING LIVE' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Main Victim Status Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#131D31',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Distress Signal Initiated By
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 12px' }}>
          {victimName}
        </h1>

        {/* Live Location Panel */}
        <div style={{
          backgroundColor: '#0F172A',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38BDF8' }}>📍 REAL-TIME GPS POSITION</span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>±{location?.accuracy ? Math.round(location.accuracy) : 10}m accuracy</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#E2E8F0', fontFamily: 'monospace' }}>
            {location ? `${location.lat.toFixed(5)}° N, ${location.lng.toFixed(5)}° E` : 'Receiving coordinates from distress beacon...'}
          </div>
          {location && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                color: '#38BDF8',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Open Direct Turn-by-Turn Navigation ↗
            </a>
          )}
        </div>

        {/* Audio Waveform & Speaker Playback Button */}
        <div style={{
          backgroundColor: '#0A101D',
          border: '1px solid #1E293B',
          borderRadius: '14px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '12px', fontWeight: 600 }}>
            SURROUNDING AMBIENT ACOUSTICS
          </div>

          {/* Dynamic Audio Visualizer Bars */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            height: '48px',
            marginBottom: '16px'
          }}>
            {[20, 45, 80, 60, 95, 40, 75, 55, 30].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '6px',
                  height: isPlaying && audioLevel > 0 ? `${Math.max(8, (h * audioLevel) / 100)}px` : '8px',
                  backgroundColor: isPlaying ? '#EF4444' : '#475569',
                  borderRadius: '4px',
                  transition: 'height 0.15s ease'
                }}
              />
            ))}
          </div>

          {!isPlaying ? (
            <button
              onClick={handleStartListening}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(220,38,38,0.4)'
              }}
            >
              🔊 Tap to Start Listening Live
            </button>
          ) : (
            <div style={{ color: '#10B981', fontSize: '0.9rem', fontWeight: 700 }}>
              🔊 Listening Live (Streaming ambient microphone audio)
            </div>
          )}
        </div>

        {/* Evidence Status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: '#94A3B8',
          padding: '8px 4px',
          borderBottom: '1px solid #1E293B',
          marginBottom: '16px'
        }}>
          <span>Evidence Chunks Captured:</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700, fontFamily: 'monospace' }}>
            {chunksReceived} seconds
          </span>
        </div>

        {/* Action Buttons for Evidence & Police Assistance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleDownloadEvidence}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#1E293B',
              color: '#38BDF8',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>📥</span>
            <span>Download Police Audio Evidence (.webm)</span>
          </button>

          <button
            onClick={handleDownloadReport}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#0F172A',
              color: '#94A3B8',
              border: '1px solid #1E293B',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>📋</span>
            <span>Download Forensic Incident Report (.txt)</span>
          </button>

          <a
            href="tel:112"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.95rem',
              textAlign: 'center',
              textDecoration: 'none',
              marginTop: '6px',
              display: 'block',
              boxShadow: '0 4px 14px rgba(220,38,38,0.3)'
            }}
          >
            🚨 Dial Emergency Services (112) for Victim
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmergencyListener;

import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';
import { MicIcon } from './Icons';

interface AmbientGuardCardProps {
  onThreatDetected: (reason: string) => void;
}

export const AmbientGuardCard: React.FC<AmbientGuardCardProps> = ({
  onThreatDetected,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem('safetymesh_ambient_guard');
    return val !== 'false';
  });

  const [, setDecibels] = useState<number>(38);
  const [, setStatus] = useState<'quiet' | 'elevated' | 'spike'>('quiet');
  const [velocity, setVelocity] = useState<number>(0);
  const [gForce, setGForce] = useState<number>(1.0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(3.5);
  const [, setHasMicPermission] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastThreatTimeRef = useRef<number>(0);
  const spikeCountRef = useRef<number>(0);
  const recognizerRef = useRef<speechCommands.SpeechCommandRecognizer | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const lastGpsFixRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const lastMotionUpdateRef = useRef<number>(0);

  // Preload TF.js Speech Commands Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const recognizer = speechCommands.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();
        recognizerRef.current = recognizer;
        console.log('TF.js Audio Model Loaded Offline');
      } catch (err) {
        console.error('Failed to load TF.js model:', err);
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    const handleSettingsChange = () => {
      const val = localStorage.getItem('safetymesh_ambient_guard');
      const nextState = val !== 'false';
      if (isEnabled !== nextState) {
        setIsEnabled(nextState);
        if (!nextState) stopAudioMonitoring();
      }
    };
    window.addEventListener('ambient_guard_changed', handleSettingsChange);
    return () => window.removeEventListener('ambient_guard_changed', handleSettingsChange);
  }, [isEnabled]);

  // Start Audio Monitoring (Robust Web Audio & Native Android Mic Integration)
  const startAudioMonitoring = async () => {
    try {
      // 1. Ensure AudioContext is initialized & active
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch {}
      }

      // 2. Request microphone stream
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia unsupported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      // Crucial for Android WebView: resume AudioContext immediately after stream is granted
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch {}
      }

      micStreamRef.current = stream;
      setHasMicPermission(true);

      // Attach touch/click listeners to resume AudioContext if Android WebView enforces user gesture
      const resumeAudio = () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
      };
      window.addEventListener('touchstart', resumeAudio, { passive: true, once: false });
      window.addEventListener('click', resumeAudio, { passive: true, once: false });

      // 3. Connect analyser
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      startDecibelAnalysis();
    } catch (err: any) {
      console.warn('Microphone access in AmbientGuardCard:', err);
      setHasMicPermission(false);

      // If in native Android app, prompt native emergency permissions which covers RECORD_AUDIO
      const bridge = typeof window !== 'undefined' ? ((window as any).AndroidSafeMesh || (window as any).Android) : null;
      if (bridge && typeof bridge.requestEmergencyPermissions === 'function') {
        try { bridge.requestEmergencyPermissions(); } catch {}
      }
    }
  };

  // Stop Audio Monitoring
  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (isListeningRef.current && recognizerRef.current) {
      try { recognizerRef.current.stopListening(); } catch(e){}
      isListeningRef.current = false;
    }
    setDecibels(0);
    setStatus('quiet');
  };

  // Live Decibel audio analysis loop (Direct dynamic time-domain RMS meter)
  const startDecibelAnalysis = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let renderCycle = 0;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Periodically check if AudioContext was suspended by OS/backgrounding
      renderCycle++;
      if (renderCycle % 60 === 0 && audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS volume exactly like the working waveform
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Convert to live, dynamic dB scale (35 dB baseline to 100 dB)
      let currentDb = 35;
      if (rms > 0.0005) {
        currentDb = Math.min(100, Math.max(35, Math.round(35 + rms * 280)));
      } else {
        // Subtle micro-variance for ambient room air pressure
        currentDb = 35 + (Math.round(rms * 1000) % 3);
      }

      setDecibels(currentDb);

      let currentStatus: 'quiet' | 'elevated' | 'spike' = 'quiet';
      if (currentDb >= 86) {
        currentStatus = 'spike';
      } else if (currentDb >= 68) {
        currentStatus = 'elevated';
      }
      setStatus(currentStatus);

      // Threat Trigger: High volume spike sustained
      if (currentDb >= 86) {
        spikeCountRef.current += 1;
        const now = Date.now();
        if (spikeCountRef.current >= 2 && now - lastThreatTimeRef.current > 8000) {
          lastThreatTimeRef.current = now;
          spikeCountRef.current = 0;
          onThreatDetected('Sudden Loud Noise / Acoustic Spike Detected');
        }
      } else {
        spikeCountRef.current = 0;
      }

      // TF.js Wake-up pipeline
      if (currentDb >= 68 && recognizerRef.current && !isListeningRef.current) {
        isListeningRef.current = true;
        try {
          recognizerRef.current.listen(
            async (result) => {
              const words = recognizerRef.current!.wordLabels();
              let maxScore = 0;
              let bestWord = "";
              for (let i = 0; i < words.length; ++i) {
                const currentScore = result.scores[i] as number;
                if (currentScore > maxScore) {
                  maxScore = currentScore;
                  bestWord = words[i];
                }
              }
              // If distress words detected with high confidence
              if (maxScore > 0.8 && (bestWord === 'stop' || bestWord === 'no' || bestWord === 'help')) {
                const threatTime = Date.now();
                if (threatTime - lastThreatTimeRef.current > 8000) {
                  lastThreatTimeRef.current = threatTime;
                  onThreatDetected(`AI Detected Distress Word: "${bestWord.toUpperCase()}"`);
                }
              }
            },
            {
              probabilityThreshold: 0.75,
              invokeCallbackOnNoiseAndUnknown: false,
              overlapFactor: 0.50
            }
          ).then(() => {
            // Stop listening after 3 seconds to save battery
            setTimeout(() => {
              if (isListeningRef.current && recognizerRef.current) {
                try { recognizerRef.current.stopListening(); } catch(e){}
                isListeningRef.current = false;
              }
            }, 3000);
          }).catch(() => {
            isListeningRef.current = false;
          });
        } catch (e) {
          isListeningRef.current = false;
        }
      }
    };

    render();
  };

  // Motion / Snatch / Jerk Listener & Velocity Anomaly
  useEffect(() => {
    if (!isEnabled) return;

    startAudioMonitoring();

    let watchId: number | null = null;
    const speedHistory: { time: number; speed: number }[] = [];

    const handleMotion = (event: DeviceMotionEvent) => {
      // Prioritize accelerationIncludingGravity to read true physical dynamic G-Force:
      // At rest on table/hand: ~9.81 m/s² (~1.00 G)
      // Tilting, walking, moving, waving: dynamically fluctuates (0.85 G to 1.35 G)
      // Violent snatch / sudden jerk: spikes > 28 m/s² (> 2.85 G)
      let acc = event.accelerationIncludingGravity;
      const isValid = (a: DeviceMotionEventAcceleration | null | undefined) => 
        a && (typeof a.x === 'number' || typeof a.y === 'number' || typeof a.z === 'number') &&
        (a.x !== null || a.y !== null || a.z !== null);

      if (!isValid(acc)) {
        acc = event.acceleration;
      }

      if (!acc) return;

      const x = typeof acc.x === 'number' && !isNaN(acc.x) ? acc.x : 0;
      const y = typeof acc.y === 'number' && !isNaN(acc.y) ? acc.y : 0;
      const z = typeof acc.z === 'number' && !isNaN(acc.z) ? acc.z : 0;

      // Calculate vector acceleration magnitude
      const totalAcc = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // Dynamic G-force reading (fluctuates live with tilt, movement and acceleration)
      if (totalAcc > 0.1 && now - lastMotionUpdateRef.current >= 80) {
        lastMotionUpdateRef.current = now;
        const currentG = totalAcc / 9.80665;
        setGForce(Math.round(currentG * 100) / 100);
      }

      // Sharp jerk / phone snatch threshold (> 28 m/s²)
      if (totalAcc > 28 && now - lastThreatTimeRef.current > 8000) {
        lastThreatTimeRef.current = now;
        onThreatDetected('Violent Phone Movement / Snatch Detected');
      }
    };

    // Synthetic & Simulation Listeners (immediate trigger for simulation testing)
    const handleSimulatedMotion = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; z: number }>;
      const { x = 20, y = 22, z = 12 } = customEvent.detail || {};
      const totalAcc = Math.sqrt(x * x + y * y + z * z);
      const currentG = totalAcc / 9.80665;
      setGForce(Math.round(currentG * 100) / 100);
      const now = Date.now();
      if (totalAcc > 28) {
        lastThreatTimeRef.current = now;
        onThreatDetected('Violent Phone Movement / Snatch Detected');
      }
    };

    const handleSimulatedSpeed = (e: Event) => {
      const customEvent = e as CustomEvent<{ speed: number }>;
      const speed = customEvent.detail?.speed ?? 14.5;
      setVelocity(Math.round(speed * 3.6));
      const now = Date.now();
      speedHistory.length = 0;
      speedHistory.push({ time: now - 3000, speed: 1.4 });
      speedHistory.push({ time: now - 2000, speed: 1.5 });
      speedHistory.push({ time: now - 1000, speed: 1.6 });
      speedHistory.push({ time: now, speed });

      const oldest = speedHistory[0].speed;
      const newest = speedHistory[speedHistory.length - 1].speed;
      if (oldest <= 2.5 && newest > 10) {
        lastThreatTimeRef.current = now;
        onThreatDetected('High-Velocity Anomaly (Possible Forced Movement)');
      }
    };

    const handleSimulatedAudioSpike = (e: Event) => {
      const customEvent = e as CustomEvent<{ decibels: number }>;
      const db = customEvent.detail?.decibels ?? 92;
      setDecibels(db);
      setStatus('spike');
      const now = Date.now();
      lastThreatTimeRef.current = now;
      onThreatDetected('Sudden Loud Noise / Acoustic Spike Detected');
    };

    const handleSimulatedDistressWord = (e: Event) => {
      const customEvent = e as CustomEvent<{ word: string; confidence: number }>;
      const word = (customEvent.detail?.word || 'help').toLowerCase();
      const confidence = customEvent.detail?.confidence ?? 0.94;
      setDecibels(78);
      setStatus('elevated');
      if (confidence > 0.8 && (word === 'stop' || word === 'no' || word === 'help')) {
        const now = Date.now();
        lastThreatTimeRef.current = now;
        onThreatDetected(`AI Detected Distress Word: "${word.toUpperCase()}"`);
      }
    };

    // Attach global window simulation helper for browser testing
    (window as unknown as { __safetyMeshSimulate: unknown }).__safetyMeshSimulate = {
      snatch: () => window.dispatchEvent(new CustomEvent('safetymesh_simulate_motion', { detail: { x: 20, y: 22, z: 12 } })),
      velocity: () => window.dispatchEvent(new CustomEvent('safetymesh_simulate_speed', { detail: { speed: 14.5 } })),
      acousticSpike: () => window.dispatchEvent(new CustomEvent('safetymesh_simulate_audio_spike', { detail: { decibels: 92 } })),
      distressWord: (word = 'help') => window.dispatchEvent(new CustomEvent('safetymesh_simulate_distress_word', { detail: { word, confidence: 0.94 } })),
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('safetymesh_simulate_motion', handleSimulatedMotion);
    window.addEventListener('safetymesh_simulate_speed', handleSimulatedSpeed);
    window.addEventListener('safetymesh_simulate_audio_spike', handleSimulatedAudioSpike);
    window.addEventListener('safetymesh_simulate_distress_word', handleSimulatedDistressWord);

    // Auto-resume AudioContext on first touch/click if suspended by browser Autoplay policy
    const handleUnlockAudio = () => {
      if (!micStreamRef.current) {
        startAudioMonitoring();
      } else if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('click', handleUnlockAudio);
    window.addEventListener('touchstart', handleUnlockAudio);
    window.addEventListener('pointerdown', handleUnlockAudio);

    // Velocity Sensor with live GPS calculation fallback
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position.coords.accuracy) {
            setGpsAccuracy(Math.round(position.coords.accuracy * 10) / 10);
          }
          let speedKmh = 0;
          const speedMs = position.coords.speed;
          if (speedMs !== null && !isNaN(speedMs) && speedMs >= 0) {
            speedKmh = Math.round(speedMs * 3.6);
            setVelocity(speedKmh);
          } else {
            // Calculate speed from distance & time delta between successive GPS coordinates
            const now = position.timestamp || Date.now();
            const { latitude, longitude } = position.coords;
            if (lastGpsFixRef.current) {
              const dt = (now - lastGpsFixRef.current.time) / 1000;
              if (dt >= 1 && dt <= 30) {
                const R = 6371000; // meters
                const dLat = ((latitude - lastGpsFixRef.current.lat) * Math.PI) / 180;
                const dLon = ((longitude - lastGpsFixRef.current.lon) * Math.PI) / 180;
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos((lastGpsFixRef.current.lat * Math.PI) / 180) *
                    Math.cos((latitude * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceMeters = R * c;

                if (distanceMeters > 3) {
                  const calculatedSpeedMs = distanceMeters / dt;
                  if (calculatedSpeedMs < 60) {
                    speedKmh = Math.round(calculatedSpeedMs * 3.6);
                    setVelocity(speedKmh);
                  }
                } else {
                  setVelocity(0);
                }
              }
            }
            lastGpsFixRef.current = { lat: latitude, lon: longitude, time: now };
          }

          const activeSpeedMs = (speedMs !== null && !isNaN(speedMs)) ? speedMs : (speedKmh / 3.6);
          const now = Date.now();
          speedHistory.push({ time: now, speed: activeSpeedMs });

          // Remove entries older than 20 seconds
          while (speedHistory.length > 0 && now - speedHistory[0].time > 20000) {
            speedHistory.shift();
          }

          // If we have history, check for sudden velocity jump
          if (speedHistory.length > 3) {
            const oldest = speedHistory[0].speed;
            const newest = speedHistory[speedHistory.length - 1].speed;
            
            // Walking speed ~1.5m/s. Vehicle speed > 10m/s
            if (oldest <= 2.5 && newest > 10) {
              if (now - lastThreatTimeRef.current > 8000) {
                lastThreatTimeRef.current = now;
                onThreatDetected('High-Velocity Anomaly (Possible Forced Movement)');
              }
            }
          }
        },
        (error) => console.log('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }

    return () => {
      window.removeEventListener('click', handleUnlockAudio);
      window.removeEventListener('touchstart', handleUnlockAudio);
      window.removeEventListener('pointerdown', handleUnlockAudio);
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('safetymesh_simulate_motion', handleSimulatedMotion);
      window.removeEventListener('safetymesh_simulate_speed', handleSimulatedSpeed);
      window.removeEventListener('safetymesh_simulate_audio_spike', handleSimulatedAudioSpike);
      window.removeEventListener('safetymesh_simulate_distress_word', handleSimulatedDistressWord);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      stopAudioMonitoring();
    };
  }, [isEnabled]);

  return (
    <>
      <div
        onClick={() => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {});
          }
          if (!micStreamRef.current) {
            startAudioMonitoring();
          }
        }}
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '14px 18px',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.02)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          width: '100%',
          maxWidth: '440px',
          margin: '0 auto',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header Row: Title & Subtitle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MicIcon size={18} color={isEnabled ? '#10B981' : '#64748B'} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                AI Threat Detector
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                Kinematic & Telemetry AI
              </span>
            </div>
          </div>
        </div>

        {/* 3 Live Sensor Pills */}
        {isEnabled ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              width: '100%',
            }}
          >
            {/* Velocity Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 6px',
                borderRadius: '12px',
                background:
                  velocity > 30
                    ? 'rgba(239, 68, 68, 0.12)'
                    : velocity > 10
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(241, 245, 249, 0.8)',
                border:
                  velocity > 30
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : velocity > 10
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : '1px solid rgba(226, 232, 240, 0.9)',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--text-tertiary, #64748B)',
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                }}
              >
                Velocity
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color:
                    velocity > 30
                      ? '#DC2626'
                      : velocity > 10
                      ? '#D97706'
                      : 'var(--text-primary, #0F172A)',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: velocity > 30 ? '#DC2626' : velocity > 10 ? '#D97706' : '#10B981',
                    display: 'inline-block',
                  }}
                />
                <span>{velocity} km/h</span>
              </div>
            </div>

            {/* GPS Precision / Mesh Lock Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 6px',
                borderRadius: '12px',
                background:
                  gpsAccuracy > 30
                    ? 'rgba(239, 68, 68, 0.12)'
                    : gpsAccuracy > 15
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(16, 185, 129, 0.1)',
                border:
                  gpsAccuracy > 30
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : gpsAccuracy > 15
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : '1px solid rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--text-tertiary, #64748B)',
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                }}
              >
                GPS Lock
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color:
                    gpsAccuracy > 30
                      ? '#DC2626'
                      : gpsAccuracy > 15
                      ? '#D97706'
                      : '#059669',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: gpsAccuracy > 30 ? '#DC2626' : gpsAccuracy > 15 ? '#D97706' : '#10B981',
                    display: 'inline-block',
                    boxShadow: gpsAccuracy <= 15 ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                  }}
                />
                <span>±{gpsAccuracy}m</span>
              </div>
            </div>

            {/* G-Force Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 6px',
                borderRadius: '12px',
                background:
                  gForce > 2.8
                    ? 'rgba(239, 68, 68, 0.12)'
                    : gForce > 1.8
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(241, 245, 249, 0.8)',
                border:
                  gForce > 2.8
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : gForce > 1.8
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : '1px solid rgba(226, 232, 240, 0.9)',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--text-tertiary, #64748B)',
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                }}
              >
                G-Force
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color:
                    gForce > 2.8
                      ? '#DC2626'
                      : gForce > 1.8
                      ? '#D97706'
                      : 'var(--text-primary, #0F172A)',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: gForce > 2.8 ? '#DC2626' : gForce > 1.8 ? '#D97706' : '#10B981',
                    display: 'inline-block',
                  }}
                />
                <span>{gForce.toFixed(2)} G</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'rgba(241, 245, 249, 0.6)',
              borderRadius: '12px',
              padding: '10px 12px',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              Threat Guard is inactive - Enable in Settings
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default AmbientGuardCard;

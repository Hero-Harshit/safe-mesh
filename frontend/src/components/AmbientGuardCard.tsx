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

  const [decibels, setDecibels] = useState<number>(38);
  const [status, setStatus] = useState<'quiet' | 'elevated' | 'spike'>('quiet');
  const [velocity, setVelocity] = useState<number>(0);
  const [gForce, setGForce] = useState<number>(1.0);
  const [, setHasMicPermission] = useState<boolean | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastThreatTimeRef = useRef<number>(0);
  const spikeCountRef = useRef<number>(0);
  const recognizerRef = useRef<speechCommands.SpeechCommandRecognizer | null>(null);
  const isListeningRef = useRef<boolean>(false);

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

  const drawIdleWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const render = () => {
      if (!canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(render);
      offset += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#10B981';
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.08 + offset) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    render();
  };

  const renderSimulatedWave = (statusType: 'elevated' | 'spike') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = statusType === 'spike' ? 2.5 : 2;
    ctx.strokeStyle = statusType === 'spike' ? '#EF4444' : '#F59E0B';
    const amp = statusType === 'spike' ? 12 : 7;
    for (let x = 0; x < canvas.width; x++) {
      const y = canvas.height / 2 + Math.sin(x * 0.25) * (Math.random() * amp);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // Start Audio Monitoring
  const startAudioMonitoring = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not available');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setHasMicPermission(true);

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();
    } catch {
      setHasMicPermission(false);
      // Keep isEnabled active so Kinematics & Velocity sentinel remain guarded
      drawIdleWave();
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

    // Clear canvas to flat line
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  // Waveform render loop
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      // Convert to estimated dB (approx 35dB - 100dB scale)
      const currentDb = Math.min(100, Math.max(35, Math.round(35 + rms * 140)));
      setDecibels(currentDb);

      let currentStatus: 'quiet' | 'elevated' | 'spike' = 'quiet';
      if (currentDb >= 86) {
        currentStatus = 'spike';
      } else if (currentDb >= 68) {
        currentStatus = 'elevated';
      }
      setStatus(currentStatus);

      // Threat Trigger: High volume spike sustained OR TF.js Wakeup
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
                const now = Date.now();
                if (now - lastThreatTimeRef.current > 8000) {
                  lastThreatTimeRef.current = now;
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

      // Draw clean, smooth ripple
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = currentStatus === 'spike' ? 2.5 : 2;
      ctx.strokeStyle =
        currentStatus === 'spike'
          ? '#EF4444'
          : currentStatus === 'elevated'
          ? '#F59E0B'
          : '#10B981';

      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
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
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      // Calculate acceleration magnitude
      const totalAcc = Math.sqrt(x * x + y * y + z * z);
      const currentG = totalAcc > 0 ? totalAcc / 9.80665 : 1.0;
      setGForce(Math.round(currentG * 100) / 100);
      const now = Date.now();

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
      renderSimulatedWave('spike');
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
      renderSimulatedWave('elevated');
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

    // Velocity Anomaly (Kidnapping / Vehicle Abduction)
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const speed = position.coords.speed;
          if (speed !== null && !isNaN(speed)) {
            setVelocity(Math.max(0, Math.round(speed * 3.6)));
          }
          if (speed !== null) {
            const now = Date.now();
            speedHistory.push({ time: now, speed });

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
          }
        },
        (error) => console.log('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }

    return () => {
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
        {/* Header Row: Title, Subtitle & Simulation Button */}
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
                Acoustic & Voice Sentinel
              </span>
            </div>
          </div>

          {/* Removed Simulation Button as it was moved to settings */}
        </div>
        {/* Middle Row: Visual Sound Line & Status */}
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

            {/* Sound Level Pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 6px',
                borderRadius: '12px',
                background:
                  status === 'spike'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : status === 'elevated'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(241, 245, 249, 0.8)',
                border:
                  status === 'spike'
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : status === 'elevated'
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
                Sound
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color:
                    status === 'spike'
                      ? '#DC2626'
                      : status === 'elevated'
                      ? '#D97706'
                      : 'var(--text-primary, #0F172A)',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: status === 'spike' ? '#DC2626' : status === 'elevated' ? '#D97706' : '#10B981',
                    display: 'inline-block',
                  }}
                />
                <span>{decibels} dB</span>
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
              Guard is inactive - Enable in Settings
            </span>
          </div>
        )}
      </div>

    </>
  );
};

export default AmbientGuardCard;

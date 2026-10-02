import React, { useState, useEffect, useRef } from 'react';
import { MicIcon } from './Icons';

interface AmbientGuardCardProps {
  onThreatDetected: (reason: string) => void;
  onShowToast: (msg: string) => void;
}

export const AmbientGuardCard: React.FC<AmbientGuardCardProps> = ({
  onThreatDetected,
  onShowToast,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('safetymesh_ambient_guard') === 'true';
  });

  const [decibels, setDecibels] = useState<number>(0);
  const [status, setStatus] = useState<'quiet' | 'elevated' | 'spike'>('quiet');
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastThreatTimeRef = useRef<number>(0);
  const spikeCountRef = useRef<number>(0);

  // Toggle handler
  const handleToggle = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    localStorage.setItem('safetymesh_ambient_guard', String(nextState));

    if (nextState) {
      onShowToast('🎙️ Ambient Threat Guard Armed');
    } else {
      onShowToast('Ambient Threat Guard Disarmed');
      stopAudioMonitoring();
    }
  };

  // Start Audio Monitoring
  const startAudioMonitoring = async () => {
    try {
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
      setIsEnabled(false);
      localStorage.setItem('safetymesh_ambient_guard', 'false');
      onShowToast('Microphone permission required for Ambient Guard');
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

      // Threat Trigger: High volume spike sustained
      if (currentDb >= 86) {
        spikeCountRef.current += 1;
        const now = Date.now();
        if (spikeCountRef.current >= 2 && now - lastThreatTimeRef.current > 12000) {
          lastThreatTimeRef.current = now;
          spikeCountRef.current = 0;
          onThreatDetected('Sudden Loud Noise / Acoustic Spike Detected');
        }
      } else {
        spikeCountRef.current = 0;
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

  // Motion / Snatch / Jerk Listener
  useEffect(() => {
    if (!isEnabled) return;

    startAudioMonitoring();

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      // Calculate acceleration magnitude
      const totalAcc = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // Sharp jerk / phone snatch threshold (> 28 m/s²)
      if (totalAcc > 28 && now - lastThreatTimeRef.current > 12000) {
        lastThreatTimeRef.current = now;
        onThreatDetected('Violent Phone Movement / Snatch Detected');
      }
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      stopAudioMonitoring();
    };
  }, [isEnabled]);

  return (
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
      {/* Header Row: Title & Toggle */}
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
              Ambient Threat Guard
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              Acoustic & Snatch Sentinel
            </span>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          style={{
            width: '46px',
            height: '26px',
            borderRadius: '13px',
            background: isEnabled ? '#10B981' : '#E2E8F0',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            padding: '2px',
            transition: 'background 0.2s ease',
          }}
          aria-label="Toggle Ambient Threat Guard"
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transform: isEnabled ? 'translateX(20px)' : 'translateX(0px)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Middle Row: Visual Sound Line & Status */}
      {isEnabled ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'rgba(241, 245, 249, 0.6)',
            borderRadius: '12px',
            padding: '8px 12px',
          }}
        >
          {/* Real-time wave canvas */}
          <canvas
            ref={canvasRef}
            width={180}
            height={28}
            style={{
              flex: 1,
              height: '28px',
              display: 'block',
            }}
          />

          {/* Status Pill */}
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              background:
                status === 'spike'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : status === 'elevated'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
              color:
                status === 'spike'
                  ? '#EF4444'
                  : status === 'elevated'
                  ? '#F59E0B'
                  : '#10B981',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block',
              }}
            />
            {status === 'spike'
              ? `Spike (${decibels} dB)`
              : status === 'elevated'
              ? `Loud (${decibels} dB)`
              : `Safe (${decibels} dB)`}
          </div>
        </div>
      ) : (
        <div
          onClick={handleToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: 'rgba(241, 245, 249, 0.6)',
            borderRadius: '12px',
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            {hasMicPermission === false
              ? 'Mic permission needed • Tap to allow'
              : 'Guard is inactive • Tap to arm acoustic & snatch defense'}
          </span>
        </div>
      )}
    </div>
  );
};

export default AmbientGuardCard;

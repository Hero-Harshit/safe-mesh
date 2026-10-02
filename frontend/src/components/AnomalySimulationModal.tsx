import React from 'react';
import { ShieldLogoIcon } from './Icons';

interface AnomalySimulationModalProps {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const AnomalySimulationModal: React.FC<AnomalySimulationModalProps> = ({
  onClose,
  onShowToast,
}) => {
  const triggerSnatch = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('safetymesh_simulate_motion', {
          detail: { x: 20.0, y: 22.0, z: 12.0 }, // ~32 m/s² > 28 threshold
        })
      );
      onShowToast('Simulating violent device snatch (32 m/s²)...');
    }, 150);
  };

  const triggerVelocity = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('safetymesh_simulate_speed', {
          detail: { speed: 14.5 }, // 1.5 m/s -> 14.5 m/s forced movement
        })
      );
      onShowToast('Simulating vehicle speed surge (14.5 m/s)...');
    }, 150);
  };

  const triggerAudioSpike = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('safetymesh_simulate_audio_spike', {
          detail: { decibels: 92 }, // 92 dB > 86 dB threshold
        })
      );
      onShowToast('Simulating acoustic spike (92 dB)...');
    }, 150);
  };

  const triggerDistressWord = (word: string) => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('safetymesh_simulate_distress_word', {
          detail: { word, confidence: 0.94 },
        })
      );
      onShowToast(`Simulating on-device TF.js distress detection ("${word.toUpperCase()}")...`);
    }, 150);
  };

  return (
    <div
      className="safetymesh-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ zIndex: 400 }}
    >
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div
              className="modal-icon-bubble"
              style={{ background: 'rgba(239, 68, 68, 0.12)' }}
            >
              <ShieldLogoIcon size={22} color="#EF4444" />
            </div>
            <div>
              <h2 className="modal-sheet-title">AI Threat Simulator</h2>
              <span className="modal-sheet-subtitle">Hardware & Neural Simulation Lab</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>
            Verify on-device threat sentinels and AI wake-word pipelines without physical movement or noise.
          </p>

          {/* 1. Phone Snatch (Kinematics) */}
          <div
            style={{
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '16px',
              padding: '14px',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                📱 Violent Phone Snatch
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                }}
              >
                &gt;28 m/s² Jerk
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 10px', lineHeight: 1.3 }}>
              Synthesizes accelerometer 3-axis surge magnitude to 32.0 m/s², triggering instant snatch sentinel.
            </p>
            <button
              onClick={triggerSnatch}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '10px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Simulate Device Snatch
            </button>
          </div>

          {/* 2. High-Velocity Abduction (Kinematics / GPS) */}
          <div
            style={{
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '16px',
              padding: '14px',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                🏎️ Velocity Surge (Abduction)
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#D97706',
                }}
              >
                1.5 ➔ 14.5 m/s
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 10px', lineHeight: 1.3 }}>
              Simulates pedestrian speed transitioning violently into high vehicle velocity (52 km/h).
            </p>
            <button
              onClick={triggerVelocity}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '10px',
                background: '#F59E0B',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Simulate Velocity Surge
            </button>
          </div>

          {/* 3. Acoustic Spike */}
          <div
            style={{
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '16px',
              padding: '14px',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                💥 Acoustic Noise Spike
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                }}
              >
                92 dB Volume
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 10px', lineHeight: 1.3 }}>
              Synthesizes sustained extreme acoustic energy exceeding safety threshold (86 dB).
            </p>
            <button
              onClick={triggerAudioSpike}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '10px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Simulate Acoustic Spike (92 dB)
            </button>
          </div>

          {/* 4. TF.js Wake Word Detection */}
          <div
            style={{
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '16px',
              padding: '14px',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                🎙️ TF.js Distress Recognition
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                }}
              >
                94% Offline AI
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '0 0 10px', lineHeight: 1.3 }}>
              Evaluates distress command through the on-device TensorFlow.js speech recognizer.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => triggerDistressWord('help')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                "HELP"
              </button>
              <button
                onClick={() => triggerDistressWord('stop')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.85)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                "STOP"
              </button>
              <button
                onClick={() => triggerDistressWord('no')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.85)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                "NO"
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnomalySimulationModal;

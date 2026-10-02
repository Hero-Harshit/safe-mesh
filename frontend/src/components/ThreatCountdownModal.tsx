import React, { useState, useEffect } from 'react';
import { ShieldLogoIcon } from './Icons';
import { triggerHaptic } from '../services/emergency';

interface ThreatCountdownModalProps {
  reason: string;
  onCancel: () => void;
  onConfirmThreat: () => void;
}

export const ThreatCountdownModal: React.FC<ThreatCountdownModalProps> = ({
  reason,
  onCancel,
  onConfirmThreat,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    // Initial urgent haptic vibration
    triggerHaptic([200, 100, 200, 100, 400]);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirmThreat();
          return 0;
        }
        triggerHaptic(80);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onConfirmThreat]);

  return (
    <div
      className="safetymesh-modal-backdrop"
      style={{
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="safetymesh-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderTop: '4px solid #EF4444',
          textAlign: 'center',
          padding: '24px 20px 28px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
          }}
        >
          <ShieldLogoIcon size={34} color="#EF4444" />
        </div>

        <h2
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '6px',
          }}
        >
          Threat Anomaly Detected
        </h2>

        <p
          style={{
            fontSize: '0.88rem',
            color: '#EF4444',
            fontWeight: 600,
            marginBottom: '16px',
            lineHeight: 1.4,
          }}
        >
          {reason}
        </p>

        {/* Countdown Ring / Big Number */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            border: '4px solid #EF4444',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            background: 'rgba(239, 68, 68, 0.05)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
          }}
        >
          <span
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              color: '#EF4444',
              lineHeight: 1,
            }}
          >
            {secondsLeft}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05rem',
              marginTop: '2px',
            }}
          >
            Seconds
          </span>
        </div>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
            lineHeight: 1.4,
          }}
        >
          Broadcasting Emergency SOS via Bluetooth Mesh & sending live GPS SMS if not dismissed.
        </p>

        <button
          onClick={onCancel}
          style={{
            width: 'fit-content',
            minWidth: '220px',
            margin: '0 auto',
            padding: '14px 28px',
            borderRadius: '14px',
            background: '#10B981',
            color: '#FFFFFF',
            fontSize: '1.05rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
            letterSpacing: '0.02rem',
          }}
        >
          I Am Safe Dismiss Alert
        </button>
      </div>
    </div>
  );
};

export default ThreatCountdownModal;

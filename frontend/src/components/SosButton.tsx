import React, { useState, useRef, useEffect } from 'react';
import { triggerHaptic } from '../services/emergency';

interface SosButtonProps {
  onTriggerSos: () => void;
}

const SosButton: React.FC<SosButtonProps> = ({ onTriggerSos }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const pressTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleInstantTrigger = () => {
    triggerHaptic([200, 100, 200, 100, 400]);
    onTriggerSos();
  };

  const startCountdown = () => {
    triggerHaptic([100, 80, 100]);
    setCountdown(3);

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        triggerHaptic(100);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        handleInstantTrigger();
      }
    }, 1000);
  };

  const cancelCountdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  };

  return (
    <section className="sos-hero-section" aria-label="Emergency SOS trigger">
      <div className="sos-container">
        {/* Animated pulsating outer rings */}
        <div className="sos-ripple ring-1"></div>
        <div className="sos-ripple ring-2"></div>
        <div className="sos-ripple ring-3"></div>

        {/* The Big SOS Button */}
        <button
          className={`big-sos-btn ${isPressing ? 'pressing' : ''} ${countdown !== null ? 'counting' : ''}`}
          onClick={countdown !== null ? undefined : startCountdown}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          aria-label="Activate Emergency SOS"
        >
          <div className="sos-inner-glow"></div>
          <div className="sos-content">
            {countdown !== null ? (
              <div className="sos-countdown-view">
                <span className="countdown-num">{countdown}</span>
                <span className="countdown-label">SENDING SOS...</span>
                <span className="countdown-sub">TAP CANCEL TO ABORT</span>
              </div>
            ) : (
              <>
                <span className="sos-beacon-icon">🚨</span>
                <span className="sos-primary-text">SOS</span>
                <span className="sos-sub-text">EMERGENCY</span>
              </>
            )}
          </div>
        </button>
      </div>

      {countdown !== null ? (
        <div className="sos-countdown-actions">
          <button className="sos-cancel-btn" onClick={cancelCountdown}>
            ✕ Cancel ({countdown}s)
          </button>
          <button className="sos-now-btn" onClick={handleInstantTrigger}>
            Trigger Now ➔
          </button>
        </div>
      ) : (
        <div className="sos-instruction-bar">
          <span className="sos-hint-icon">⚡</span>
          <span className="sos-hint-text">
            Tap SOS to broadcast location & notify emergency guardians
          </span>
        </div>
      )}
    </section>
  );
};

export default SosButton;

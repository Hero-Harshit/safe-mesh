import React, { useState, useRef, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../services/emergency';
import { SosBroadcastIcon } from './Icons';

interface EmergencySOSButtonProps {
  onActivate: () => void;
}

const HOLD_DURATION_MS = 1800; // 1.8 seconds hold to activate

export const EmergencySOSButton: React.FC<EmergencySOSButtonProps> = ({ onActivate }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [showHint, setShowHint] = useState(false);
  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<any>(null);

  const resetHold = useCallback(() => {
    setIsHolding(false);
    setProgress(0);
    holdStartTimeRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const handleHoldComplete = useCallback(() => {
    resetHold();
    triggerHaptic([200, 80, 200, 80, 400]);
    onActivate();
  }, [onActivate, resetHold]);

  const handleFrame = useCallback(() => {
    if (!holdStartTimeRef.current) return;
    const elapsed = Date.now() - holdStartTimeRef.current;
    const currentProgress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
    setProgress(currentProgress);

    // Provide light rhythmic haptic ticks while holding
    if (Math.floor(elapsed / 300) % 2 === 0) {
      triggerHaptic(20);
    }

    if (currentProgress >= 100) {
      handleHoldComplete();
    } else {
      animFrameRef.current = requestAnimationFrame(handleFrame);
    }
  }, [handleHoldComplete]);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsHolding(true);
    triggerHaptic(50);
    holdStartTimeRef.current = Date.now();
    animFrameRef.current = requestAnimationFrame(handleFrame);
  };

  const cancelHold = () => {
    if (isHolding && progress < 90) {
      // User tapped or released too early
      setShowHint(true);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => setShowHint(false), 2500);
    }
    resetHold();
  };

  useEffect(() => {
    return () => {
      resetHold();
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [resetHold]);

  // Circumference for the SVG progress circle (radius = 92)
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <section className="sos-hero-container" aria-label="Emergency SOS activation">
      <div className="sos-top-label">Emergency</div>

      <div className="sos-button-wrapper">
        {/* Soft Ambient Glow Rings */}
        <div className="sos-glow-outer"></div>
        <div className={`sos-ring ring-level-3 ${isHolding ? 'holding' : ''}`}></div>
        <div className={`sos-ring ring-level-2 ${isHolding ? 'holding' : ''}`}></div>
        <div className={`sos-ring ring-level-1 ${isHolding ? 'holding' : ''}`}></div>

        {/* Circular SVG Progress Ring */}
        <svg className="sos-progress-svg" width="220" height="220" viewBox="0 0 200 200">
          <circle
            className="sos-progress-bg"
            cx="100"
            cy="100"
            r={radius}
            strokeWidth="5"
          />
          <circle
            className="sos-progress-bar"
            cx="100"
            cy="100"
            r={radius}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* The Tactile Hero Button */}
        <button
          className={`hero-sos-button ${isHolding ? 'is-holding' : ''}`}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          aria-label="Press and hold SOS button to trigger emergency"
        >
          <div className="sos-button-gloss"></div>
          <div className="sos-inner-elements">
            <div className="sos-icon-wrap">
              <SosBroadcastIcon size={34} color="#FFFFFF" />
            </div>
            <span className="sos-hero-title">SOS</span>
            <span className="sos-hero-subtitle">
              {isHolding ? `${Math.ceil((HOLD_DURATION_MS * (1 - progress / 100)) / 1000)}s to activate` : 'Hold to activate'}
            </span>
          </div>
        </button>
      </div>

      {showHint && (
        <div className="sos-hint-pill" role="status">
          Press and hold for 2 seconds to activate
        </div>
      )}
    </section>
  );
};

export default EmergencySOSButton;

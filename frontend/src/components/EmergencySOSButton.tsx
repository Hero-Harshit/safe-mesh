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
  const [isActivated, setIsActivated] = useState(false); // Track completion state
  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<any>(null);

  const resetHold = useCallback(() => {
    if (isActivated) return; // Prevent reset if already transitioning to green
    setIsHolding(false);
    setProgress(0);
    holdStartTimeRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, [isActivated]);

  const handleHoldComplete = useCallback(() => {
    setIsActivated(true);
    triggerHaptic([200, 80, 200, 80, 400]);
    // Wait 2 seconds for the slow green transition before actually navigating
    setTimeout(() => {
      onActivate();
      // Reset after it's navigated away so it's clean if they come back
      setIsActivated(false); 
      setIsHolding(false);
      setProgress(0);
    }, 2000);
  }, [onActivate]);

  const handleFrame = useCallback(() => {
    if (!holdStartTimeRef.current || isActivated) return;
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
  }, [handleHoldComplete, isActivated]);

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

  // Radii for the three progress circles
  const radius1 = 92;
  const radius2 = 106;
  const radius3 = 120;

  const circ1 = 2 * Math.PI * radius1;
  const circ2 = 2 * Math.PI * radius2;
  const circ3 = 2 * Math.PI * radius3;

  const offset1 = circ1 - (progress / 100) * circ1;
  const offset2 = circ2 - (progress / 100) * circ2;
  const offset3 = circ3 - (progress / 100) * circ3;

  return (
    <section className="sos-hero-container" aria-label="Emergency SOS activation">

      <div className="sos-button-wrapper">
        {/* Soft Ambient Glow Outer */}
        <div className="sos-glow-outer"></div>
        <div className={`sos-ring ring-level-3 ${isHolding ? 'holding' : ''}`}></div>
        <div className={`sos-ring ring-level-2 ${isHolding ? 'holding' : ''}`}></div>
        <div className={`sos-ring ring-level-1 ${isHolding ? 'holding' : ''}`}></div>

        {/* Circular SVG Progress Rings (3 levels) */}
        <svg className="sos-progress-svg" width="260" height="260" viewBox="0 0 260 260" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', pointerEvents: 'none', zIndex: 6 }}>
          {/* Inner Ring (Level 1) */}
          <circle className="sos-progress-bg" cx="130" cy="130" r={radius1} strokeWidth="3" opacity="0.2" />
          <circle
            className="sos-progress-bar"
            cx="130"
            cy="130"
            r={radius1}
            strokeWidth="4"
            strokeDasharray={circ1}
            strokeDashoffset={offset1}
            strokeLinecap="round"
            stroke="#FFFFFF"
            style={{ transition: 'none' }}
          />

          {/* Middle Ring (Level 2) */}
          <circle className="sos-progress-bg" cx="130" cy="130" r={radius2} strokeWidth="2" opacity="0.15" />
          <circle
            className="sos-progress-bar"
            cx="130"
            cy="130"
            r={radius2}
            strokeWidth="3"
            strokeDasharray={circ2}
            strokeDashoffset={offset2}
            strokeLinecap="round"
            stroke="#FFFFFF"
            style={{ transition: 'none' }}
          />

          {/* Outer Ring (Level 3) */}
          <circle className="sos-progress-bg" cx="130" cy="130" r={radius3} strokeWidth="1" opacity="0.1" />
          <circle
            className="sos-progress-bar"
            cx="130"
            cy="130"
            r={radius3}
            strokeWidth="2"
            strokeDasharray={circ3}
            strokeDashoffset={offset3}
            strokeLinecap="round"
            stroke="#FFFFFF"
            style={{ transition: 'none' }}
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
          style={{
            transition: 'background 2s ease, box-shadow 2s ease, border 2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: isActivated ? 'linear-gradient(135deg, #10B981 0%, #047857 100%)' : undefined,
            boxShadow: isActivated 
              ? '0 0 0 6px rgba(16, 185, 129, 0.7), 0 0 0 10px rgba(16, 185, 129, 0.2), 0 12px 40px rgba(16, 185, 129, 0.8), inset 0 4px 8px rgba(255, 255, 255, 0.45), inset 0 -6px 12px rgba(4, 120, 87, 0.8)' 
              : undefined,
            border: isActivated ? '1px solid #34D399' : 'none'
          }}
        >
          <div className="sos-button-gloss"></div>
          <div className="sos-inner-elements">
            {!isActivated && (
              <div className="sos-icon-wrap">
                <SosBroadcastIcon size={34} color="#FFFFFF" />
              </div>
            )}
            <span className="sos-hero-title">{isActivated ? "You're safe" : 'SOS'}</span>
            <span className="sos-hero-subtitle">
              {isActivated 
                ? 'Help arriving' 
                : isHolding 
                  ? `${Math.ceil((HOLD_DURATION_MS * (1 - progress / 100)) / 1000)}s to activate` 
                  : 'Hold to activate'}
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

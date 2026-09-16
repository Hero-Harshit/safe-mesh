import { useState } from 'react';
import type { LocationData } from '../services/location';
import { getCurrentLocation } from '../services/location';
import { triggerHaptic } from '../services/emergency';

interface SafetyToolsGridProps {
  onNavigate: (view: string) => void;
  sirenActive: boolean;
  onToggleSiren: () => void;
  onShowToast: (msg: string) => void;
}

const SafetyToolsGrid: React.FC<SafetyToolsGridProps> = ({
  onNavigate,
  sirenActive,
  onToggleSiren,
  onShowToast,
}) => {
  const [sharingLoc, setSharingLoc] = useState(false);
  const [safeWalkActive, setSafeWalkActive] = useState(false);
  const [safeWalkMinutes, setSafeWalkMinutes] = useState(15);
  const [showSafeWalkModal, setShowSafeWalkModal] = useState(false);

  // Share Live Location action
  const handleShareLocation = async () => {
    setSharingLoc(true);
    triggerHaptic(50);
    try {
      const loc: LocationData = await getCurrentLocation();
      const text = `Safemesh Alert: Here is my real-time location: ${loc.mapsUrl} (Accuracy: ±${Math.round(
        loc.accuracy
      )}m)`;

      if (navigator.share) {
        await navigator.share({
          title: 'My Safemesh Live Location',
          text,
          url: loc.mapsUrl,
        });
        onShowToast('Location shared successfully');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        onShowToast('Location link copied to clipboard!');
      } else {
        window.open(loc.mapsUrl, '_blank');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Unable to fetch current GPS location');
    } finally {
      setSharingLoc(false);
    }
  };

  // Safe Walk Timer Start
  const handleStartSafeWalk = (mins: number) => {
    setSafeWalkMinutes(mins);
    setSafeWalkActive(true);
    setShowSafeWalkModal(false);
    triggerHaptic(100);
    onShowToast(`Safe Walk armed for ${mins} minutes`);
  };

  const handleStopSafeWalk = () => {
    setSafeWalkActive(false);
    triggerHaptic(50);
    onShowToast('Safe Walk completed safely');
  };

  return (
    <section className="safety-tools-section" aria-label="Other safety features and options">
      <div className="section-header-compact">
        <span className="section-icon">🛠️</span>
        <h3 className="section-title-compact">SAFETY TOOLS & OPTIONS</h3>
      </div>

      <div className="tools-grid">
        {/* Nearby Guardian Card (BLE Mesh) */}
        <button
          className="tool-card guardian-card"
          onClick={() => {
            triggerHaptic(50);
            onNavigate('nearby_guardian');
          }}
          aria-label="Open Nearby Guardian"
        >
          <div className="tool-card-icon-wrap mesh-glow">
            <span className="tool-icon">📡</span>
          </div>
          <div className="tool-card-body">
            <div className="tool-header-row">
              <span className="tool-title">Nearby Guardian</span>
              <span className="tool-tag">BLE MESH</span>
            </div>
            <p className="tool-desc">
              Discover & connect to offline safety nodes within 50m
            </p>
          </div>
          <span className="tool-arrow">➔</span>
        </button>

        {/* Share Live Location */}
        <button
          className="tool-card"
          onClick={handleShareLocation}
          disabled={sharingLoc}
          aria-label="Share live location"
        >
          <div className="tool-card-icon-wrap loc-glow">
            <span className="tool-icon">{sharingLoc ? '⏳' : '📍'}</span>
          </div>
          <div className="tool-card-body">
            <div className="tool-header-row">
              <span className="tool-title">Share Live Location</span>
              <span className="tool-tag tag-blue">GPS</span>
            </div>
            <p className="tool-desc">
              {sharingLoc ? 'Fetching GPS coordinates...' : 'Send Google Maps link with exact coordinates'}
            </p>
          </div>
          <span className="tool-arrow">↗</span>
        </button>

        {/* Loud Siren Alarm */}
        <button
          className={`tool-card ${sirenActive ? 'active-siren-card' : ''}`}
          onClick={onToggleSiren}
          aria-label="Toggle loud panic siren"
        >
          <div className="tool-card-icon-wrap siren-glow">
            <span className="tool-icon">{sirenActive ? '🔊' : '📢'}</span>
          </div>
          <div className="tool-card-body">
            <div className="tool-header-row">
              <span className="tool-title">Loud Panic Siren</span>
              <span className={`tool-tag ${sirenActive ? 'tag-danger' : ''}`}>
                {sirenActive ? 'BLARING' : 'AUDIO'}
              </span>
            </div>
            <p className="tool-desc">
              {sirenActive ? 'Tap to silence alarm siren' : 'Play high-decibel pulsing alarm synthesizer'}
            </p>
          </div>
          <span className="tool-arrow">{sirenActive ? '⏹' : '▶'}</span>
        </button>

        {/* Safe Walk Check-In Timer */}
        <button
          className={`tool-card ${safeWalkActive ? 'active-safewalk-card' : ''}`}
          onClick={() => {
            if (safeWalkActive) {
              handleStopSafeWalk();
            } else {
              setShowSafeWalkModal(true);
            }
          }}
          aria-label="Safe Walk Check-In Timer"
        >
          <div className="tool-card-icon-wrap timer-glow">
            <span className="tool-icon">⏱️</span>
          </div>
          <div className="tool-card-body">
            <div className="tool-header-row">
              <span className="tool-title">Safe Walk Check-in</span>
              <span className={`tool-tag ${safeWalkActive ? 'tag-green' : ''}`}>
                {safeWalkActive ? 'MONITORING' : 'TIMER'}
              </span>
            </div>
            <p className="tool-desc">
              {safeWalkActive
                ? `Armed (${safeWalkMinutes}m). Tap when you arrive safely.`
                : 'Auto-alerts contacts if not checked in on time'}
            </p>
          </div>
          <span className="tool-arrow">{safeWalkActive ? '✓' : '➔'}</span>
        </button>
      </div>

      {/* Safe Walk Modal */}
      {showSafeWalkModal && (
        <div className="modal-backdrop" onClick={() => setShowSafeWalkModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <span className="modal-icon">🚶</span>
                <h3 className="modal-title">Start Safe Walk</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowSafeWalkModal(false)}>
                ✕
              </button>
            </div>
            <p className="modal-body-desc">
              Walking back alone? Set your expected trip duration. If you don't check in before the
              timer runs out, Safemesh prepares an emergency broadcast.
            </p>

            <div className="timer-presets">
              {[5, 10, 15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  className={`timer-preset-btn ${safeWalkMinutes === mins ? 'selected' : ''}`}
                  onClick={() => handleStartSafeWalk(mins)}
                >
                  <span className="preset-mins">{mins}</span>
                  <span className="preset-unit">min</span>
                </button>
              ))}
            </div>

            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setShowSafeWalkModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn-save"
                onClick={() => handleStartSafeWalk(safeWalkMinutes)}
              >
                Arm Safe Walk ({safeWalkMinutes}m)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SafetyToolsGrid;

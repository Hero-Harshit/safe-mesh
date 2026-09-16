import React from 'react';
import { PhoneCallIcon, LocationPinIcon } from './Icons';
import type { LocationData } from '../services/location';

interface Call112ModalProps {
  location: LocationData | null;
  onClose: () => void;
}

export const Call112Modal: React.FC<Call112ModalProps> = ({ location, onClose }) => {
  const displayAddress = location?.addressName || 'Fetching current address...';
  const displayCoords = location
    ? `${location.latitude.toFixed(5)}° N, ${location.longitude.toFixed(5)}° E (±${Math.round(location.accuracy)}m)`
    : 'GPS acquiring...';

  return (
    <div className="safemesh-modal-backdrop" onClick={onClose}>
      <div className="safemesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-green-tint">
              <PhoneCallIcon size={22} color="#10B981" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Call 112</h2>
              <span className="modal-sheet-subtitle">National Emergency Response</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content">
          {/* Location Dispatcher Readout Box */}
          <div className="dispatcher-box">
            <div className="dispatcher-header">
              <LocationPinIcon size={16} color="#0EA5E9" />
              <span className="dispatcher-label">READ THIS TO THE DISPATCHER:</span>
            </div>
            <p className="dispatcher-address">{displayAddress}</p>
            <p className="dispatcher-coords">{displayCoords}</p>
          </div>

          {/* Primary Call Button */}
          <a href="tel:112" className="btn-call-112-hero">
            <PhoneCallIcon size={22} color="#FFFFFF" />
            <div className="hero-call-text">
              <span className="hero-call-main">CALL 112 (POLICE / EMS)</span>
              <span className="hero-call-sub">Toll-free 24/7 Emergency Dispatch</span>
            </div>
          </a>

          {/* Dedicated Other Helplines */}
          <div className="other-helplines-card">
            <span className="other-helpline-title">DIRECT HELPLINE CHANNELS</span>
            <div className="helpline-options-grid">
              <a href="tel:1091" className="helpline-option-btn">
                <span className="opt-number">1091</span>
                <span className="opt-name">Women Helpline</span>
              </a>
              <a href="tel:108" className="helpline-option-btn">
                <span className="opt-number">108</span>
                <span className="opt-name">Ambulance</span>
              </a>
              <a href="tel:101" className="helpline-option-btn">
                <span className="opt-number">101</span>
                <span className="opt-name">Fire & Rescue</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Call112Modal;

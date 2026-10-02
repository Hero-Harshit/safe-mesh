import React, { useState, useEffect } from 'react';
import { LockIcon } from './Icons';

interface PinSetupModalProps {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ onClose, onShowToast }) => {
  const [realPin, setRealPin] = useState('');
  const [duressPin, setDuressPin] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('safetymesh_pins');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.realPin) setRealPin(parsed.realPin);
        if (parsed.duressPin) setDuressPin(parsed.duressPin);
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    if (realPin.length !== 4 || duressPin.length !== 4) {
      onShowToast('Both PINs must be exactly 4 digits');
      return;
    }
    if (realPin === duressPin) {
      onShowToast('Real PIN and Duress PIN must be different');
      return;
    }

    localStorage.setItem('safetymesh_pins', JSON.stringify({ realPin, duressPin }));
    onShowToast('Security PINs saved successfully');
    onClose();
  };

  return (
    <div 
      className="safetymesh-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }} 
      style={{ zIndex: 1000 }}
    >
      <div 
        className="safetymesh-modal-sheet" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          padding: '12px 20px 18px',
          maxHeight: '95vh',
          overflowY: 'visible' 
        }}
      >
        <div className="modal-pill-indicator" style={{ marginBottom: '10px' }}></div>

        <div className="modal-sheet-header" style={{ marginBottom: '12px' }}>
          <div className="modal-title-group" style={{ gap: '10px' }}>
            <div className="modal-icon-bubble bg-amber-tint" style={{ width: '38px', height: '38px', flexShrink: 0 }}>
              <LockIcon size={20} color="#F59E0B" />
            </div>
            <div>
              <h2 className="modal-sheet-title" style={{ fontSize: '1.2rem', margin: 0 }}>Security PINs</h2>
              <span className="modal-sheet-subtitle" style={{ fontSize: '0.78rem' }}>Safe Timer Verification</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content" style={{ padding: 0 }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                Actual PIN (4 Digits)
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Normal safe stop</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={realPin}
              onChange={(e) => setRealPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '10px', 
                background: 'rgba(0, 0, 0, 0.05)', border: '1.5px solid var(--border-color)',
                color: 'var(--text-primary)', fontSize: '1.2rem', letterSpacing: '0.5rem', textAlign: 'center',
                fontWeight: 700, outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                Duress PIN (4 Digits)
              </label>
              <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>Silent SOS</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={duressPin}
              onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '10px', 
                background: 'rgba(0, 0, 0, 0.05)', border: '1.5px solid rgba(239, 68, 68, 0.35)',
                color: 'var(--text-primary)', fontSize: '1.2rem', letterSpacing: '0.5rem', textAlign: 'center',
                fontWeight: 700, outline: 'none'
              }}
            />
            <p style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '4px', lineHeight: 1.25 }}>
              If forced to stop timer, enter this to secretly broadcast an SOS.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <button 
              id="save-pins-btn"
              onClick={handleSave}
              style={{
                width: 'fit-content',
                padding: '10px 36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.38)',
                transition: 'all 0.15s ease'
              }}
            >
              Save PINs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinSetupModal;

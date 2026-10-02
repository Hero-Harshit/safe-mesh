import React, { useState } from 'react';
import { ToolkitIcon } from './Icons';
import { startSiren, stopSiren } from '../services/native';

interface SafetyToolkitModalProps {
  onClose: () => void;
}

export const SafetyToolkitModal: React.FC<SafetyToolkitModalProps> = ({
  onClose,
}) => {
  const [isSirenActive, setIsSirenActive] = useState(false);

  return (
    <div 
      className="safetymesh-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-blue-tint">
              <ToolkitIcon size={22} color="#3B82F6" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Safety Toolkit</h2>
              <span className="modal-sheet-subtitle">More features coming soon</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
            
            {/* Siren & Strobe List Item */}
            <div 
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'var(--surface-color)',
                borderRadius: '16px', border: '1px solid var(--border-card)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  Siren & Strobe
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Attention & deterrent alarm
                </span>
              </div>
              
              <button 
                onClick={() => {
                  if (isSirenActive) {
                    stopSiren();
                    setIsSirenActive(false);
                  } else {
                    startSiren();
                    setIsSirenActive(true);
                  }
                }}
                style={{
                  padding: '8px 24px', borderRadius: '100px',
                  background: isSirenActive ? '#FEE2E2' : '#F1F5F9',
                  color: isSirenActive ? '#EF4444' : '#3B82F6', 
                  fontWeight: '700', fontSize: '0.85rem',
                  border: isSirenActive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '80px'
                }}
              >
                {isSirenActive ? 'Stop' : 'Start'}
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-tertiary)' }}>
              <p style={{ fontSize: '0.85rem' }}>More stealth tools coming soon!</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyToolkitModal;

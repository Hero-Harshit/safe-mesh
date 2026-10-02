import React from 'react';
import { TimerIcon } from './Icons';

interface SafetyTimerModalProps {
  onClose: () => void;
}

export const SafetyTimerModal: React.FC<SafetyTimerModalProps> = ({
  onClose,
}) => {
  return (
    <div className="safetymesh-modal-backdrop" onClick={onClose}>
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-blue-tint">
              <TimerIcon size={22} color="#3B82F6" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Safety Timer</h2>
              <span className="modal-sheet-subtitle">Dead man's switch</span>
            </div>
          </div>
        </div>

        <div className="modal-sheet-content">
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)' }}>
            <p>Set a timer. If you don't check in before it expires, an SOS will be sent automatically.</p>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Feature coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyTimerModal;

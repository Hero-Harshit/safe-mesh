import React from 'react';
import { ToolkitIcon } from './Icons';

interface SafetyToolkitModalProps {
  onClose: () => void;
}

export const SafetyToolkitModal: React.FC<SafetyToolkitModalProps> = ({
  onClose,
}) => {
  return (
    <div className="safetymesh-modal-backdrop" onClick={onClose}>
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
        </div>

        <div className="modal-sheet-content">
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)' }}>
            <p>We are building an incredible set of tools to add here, like Safe Havens, AI Threat Detection, and more.</p>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Stay tuned!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyToolkitModal;

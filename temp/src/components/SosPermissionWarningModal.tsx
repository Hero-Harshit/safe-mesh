import React from 'react';
import { LocationPinIcon } from './Icons';

interface SosPermissionWarningModalProps {
  onEnableLocation: () => void;
  onContinueWithoutLocation: () => void;
  onCancel: () => void;
}

export const SosPermissionWarningModal: React.FC<SosPermissionWarningModalProps> = ({
  onEnableLocation,
  onContinueWithoutLocation,
  onCancel,
}) => {
  return (
    <div className="safemesh-modal-backdrop" onClick={onCancel} role="alertdialog">
      <div className="safemesh-modal-sheet alert-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="warning-icon-box">
          <LocationPinIcon size={28} color="#EF4444" />
        </div>

        <h2 className="warning-title">Location Access Disabled</h2>
        <p className="warning-desc">
          SafeMesh cannot share your live coordinates with emergency responders or your emergency contacts without Location permission.
        </p>

        <div className="warning-action-stack">
          <button className="btn-enable-warning" onClick={onEnableLocation}>
            Enable Location Permission
          </button>
          <button className="btn-continue-warning" onClick={onContinueWithoutLocation}>
            Continue SOS Without Location
          </button>
          <button className="btn-cancel-warning" onClick={onCancel}>
            Cancel Emergency
          </button>
        </div>
      </div>
    </div>
  );
};

export default SosPermissionWarningModal;

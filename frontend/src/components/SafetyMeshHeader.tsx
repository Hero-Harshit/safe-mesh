import React from 'react';
import { ShieldLogoIcon, UserAvatarIcon } from './Icons';
import type { PermissionStatus } from '../services/permissions';

interface SafetyMeshHeaderProps {
  onProfileClick?: () => void;
  locationPermission: PermissionStatus;
  hasLocationData: boolean;
  isLocating: boolean;
  isEmergencyActive?: boolean;
}

export const SafetyMeshHeader: React.FC<SafetyMeshHeaderProps> = ({
  onProfileClick,
  locationPermission,
  hasLocationData,
  isLocating,
  isEmergencyActive = false,
}) => {
  // Dynamically calculate status according to real system state
  let statusText = 'Setup Required';
  let pillClass = 'status-setup-required';

  if (isEmergencyActive) {
    statusText = 'SOS Active';
    pillClass = 'status-sos-active';
  } else if (locationPermission !== 'GRANTED') {
    statusText = 'Location Disabled';
    pillClass = 'status-setup-required';
  } else if (isLocating && !hasLocationData) {
    statusText = 'Locating...';
    pillClass = 'status-locating';
  } else if (hasLocationData) {
    statusText = "You're Safe";
    pillClass = 'status-safe';
  }

  return (
    <header className="safetymesh-header">
      <div className="header-brand">
        <div className="brand-logo-container">
          <ShieldLogoIcon size={30} color="#DC2626" />
        </div>
        <div className="brand-copy">
          <div className="brand-name">
            <span className="name-bold">Safety</span>
            <span className="name-accent">Mesh</span>
          </div>
          <span className="brand-tagline">Personal Safety Network</span>
        </div>
      </div>

      <div className="header-status-area">

        <button
          className="profile-avatar-btn"
          onClick={onProfileClick}
          aria-label="User Profile"
          title="Profile & Settings"
        >
          <UserAvatarIcon size={18} color="#475569" />
        </button>
      </div>
    </header>
  );
};

export default SafetyMeshHeader;

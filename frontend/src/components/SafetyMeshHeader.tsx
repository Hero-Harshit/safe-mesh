import React from 'react';
import { ShieldLogoIcon, UserAvatarIcon } from './Icons';

interface SafetyMeshHeaderProps {
  onProfileClick?: () => void;
}

export const SafetyMeshHeader: React.FC<SafetyMeshHeaderProps> = ({
  onProfileClick,
}) => {

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

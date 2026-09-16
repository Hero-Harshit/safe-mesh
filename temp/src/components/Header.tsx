import React from 'react';

interface HeaderProps {
  gpsActive?: boolean;
  sirenActive?: boolean;
  onToggleSiren?: () => void;
}

const Header: React.FC<HeaderProps> = ({ gpsActive = true, sirenActive = false, onToggleSiren }) => (
  <header className="app-header">
    <div className="brand-group">
      <div className="brand-icon-wrapper">
        <span className="brand-logo-icon">🛡️</span>
        <span className="pulse-indicator online" title="Mesh Network Online"></span>
      </div>
      <div className="brand-text">
        <div className="brand-title-row">
          <h1 className="app-title">SAFEMESH</h1>
          <span className="badge-mesh">MESH v1.0</span>
        </div>
        <p className="app-tagline">Campus & Offline Safety Network</p>
      </div>
    </div>

    <div className="header-actions">
      {onToggleSiren && (
        <button
          className={`siren-pill-btn ${sirenActive ? 'active' : ''}`}
          onClick={onToggleSiren}
          title={sirenActive ? 'Turn off siren' : 'Sound emergency siren'}
          aria-label="Toggle Siren"
        >
          <span className="siren-icon">{sirenActive ? '🔊' : '📢'}</span>
          <span className="siren-text">{sirenActive ? 'ALARM ON' : 'SIREN'}</span>
        </button>
      )}

      <div className="status-chip" title="Mesh Node Connected">
        <span className="status-dot"></span>
        <span className="status-label">{gpsActive ? 'GPS Armed' : 'Offline Mesh'}</span>
      </div>
    </div>
  </header>
);

export default Header;

import React, { useState } from 'react';
import { SettingsGearIcon, ShieldCheckIcon } from './Icons';

interface SettingsModalProps {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onShowToast }) => {
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoSms, setAutoSms] = useState(true);
  const [stealthMode, setStealthMode] = useState(false);
  const [meshRelay, setMeshRelay] = useState(true);

  const toggleSetting = (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean, label: string) => {
    setter(!current);
    onShowToast(`${label} ${!current ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <div className="safemesh-modal-backdrop" onClick={onClose}>
      <div className="safemesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-slate-tint">
              <SettingsGearIcon size={22} color="#64748B" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Settings</h2>
              <span className="modal-sheet-subtitle">Platform & Safety Preferences</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content">
          {/* User profile card */}
          <div className="settings-profile-card">
            <div className="profile-badge-circle">
              <span>AS</span>
            </div>
            <div className="profile-details">
              <div className="profile-name-row">
                <span className="profile-name">Alex Sharma</span>
                <span className="verified-badge">VERIFIED</span>
              </div>
              <span className="profile-sub">SafeMesh ID: SM-8921-IN</span>
              <span className="profile-blood">Medical Info: O+ Blood • No Allergies</span>
            </div>
          </div>

          {/* Preferences list */}
          <div className="settings-section">
            <span className="settings-section-title">EMERGENCY PREFERENCES</span>

            <div className="setting-toggle-row">
              <div className="setting-text">
                <span className="setting-label">Haptic Vibration</span>
                <span className="setting-desc">Tactile vibration during SOS hold & alerts</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={hapticEnabled}
                  onChange={() => toggleSetting(setHapticEnabled, hapticEnabled, 'Haptic feedback')}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-toggle-row">
              <div className="setting-text">
                <span className="setting-label">Automatic SMS Dispatch</span>
                <span className="setting-desc">Prepares SMS with GPS coordinates upon SOS</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoSms}
                  onChange={() => toggleSetting(setAutoSms, autoSms, 'Auto-SMS')}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-toggle-row">
              <div className="setting-text">
                <span className="setting-label">Stealth Emergency Mode</span>
                <span className="setting-desc">Dims brightness to avoid drawing aggressor attention</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={stealthMode}
                  onChange={() => toggleSetting(setStealthMode, stealthMode, 'Stealth Mode')}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-toggle-row">
              <div className="setting-text">
                <span className="setting-label">Offline Mesh Relay</span>
                <span className="setting-desc">Silently bridge distress beacons for nearby students</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={meshRelay}
                  onChange={() => toggleSetting(setMeshRelay, meshRelay, 'Offline Mesh Relay')}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {/* About safe mesh */}
          <div className="about-safemesh-card">
            <div className="about-header">
              <ShieldCheckIcon size={18} color="#10B981" />
              <span className="about-title">SafeMesh Core v1.0.0</span>
            </div>
            <p className="about-desc">
              SafeMesh is a distributed, privacy-first personal safety network engineered with zero-knowledge encryption and offline peer mesh failover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

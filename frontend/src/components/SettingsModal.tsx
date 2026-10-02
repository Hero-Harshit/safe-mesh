import React, { useState, useEffect } from 'react';
import { SettingsGearIcon, ShieldCheckIcon, UsersIcon, LockIcon } from './Icons';
import { subscribePermissions, requestSmsPermission } from '../services/permissions';
import type { SafetyMeshPermissionsState } from '../services/permissions';
import ProfileEditModal from './ProfileEditModal';
import PinSetupModal from './PinSetupModal';
import AnomalySimulationModal from './AnomalySimulationModal';
import EmergencyContactsModal from './EmergencyContactsModal';
import type { EmergencyContact } from '../services/emergency';

interface SettingsModalProps {
  onClose: () => void;
  onShowToast: (msg: string) => void;
  contacts: EmergencyContact[];
  onAddContact: (contactData: Omit<EmergencyContact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  currentMapsUrl?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  onShowToast, 
  contacts, 
  onAddContact, 
  onDeleteContact, 
  currentMapsUrl 
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSettingPins, setIsSettingPins] = useState(false);
  const [isManagingContacts, setIsManagingContacts] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: 'Unknown User',
    phone: '',
    age: '',
    bloodGroup: 'Unknown',
    medical: 'No medical info',
    contactName: '',
    contactPhone: ''
  });

  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoSms, setAutoSms] = useState(true);
  const [stealthMode, setStealthMode] = useState(false);
  const [meshRelay, setMeshRelay] = useState(true);
  const [aiAnomalyEnabled, setAiAnomalyEnabled] = useState(() => {
    return localStorage.getItem('safetymesh_ambient_guard') !== 'false';
  });

  const [permissions, setPermissions] = useState<SafetyMeshPermissionsState>({
    location: 'UNKNOWN',
    background_location: 'UNKNOWN',
    bluetooth: 'UNKNOWN',
    notifications: 'UNKNOWN',
    sms: 'UNKNOWN',
    battery: 'UNKNOWN',
    isInitialFlowCompleted: true,
  });

  useEffect(() => {
    const unsub = subscribePermissions((newPerms) => {
      setPermissions(newPerms);
    });
    const saved = localStorage.getItem('safetymesh_profile');
    if (saved) {
      try {
        setProfileData(JSON.parse(saved));
      } catch (e) { }
    }
    return () => unsub();
  }, []);

  const handleRetrySms = async () => {
    onShowToast('Requesting SMS access...');
    const result = await requestSmsPermission();
    if (result === 'GRANTED') {
      onShowToast('SMS permission granted.');
    } else {
      onShowToast('SMS permission denied.');
    }
  };

  const toggleSetting = (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean, label: string) => {
    const nextState = !current;
    setter(nextState);
    if (label === 'AI Threat Detector' || label === 'AI Threat Detector') {
      localStorage.setItem('safetymesh_ambient_guard', nextState ? 'true' : 'false');
      window.dispatchEvent(new Event('ambient_guard_changed'));
    }
    onShowToast(`${label} ${nextState ? 'Enabled' : 'Disabled'}`);
  };


  const handleOpenPins = () => {
    window.history.pushState({ safetymesh_modal: 'settings', submodal: 'pins' }, '');
    setIsSettingPins(true);
  };

  const handleClosePins = () => {
    if (window.history.state?.submodal === 'pins') {
      window.history.back();
    } else {
      setIsSettingPins(false);
    }
  };

  const handleOpenContacts = () => {
    window.history.pushState({ safetymesh_modal: 'settings', submodal: 'contacts' }, '');
    setIsManagingContacts(true);
  };

  const handleCloseContacts = () => {
    if (window.history.state?.submodal === 'contacts') {
      window.history.back();
    } else {
      setIsManagingContacts(false);
    }
  };

  const handleOpenProfile = () => {
    window.history.pushState({ safetymesh_modal: 'settings', submodal: 'profile' }, '');
    setIsEditingProfile(true);
  };

  const handleCloseProfile = () => {
    if (window.history.state?.submodal === 'profile') {
      window.history.back();
    } else {
      setIsEditingProfile(false);
    }
  };

  useEffect(() => {
    const handleSubmodalPopState = (e: PopStateEvent) => {
      if (!e.state || e.state.submodal !== 'pins') {
        setIsSettingPins(false);
      }
      if (!e.state || e.state.submodal !== 'profile') {
        setIsEditingProfile(false);
      }
      if (!e.state || e.state.submodal !== 'contacts') {
        setIsManagingContacts(false);
      }
    };
    window.addEventListener('popstate', handleSubmodalPopState);
    return () => window.removeEventListener('popstate', handleSubmodalPopState);
  }, []);

  return (
    <>
      {isEditingProfile && (
        <ProfileEditModal
          initialData={profileData}
          onClose={handleCloseProfile}
          onSave={(newData) => {
            setProfileData(newData);
            localStorage.setItem('safetymesh_profile', JSON.stringify(newData));
            handleCloseProfile();
            onShowToast('Profile updated');
          }}
        />
      )}
      {isSettingPins && (
        <PinSetupModal
          onShowToast={onShowToast}
          onClose={handleClosePins}
        />
      )}
      {showSimulator && (
        <AnomalySimulationModal
          onClose={() => setShowSimulator(false)}
          onShowToast={onShowToast}
        />
      )}
      {isManagingContacts && (
        <EmergencyContactsModal
          contacts={contacts}
          onAddContact={onAddContact}
          onDeleteContact={onDeleteContact}
          currentMapsUrl={currentMapsUrl}
          onClose={handleCloseContacts}
          onShowToast={onShowToast}
        />
      )}
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
            <div className="settings-profile-card" onClick={handleOpenProfile} style={{ cursor: 'pointer' }}>

              <div className="profile-details">
                <div className="profile-name-row">
                  <span className="profile-name">{profileData.fullName}</span>
                  <span className="verified-badge">VERIFIED</span>
                </div>
                <span className="profile-sub">{profileData.phone ? `Phone: ${profileData.phone}` : 'SafetyMesh ID: SM-8921-IN'}</span>
                <span className="profile-blood">Medical: {profileData.bloodGroup} • {profileData.medical || 'None'}</span>
              </div>
            </div>

            {/* Preferences list */}
            <div className="settings-section">
              <span className="settings-section-title">EMERGENCY PREFERENCES</span>

              <div
                className="setting-toggle-row"
                onClick={handleOpenContacts}
                style={{ cursor: 'pointer', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}
              >
                <div className="setting-text">
                  <span className="setting-label" style={{ color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UsersIcon size={18} color="#8B5CF6" /> Manage Emergency Contacts
                  </span>
                  <span className="setting-desc">Set your primary distress contacts</span>
                </div>
              </div>

              <div
                className="setting-toggle-row"
                onClick={handleOpenPins}
                style={{ cursor: 'pointer', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px' }}
              >
                <div className="setting-text">
                  <span className="setting-label" style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LockIcon size={18} color="#F59E0B" /> Manage Security PINs
                  </span>
                  <span className="setting-desc">Set Actual & Duress PINs for Safe Timer</span>
                </div>
              </div>

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

              <div className="setting-toggle-row">
                <div className="setting-text">
                  <span className="setting-label">AI Threat Detector</span>
                  <span className="setting-desc">Continuous background analysis of acoustics and voice spikes</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={aiAnomalyEnabled}
                    onChange={() => toggleSetting(setAiAnomalyEnabled, aiAnomalyEnabled, 'AI Threat Detector')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {aiAnomalyEnabled && (
                <div className="setting-toggle-row" style={{ marginTop: '-8px', paddingTop: 0, borderTop: 'none' }}>
                  <div className="setting-text">
                  </div>
                  <button
                    onClick={() => setShowSimulator(true)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.22)',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      color: '#2563EB',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Simulate hardware & AI anomalies"
                  >
                    ⚡ Simulate AI
                  </button>
                </div>
              )}
            </div>

            {/* System Permissions list */}
            <div className="settings-section">
              <span className="settings-section-title">SYSTEM PERMISSIONS</span>

              <div className="setting-toggle-row">
                <div className="setting-text">
                  <span className="setting-label">SMS Access</span>
                  <span className="setting-desc">Required to notify emergency contacts during SOS</span>
                </div>
                <div>
                  {permissions.sms === 'GRANTED' ? (
                    <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '0.9rem' }}>✓ Granted</span>
                  ) : (
                    <button
                      onClick={handleRetrySms}
                      style={{ backgroundColor: 'transparent', color: '#F59E0B', border: '1px solid #F59E0B', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ⚠ Not granted (Retry)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* About safety mesh */}
            <div className="about-safetymesh-card">
              <div className="about-header">
                <ShieldCheckIcon size={18} color="#10B981" />
                <span className="about-title">SafetyMesh Core v1.0.0</span>
              </div>
              <p className="about-desc">
                SafetyMesh is a distributed, privacy-first personal safety network engineered with zero-knowledge encryption and offline peer mesh failover.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;

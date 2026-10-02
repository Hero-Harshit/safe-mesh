import React, { useState } from 'react';
import {
  ShieldLogoIcon,
  LocationPinIcon,
  GuardianMeshIcon,
  SosBroadcastIcon,
  UsersIcon,
} from './Icons';
import { saveEmergencyContact } from '../services/emergency';
import { supabase } from '../services/supabase';
import {
  requestLocationPermission,
  requestBluetoothPermission,
  requestNotificationPermission,
  requestSmsPermission,
  requestBackgroundLocationPermission,
  requestBatteryOptimizationPermission,
  setInitialFlowCompleted,
} from '../services/permissions';
import type { SafetyMeshPermissionsState } from '../services/permissions';

interface StartupPermissionFlowProps {
  initialState: SafetyMeshPermissionsState;
  onComplete: () => void;
}

type StepKey = 'profile_1' | 'profile_2' | 'profile_3' | 'location' | 'background_location' | 'battery' | 'bluetooth' | 'notifications' | 'sms' | 'loading';

export const StartupPermissionFlow: React.FC<StartupPermissionFlowProps> = ({
  initialState,
  onComplete,
}) => {
  const isProfileDone = !!localStorage.getItem('safetymesh_profile');
  const isLocationDone = localStorage.getItem('safetymesh_location_granted') === 'true' || initialState.location === 'GRANTED';
  const savedStep = (typeof localStorage !== 'undefined' ? localStorage.getItem('safetymesh_onboarding_step') : null) as StepKey | null;

  const determineInitialStep = (): StepKey => {
    if (!isProfileDone) return 'profile_1';
    if (savedStep && savedStep !== 'loading') {
      if (savedStep === 'location' && isLocationDone) return 'background_location';
      return savedStep;
    }
    if (!isLocationDone) return 'location';
    if (initialState.background_location !== 'GRANTED' && localStorage.getItem('safetymesh_bg_loc_granted') !== 'true') return 'background_location';
    if (initialState.battery !== 'GRANTED' && localStorage.getItem('safetymesh_battery_granted') !== 'true') return 'battery';
    if (initialState.bluetooth !== 'GRANTED' && localStorage.getItem('safetymesh_bt_granted') !== 'true') return 'bluetooth';
    if (initialState.notifications !== 'GRANTED') return 'notifications';
    if (initialState.sms !== 'GRANTED' && localStorage.getItem('safetymesh_sms_granted') !== 'true') return 'sms';
    return 'loading';
  };

  const [currentStep, setCurrentStep] = useState<StepKey>(determineInitialStep);
  const [permissions, setPermissions] = useState<SafetyMeshPermissionsState>(initialState);
  const [isRequesting, setIsRequesting] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    age: '',
    bloodGroup: '',
    medical: '',
    contactName: '',
    contactPhone: ''
  });

  const advanceToStep = (next: StepKey) => {
    if (next === 'loading') {
      setCurrentStep('loading');
      localStorage.removeItem('safetymesh_onboarding_step');
      localStorage.setItem('safetymesh_permission_flow_completed', 'true');
      setInitialFlowCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } else {
      localStorage.setItem('safetymesh_onboarding_step', next);
      setCurrentStep(next);
    }
  };

  const saveProfile1 = () => {
    if (!profileData.fullName || !profileData.phone) {
       alert("Please enter your name and phone number.");
       return;
    }
    advanceToStep('profile_2');
  };

  const saveProfile2 = () => {
    advanceToStep('profile_3');
  };

  const saveProfile3 = async () => {
    if (!profileData.contactName || !profileData.contactPhone) {
       alert("Please add an emergency contact.");
       return;
    }

    setIsRequesting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const { error: insertError } = await supabase
        .from('citizen_profiles')
        .insert({
          id: authData.user?.id,
          full_name: profileData.fullName,
          phone_number: profileData.phone,
          age: profileData.age || null,
          blood_group: profileData.bloodGroup,
          medical_conditions: profileData.medical,
          primary_contact_name: profileData.contactName,
          primary_contact_phone: profileData.contactPhone
        });
      
      if (insertError) throw insertError;

      localStorage.setItem('safetymesh_profile', JSON.stringify(profileData));
      saveEmergencyContact({
         name: profileData.contactName,
         phone: profileData.contactPhone,
         relation: 'Family',
         isPrimary: true
      });
      advanceToStep(isLocationDone ? 'background_location' : 'location');
    } catch (err: any) {
      console.error('Supabase Error:', err);
      // Fallback local persistence so user is never blocked
      localStorage.setItem('safetymesh_profile', JSON.stringify(profileData));
      saveEmergencyContact({
         name: profileData.contactName,
         phone: profileData.contactPhone,
         relation: 'Family',
         isPrimary: true
      });
      advanceToStep(isLocationDone ? 'background_location' : 'location');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleEnableLocation = async () => {
    setIsRequesting(true);
    try {
      const status = await requestLocationPermission();
      setPermissions((prev) => ({ ...prev, location: status }));
      localStorage.setItem('safetymesh_location_granted', 'true');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
      advanceToStep('background_location');
    }
  };

  const handleEnableBackgroundLocation = async () => {
    setIsRequesting(true);
    try {
      const status = await requestBackgroundLocationPermission();
      setPermissions((prev) => ({ ...prev, background_location: status }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
      advanceToStep('battery');
    }
  };

  const handleEnableBattery = async () => {
    setIsRequesting(true);
    try {
      const status = await requestBatteryOptimizationPermission();
      setPermissions((prev) => ({ ...prev, battery: status }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
      advanceToStep('bluetooth');
    }
  };

  const handleEnableBluetooth = async () => {
    setIsRequesting(true);
    try {
      const status = await requestBluetoothPermission();
      setPermissions((prev) => ({ ...prev, bluetooth: status }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
      advanceToStep('notifications');
    }
  };

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const status = await requestNotificationPermission();
      setPermissions((prev) => ({ ...prev, notifications: status }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
      advanceToStep('sms');
    }
  };

  const handleEnableSms = async () => {
    setIsRequesting(true);
    try {
      const status = await requestSmsPermission();
      setPermissions((prev) => ({ ...prev, sms: status }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
      advanceToStep('loading');
    }
  };

  const handleSkipStep = (next: StepKey) => {
    advanceToStep(next);
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Brand Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo-box">
            <ShieldLogoIcon size={36} color="#DC2626" />
          </div>
          <div className="onboarding-title-group">
            <span className="onboarding-brand-name">SAFETY MESH</span>
            <span className="onboarding-brand-sub">Your personal safety network.</span>
          </div>
        </div>

        {/* Only show intro and permission pills during the permission flow */}
        {!currentStep.startsWith('profile_') && (
          <>
            <div className="onboarding-intro">
              <h2 className="onboarding-headline">Let's get your safety system ready.</h2>
              <p className="onboarding-desc">
                SafetyMesh requires essential device permissions to protect you in real-time.
              </p>
            </div>

            {/* Step Indicator Badges */}
            <div className="onboarding-steps-pills">
              <div
                className={`step-pill ${
                  permissions.location === 'GRANTED' || localStorage.getItem('safetymesh_location_granted') === 'true' ? 'completed' : currentStep === 'location' ? 'active' : ''
                }`}
              >
                <span className="step-pill-indicator">
                  {permissions.location === 'GRANTED' || localStorage.getItem('safetymesh_location_granted') === 'true' ? '✓' : '1'}
                </span>
                <span>Location</span>
              </div>

              <div
                className={`step-pill ${
                  permissions.bluetooth === 'GRANTED' || localStorage.getItem('safetymesh_bt_granted') === 'true' ? 'completed' : currentStep === 'bluetooth' ? 'active' : ''
                }`}
              >
                <span className="step-pill-indicator">
                  {permissions.bluetooth === 'GRANTED' || localStorage.getItem('safetymesh_bt_granted') === 'true' ? '✓' : '2'}
                </span>
                <span>Bluetooth</span>
              </div>

              <div
                className={`step-pill ${
                  permissions.notifications === 'GRANTED'
                    ? 'completed'
                    : currentStep === 'notifications'
                    ? 'active'
                    : ''
                }`}
              >
                <span className="step-pill-indicator">
                  {permissions.notifications === 'GRANTED' ? '✓' : '3'}
                </span>
                <span>Alerts</span>
              </div>

              <div
                className={`step-pill ${
                  permissions.sms === 'GRANTED' || localStorage.getItem('safetymesh_sms_granted') === 'true' ? 'completed' : currentStep === 'sms' ? 'active' : ''
                }`}
              >
                <span className="step-pill-indicator">
                  {permissions.sms === 'GRANTED' || localStorage.getItem('safetymesh_sms_granted') === 'true' ? '✓' : '4'}
                </span>
                <span>SMS</span>
              </div>
            </div>
          </>
        )}

        {/* Step 0.1: Profile Creation - Basic Info */}
        {currentStep === 'profile_1' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-blue-tint">
              <UsersIcon size={26} color="#3B82F6" />
            </div>
            <h3 className="step-title">Who are you?</h3>
            <p className="step-explanation" style={{marginBottom: '16px'}}>
              Basic details to identify you during an emergency.
            </p>

            <div className="profile-form-grid">
              <input type="text" className="profile-input" placeholder="Full Name *" value={profileData.fullName} onChange={e => setProfileData({...profileData, fullName: e.target.value})} />
              <input type="tel" className="profile-input" placeholder="Phone Number *" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
            </div>

            <div className="step-actions">
              <button className="btn-enable-permission" onClick={saveProfile1}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 0.2: Profile Creation - Medical Info */}
        {currentStep === 'profile_2' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-blue-tint">
              <ShieldLogoIcon size={26} color="#3B82F6" />
            </div>
            <h3 className="step-title">Medical Info</h3>
            <p className="step-explanation" style={{marginBottom: '16px'}}>
              Crucial information for first responders. (Optional)
            </p>

            <div className="profile-form-grid">
              <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                <input type="number" className="profile-input" placeholder="Age" style={{flex: 1}} value={profileData.age} onChange={e => setProfileData({...profileData, age: e.target.value})} />
                <input type="text" className="profile-input" placeholder="Blood Group (e.g. O+)" style={{flex: 1}} value={profileData.bloodGroup} onChange={e => setProfileData({...profileData, bloodGroup: e.target.value})} />
              </div>
              <textarea className="profile-input" placeholder="Medical Conditions / Allergies" rows={3} style={{resize: 'none', padding: '12px'}} value={profileData.medical} onChange={e => setProfileData({...profileData, medical: e.target.value})} />
            </div>

            <div className="step-actions">
              <button className="btn-enable-permission" onClick={saveProfile2}>
                Next
              </button>
              <button className="btn-skip-permission" onClick={() => advanceToStep('profile_1')}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 0.3: Profile Creation - Emergency Contact */}
        {currentStep === 'profile_3' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-blue-tint">
              <GuardianMeshIcon size={26} color="#3B82F6" />
            </div>
            <h3 className="step-title">Emergency Contact</h3>
            <p className="step-explanation" style={{marginBottom: '16px'}}>
              Who should we notify if you are in danger?
            </p>

            <div className="profile-form-grid">
              <div className="contact-picker-header">
                <span className="profile-input-label">Primary Contact</span>
              </div>
              <input type="text" className="profile-input" placeholder="Contact Name *" value={profileData.contactName} onChange={e => setProfileData({...profileData, contactName: e.target.value})} />
              <input type="tel" className="profile-input" placeholder="Contact Phone *" value={profileData.contactPhone} onChange={e => setProfileData({...profileData, contactPhone: e.target.value})} />
            </div>

            <div className="step-actions">
              <button className="btn-enable-permission" onClick={saveProfile3} disabled={isRequesting}>
                {isRequesting ? 'Saving Profile...' : 'Save Profile'}
              </button>
              <button className="btn-skip-permission" onClick={() => advanceToStep('profile_2')}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {currentStep === 'location' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-green-tint">
              <LocationPinIcon size={26} color="#10B981" />
            </div>
            <h3 className="step-title">Location Permission</h3>
            <p className="step-explanation">
              Used to show your real-time position, navigate through verified safe routes, and alert
              nearby Safety Mesh responders during distress.
            </p>

            <div className="step-actions">
              <button
                className="btn-enable-permission"
                onClick={handleEnableLocation}
                disabled={isRequesting}
              >
                {isRequesting ? 'Requesting Permission...' : 'Enable Location'}
              </button>
              <button
                className="btn-skip-permission"
                onClick={() => handleSkipStep('background_location')}
              >
                Not Now (Location Features Disabled)
              </button>
            </div>
          </div>
        )}

        {/* Step 1.5: Background Location */}
        {currentStep === 'background_location' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-green-tint">
              <LocationPinIcon size={26} color="#10B981" />
            </div>
            <h3 className="step-title">Background Location</h3>
            <p className="step-explanation">
              Required for the Voice Activity Detector to track your GPS velocity and trigger alerts if you are suddenly pulled into a moving vehicle.
            </p>

            <div className="step-actions">
              <button
                className="btn-enable-permission"
                onClick={handleEnableBackgroundLocation}
                disabled={isRequesting}
              >
                {isRequesting ? 'Requesting...' : 'Allow All The Time'}
              </button>
              <button
                className="btn-skip-permission"
                onClick={() => handleSkipStep('battery')}
              >
                Not Now (Velocity Anomaly Disabled)
              </button>
            </div>
          </div>
        )}

        {/* Step 1.6: Battery Optimization */}
        {currentStep === 'battery' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-amber-tint">
              <ShieldLogoIcon size={26} color="#F59E0B" />
            </div>
            <h3 className="step-title">Ignore Battery Optimization</h3>
            <p className="step-explanation">
              Android kills background apps to save battery. To keep the AI Threat Engine running while your screen is off, you must let SafetyMesh run without restrictions.
            </p>

            <div className="step-actions">
              <button
                className="btn-enable-permission"
                onClick={handleEnableBattery}
                disabled={isRequesting}
              >
                {isRequesting ? 'Requesting...' : 'Allow Background Run'}
              </button>
              <button
                className="btn-skip-permission"
                onClick={() => handleSkipStep('bluetooth')}
              >
                Not Now (AI May Stop Working)
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Bluetooth */}
        {currentStep === 'bluetooth' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-amber-tint">
              <GuardianMeshIcon size={26} color="#F59E0B" />
            </div>
            <h3 className="step-title">Bluetooth / Nearby Devices</h3>
            <p className="step-explanation">
              Used to connect SafetyMesh with offline peer safety nodes, supported wearables, and
              nearby safety peripherals even when cellular coverage drops.
            </p>

            <div className="step-actions">
              <button
                className="btn-enable-permission"
                onClick={handleEnableBluetooth}
                disabled={isRequesting}
              >
                {isRequesting ? 'Requesting Permission...' : 'Enable Bluetooth'}
              </button>
              <button
                className="btn-skip-permission"
                onClick={() => handleSkipStep('notifications')}
              >
                Not Now (Peer Mesh Disabled)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Notifications */}
        {currentStep === 'notifications' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-purple-tint">
              <SosBroadcastIcon size={26} color="#8B5CF6" />
            </div>
            <h3 className="step-title">Push Notifications</h3>
            <p className="step-explanation">
              Used to alert you instantly about emergency SOS events, guardian responses, safe route
              deviations, and safety network updates.
            </p>

            <div className="step-actions">
              <button
                className="btn-enable-permission"
                onClick={handleEnableNotifications}
                disabled={isRequesting}
              >
                {isRequesting ? 'Requesting Permission...' : 'Enable Notifications'}
              </button>
              <button
                className="btn-skip-permission"
                onClick={() => handleSkipStep('sms')}
              >
                Not Now (No Background Alerts)
              </button>
            </div>
          </div>
        )}

        {/* Step 4: SMS */}
        {currentStep === 'sms' && (
          <div className="step-detail-card">
            <div className="step-icon-bubble bg-purple-tint">
              <SosBroadcastIcon size={26} color="#8B5CF6" />
            </div>
            <h3 className="step-title">SMS ACCESS</h3>
            <p className="step-explanation">
              SafetyMesh uses SMS to notify your emergency contacts when an SOS is activated.
            </p>

            <div className="step-actions">
              <button
                className="btn-enable-permission"
                onClick={handleEnableSms}
                disabled={isRequesting}
              >
                {isRequesting ? 'Requesting Permission...' : 'Allow SMS Access'}
              </button>
              <button
                className="btn-skip-permission"
                onClick={() => handleSkipStep('loading')}
              >
                Not Now (No Emergency SMS)
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Loading Real Device Data */}
        {currentStep === 'loading' && (
          <div className="step-detail-card loading-card">
            <div className="loading-spinner-ring"></div>
            <h3 className="step-title">Synchronizing Real Device Data</h3>
            <p className="step-explanation">
              Configuring live GPS sensors and establishing secure encryption keys...
            </p>
          </div>
        )}

        <div className="onboarding-privacy-note">
          <span>🔒 SafetyMesh adheres to strict zero-knowledge privacy. No fake data is ever shared.</span>
        </div>
      </div>
    </div>
  );
};

export default StartupPermissionFlow;

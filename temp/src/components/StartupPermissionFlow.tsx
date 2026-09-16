import React, { useState } from 'react';
import {
  ShieldLogoIcon,
  LocationPinIcon,
  GuardianMeshIcon,
  SosBroadcastIcon,
} from './Icons';
import {
  requestLocationPermission,
  requestBluetoothPermission,
  requestNotificationPermission,
  setInitialFlowCompleted,
} from '../services/permissions';
import type { SafeMeshPermissionsState } from '../services/permissions';

interface StartupPermissionFlowProps {
  initialState: SafeMeshPermissionsState;
  onComplete: () => void;
}

type StepKey = 'location' | 'bluetooth' | 'notifications' | 'loading';

export const StartupPermissionFlow: React.FC<StartupPermissionFlowProps> = ({
  initialState,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<StepKey>(
    initialState.location === 'GRANTED'
      ? initialState.bluetooth === 'GRANTED'
        ? initialState.notifications === 'GRANTED'
          ? 'loading'
          : 'notifications'
        : 'bluetooth'
      : 'location'
  );

  const [permissions, setPermissions] = useState<SafeMeshPermissionsState>(initialState);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableLocation = async () => {
    setIsRequesting(true);
    const status = await requestLocationPermission();
    setPermissions((prev) => ({ ...prev, location: status }));
    setIsRequesting(false);
    setCurrentStep('bluetooth');
  };

  const handleEnableBluetooth = async () => {
    setIsRequesting(true);
    const status = await requestBluetoothPermission();
    setPermissions((prev) => ({ ...prev, bluetooth: status }));
    setIsRequesting(false);
    setCurrentStep('notifications');
  };

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    const status = await requestNotificationPermission();
    setPermissions((prev) => ({ ...prev, notifications: status }));
    setIsRequesting(false);
    setCurrentStep('loading');

    // Smooth transition into dashboard
    setTimeout(() => {
      setInitialFlowCompleted(true);
      onComplete();
    }, 1200);
  };

  const handleSkipStep = (next: StepKey) => {
    if (next === 'loading') {
      setCurrentStep('loading');
      setTimeout(() => {
        setInitialFlowCompleted(true);
        onComplete();
      }, 1000);
    } else {
      setCurrentStep(next);
    }
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
            <span className="onboarding-brand-name">SAFE MESH</span>
            <span className="onboarding-brand-sub">Your personal safety network.</span>
          </div>
        </div>

        <div className="onboarding-intro">
          <h2 className="onboarding-headline">Let's get your safety system ready.</h2>
          <p className="onboarding-desc">
            SafeMesh requires essential device permissions to protect you in real-time.
          </p>
        </div>

        {/* Step Indicator Badges */}
        <div className="onboarding-steps-pills">
          <div
            className={`step-pill ${
              permissions.location === 'GRANTED' ? 'completed' : currentStep === 'location' ? 'active' : ''
            }`}
          >
            <span className="step-pill-indicator">
              {permissions.location === 'GRANTED' ? '✓' : '1'}
            </span>
            <span>Location</span>
          </div>

          <div
            className={`step-pill ${
              permissions.bluetooth === 'GRANTED' ? 'completed' : currentStep === 'bluetooth' ? 'active' : ''
            }`}
          >
            <span className="step-pill-indicator">
              {permissions.bluetooth === 'GRANTED' ? '✓' : '2'}
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
        </div>

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
                onClick={() => handleSkipStep('bluetooth')}
              >
                Not Now (Location Features Disabled)
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
              Used to connect SafeMesh with offline peer safety nodes, supported wearables, and
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
                onClick={() => handleSkipStep('loading')}
              >
                Not Now (No Background Alerts)
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Loading Real Device Data */}
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
          <span>🔒 SafeMesh adheres to strict zero-knowledge privacy. No fake data is ever shared.</span>
        </div>
      </div>
    </div>
  );
};

export default StartupPermissionFlow;

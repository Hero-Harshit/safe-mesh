import React from 'react';
import { LocationPinIcon, UsersIcon, ShieldCheckIcon } from './Icons';
import type { LocationData } from '../services/location';
import type { PermissionStatus } from '../services/permissions';

interface BottomSafetyStatusProps {
  location: LocationData | null;
  locationPermission: PermissionStatus;
  bluetoothPermission: PermissionStatus;
  notificationPermission: PermissionStatus;
  realGuardianCount?: number | null; // null if no real backend response or no location
}

export const BottomSafetyStatus: React.FC<BottomSafetyStatusProps> = ({
  location,
  locationPermission,
  bluetoothPermission,
  notificationPermission,
  realGuardianCount = null,
}) => {
  // 1. Current Location column
  const isLocationLive = locationPermission === 'GRANTED' && location?.status === 'LIVE';
  const displayLocation = isLocationLive ? location.addressName : '—';
  const locationSubtext =
    locationPermission !== 'GRANTED'
      ? 'Required'
      : isLocationLive
      ? 'Live'
      : 'Locating…';

  // 2. Safety Network column (Never display fake 12 Guardians!)
  const displayNetwork =
    realGuardianCount !== null
      ? `${realGuardianCount} Active`
      : '—';

  const networkSubtext =
    !isLocationLive
      ? 'Waiting'
      : realGuardianCount !== null
      ? 'In mesh'
      : 'BLE Ready';

  // 3. App Status column
  let appStatusTitle = 'Setup';
  let isAllHealthy = false;

  if (locationPermission !== 'GRANTED') {
    appStatusTitle = 'No GPS';
  } else if (bluetoothPermission !== 'GRANTED') {
    appStatusTitle = 'Standby';
  } else if (notificationPermission !== 'GRANTED') {
    appStatusTitle = 'Alerts Off';
  } else if (isLocationLive) {
    appStatusTitle = 'All Active';
    isAllHealthy = true;
  } else {
    appStatusTitle = 'Ready';
  }

  return (
    <div className="bottom-safety-container">
      <div className="bottom-safety-card">
        {/* Item 1: Location */}
        <div className="status-metric-col bordered-col">
          <div className="status-metric-icon bg-slate-subtle">
            <LocationPinIcon size={14} color={isLocationLive ? '#0EA5E9' : '#94A3B8'} />
          </div>
          <div className="status-metric-content">
            <span className="metric-label">Location</span>
            <div className="metric-live-row">
              {isLocationLive && <span className="metric-live-dot"></span>}
              <span className={`metric-live-tag ${!isLocationLive ? 'inactive' : ''}`}>
                {locationSubtext}
              </span>
            </div>
            <span className="metric-value" title={displayLocation}>
              {displayLocation}
            </span>
          </div>
        </div>

        {/* Item 2: Safety Network */}
        <div className="status-metric-col bordered-col">
          <div className="status-metric-icon bg-purple-subtle">
            <UsersIcon size={14} color={realGuardianCount !== null ? '#8B5CF6' : '#94A3B8'} />
          </div>
          <div className="status-metric-content">
            <span className="metric-label">Network</span>
            <span className="metric-headline">{displayNetwork}</span>
            <span className="metric-sub">{networkSubtext}</span>
          </div>
        </div>

        {/* Item 3: App Status */}
        <div className="status-metric-col">
          <div className="status-metric-icon bg-green-subtle">
            <ShieldCheckIcon size={14} color={isAllHealthy ? '#10B981' : '#F59E0B'} />
          </div>
          <div className="status-metric-content">
            <span className="metric-label">Status</span>
            <span className={`metric-status-active ${!isAllHealthy ? 'pending' : ''}`}>
              {appStatusTitle}
            </span>
            <span className="metric-sub">{isAllHealthy ? 'Encrypted' : 'Shield Ready'}</span>
          </div>
        </div>
      </div>

      <div className="safemesh-footer-tagline">
        <span className="footer-line"></span>
        <span className="footer-text">A SAFER TOMORROW TOGETHER</span>
        <span className="footer-line"></span>
      </div>
    </div>
  );
};

export default BottomSafetyStatus;

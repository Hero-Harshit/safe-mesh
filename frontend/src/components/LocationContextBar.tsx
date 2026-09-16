import React, { useState, useEffect } from 'react';
import { LocationPinIcon, ChevronRightIcon } from './Icons';
import type { LocationData } from '../services/location';
import type { PermissionStatus } from '../services/permissions';

interface LocationContextBarProps {
  location: LocationData | null;
  permissionStatus: PermissionStatus;
  isLocating: boolean;
  onRetry: () => void;
  onRequestPermission: () => void;
  onLocationClick?: () => void;
}

export const LocationContextBar: React.FC<LocationContextBarProps> = ({
  location,
  permissionStatus,
  isLocating,
  onRetry,
  onRequestPermission,
  onLocationClick,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState({ date: '', time: '' });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentDateTime({ date: dateStr, time: timeStr });
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Determine what to render based on real device state
  let statusTitle = 'Location Active';
  let addressDisplay = '—';
  let statusColor = '#10B981';
  let isInteractive = false;
  let actionButton: React.ReactNode = null;

  if (permissionStatus === 'DENIED' || permissionStatus === 'BLOCKED') {
    statusTitle = 'Location Disabled';
    addressDisplay = 'Location access required';
    statusColor = '#EF4444';
    actionButton = (
      <button
        className="btn-location-inline-action"
        onClick={(e) => {
          e.stopPropagation();
          onRequestPermission();
        }}
      >
        Enable
      </button>
    );
  } else if (isLocating && !location) {
    statusTitle = 'Locating you…';
    addressDisplay = 'Acquiring GPS fix...';
    statusColor = '#0EA5E9';
  } else if (location?.status === 'UNAVAILABLE') {
    statusTitle = 'Location Unavailable';
    addressDisplay = 'Unable to determine location';
    statusColor = '#F59E0B';
    actionButton = (
      <button
        className="btn-location-inline-action"
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
      >
        Retry
      </button>
    );
  } else if (location && location.status === 'LIVE') {
    statusTitle = 'Location Active';
    addressDisplay = location.addressName;
    statusColor = '#10B981';
    isInteractive = true;
  }

  return (
    <div className="location-context-row">
      <div
        className={`location-card-action ${isInteractive ? 'interactive' : ''}`}
        onClick={isInteractive ? onLocationClick : undefined}
        role={isInteractive ? 'button' : 'region'}
        aria-label="Location Status"
      >
        <div
          className="location-icon-bubble"
          style={{ background: `${statusColor}18` }}
        >
          <LocationPinIcon size={18} color={statusColor} />
        </div>
        <div className="location-card-text">
          <span className="location-card-status" style={{ color: statusColor }}>
            {statusTitle}
          </span>
          <span className="location-card-name" title={addressDisplay}>
            {addressDisplay}
          </span>
        </div>

        {actionButton ? (
          actionButton
        ) : isInteractive ? (
          <div className="location-card-arrow">
            <ChevronRightIcon size={16} color="#94A3B8" />
          </div>
        ) : null}
      </div>

      <div className="datetime-card" aria-label="Current Date and Time">
        <span className="datetime-date">{currentDateTime.date || 'Today'}</span>
        <span className="datetime-time">{currentDateTime.time || '--:--'}</span>
      </div>
    </div>
  );
};

export default LocationContextBar;

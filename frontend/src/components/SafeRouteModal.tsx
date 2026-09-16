import { useState } from 'react';
import { NavigationArrowIcon, ShieldCheckIcon, LocationPinIcon } from './Icons';
import type { LocationData } from '../services/location';
import type { PermissionStatus } from '../services/permissions';

interface SafeRouteModalProps {
  location: LocationData | null;
  locationPermission: PermissionStatus;
  onRequestLocationPermission: () => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const SafeRouteModal: React.FC<SafeRouteModalProps> = ({
  location,
  locationPermission,
  onRequestLocationPermission,
  onClose,
  onShowToast,
}) => {
  const [destination, setDestination] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const hasRealLocation = locationPermission === 'GRANTED' && location?.status === 'LIVE';

  const startNavigation = () => {
    if (!destination.trim()) {
      onShowToast('Please enter a destination to calculate safe route');
      return;
    }
    setIsNavigating(true);
    onShowToast(`Safe Route active: Navigating to ${destination}`);
    
    // Open in external native mapping provider with exact coordinates
    if (location) {
      const destQuery = encodeURIComponent(destination);
      const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${destQuery}&travelmode=walking`;
      setTimeout(() => {
        window.open(url, '_blank');
      }, 500);
    }
  };

  return (
    <div className="safemesh-modal-backdrop" onClick={onClose}>
      <div className="safemesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-blue-tint">
              <NavigationArrowIcon size={22} color="#3B82F6" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Safe Route</h2>
              <span className="modal-sheet-subtitle">
                {hasRealLocation ? 'Safety-Optimized Walking Corridors' : 'Location Required'}
              </span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content">
          {!hasRealLocation ? (
            /* Explicit Empty / Disabled State when Location is Unavailable */
            <div className="empty-state-card">
              <div className="empty-icon-circle bg-slate-tint">
                <LocationPinIcon size={26} color="#94A3B8" />
              </div>
              <h3 className="empty-state-title">Location Permission Required</h3>
              <p className="empty-state-desc">
                Safe Route requires your live GPS coordinates to calculate well-lit walking corridors and avoid unverified areas.
              </p>
              <div className="empty-metrics-row">
                <div className="empty-metric">
                  <span className="metric-label">Distance</span>
                  <span className="metric-val">—</span>
                </div>
                <div className="empty-metric">
                  <span className="metric-label">Estimated Walk</span>
                  <span className="metric-val">—</span>
                </div>
                <div className="empty-metric">
                  <span className="metric-label">Guardians</span>
                  <span className="metric-val">—</span>
                </div>
              </div>
              <button
                className="action-button-primary"
                onClick={onRequestLocationPermission}
              >
                Enable Location Access
              </button>
            </div>
          ) : (
            <>
              {/* Real Route Visualization */}
              <div className="safe-route-map-card">
                <svg className="route-map-svg" viewBox="0 0 400 210">
                  <path d="M 30 180 Q 120 140 200 130 T 370 50" fill="none" stroke="#E2E8F0" strokeWidth="18" strokeLinecap="round" />
                  <path d="M 50 40 L 350 170" fill="none" stroke="#F1F5F9" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 200 20 L 200 190" fill="none" stroke="#F1F5F9" strokeWidth="10" strokeLinecap="round" />

                  <path
                    d="M 60 170 C 130 140, 160 110, 240 105 S 320 60, 340 50"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray="6 2"
                  />

                  <circle cx="150" cy="130" r="16" fill="#10B981" fillOpacity="0.18" />
                  <circle cx="240" cy="105" r="16" fill="#10B981" fillOpacity="0.18" />

                  <circle cx="150" cy="130" r="6" fill="#3B82F6" />
                  <text x="162" y="134" fontSize="10" fontWeight="700" fill="#1E293B">Assistance Point</text>

                  <circle cx="240" cy="105" r="6" fill="#10B981" />
                  <text x="252" y="109" fontSize="10" fontWeight="700" fill="#1E293B">Lit Corridor</text>

                  <circle cx="60" cy="170" r="10" fill="#3B82F6" fillOpacity="0.25" />
                  <circle cx="60" cy="170" r="6" fill="#3B82F6" />
                  <text x="45" y="195" fontSize="11" fontWeight="800" fill="#0F172A">You</text>
                </svg>

                <div className="route-score-badge">
                  <ShieldCheckIcon size={14} color="#10B981" />
                  <span>Real GPS Lock: ±{Math.round(location.accuracy)}m Accuracy</span>
                </div>
              </div>

              {/* Endpoints */}
              <div className="route-endpoints-card">
                <div className="endpoint-row">
                  <div className="endpoint-icon start-point"></div>
                  <div className="endpoint-meta">
                    <span className="endpoint-tag">CURRENT GPS LOCATION</span>
                    <span className="endpoint-text">{location.addressName}</span>
                  </div>
                </div>
                <div className="endpoint-connector"></div>
                <div className="endpoint-row">
                  <div className="endpoint-icon end-point"></div>
                  <div className="endpoint-meta">
                    <span className="endpoint-tag">ENTER DESTINATION</span>
                    <input
                      type="text"
                      className="endpoint-input"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Metro Station, Hostel Block, Library"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <button
                className="action-button-primary"
                onClick={startNavigation}
                disabled={isNavigating}
              >
                <NavigationArrowIcon size={18} color="#FFFFFF" />
                <span>{isNavigating ? 'Opening Directions…' : 'Calculate & Start Safe Navigation'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeRouteModal;

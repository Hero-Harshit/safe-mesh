import React, { useState } from 'react';
import { ToolkitIcon, SatelliteIcon, CabConnectIcon } from './Icons';
import { startSiren, stopSiren, isSirenRunning } from '../services/native';
import { requestSatelliteUplink } from '../services/satelliteService';
import { requestCabConnect } from '../services/cabConnectService';
import AnomalySimulationModal from './AnomalySimulationModal';

interface SafetyToolkitModalProps {
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const SafetyToolkitModal: React.FC<SafetyToolkitModalProps> = ({
  onClose,
  onShowToast,
}) => {
  const [isSirenActive, setIsSirenActive] = useState(() => isSirenRunning());
  const [showThreatDiagnostics, setShowThreatDiagnostics] = useState(false);
  const [isSatelliteConnecting, setIsSatelliteConnecting] = useState(false);
  const [satelliteModalMessage, setSatelliteModalMessage] = useState<string | null>(null);

  // Cab Connect State
  const [isCabConnecting, setIsCabConnecting] = useState(false);
  const [cabModalMessage, setCabModalMessage] = useState<string | null>(null);

  const handleBeginCabConnect = async () => {
    setIsCabConnecting(true);
    try {
      const res = await requestCabConnect();
      setCabModalMessage(res.message);
    } catch {
      setCabModalMessage(
        'Connecting to commercial cab booking networks (Uber, Ola, Rapido) requires an active commercial fleet dispatch license, approved partner OAuth2 credentials, and enterprise mobility agreements.'
      );
    } finally {
      setIsCabConnecting(false);
    }
  };

  const handleBeginSatellite = async () => {
    setIsSatelliteConnecting(true);
    try {
      const res = await requestSatelliteUplink();
      setSatelliteModalMessage(res.message);
    } catch {
      setSatelliteModalMessage(
        'This feature requires government permissions and Starlink integration to access satellite networks.'
      );
    } finally {
      setIsSatelliteConnecting(false);
    }
  };

  return (
    <>
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
              <div className="modal-icon-bubble bg-blue-tint">
                <ToolkitIcon size={22} color="#3B82F6" />
              </div>
              <div>
                <h2 className="modal-sheet-title">Safety Toolkit</h2>
                <span className="modal-sheet-subtitle">Emergency field utilities</span>
              </div>
            </div>
            <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="modal-sheet-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
              
              {/* 1. Siren & Strobe List Item */}
              <div 
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--surface-color)',
                  borderRadius: '16px', border: '1px solid var(--border-card)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    Siren & Strobe
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Attention & deterrent alarm
                  </span>
                </div>
                
                <button 
                  onClick={() => {
                    if (isSirenActive) {
                      stopSiren();
                      setIsSirenActive(false);
                    } else {
                      startSiren();
                      setIsSirenActive(true);
                    }
                  }}
                  style={{
                    padding: '8px 24px', borderRadius: '100px',
                    background: isSirenActive ? '#FEE2E2' : '#F1F5F9',
                    color: isSirenActive ? '#EF4444' : '#3B82F6', 
                    fontWeight: '700', fontSize: '0.85rem',
                    border: isSirenActive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '80px'
                  }}
                >
                  {isSirenActive ? 'Stop' : 'Start'}
                </button>
              </div>

              {/* 2. Threat Diagnostics List Item */}
              <div 
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--surface-color)',
                  borderRadius: '16px', border: '1px solid var(--border-card)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    Threat Diagnostics
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Hardware anomaly & acoustic simulation
                  </span>
                </div>
                
                <button 
                  onClick={() => setShowThreatDiagnostics(true)}
                  style={{
                    padding: '8px 24px', borderRadius: '100px',
                    background: '#F1F5F9',
                    color: '#3B82F6', 
                    fontWeight: '700', fontSize: '0.85rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '80px'
                  }}
                >
                  Check
                </button>
              </div>

              {/* 3. Cab Connect List Item (Uber / Ola / Rapido Commercial Dispatch Integration) */}
              <div 
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--surface-color)',
                  borderRadius: '16px', border: '1px solid var(--border-card)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    Cab Connect
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Automated emergency evacuation ride dispatch
                  </span>
                </div>
                
                <button 
                  onClick={handleBeginCabConnect}
                  disabled={isCabConnecting}
                  style={{
                    padding: '8px 24px', borderRadius: '100px',
                    background: isCabConnecting ? '#E2E8F0' : '#F1F5F9',
                    color: '#3B82F6', 
                    fontWeight: '700', fontSize: '0.85rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)', 
                    cursor: isCabConnecting ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '80px'
                  }}
                >
                  {isCabConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>

              {/* Notice / Status Card if user clicked Cab Connect */}
              {cabModalMessage && (
                <div 
                  style={{
                    marginTop: '2px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: 'rgba(239, 68, 68, 0.15)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                      }}
                    >
                      <CabConnectIcon size={16} color="#EF4444" />
                    </div>
                    <strong style={{ fontSize: '0.92rem', color: '#EF4444' }}>
                      Commercial License Requirement
                    </strong>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {cabModalMessage}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                      Status: COMMERCIAL_LICENSE_MANDATORY
                    </span>
                    <button
                      onClick={() => setCabModalMessage(null)}
                      style={{
                        padding: '4px 14px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Satellite Connect List Item */}
              <div 
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--surface-color)',
                  borderRadius: '16px', border: '1px solid var(--border-card)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    Satellite Connect
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Direct-to-orbit emergency uplink
                  </span>
                </div>
                
                <button 
                  onClick={handleBeginSatellite}
                  disabled={isSatelliteConnecting}
                  style={{
                    padding: '8px 24px', borderRadius: '100px',
                    background: isSatelliteConnecting ? '#E2E8F0' : '#F1F5F9',
                    color: '#3B82F6', 
                    fontWeight: '700', fontSize: '0.85rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)', 
                    cursor: isSatelliteConnecting ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '80px'
                  }}
                >
                  {isSatelliteConnecting ? 'Connecting...' : 'Begin'}
                </button>
              </div>

              {/* Notice / Status Card if user clicked Begin */}
              {satelliteModalMessage && (
                <div 
                  style={{
                    marginTop: '6px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: 'rgba(239, 68, 68, 0.15)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                      }}
                    >
                      <SatelliteIcon size={16} color="#EF4444" />
                    </div>
                    <strong style={{ fontSize: '0.92rem', color: '#EF4444' }}>
                      Regulatory & Hardware Requirement
                    </strong>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {satelliteModalMessage}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      onClick={() => setSatelliteModalMessage(null)}
                      style={{
                        padding: '4px 14px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', padding: '1.2rem 1rem 0.5rem', color: 'var(--text-tertiary)' }}>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>More stealth tools coming soon!</p>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Threat Diagnostics Anomaly Simulation Panel */}
      {showThreatDiagnostics && (
        <AnomalySimulationModal
          onClose={() => setShowThreatDiagnostics(false)}
          onShowToast={(msg) => onShowToast ? onShowToast(msg) : alert(msg)}
        />
      )}
    </>
  );
};

export default SafetyToolkitModal;

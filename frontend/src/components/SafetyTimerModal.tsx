import React, { useState, useEffect } from 'react';
import { TimerIcon, ShieldCheckIcon, LockIcon } from './Icons';

interface SafetyTimerModalProps {
  onClose: () => void;
  onStartTimer: (minutes: number) => void;
  isActive: boolean;
  onStopTimer: () => void;
}

export const SafetyTimerModal: React.FC<SafetyTimerModalProps> = ({
  onClose,
  onStartTimer,
  isActive,
  onStopTimer
}) => {
  const [hasPins, setHasPins] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(15);

  useEffect(() => {
    const saved = localStorage.getItem('safetymesh_pins');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.realPin && parsed.duressPin) {
          setHasPins(true);
        }
      } catch (e) {}
    }
  }, []);

  return (
    <div 
      className="safetymesh-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }} 
      style={{ zIndex: 100 }}
    >
      <div className="safetymesh-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pill-indicator"></div>

        <div className="modal-sheet-header">
          <div className="modal-title-group">
            <div className="modal-icon-bubble bg-blue-tint">
              <TimerIcon size={22} color="#3B82F6" />
            </div>
            <div>
              <h2 className="modal-sheet-title">Safe Timer</h2>
              <span className="modal-sheet-subtitle">Dead man's switch</span>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-sheet-content" style={{ padding: '0 20px 20px' }}>
          {!hasPins ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <LockIcon size={32} color="#F59E0B" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: '#F59E0B', marginBottom: '8px', fontSize: '1.1rem' }}>Setup Required</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Please set up your Actual PIN and Duress PIN in <b>Settings</b> before using the Safe Timer.
              </p>
            </div>
          ) : isActive ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <ShieldCheckIcon size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ color: 'white', marginBottom: '8px', fontSize: '1.2rem' }}>Timer is Active</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                You will be prompted to verify your safety periodically. Keep your phone accessible.
              </p>
              <button 
                onClick={onStopTimer}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                  fontWeight: 'bold', fontSize: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                Stop Timer
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: 1.5 }}>
                Select an interval. You will be prompted to enter your Actual PIN at this interval. If you fail to respond within 30 seconds, an SOS will be dispatched automatically.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {[1, 15, 30, 60].map(min => (
                  <button
                    key={min}
                    onClick={() => setSelectedMinutes(min)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedMinutes === min ? '2px solid #3B82F6' : '1px solid var(--border-card)',
                      background: selectedMinutes === min ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: selectedMinutes === min ? '#3B82F6' : 'var(--text-secondary)',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    {min} {min === 1 ? 'min' : 'mins'}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  onStartTimer(selectedMinutes);
                  onClose();
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: '#FFFFFF', color: '#3B82F6',
                  fontWeight: 'bold', fontSize: '1rem', 
                  border: '2px solid #3B82F6',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.12)'
                }}
              >
                Start Timer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyTimerModal;

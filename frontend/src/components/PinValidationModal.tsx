import React, { useState, useEffect } from 'react';
import { validatePin } from '../services/pinManager';

interface PinValidationModalProps {
  onSuccess: () => void;
  onDuress: () => void;
  onTimeout: () => void;
}

export const PinValidationModal: React.FC<PinValidationModalProps> = ({
  onSuccess,
  onDuress,
  onTimeout,
}) => {
  const [pin, setPin] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onTimeout]);

  // Vibrate immediately to grab attention
  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }, []);

  const handleDigitClick = (num: number) => {
    if (errorMessage) {
      setErrorMessage(null);
      setError(false);
    }
    if (pin.length < 4) {
      setPin(prev => prev + num.toString());
    }
  };

  const handleBackspace = () => {
    if (errorMessage) {
      setErrorMessage(null);
      setError(false);
    }
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = () => {
    if (pin.length < 4) {
      setError(true);
      setErrorMessage('Please enter 4 digits');
      setTimeout(() => setError(false), 1000);
      return;
    }

    const validationResult = validatePin(pin);

    if (validationResult === 'REAL') {
      setErrorMessage(null);
      setError(false);
      onSuccess();
    } else if (validationResult === 'DURESS') {
      setErrorMessage(null);
      setError(false);
      onDuress();
    } else {
      setError(true);
      setErrorMessage('Wrong PIN entered');
      setPin('');
      if (navigator.vibrate) {
        navigator.vibrate([150, 75, 150]);
      }
      setTimeout(() => setError(false), 1200);
    }
  };

  return (
    <div className="safetymesh-modal-backdrop" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.9)' }}>
      <div className="safetymesh-modal-sheet" style={{ background: '#1e1e1e' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '1.8rem 1rem' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: timeLeft <= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            border: `2px solid ${timeLeft <= 10 ? '#EF4444' : '#3B82F6'}`
          }}>
            <h1 style={{ fontSize: '2rem', color: timeLeft <= 10 ? '#EF4444' : '#3B82F6', margin: 0 }}>
              {timeLeft}
            </h1>
          </div>
          
          <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '1.35rem' }}>Are you safe?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '0.9rem' }}>
            Enter your PIN to verify your safety.
          </p>

          {/* PIN Digits Display */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '14px' }}>
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                style={{ 
                  width: '52px', height: '56px', 
                  borderBottom: `3px solid ${error ? '#EF4444' : (pin.length > i ? '#3B82F6' : 'var(--border-color)')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', color: 'white',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Error / Status Indicator */}
          <div style={{ minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            {errorMessage ? (
              <div 
                style={{ 
                  color: '#EF4444', 
                  fontSize: '0.88rem', 
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  padding: '5px 14px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>⚠️</span> {errorMessage}
              </div>
            ) : (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                Enter PIN and tap OK
              </span>
            )}
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigitClick(num)}
                style={{
                  padding: '16px', fontSize: '1.5rem', background: 'rgba(255,255,255,0.08)',
                  border: 'none', borderRadius: '14px', color: 'white', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.1s ease'
                }}
              >
                {num}
              </button>
            ))}

            {/* Bottom-left: Backspace button */}
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Backspace"
              style={{
                padding: '16px', fontSize: '1.3rem', background: 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '14px', color: 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ⌫
            </button>

            {/* Bottom-center: 0 button */}
            <button
              type="button"
              onClick={() => handleDigitClick(0)}
              style={{
                padding: '16px', fontSize: '1.5rem', background: 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '14px', color: 'white', cursor: 'pointer',
                fontWeight: 600, transition: 'all 0.1s ease'
              }}
            >
              0
            </button>

            {/* Bottom-right: OK button */}
            <button
              type="button"
              onClick={handlePinSubmit}
              disabled={pin.length < 4}
              aria-label="Submit PIN"
              style={{
                padding: '16px', fontSize: '1.15rem', fontWeight: 800,
                background: pin.length === 4 
                  ? 'linear-gradient(135deg, #10B981, #059669)' 
                  : 'rgba(255,255,255,0.04)',
                border: 'none', borderRadius: '14px',
                color: pin.length === 4 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: pin.length === 4 ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinValidationModal;

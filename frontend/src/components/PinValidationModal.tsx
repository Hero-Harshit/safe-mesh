import React, { useState, useEffect } from 'react';


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

  const handlePinSubmit = () => {
    const saved = localStorage.getItem('safetymesh_pins');
    let realPin = '';
    let duressPin = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        realPin = parsed.realPin;
        duressPin = parsed.duressPin;
      } catch (e) {}
    }

    if (pin === realPin) {
      onSuccess();
    } else if (pin === duressPin) {
      onDuress();
    } else {
      setError(true);
      setPin('');
      if (navigator.vibrate) navigator.vibrate(200);
      setTimeout(() => setError(false), 500);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit();
    }
  }, [pin]);

  return (
    <div className="safetymesh-modal-backdrop" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.9)' }}>
      <div className="safetymesh-modal-sheet" style={{ background: '#1e1e1e' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
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
          
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Are you safe?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Enter your PIN to verify your safety.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                style={{ 
                  width: '50px', height: '60px', 
                  borderBottom: `2px solid ${error ? '#EF4444' : (pin.length > i ? '#3B82F6' : 'var(--border-color)')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', color: 'white'
                }}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => pin.length < 4 && setPin(p => p + num)}
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
              onClick={() => setPin(p => p.slice(0, -1))}
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
              onClick={() => pin.length < 4 && setPin(p => p + '0')}
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

/**
 * SafetyMesh PIN Manager Service
 * Manages storage, retrieval, validation, and defaults for Actual and Duress PINs.
 */

export const DEFAULT_REAL_PIN = '1234';
export const DEFAULT_DURESS_PIN = '9999';

export interface SecurityPins {
  realPin: string;
  duressPin: string;
}

const STORAGE_KEY = 'safetymesh_pins';

/**
 * Retrieve security PINs. If none are stored, initializes with default PINs.
 */
export function getSecurityPins(): SecurityPins {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.realPin === 'string' &&
        typeof parsed.duressPin === 'string' &&
        /^\d{4}$/.test(parsed.realPin) &&
        /^\d{4}$/.test(parsed.duressPin)
      ) {
        return {
          realPin: parsed.realPin,
          duressPin: parsed.duressPin,
        };
      }
    }
  } catch (e) {
    console.warn('[pinManager] Error parsing saved PINs, using defaults', e);
  }

  // Persist default PINs so storage is never undefined
  const defaults: SecurityPins = {
    realPin: DEFAULT_REAL_PIN,
    duressPin: DEFAULT_DURESS_PIN,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch (e) {
    console.warn('[pinManager] Failed to persist default PINs to localStorage', e);
  }

  return defaults;
}

/**
 * Validates and saves new PINs.
 */
export function saveSecurityPins(
  realPin: string,
  duressPin: string
): { success: boolean; error?: string } {
  const cleanReal = (realPin || '').trim();
  const cleanDuress = (duressPin || '').trim();

  if (!/^\d{4}$/.test(cleanReal)) {
    return { success: false, error: 'Actual PIN must be exactly 4 digits' };
  }
  if (!/^\d{4}$/.test(cleanDuress)) {
    return { success: false, error: 'Duress PIN must be exactly 4 digits' };
  }
  if (cleanReal === cleanDuress) {
    return { success: false, error: 'Actual PIN and Duress PIN must be different' };
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ realPin: cleanReal, duressPin: cleanDuress })
    );
    return { success: true };
  } catch (e) {
    console.error('[pinManager] Failed to save PINs', e);
    return { success: false, error: 'Failed to save to device storage' };
  }
}

/**
 * Validates an entered PIN against stored actual and duress PINs.
 */
export function validatePin(enteredPin: string): 'REAL' | 'DURESS' | 'INVALID' {
  const { realPin, duressPin } = getSecurityPins();
  const clean = (enteredPin || '').trim();
  if (clean === realPin) return 'REAL';
  if (clean === duressPin) return 'DURESS';
  return 'INVALID';
}

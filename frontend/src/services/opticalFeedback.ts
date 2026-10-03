/**
 * Optical Flash Feedback Service
 * 
 * Provides an optical screen perimeter flash upon user interaction,
 * designed for deaf, hard-of-hearing, or low-audio environments.
 * 
 * Works 100% in mobile WebView and browser without native APK rebuilding.
 */

const STORAGE_KEY = 'safetymesh_optical_feedback';

let overlayElement: HTMLDivElement | null = null;
let flashTimeout: ReturnType<typeof setTimeout> | null = null;
let isListenerAttached = false;

/**
 * Returns true if Optical Flash Feedback is enabled in Settings.
 */
export function isOpticalFeedbackEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Enables or disables Optical Flash Feedback and dispatches a change event.
 */
export function setOpticalFeedbackEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new Event('optical_feedback_changed'));
  if (enabled) {
    triggerOpticalFlash(true);
  }
}

/**
 * Ensures the singleton optical flash overlay DOM element is present in body.
 */
function getOrCreateOverlay(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (!overlayElement) {
    overlayElement = document.createElement('div');
    overlayElement.className = 'optical-flash-overlay';
    overlayElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlayElement);
  }
  return overlayElement;
}

/**
 * Triggers a crisp optical screen flash.
 * 
 * @param force If true, flashes regardless of setting (useful for toggle preview).
 */
export function triggerOpticalFlash(force: boolean = false): void {
  if (!force && !isOpticalFeedbackEnabled()) return;

  const overlay = getOrCreateOverlay();
  if (!overlay) return;

  if (flashTimeout) {
    clearTimeout(flashTimeout);
  }

  // Flash on immediately
  overlay.classList.add('flashing');

  flashTimeout = setTimeout(() => {
    overlay.classList.remove('flashing');
    flashTimeout = null;
  }, 140);
}

/**
 * Attaches a global interaction listener to flash the screen on taps.
 */
export function initOpticalFeedback(): void {
  if (typeof window === 'undefined' || isListenerAttached) return;
  isListenerAttached = true;

  const handlePointerDown = () => {
    if (!isOpticalFeedbackEnabled()) return;
    triggerOpticalFlash();
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
}

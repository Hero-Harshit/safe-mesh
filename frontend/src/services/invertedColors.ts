/**
 * Inverted Colors Accessibility Service
 * 
 * Provides high-contrast color inversion for users with low vision or weak eyesight.
 * Seamlessly toggles without requiring native APK rebuilds.
 */

const STORAGE_KEY = 'safetymesh_inverted_colors';

export function isInvertedColorsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setInvertedColorsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  applyInvertedColors(enabled);
}

export function applyInvertedColors(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.documentElement.classList.add('inverted-colors-mode');
  } else {
    document.documentElement.classList.remove('inverted-colors-mode');
  }
}

export function initInvertedColors(): void {
  if (typeof window === 'undefined') return;
  applyInvertedColors(isInvertedColorsEnabled());
}

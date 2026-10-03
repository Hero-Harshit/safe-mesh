/**
 * Tactile Morse Code Accessibility Service
 * 
 * Provides covert haptic vibration and acoustic Morse code audio feedback
 * specifically designed for blind and visually impaired users.
 * 
 * Works 100% in mobile WebView and browser without native APK rebuilding.
 */

import { getNativeBridge } from './native';

const STORAGE_KEY = 'safetymesh_tactile_morse';

// Morse timing parameters (in milliseconds)
const DOT_DURATION = 65;
const DASH_DURATION = 175;
const GAP_DURATION = 45;
const MORSE_FREQ = 750; // Crisp radio telegraph frequency in Hz

let audioContext: AudioContext | null = null;
let lastTriggerTime = 0;
const THROTTLE_MS = 100; // Prevent spamming on double touch events

/**
 * Returns true if the user enabled Tactile Morse Code in Settings.
 */
export function isTactileMorseEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Sets the Tactile Morse Code preference and dispatches a change event.
 */
export function setTactileMorseEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new Event('tactile_morse_changed'));
}

/**
 * Safe initializer for Web Audio Context.
 * Resumes suspended context on user interaction.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioContext) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioContext = new AudioCtxClass();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a pure sine wave Morse beep tone via Web Audio API.
 */
function playTone(startTime: number, durationMs: number, ctx: AudioContext) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(MORSE_FREQ, startTime);

    // Smooth envelope ramp to prevent harsh speaker pops/clicks
    const startSec = startTime;
    const endSec = startTime + durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, startSec);
    gain.gain.exponentialRampToValueAtTime(0.18, startSec + 0.008);
    gain.gain.setValueAtTime(0.18, endSec - 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, endSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startSec);
    osc.stop(endSec + 0.02);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignored
      }
    };
  } catch {
    // Ignored
  }
}

/**
 * Triggers vibration via navigator.vibrate or native bridge.
 */
function triggerVibration(pattern: number[] | number) {
  // 1. Browser / WebView vibration API
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored
    }
  }

  // 2. Fallback to native bridge if present
  try {
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.vibrate === 'function') {
      const totalDuration = Array.isArray(pattern)
        ? pattern.reduce((acc, curr) => acc + curr, 0)
        : pattern;
      bridge.vibrate(Math.min(totalDuration, 350));
    }
  } catch {
    // Ignored
  }
}

export type MorseFeedbackType = 'tap' | 'module' | 'toggle_on' | 'toggle_off' | 'sos';

/**
 * Plays tactile vibration and acoustic Morse sound feedback.
 * 
 * @param type 'tap' (single dot), 'module' (dot-dash / 'A'), 'toggle_on' (ascending sequence), etc.
 * @param force If true, plays even if setting is disabled (e.g. for preview when toggling ON).
 */
export function triggerTactileMorse(type: MorseFeedbackType = 'module', force: boolean = false): void {
  if (!force && !isTactileMorseEnabled()) {
    return;
  }

  const now = Date.now();
  if (now - lastTriggerTime < THROTTLE_MS && !force) {
    return;
  }
  lastTriggerTime = now;

  let pattern: number[];

  switch (type) {
    case 'tap':
      // Single Dot (.)
      pattern = [DOT_DURATION];
      break;

    case 'toggle_on':
      // Rapid Dot-Dot-Dash (..-)
      pattern = [DOT_DURATION, GAP_DURATION, DOT_DURATION, GAP_DURATION, DASH_DURATION];
      break;

    case 'toggle_off':
      // Single Long Dash (-)
      pattern = [DASH_DURATION];
      break;

    case 'sos':
      // Full SOS (... --- ...)
      pattern = [
        DOT_DURATION, GAP_DURATION, DOT_DURATION, GAP_DURATION, DOT_DURATION, GAP_DURATION * 2,
        DASH_DURATION, GAP_DURATION, DASH_DURATION, GAP_DURATION, DASH_DURATION, GAP_DURATION * 2,
        DOT_DURATION, GAP_DURATION, DOT_DURATION, GAP_DURATION, DOT_DURATION
      ];
      break;

    case 'module':
    default:
      // Classic Morse 'A' (.-): Dot + Dash, universally recognizable
      pattern = [DOT_DURATION, GAP_DURATION, DASH_DURATION];
      break;
  }

  // 1. Trigger tactile vibration pattern
  triggerVibration(pattern);

  // 2. Synthesize audio tones for speaker
  const ctx = getAudioContext();
  if (ctx) {
    const nowCtx = ctx.currentTime;
    let accumulatedTime = nowCtx;

    for (let i = 0; i < pattern.length; i++) {
      const dur = pattern[i];
      if (i % 2 === 0) {
        // Active tone pulse
        playTone(accumulatedTime, dur, ctx);
      }
      // Increment accumulated time by duration
      accumulatedTime += dur / 1000;
    }
  }
}

let isGlobalListenerAttached = false;

/**
 * Initializes global tap detection for interactive modules, buttons, and cards.
 * When Tactile Morse Code is enabled, every module/button tap produces Morse feedback.
 */
export function initTactileMorse(): void {
  if (typeof window === 'undefined' || isGlobalListenerAttached) return;
  isGlobalListenerAttached = true;

  const handlePointerDown = (event: PointerEvent | MouseEvent) => {
    if (!isTactileMorseEnabled()) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or its ancestors are interactive modules, buttons, or cards
    let el: HTMLElement | null = target;
    let isInteractive = false;
    let depth = 0;

    while (el && depth < 6 && el !== document.body) {
      const tag = el.tagName.toLowerCase();
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (
        tag === 'button' ||
        tag === 'a' ||
        tag === 'input' ||
        tag === 'select' ||
        tag === 'label' ||
        el.getAttribute('role') === 'button' ||
        el.classList.contains('setting-toggle-row') ||
        el.classList.contains('shortcut-card') ||
        el.classList.contains('settings-profile-card') ||
        el.classList.contains('modal-sheet') ||
        el.getAttribute('data-interactive') === 'true' ||
        el.style.cursor === 'pointer' ||
        (style && style.cursor === 'pointer')
      ) {
        isInteractive = true;
        break;
      }
      el = el.parentElement;
      depth++;
    }

    if (isInteractive) {
      triggerTactileMorse('module');
    }
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
}

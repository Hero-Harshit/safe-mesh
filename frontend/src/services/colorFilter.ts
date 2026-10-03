/**
 * Color Filter & Daltonization Accessibility Service
 * 
 * Provides color correction filters for color-blind users:
 * - Protanopia (Red-blind / Red-weak)
 * - Deuteranopia (Green-blind / Green-weak)
 * - Tritanopia (Blue-yellow blind)
 * - Monochrome (Grayscale / High-contrast Achromatopsia)
 * 
 * Injects standard Daltonization color matrices via SVG filters.
 * Works 100% in mobile WebView and browser without native APK rebuilding.
 */

export type ColorFilterMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';

const STORAGE_KEY = 'safetymesh_color_filter';

const SVG_FILTERS_ID = 'safetymesh-daltonization-filters';

/**
 * Returns the currently active Color Filter Mode.
 */
export function getColorFilterMode(): ColorFilterMode {
  if (typeof window === 'undefined') return 'none';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'protanopia' || saved === 'deuteranopia' || saved === 'tritanopia' || saved === 'monochrome') {
    return saved;
  }
  return 'none';
}

/**
 * Sets and applies a new Color Filter Mode, persisting to localStorage.
 */
export function setColorFilterMode(mode: ColorFilterMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, mode);
  applyColorFilter(mode);
  window.dispatchEvent(new CustomEvent('color_filter_changed', { detail: mode }));
}

/**
 * Ensures the SVG filters element exists in the DOM.
 */
function ensureSvgFilters(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SVG_FILTERS_ID)) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = SVG_FILTERS_ID;
  svg.setAttribute('style', 'display: none; position: absolute; width: 0; height: 0;');
  svg.setAttribute('aria-hidden', 'true');

  svg.innerHTML = `
    <defs>
      <!-- Protanopia (Red-Weak / Red-Blind) -->
      <filter id="protanopia-filter">
        <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0" />
      </filter>
      <!-- Deuteranopia (Green-Weak / Green-Blind) -->
      <filter id="deuteranopia-filter">
        <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.700, 0.300, 0, 0, 0  0, 0.300, 0.700, 0, 0  0, 0, 0, 1, 0" />
      </filter>
      <!-- Tritanopia (Blue-Weak / Blue-Yellow Blind) -->
      <filter id="tritanopia-filter">
        <feColorMatrix type="matrix" values="0.950, 0.050, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0" />
      </filter>
    </defs>
  `;

  document.body.appendChild(svg);
}

/**
 * Applies the CSS class for the chosen color filter to html root.
 */
export function applyColorFilter(mode: ColorFilterMode): void {
  if (typeof document === 'undefined') return;
  ensureSvgFilters();

  const root = document.documentElement;
  root.classList.remove(
    'color-filter-protanopia',
    'color-filter-deuteranopia',
    'color-filter-tritanopia',
    'color-filter-monochrome'
  );

  if (mode !== 'none') {
    root.classList.add(`color-filter-${mode}`);
  }
}

/**
 * Initializes SVG filters and applies the saved preference on startup.
 */
export function initColorFilters(): void {
  if (typeof window === 'undefined') return;
  ensureSvgFilters();
  applyColorFilter(getColorFilterMode());
}

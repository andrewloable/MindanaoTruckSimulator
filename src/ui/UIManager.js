/**
 * UIManager - Manages all UI screens and overlays
 *
 * Handles showing/hiding UI elements and transitions between screens.
 */

export class UIManager {
  constructor() {
    this.container = null;
    this.screens = new Map();
    this.activeScreen = null;
    this.overlays = new Map();
  }

  /**
   * Initialize the UI manager
   */
  init() {
    this.container = document.getElementById('ui-overlay');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'ui-overlay';
      document.getElementById('app').appendChild(this.container);
    }

    // Add base styles
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
  }

  /**
   * Register a screen
   * @param {string} name - Screen name
   * @param {HTMLElement} element - Screen element
   */
  registerScreen(name, element) {
    element.style.pointerEvents = 'auto';
    element.style.display = 'none';
    this.container.appendChild(element);
    this.screens.set(name, element);
  }

  /**
   * Register an overlay (shown on top of game, not exclusive)
   * @param {string} name - Overlay name
   * @param {HTMLElement} element - Overlay element
   */
  registerOverlay(name, element) {
    element.style.pointerEvents = 'auto';
    element.style.display = 'none';
    this.container.appendChild(element);
    this.overlays.set(name, element);
  }

  /**
   * Show a screen (hides other screens)
   * @param {string} name - Screen name
   */
  showScreen(name) {
    // Hide all screens
    for (const [screenName, element] of this.screens) {
      if (screenName === name) {
        element.style.display = 'flex';
        element.style.opacity = '0';
        // Fade in
        requestAnimationFrame(() => {
          element.style.transition = 'opacity 0.3s ease-out';
          element.style.opacity = '1';
        });
      } else {
        element.style.display = 'none';
      }
    }
    this.activeScreen = name;
  }

  /**
   * Hide all screens
   */
  hideAllScreens() {
    for (const element of this.screens.values()) {
      element.style.display = 'none';
    }
    this.activeScreen = null;
  }

  /**
   * Show an overlay
   * @param {string} name - Overlay name
   */
  showOverlay(name) {
    const element = this.overlays.get(name);
    if (element) {
      element.style.display = 'flex';
    }
  }

  /**
   * Hide an overlay
   * @param {string} name - Overlay name
   */
  hideOverlay(name) {
    const element = this.overlays.get(name);
    if (element) {
      element.style.display = 'none';
    }
  }

  /**
   * Get active screen name
   * @returns {string|null}
   */
  getActiveScreen() {
    return this.activeScreen;
  }

  /**
   * Check if a screen is active
   * @param {string} name
   * @returns {boolean}
   */
  isScreenActive(name) {
    return this.activeScreen === name;
  }
}

/**
 * Mindanao Truck Simulator - Main Entry Point
 *
 * A web-based truck driving simulation game set in Mindanao, Philippines.
 * Built with Three.js for 3D rendering.
 */

import * as THREE from 'three';
import { Game } from './core/Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the game
  const game = new Game();

  // Start the game loop
  game.init().then(() => {
    game.start();
  }).catch((error) => {
    console.error('Failed to initialize game:', error);
    updateLoadingText('Failed to load game. Please refresh the page.');
  });
});

/**
 * Update the loading screen text
 * @param {string} text - Text to display
 */
function updateLoadingText(text) {
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.textContent = text;
  }
}

/**
 * Update the loading progress bar
 * @param {number} progress - Progress value from 0 to 100
 */
export function updateLoadingProgress(progress) {
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    loadingBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }
}

/**
 * Hide the loading screen
 */
export function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    // Remove from DOM after transition
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

// Export for use in other modules
export { updateLoadingText };

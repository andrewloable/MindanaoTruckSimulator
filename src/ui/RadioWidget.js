/**
 * RadioWidget - HUD component for radio controls
 *
 * Displays current station, track, and provides station switching.
 */

import { RadioStations } from '../systems/RadioSystem.js';

export class RadioWidget {
  constructor(uiManager, radioSystem) {
    this.uiManager = uiManager;
    this.radio = radioSystem;
    this.element = null;

    // UI elements
    this.stationName = null;
    this.trackName = null;
    this.progressBar = null;
    this.timeDisplay = null;
  }

  /**
   * Initialize the radio widget
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerOverlay('radio-widget', this.element);
    this.addStyles();

    // Listen for station changes
    this.radio.onStationChange = (station) => this.onStationChange(station);
    this.radio.onTrackChange = (track) => this.onTrackChange(track);
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('radio-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'radio-widget-styles';
    style.textContent = `
      .radio-widget {
        position: absolute;
        bottom: 190px;
        right: 30px;
        width: 160px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 10px;
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: auto;
        border: 2px solid rgba(255, 255, 255, 0.1);
      }

      .radio-widget__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .radio-widget__icon {
        font-size: 16px;
      }

      .radio-widget__station {
        color: #4CAF50;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        flex: 1;
      }

      .radio-widget__station--off {
        color: rgba(255, 255, 255, 0.4);
      }

      .radio-widget__track {
        color: white;
        font-size: 12px;
        text-align: center;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .radio-widget__progress {
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 6px;
      }

      .radio-widget__progress-bar {
        height: 100%;
        background: #4CAF50;
        width: 0%;
        transition: width 0.5s linear;
      }

      .radio-widget__time {
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
        text-align: center;
        margin-bottom: 8px;
      }

      .radio-widget__controls {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .radio-widget__btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .radio-widget__btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .radio-widget__hint {
        color: rgba(255, 255, 255, 0.3);
        font-size: 9px;
        text-align: center;
        margin-top: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the widget element
   * @returns {HTMLElement}
   */
  createElement() {
    const container = document.createElement('div');
    container.className = 'radio-widget';

    // Header with icon and station name
    const header = document.createElement('div');
    header.className = 'radio-widget__header';

    const icon = document.createElement('span');
    icon.className = 'radio-widget__icon';
    icon.textContent = '\u{1F4FB}'; // 📻
    header.appendChild(icon);

    this.stationName = document.createElement('div');
    this.stationName.className = 'radio-widget__station radio-widget__station--off';
    this.stationName.textContent = 'Radio Off';
    header.appendChild(this.stationName);

    container.appendChild(header);

    // Track name
    this.trackName = document.createElement('div');
    this.trackName.className = 'radio-widget__track';
    this.trackName.textContent = '-';
    container.appendChild(this.trackName);

    // Progress bar
    const progress = document.createElement('div');
    progress.className = 'radio-widget__progress';

    this.progressBar = document.createElement('div');
    this.progressBar.className = 'radio-widget__progress-bar';
    progress.appendChild(this.progressBar);

    container.appendChild(progress);

    // Time display
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.className = 'radio-widget__time';
    this.timeDisplay.textContent = '--:-- / --:--';
    container.appendChild(this.timeDisplay);

    // Control buttons
    const controls = document.createElement('div');
    controls.className = 'radio-widget__controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'radio-widget__btn';
    prevBtn.textContent = '\u25C0'; // ◀
    prevBtn.title = 'Previous station';
    prevBtn.addEventListener('click', () => this.radio.prevStation());
    controls.appendChild(prevBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'radio-widget__btn';
    toggleBtn.textContent = '\u23FB'; // ⏻ power
    toggleBtn.title = 'Toggle radio';
    toggleBtn.addEventListener('click', () => this.radio.toggle());
    controls.appendChild(toggleBtn);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'radio-widget__btn';
    nextBtn.textContent = '\u25B6'; // ▶
    nextBtn.title = 'Next station';
    nextBtn.addEventListener('click', () => this.radio.nextStation());
    controls.appendChild(nextBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'radio-widget__btn';
    skipBtn.textContent = '\u23ED'; // ⏭ next track
    skipBtn.title = 'Skip track';
    skipBtn.addEventListener('click', () => this.radio.nextTrack());
    controls.appendChild(skipBtn);

    container.appendChild(controls);

    // Keyboard hint
    const hint = document.createElement('div');
    hint.className = 'radio-widget__hint';
    hint.textContent = 'R: Toggle | [ ]: Stations';
    container.appendChild(hint);

    return container;
  }

  /**
   * Handle station change
   * @param {Object} station
   */
  onStationChange(station) {
    if (station === RadioStations.OFF) {
      this.stationName.textContent = 'Radio Off';
      this.stationName.classList.add('radio-widget__station--off');
      this.trackName.textContent = '-';
      this.progressBar.style.width = '0%';
      this.timeDisplay.textContent = '--:-- / --:--';
    } else {
      this.stationName.textContent = station.name;
      this.stationName.classList.remove('radio-widget__station--off');

      const track = this.radio.getCurrentTrack();
      if (track) {
        this.trackName.textContent = track.name;
      }
    }
  }

  /**
   * Handle track change
   * @param {Object} track
   */
  onTrackChange(track) {
    if (track) {
      this.trackName.textContent = track.name;
    }
  }

  /**
   * Update display (called each frame)
   */
  update() {
    if (!this.radio.isPlaying) return;

    // Update progress bar
    const progress = this.radio.getTrackProgress() * 100;
    this.progressBar.style.width = `${progress}%`;

    // Update time display
    const current = this.radio.getFormattedTime();
    const total = this.radio.getFormattedDuration();
    this.timeDisplay.textContent = `${current} / ${total}`;
  }

  /**
   * Show the widget
   */
  show() {
    this.uiManager.showOverlay('radio-widget');
  }

  /**
   * Hide the widget
   */
  hide() {
    this.uiManager.hideOverlay('radio-widget');
  }
}

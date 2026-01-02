/**
 * OptionsMenu - Game settings screen
 *
 * Allows players to adjust audio, controls, and graphics settings.
 */

import { AudioCategory } from '../systems/AudioManager.js';

export class OptionsMenu {
  constructor(uiManager, audioManager, inputManager, callbacks = {}) {
    this.uiManager = uiManager;
    this.audioManager = audioManager;
    this.inputManager = inputManager;
    this.callbacks = callbacks;
    this.element = null;
    this.activeTab = 'audio';

    // UI element references
    this.sliders = new Map();
    this.tabButtons = new Map();
    this.tabPanels = new Map();
  }

  /**
   * Create and register the options menu
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerScreen('optionsMenu', this.element);
  }

  /**
   * Add CSS styles to document
   */
  addStyles() {
    if (document.getElementById('options-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'options-menu-styles';
    style.textContent = `
      .options-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .options-menu__container {
        background: rgba(30, 30, 50, 0.95);
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      .options-menu__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .options-menu__title {
        color: white;
        font-size: 24px;
        font-weight: bold;
      }
      .options-menu__close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .options-menu__close:hover {
        color: white;
      }
      .options-menu__tabs {
        display: flex;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }
      .options-menu__tab {
        flex: 1;
        padding: 14px 20px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: all 0.2s;
        border-bottom: 3px solid transparent;
      }
      .options-menu__tab:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.05);
      }
      .options-menu__tab--active {
        color: #4CAF50;
        border-bottom-color: #4CAF50;
      }
      .options-menu__content {
        padding: 24px;
        max-height: 400px;
        overflow-y: auto;
      }
      .options-menu__panel {
        display: none;
      }
      .options-menu__panel--active {
        display: block;
      }
      .options-menu__section {
        margin-bottom: 24px;
      }
      .options-menu__section:last-child {
        margin-bottom: 0;
      }
      .options-menu__section-title {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .options-menu__row {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }
      .options-menu__row:last-child {
        margin-bottom: 0;
      }
      .options-menu__label {
        color: white;
        font-size: 14px;
        width: 120px;
        flex-shrink: 0;
      }
      .options-menu__slider-container {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .options-menu__slider {
        flex: 1;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        outline: none;
      }
      .options-menu__slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: #4CAF50;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s;
      }
      .options-menu__slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      .options-menu__slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #4CAF50;
        border: none;
        border-radius: 50%;
        cursor: pointer;
      }
      .options-menu__value {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        width: 45px;
        text-align: right;
      }
      .options-menu__info {
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        margin-top: 8px;
        line-height: 1.6;
      }
      .options-menu__info-line {
        margin-bottom: 4px;
      }
      .options-menu__info-key {
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
      }
      .options-menu__gamepad-status {
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        margin-bottom: 16px;
      }
      .options-menu__gamepad-status--connected {
        border-left: 3px solid #4CAF50;
      }
      .options-menu__gamepad-status--disconnected {
        border-left: 3px solid #f44336;
      }
      .options-menu__gamepad-name {
        color: white;
        font-size: 14px;
        margin-bottom: 4px;
      }
      .options-menu__gamepad-hint {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
      }
      .options-menu__footer {
        padding: 16px 24px;
        background: rgba(0, 0, 0, 0.3);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .options-menu__btn {
        padding: 10px 24px;
        font-size: 14px;
        font-weight: 600;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .options-menu__btn--primary {
        background: #4CAF50;
        color: white;
      }
      .options-menu__btn--primary:hover {
        background: #66BB6A;
      }
      .options-menu__btn--secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .options-menu__btn--secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the options menu element
   * @returns {HTMLElement}
   */
  createElement() {
    this.addStyles();

    const menu = document.createElement('div');
    menu.className = 'options-menu';

    const container = document.createElement('div');
    container.className = 'options-menu__container';

    // Header
    const header = document.createElement('div');
    header.className = 'options-menu__header';

    const title = document.createElement('div');
    title.className = 'options-menu__title';
    title.textContent = 'Options';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'options-menu__close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    container.appendChild(header);

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'options-menu__tabs';

    const tabData = [
      { id: 'audio', label: 'Audio' },
      { id: 'controls', label: 'Controls' },
      { id: 'graphics', label: 'Graphics' },
    ];

    for (const tab of tabData) {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'options-menu__tab';
      if (tab.id === this.activeTab) {
        tabBtn.classList.add('options-menu__tab--active');
      }
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => this.switchTab(tab.id));
      tabs.appendChild(tabBtn);
      this.tabButtons.set(tab.id, tabBtn);
    }

    container.appendChild(tabs);

    // Content area
    const content = document.createElement('div');
    content.className = 'options-menu__content';

    // Audio panel
    const audioPanel = this.createAudioPanel();
    content.appendChild(audioPanel);
    this.tabPanels.set('audio', audioPanel);

    // Controls panel
    const controlsPanel = this.createControlsPanel();
    content.appendChild(controlsPanel);
    this.tabPanels.set('controls', controlsPanel);

    // Graphics panel
    const graphicsPanel = this.createGraphicsPanel();
    content.appendChild(graphicsPanel);
    this.tabPanels.set('graphics', graphicsPanel);

    container.appendChild(content);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'options-menu__footer';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'options-menu__btn options-menu__btn--secondary';
    resetBtn.textContent = 'Reset to Defaults';
    resetBtn.addEventListener('click', () => this.resetToDefaults());
    footer.appendChild(resetBtn);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'options-menu__btn options-menu__btn--primary';
    applyBtn.textContent = 'Done';
    applyBtn.addEventListener('click', () => this.close());
    footer.appendChild(applyBtn);

    container.appendChild(footer);
    menu.appendChild(container);

    return menu;
  }

  /**
   * Create audio settings panel
   * @returns {HTMLElement}
   */
  createAudioPanel() {
    const panel = document.createElement('div');
    panel.className = 'options-menu__panel options-menu__panel--active';

    const section = document.createElement('div');
    section.className = 'options-menu__section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'options-menu__section-title';
    sectionTitle.textContent = 'Volume';
    section.appendChild(sectionTitle);

    // Volume sliders
    const volumeSettings = [
      { id: AudioCategory.MASTER, label: 'Master' },
      { id: AudioCategory.MUSIC, label: 'Music' },
      { id: AudioCategory.SFX, label: 'Sound FX' },
      { id: AudioCategory.AMBIENT, label: 'Ambient' },
      { id: AudioCategory.UI, label: 'UI' },
    ];

    for (const setting of volumeSettings) {
      const row = this.createSliderRow(
        setting.label,
        setting.id,
        this.audioManager ? this.audioManager.getVolume(setting.id) : 1,
        (value) => {
          if (this.audioManager) {
            this.audioManager.setVolume(setting.id, value);
            this.audioManager.saveSettings();
          }
        }
      );
      section.appendChild(row);
    }

    panel.appendChild(section);
    return panel;
  }

  /**
   * Create controls settings panel
   * @returns {HTMLElement}
   */
  createControlsPanel() {
    const panel = document.createElement('div');
    panel.className = 'options-menu__panel';

    // Gamepad status section
    const gamepadSection = document.createElement('div');
    gamepadSection.className = 'options-menu__section';

    const gamepadTitle = document.createElement('div');
    gamepadTitle.className = 'options-menu__section-title';
    gamepadTitle.textContent = 'Gamepad';
    gamepadSection.appendChild(gamepadTitle);

    const gamepadStatus = document.createElement('div');
    gamepadStatus.className = 'options-menu__gamepad-status';
    this.updateGamepadStatus(gamepadStatus);
    gamepadSection.appendChild(gamepadStatus);
    this.gamepadStatusElement = gamepadStatus;

    panel.appendChild(gamepadSection);

    // Deadzone setting
    const deadzoneSection = document.createElement('div');
    deadzoneSection.className = 'options-menu__section';

    const deadzoneTitle = document.createElement('div');
    deadzoneTitle.className = 'options-menu__section-title';
    deadzoneTitle.textContent = 'Gamepad Settings';
    deadzoneSection.appendChild(deadzoneTitle);

    const deadzoneRow = this.createSliderRow(
      'Deadzone',
      'deadzone',
      this.inputManager ? this.inputManager.gamepadDeadzone : 0.15,
      (value) => {
        if (this.inputManager) {
          this.inputManager.setGamepadDeadzone(value);
        }
      },
      0, 0.5, 0.01
    );
    deadzoneSection.appendChild(deadzoneRow);

    panel.appendChild(deadzoneSection);

    // Keyboard hints
    const keyboardSection = document.createElement('div');
    keyboardSection.className = 'options-menu__section';

    const keyboardTitle = document.createElement('div');
    keyboardTitle.className = 'options-menu__section-title';
    keyboardTitle.textContent = 'Keyboard Controls';
    keyboardSection.appendChild(keyboardTitle);

    const info = document.createElement('div');
    info.className = 'options-menu__info';

    const controls = [
      { key: 'Movement', value: 'WASD or Arrow Keys' },
      { key: 'Handbrake', value: 'Space' },
      { key: 'Horn', value: 'H' },
      { key: 'Headlights', value: 'L' },
      { key: 'Camera', value: 'C' },
      { key: 'Pause', value: 'ESC' },
    ];

    for (const control of controls) {
      const line = document.createElement('div');
      line.className = 'options-menu__info-line';

      const keySpan = document.createElement('span');
      keySpan.className = 'options-menu__info-key';
      keySpan.textContent = control.key + ': ';
      line.appendChild(keySpan);

      const valueSpan = document.createTextNode(control.value);
      line.appendChild(valueSpan);

      info.appendChild(line);
    }

    keyboardSection.appendChild(info);
    panel.appendChild(keyboardSection);

    return panel;
  }

  /**
   * Create graphics settings panel
   * @returns {HTMLElement}
   */
  createGraphicsPanel() {
    const panel = document.createElement('div');
    panel.className = 'options-menu__panel';

    const section = document.createElement('div');
    section.className = 'options-menu__section';

    const info = document.createElement('div');
    info.className = 'options-menu__info';
    info.textContent = 'Graphics settings coming soon...';
    section.appendChild(info);

    panel.appendChild(section);
    return panel;
  }

  /**
   * Create a slider row
   * @param {string} label
   * @param {string} id
   * @param {number} value
   * @param {Function} onChange
   * @param {number} min
   * @param {number} max
   * @param {number} step
   * @returns {HTMLElement}
   */
  createSliderRow(label, id, value, onChange, min = 0, max = 1, step = 0.01) {
    const row = document.createElement('div');
    row.className = 'options-menu__row';

    const labelEl = document.createElement('div');
    labelEl.className = 'options-menu__label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const container = document.createElement('div');
    container.className = 'options-menu__slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'options-menu__slider';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'options-menu__value';
    valueDisplay.textContent = Math.round(value * 100) + '%';

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueDisplay.textContent = Math.round(val * 100) + '%';
      onChange(val);
    });

    container.appendChild(slider);
    container.appendChild(valueDisplay);
    row.appendChild(container);

    this.sliders.set(id, { slider, valueDisplay });
    return row;
  }

  /**
   * Update gamepad status display
   * @param {HTMLElement} element
   */
  updateGamepadStatus(element) {
    const connected = this.inputManager && this.inputManager.isGamepadConnected();
    const name = this.inputManager ? this.inputManager.getGamepadName() : null;

    element.className = 'options-menu__gamepad-status';
    element.classList.add(connected ? 'options-menu__gamepad-status--connected' : 'options-menu__gamepad-status--disconnected');

    // Clear existing content
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'options-menu__gamepad-name';
    nameEl.textContent = connected ? name : 'No gamepad connected';
    element.appendChild(nameEl);

    const hintEl = document.createElement('div');
    hintEl.className = 'options-menu__gamepad-hint';
    hintEl.textContent = connected
      ? 'RT: Accelerate | LT: Brake | Left Stick: Steer'
      : 'Connect a gamepad and press any button to use it';
    element.appendChild(hintEl);
  }

  /**
   * Switch to a different tab
   * @param {string} tabId
   */
  switchTab(tabId) {
    this.activeTab = tabId;

    // Update tab buttons
    for (const [id, btn] of this.tabButtons) {
      btn.classList.toggle('options-menu__tab--active', id === tabId);
    }

    // Update panels
    for (const [id, panel] of this.tabPanels) {
      panel.classList.toggle('options-menu__panel--active', id === tabId);
    }

    // Refresh gamepad status when switching to controls tab
    if (tabId === 'controls' && this.gamepadStatusElement) {
      this.updateGamepadStatus(this.gamepadStatusElement);
    }
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    // Reset audio
    if (this.audioManager) {
      this.audioManager.setVolume(AudioCategory.MASTER, 1.0);
      this.audioManager.setVolume(AudioCategory.MUSIC, 0.5);
      this.audioManager.setVolume(AudioCategory.SFX, 0.8);
      this.audioManager.setVolume(AudioCategory.AMBIENT, 0.6);
      this.audioManager.setVolume(AudioCategory.UI, 0.7);
      this.audioManager.saveSettings();
    }

    // Reset input
    if (this.inputManager) {
      this.inputManager.setGamepadDeadzone(0.15);
      this.inputManager.resetBindings();
    }

    // Update sliders
    this.updateSliderValues();
  }

  /**
   * Update slider values from current settings
   */
  updateSliderValues() {
    for (const [id, { slider, valueDisplay }] of this.sliders) {
      let value;
      if (Object.values(AudioCategory).includes(id)) {
        value = this.audioManager ? this.audioManager.getVolume(id) : 1;
      } else if (id === 'deadzone') {
        value = this.inputManager ? this.inputManager.gamepadDeadzone : 0.15;
      }

      if (value !== undefined) {
        slider.value = value;
        valueDisplay.textContent = Math.round(value * 100) + '%';
      }
    }
  }

  /**
   * Show the options menu
   */
  show() {
    this.updateSliderValues();
    if (this.gamepadStatusElement) {
      this.updateGamepadStatus(this.gamepadStatusElement);
    }
    this.uiManager.showScreen('optionsMenu');
  }

  /**
   * Close the options menu
   */
  close() {
    this.uiManager.hideAllScreens();
    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }
}

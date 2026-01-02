/**
 * MainMenu - Main menu screen
 *
 * Displays game title, logo, and menu options.
 */

export class MainMenu {
  constructor(uiManager, callbacks = {}) {
    this.uiManager = uiManager;
    this.callbacks = callbacks;
    this.element = null;
  }

  /**
   * Create and register the main menu
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerScreen('mainMenu', this.element);
  }

  /**
   * Add CSS styles to document
   */
  addStyles() {
    if (document.getElementById('main-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'main-menu-styles';
    style.textContent = `
      .main-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .main-menu::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('/images/mts-cover.png');
        background-size: cover;
        background-position: center;
        opacity: 0.3;
        z-index: 0;
      }
      .main-menu__content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .main-menu__logo {
        width: 250px;
        height: auto;
        margin-bottom: 10px;
        filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
        animation: logoFloat 3s ease-in-out infinite;
      }
      @keyframes logoFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .main-menu__tagline {
        color: #8BC34A;
        font-size: 18px;
        font-style: italic;
        margin-bottom: 30px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      }
      .main-menu__buttons {
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 280px;
      }
      .main-menu__btn {
        padding: 16px 32px;
        font-size: 18px;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .main-menu__btn--primary {
        background: linear-gradient(135deg, #4CAF50, #8BC34A);
        color: white;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
      }
      .main-menu__btn--primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.6);
      }
      .main-menu__btn--secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }
      .main-menu__btn--secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }
      .main-menu__btn:active {
        transform: translateY(1px);
      }
      .main-menu__version {
        position: absolute;
        bottom: 20px;
        right: 20px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
      }
      .main-menu__controls-hint {
        position: absolute;
        bottom: 20px;
        left: 20px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the main menu element using DOM methods
   * @returns {HTMLElement}
   */
  createElement() {
    this.addStyles();

    const menu = document.createElement('div');
    menu.className = 'main-menu';

    // Content container
    const content = document.createElement('div');
    content.className = 'main-menu__content';

    // Logo
    const logo = document.createElement('img');
    logo.className = 'main-menu__logo';
    logo.src = '/images/mts-logo.png';
    logo.alt = 'Mindanao Truck Simulator';
    content.appendChild(logo);

    // Tagline
    const tagline = document.createElement('div');
    tagline.className = 'main-menu__tagline';
    tagline.textContent = 'Casual Driving Experience';
    content.appendChild(tagline);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'main-menu__buttons';

    // Start button
    const startBtn = this.createButton('Start Game', 'start', true);
    buttons.appendChild(startBtn);

    // Options button
    const optionsBtn = this.createButton('Options', 'options', false);
    buttons.appendChild(optionsBtn);

    // About button
    const aboutBtn = this.createButton('About', 'about', false);
    buttons.appendChild(aboutBtn);

    content.appendChild(buttons);
    menu.appendChild(content);

    // Version
    const version = document.createElement('div');
    version.className = 'main-menu__version';
    version.textContent = 'v0.1.0';
    menu.appendChild(version);

    // Controls hint
    const hint = document.createElement('div');
    hint.className = 'main-menu__controls-hint';
    hint.textContent = 'WASD to drive | C for camera | ESC to pause';
    menu.appendChild(hint);

    return menu;
  }

  /**
   * Create a menu button
   * @param {string} text - Button text
   * @param {string} action - Action identifier
   * @param {boolean} primary - Is primary button
   * @returns {HTMLButtonElement}
   */
  createButton(text, action, primary) {
    const btn = document.createElement('button');
    btn.className = `main-menu__btn main-menu__btn--${primary ? 'primary' : 'secondary'}`;
    btn.textContent = text;
    btn.addEventListener('click', () => this.handleAction(action));
    return btn;
  }

  /**
   * Handle menu button actions
   * @param {string} action
   */
  handleAction(action) {
    switch (action) {
      case 'start':
        if (this.callbacks.onStart) {
          this.callbacks.onStart();
        }
        break;
      case 'options':
        if (this.callbacks.onOptions) {
          this.callbacks.onOptions();
        }
        break;
      case 'about':
        if (this.callbacks.onAbout) {
          this.callbacks.onAbout();
        }
        break;
    }
  }

  /**
   * Show the main menu
   */
  show() {
    this.uiManager.showScreen('mainMenu');
  }

  /**
   * Hide the main menu
   */
  hide() {
    this.uiManager.hideAllScreens();
  }
}

/**
 * PauseMenu - In-game pause menu
 *
 * Displayed when the game is paused (ESC key).
 */

export class PauseMenu {
  constructor(uiManager, callbacks = {}) {
    this.uiManager = uiManager;
    this.callbacks = callbacks;
    this.element = null;
  }

  /**
   * Create and register the pause menu
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerScreen('pauseMenu', this.element);
  }

  /**
   * Add CSS styles to document
   */
  addStyles() {
    if (document.getElementById('pause-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'pause-menu-styles';
    style.textContent = `
      .pause-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .pause-menu__content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .pause-menu__title {
        color: white;
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 20px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      }
      .pause-menu__buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 250px;
      }
      .pause-menu__btn {
        padding: 14px 28px;
        font-size: 16px;
        font-weight: 600;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .pause-menu__btn--primary {
        background: linear-gradient(135deg, #4CAF50, #8BC34A);
        color: white;
      }
      .pause-menu__btn--primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
      }
      .pause-menu__btn--secondary {
        background: rgba(255, 255, 255, 0.15);
        color: white;
      }
      .pause-menu__btn--secondary:hover {
        background: rgba(255, 255, 255, 0.25);
      }
      .pause-menu__btn--danger {
        background: rgba(244, 67, 54, 0.8);
        color: white;
      }
      .pause-menu__btn--danger:hover {
        background: rgba(244, 67, 54, 1);
      }
      .pause-menu__hint {
        margin-top: 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the pause menu element using DOM methods
   * @returns {HTMLElement}
   */
  createElement() {
    this.addStyles();

    const menu = document.createElement('div');
    menu.className = 'pause-menu';

    // Content container
    const content = document.createElement('div');
    content.className = 'pause-menu__content';

    // Title
    const title = document.createElement('div');
    title.className = 'pause-menu__title';
    title.textContent = 'PAUSED';
    content.appendChild(title);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'pause-menu__buttons';

    // Resume button
    const resumeBtn = this.createButton('Resume', 'resume', 'primary');
    buttons.appendChild(resumeBtn);

    // Options button
    const optionsBtn = this.createButton('Options', 'options', 'secondary');
    buttons.appendChild(optionsBtn);

    // Main Menu button
    const mainMenuBtn = this.createButton('Main Menu', 'mainMenu', 'danger');
    buttons.appendChild(mainMenuBtn);

    content.appendChild(buttons);

    // Hint
    const hint = document.createElement('div');
    hint.className = 'pause-menu__hint';
    hint.textContent = 'Press ESC to resume';
    content.appendChild(hint);

    menu.appendChild(content);

    return menu;
  }

  /**
   * Create a menu button
   * @param {string} text - Button text
   * @param {string} action - Action identifier
   * @param {string} type - Button type (primary, secondary, danger)
   * @returns {HTMLButtonElement}
   */
  createButton(text, action, type) {
    const btn = document.createElement('button');
    btn.className = `pause-menu__btn pause-menu__btn--${type}`;
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
      case 'resume':
        if (this.callbacks.onResume) {
          this.callbacks.onResume();
        }
        break;
      case 'options':
        if (this.callbacks.onOptions) {
          this.callbacks.onOptions();
        }
        break;
      case 'mainMenu':
        if (this.callbacks.onMainMenu) {
          this.callbacks.onMainMenu();
        }
        break;
    }
  }

  /**
   * Show the pause menu
   */
  show() {
    this.uiManager.showScreen('pauseMenu');
  }

  /**
   * Hide the pause menu
   */
  hide() {
    this.uiManager.hideAllScreens();
  }
}

/**
 * InputManager - Handles all input from keyboard, gamepad, and mouse
 *
 * Provides a unified input system that can be queried by game systems.
 * Includes force feedback support for racing wheels and gamepads.
 */

// Force feedback effect types
export const FFBEffect = {
  ENGINE_RUMBLE: 'engineRumble',
  ROAD_SURFACE: 'roadSurface',
  COLLISION: 'collision',
  BRAKE: 'brake',
  STEERING_RESISTANCE: 'steeringResistance',
};

// Input action names
export const InputAction = {
  ACCELERATE: 'accelerate',
  BRAKE: 'brake',
  STEER_LEFT: 'steerLeft',
  STEER_RIGHT: 'steerRight',
  HANDBRAKE: 'handbrake',
  HORN: 'horn',
  HEADLIGHTS: 'headlights',
  CAMERA_NEXT: 'cameraNext',
  PAUSE: 'pause',
  TOGGLE_MAP: 'toggleMap',
  TOGGLE_JOBS: 'toggleJobs',
  TOGGLE_GARAGE: 'toggleGarage',
  RADIO_TOGGLE: 'radioToggle',
  RADIO_NEXT: 'radioNext',
  RADIO_PREV: 'radioPrev',
  REFUEL: 'refuel',
  WEATHER_CYCLE: 'weatherCycle',
  REPAIR: 'repair',
};

// Default gamepad button/axis mappings (standard gamepad layout)
// Standard Gamepad API button indices
const GAMEPAD_BUTTONS = {
  A: 0,           // Bottom button (A/Cross)
  B: 1,           // Right button (B/Circle)
  X: 2,           // Left button (X/Square)
  Y: 3,           // Top button (Y/Triangle)
  LB: 4,          // Left bumper
  RB: 5,          // Right bumper
  LT: 6,          // Left trigger (also axis)
  RT: 7,          // Right trigger (also axis)
  BACK: 8,        // Back/Select/Share
  START: 9,       // Start/Options
  L3: 10,         // Left stick press
  R3: 11,         // Right stick press
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

// Standard Gamepad API axis indices
const GAMEPAD_AXES = {
  LEFT_X: 0,      // Left stick horizontal (-1 left, 1 right)
  LEFT_Y: 1,      // Left stick vertical (-1 up, 1 down)
  RIGHT_X: 2,     // Right stick horizontal
  RIGHT_Y: 3,     // Right stick vertical
};

// Default gamepad mappings
const DEFAULT_GAMEPAD_MAPPINGS = {
  buttons: {
    [GAMEPAD_BUTTONS.A]: InputAction.HANDBRAKE,
    [GAMEPAD_BUTTONS.B]: InputAction.HORN,
    [GAMEPAD_BUTTONS.Y]: InputAction.HEADLIGHTS,
    [GAMEPAD_BUTTONS.RB]: InputAction.CAMERA_NEXT,
    [GAMEPAD_BUTTONS.START]: InputAction.PAUSE,
    [GAMEPAD_BUTTONS.BACK]: InputAction.TOGGLE_MAP,
  },
  // Axes mapped to actions (value threshold for activation)
  axes: {
    steering: GAMEPAD_AXES.LEFT_X,  // Left stick X for steering
    // RT (button 7) and LT (button 6) are used as triggers on modern controllers
  },
  // For racing wheels, triggers are axes 2 and 5
  triggerThrottle: GAMEPAD_BUTTONS.RT,  // Right trigger for throttle
  triggerBrake: GAMEPAD_BUTTONS.LT,     // Left trigger for brake
};

// Default keyboard bindings
const DEFAULT_KEY_BINDINGS = {
  // Movement - WASD
  'KeyW': InputAction.ACCELERATE,
  'KeyS': InputAction.BRAKE,
  'KeyA': InputAction.STEER_LEFT,
  'KeyD': InputAction.STEER_RIGHT,

  // Movement - Arrow keys
  'ArrowUp': InputAction.ACCELERATE,
  'ArrowDown': InputAction.BRAKE,
  'ArrowLeft': InputAction.STEER_LEFT,
  'ArrowRight': InputAction.STEER_RIGHT,

  // Actions
  'Space': InputAction.HANDBRAKE,
  'KeyH': InputAction.HORN,
  'KeyL': InputAction.HEADLIGHTS,
  'KeyC': InputAction.CAMERA_NEXT,
  'Escape': InputAction.PAUSE,
  'KeyM': InputAction.TOGGLE_MAP,
  'KeyJ': InputAction.TOGGLE_JOBS,
  'KeyG': InputAction.TOGGLE_GARAGE,
  'KeyR': InputAction.RADIO_TOGGLE,
  'BracketRight': InputAction.RADIO_NEXT,
  'BracketLeft': InputAction.RADIO_PREV,
  'KeyF': InputAction.REFUEL,
  'KeyP': InputAction.WEATHER_CYCLE,
  'KeyN': InputAction.REPAIR,
};

export class InputManager {
  constructor() {
    // Current key states
    this.keyStates = new Map();

    // Action states (binary on/off)
    this.actionStates = new Map();

    // Action values (for analog input, 0-1 range)
    this.actionValues = new Map();

    // Key bindings (key code -> action)
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS };

    // Action callbacks for one-shot events (key press, not hold)
    this.actionCallbacks = new Map();

    // Track keys that were just pressed this frame
    this.justPressed = new Set();

    // Track keys that were just released this frame
    this.justReleased = new Set();

    // Gamepad state
    this.gamepads = [];
    this.activeGamepadIndex = -1;
    this.gamepadMappings = { ...DEFAULT_GAMEPAD_MAPPINGS };
    this.gamepadDeadzone = 0.15;
    this.gamepadConnected = false;

    // Gamepad analog values (for smooth steering/throttle)
    this.gamepadSteering = 0;
    this.gamepadThrottle = 0;
    this.gamepadBrake = 0;

    // Track gamepad button press states (for one-shot callbacks)
    this.gamepadButtonStates = new Map();
    this.gamepadJustPressed = new Set();

    // Force feedback state
    this.ffbEnabled = true;
    this.ffbIntensity = 1.0; // 0-1 master intensity
    this.vibrationActuator = null;
    this.currentVibration = { weak: 0, strong: 0 };
    this.activeEffects = new Map(); // Track active continuous effects

    // Initialize action states
    for (const action of Object.values(InputAction)) {
      this.actionStates.set(action, false);
      this.actionValues.set(action, 0);
    }

    // Bound event handlers (for removal)
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onBlur = this._handleBlur.bind(this);
    this._onGamepadConnected = this._handleGamepadConnected.bind(this);
    this._onGamepadDisconnected = this._handleGamepadDisconnected.bind(this);

    // Start listening
    this._setupEventListeners();
  }

  /**
   * Setup keyboard and gamepad event listeners
   */
  _setupEventListeners() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('gamepadconnected', this._onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected);
  }

  /**
   * Remove event listeners (cleanup)
   */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('gamepadconnected', this._onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnected);
  }

  /**
   * Handle gamepad connection
   * @param {GamepadEvent} event
   */
  _handleGamepadConnected(event) {
    console.log(`Gamepad connected: ${event.gamepad.id} (index ${event.gamepad.index})`);
    this.activeGamepadIndex = event.gamepad.index;
    this.gamepadConnected = true;

    // Check for vibration actuator (force feedback support)
    this._initVibrationActuator(event.gamepad);
  }

  /**
   * Initialize vibration actuator for force feedback
   * @param {Gamepad} gamepad
   */
  _initVibrationActuator(gamepad) {
    // Check for vibrationActuator (standard)
    if (gamepad.vibrationActuator) {
      this.vibrationActuator = gamepad.vibrationActuator;
      console.log('Force feedback available (vibrationActuator)');
      return;
    }

    // Check for hapticActuators (older spec)
    if (gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
      this.vibrationActuator = gamepad.hapticActuators[0];
      console.log('Force feedback available (hapticActuators)');
      return;
    }

    console.log('No force feedback support detected');
    this.vibrationActuator = null;
  }

  /**
   * Handle gamepad disconnection
   * @param {GamepadEvent} event
   */
  _handleGamepadDisconnected(event) {
    console.log(`Gamepad disconnected: ${event.gamepad.id}`);
    if (this.activeGamepadIndex === event.gamepad.index) {
      this.activeGamepadIndex = -1;
      this.gamepadConnected = false;
      this.gamepadSteering = 0;
      this.gamepadThrottle = 0;
      this.gamepadBrake = 0;
    }
  }

  /**
   * Handle key down event
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    // Ignore if typing in an input field
    if (this._isTypingInInput(event)) return;

    const code = event.code;

    // Track if this is a new press (not a repeat)
    if (!this.keyStates.get(code)) {
      this.justPressed.add(code);

      // Trigger one-shot callbacks
      const action = this.keyBindings[code];
      if (action && this.actionCallbacks.has(action)) {
        for (const callback of this.actionCallbacks.get(action)) {
          callback();
        }
      }
    }

    // Update key state
    this.keyStates.set(code, true);

    // Update action state
    const action = this.keyBindings[code];
    if (action) {
      this.actionStates.set(action, true);
      this.actionValues.set(action, 1);

      // Prevent default for game keys
      event.preventDefault();
    }
  }

  /**
   * Handle key up event
   * @param {KeyboardEvent} event
   */
  _handleKeyUp(event) {
    const code = event.code;

    // Track release
    if (this.keyStates.get(code)) {
      this.justReleased.add(code);
    }

    // Update key state
    this.keyStates.set(code, false);

    // Update action state
    const action = this.keyBindings[code];
    if (action) {
      // Check if any other key is bound to the same action and still pressed
      const stillPressed = Object.entries(this.keyBindings).some(
        ([key, act]) => act === action && this.keyStates.get(key)
      );

      if (!stillPressed) {
        this.actionStates.set(action, false);
        this.actionValues.set(action, 0);
      }
    }
  }

  /**
   * Handle window blur (release all keys)
   */
  _handleBlur() {
    // Release all keys when window loses focus
    for (const [code, pressed] of this.keyStates) {
      if (pressed) {
        this.keyStates.set(code, false);
        this.justReleased.add(code);
      }
    }

    // Reset all action states
    for (const action of Object.values(InputAction)) {
      this.actionStates.set(action, false);
      this.actionValues.set(action, 0);
    }
  }

  /**
   * Check if user is typing in an input field
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  _isTypingInInput(event) {
    const target = event.target;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  /**
   * Update input state (call once per frame)
   * Clears just-pressed/released states and polls gamepad
   */
  update() {
    this.justPressed.clear();
    this.justReleased.clear();
    this.gamepadJustPressed.clear();

    // Poll gamepad input
    this._pollGamepad();
  }

  /**
   * Poll connected gamepads and update input state
   */
  _pollGamepad() {
    // Get fresh gamepad state (required by Gamepad API)
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    if (this.activeGamepadIndex < 0) {
      // Try to find a connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          this.activeGamepadIndex = i;
          this.gamepadConnected = true;
          console.log(`Using gamepad: ${gamepads[i].id}`);
          break;
        }
      }
    }

    if (this.activeGamepadIndex < 0) return;

    const gamepad = gamepads[this.activeGamepadIndex];
    if (!gamepad) {
      this.activeGamepadIndex = -1;
      this.gamepadConnected = false;
      return;
    }

    // Read analog steering from left stick
    const steerAxis = gamepad.axes[this.gamepadMappings.axes.steering] || 0;
    this.gamepadSteering = this._applyDeadzone(steerAxis);

    // Read triggers for throttle/brake
    // Modern controllers expose triggers as buttons with analog values
    const throttleButton = gamepad.buttons[this.gamepadMappings.triggerThrottle];
    const brakeButton = gamepad.buttons[this.gamepadMappings.triggerBrake];

    this.gamepadThrottle = throttleButton ? throttleButton.value : 0;
    this.gamepadBrake = brakeButton ? brakeButton.value : 0;

    // Process button presses for one-shot actions
    for (const [buttonIndex, action] of Object.entries(this.gamepadMappings.buttons)) {
      const button = gamepad.buttons[buttonIndex];
      if (!button) continue;

      const wasPressed = this.gamepadButtonStates.get(buttonIndex) || false;
      const isPressed = button.pressed;

      // Update state
      this.gamepadButtonStates.set(buttonIndex, isPressed);

      // Check for just pressed
      if (isPressed && !wasPressed) {
        this.gamepadJustPressed.add(buttonIndex);

        // Trigger action callbacks
        if (this.actionCallbacks.has(action)) {
          for (const callback of this.actionCallbacks.get(action)) {
            callback();
          }
        }
      }

      // Update action state from gamepad
      if (isPressed) {
        this.actionStates.set(action, true);
        this.actionValues.set(action, 1);
      }
    }
  }

  /**
   * Apply deadzone to axis value
   * @param {number} value - Raw axis value (-1 to 1)
   * @returns {number} - Adjusted value with deadzone applied
   */
  _applyDeadzone(value) {
    if (Math.abs(value) < this.gamepadDeadzone) {
      return 0;
    }
    // Scale value to 0-1 range after deadzone
    const sign = Math.sign(value);
    const magnitude = Math.abs(value);
    return sign * (magnitude - this.gamepadDeadzone) / (1 - this.gamepadDeadzone);
  }

  /**
   * Check if an action is currently active (held down)
   * @param {string} action - Action name from InputAction
   * @returns {boolean}
   */
  isActionActive(action) {
    return this.actionStates.get(action) || false;
  }

  /**
   * Get analog value for an action (0-1 range)
   * For keyboard, this is binary (0 or 1)
   * For gamepad, this can be any value in range
   * @param {string} action - Action name from InputAction
   * @returns {number}
   */
  getActionValue(action) {
    return this.actionValues.get(action) || 0;
  }

  /**
   * Check if an action was just pressed this frame
   * @param {string} action - Action name from InputAction
   * @returns {boolean}
   */
  isActionJustPressed(action) {
    for (const code of this.justPressed) {
      if (this.keyBindings[code] === action) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if an action was just released this frame
   * @param {string} action - Action name from InputAction
   * @returns {boolean}
   */
  isActionJustReleased(action) {
    for (const code of this.justReleased) {
      if (this.keyBindings[code] === action) {
        return true;
      }
    }
    return false;
  }

  /**
   * Register a callback for when an action is triggered (one-shot)
   * @param {string} action - Action name from InputAction
   * @param {Function} callback - Function to call
   */
  onAction(action, callback) {
    if (!this.actionCallbacks.has(action)) {
      this.actionCallbacks.set(action, []);
    }
    this.actionCallbacks.get(action).push(callback);
  }

  /**
   * Remove an action callback
   * @param {string} action - Action name from InputAction
   * @param {Function} callback - Function to remove
   */
  offAction(action, callback) {
    if (this.actionCallbacks.has(action)) {
      const callbacks = this.actionCallbacks.get(action);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Get steering input (-1 to 1, left to right)
   * Combines keyboard left/right inputs and gamepad steering
   * @returns {number}
   */
  getSteeringInput() {
    // Keyboard input
    const left = this.getActionValue(InputAction.STEER_LEFT);
    const right = this.getActionValue(InputAction.STEER_RIGHT);
    const keyboardSteering = right - left;

    // Use gamepad if it has larger input, otherwise keyboard
    if (Math.abs(this.gamepadSteering) > Math.abs(keyboardSteering)) {
      return this.gamepadSteering;
    }
    return keyboardSteering;
  }

  /**
   * Get throttle input (0 to 1)
   * Combines keyboard and gamepad input
   * @returns {number}
   */
  getThrottleInput() {
    const keyboardThrottle = this.getActionValue(InputAction.ACCELERATE);
    // Return the larger of keyboard or gamepad input
    return Math.max(keyboardThrottle, this.gamepadThrottle);
  }

  /**
   * Get brake input (0 to 1)
   * Combines keyboard and gamepad input
   * @returns {number}
   */
  getBrakeInput() {
    const keyboardBrake = this.getActionValue(InputAction.BRAKE);
    // Return the larger of keyboard or gamepad input
    return Math.max(keyboardBrake, this.gamepadBrake);
  }

  /**
   * Check if handbrake is active
   * @returns {boolean}
   */
  isHandbrakeActive() {
    return this.isActionActive(InputAction.HANDBRAKE);
  }

  /**
   * Check if a gamepad is connected
   * @returns {boolean}
   */
  isGamepadConnected() {
    return this.gamepadConnected;
  }

  /**
   * Get the name of the connected gamepad
   * @returns {string|null}
   */
  getGamepadName() {
    if (!this.gamepadConnected || this.activeGamepadIndex < 0) return null;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[this.activeGamepadIndex];
    return gamepad ? gamepad.id : null;
  }

  /**
   * Set gamepad deadzone
   * @param {number} deadzone - Deadzone value (0-0.5)
   */
  setGamepadDeadzone(deadzone) {
    this.gamepadDeadzone = Math.max(0, Math.min(0.5, deadzone));
  }

  /**
   * Rebind a key to an action
   * @param {string} action - Action name from InputAction
   * @param {string} keyCode - Key code (e.g., 'KeyW')
   */
  rebindKey(action, keyCode) {
    // Remove any existing binding for this key
    delete this.keyBindings[keyCode];

    // Remove old binding for this action (only primary, keep secondary arrow keys)
    for (const [key, act] of Object.entries(this.keyBindings)) {
      if (act === action && !key.startsWith('Arrow')) {
        delete this.keyBindings[key];
        break;
      }
    }

    // Add new binding
    this.keyBindings[keyCode] = action;
  }

  /**
   * Get the primary key bound to an action
   * @param {string} action - Action name from InputAction
   * @returns {string|null} Key code or null if not bound
   */
  getKeyForAction(action) {
    for (const [key, act] of Object.entries(this.keyBindings)) {
      if (act === action && !key.startsWith('Arrow')) {
        return key;
      }
    }
    // Fallback to arrow keys if no primary binding
    for (const [key, act] of Object.entries(this.keyBindings)) {
      if (act === action) {
        return key;
      }
    }
    return null;
  }

  /**
   * Reset key bindings to defaults
   */
  resetBindings() {
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS };
  }

  /**
   * Get all current key bindings
   * @returns {Object}
   */
  getBindings() {
    return { ...this.keyBindings };
  }

  /**
   * Load key bindings from localStorage
   */
  loadBindings() {
    try {
      const saved = localStorage.getItem('mts_keybindings');
      if (saved) {
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load key bindings:', e);
    }
  }

  /**
   * Save key bindings to localStorage
   */
  saveBindings() {
    try {
      localStorage.setItem('mts_keybindings', JSON.stringify(this.keyBindings));
    } catch (e) {
      console.warn('Failed to save key bindings:', e);
    }
  }

  // ========== FORCE FEEDBACK METHODS ==========

  /**
   * Check if force feedback is supported
   * @returns {boolean}
   */
  hasForceFeedback() {
    return this.vibrationActuator !== null;
  }

  /**
   * Enable or disable force feedback
   * @param {boolean} enabled
   */
  setForceFeedbackEnabled(enabled) {
    this.ffbEnabled = enabled;
    if (!enabled) {
      this.stopAllVibration();
    }
  }

  /**
   * Set force feedback intensity
   * @param {number} intensity - 0 to 1
   */
  setForceFeedbackIntensity(intensity) {
    this.ffbIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Play a vibration effect
   * @param {number} weakMagnitude - Weak motor (0-1), good for subtle effects
   * @param {number} strongMagnitude - Strong motor (0-1), good for impacts
   * @param {number} duration - Duration in milliseconds
   */
  async playVibration(weakMagnitude, strongMagnitude, duration = 100) {
    if (!this.ffbEnabled || !this.vibrationActuator) return;

    const weak = weakMagnitude * this.ffbIntensity;
    const strong = strongMagnitude * this.ffbIntensity;

    try {
      // Standard Gamepad API vibration
      if (this.vibrationActuator.playEffect) {
        await this.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: duration,
          weakMagnitude: weak,
          strongMagnitude: strong,
        });
      } else if (this.vibrationActuator.pulse) {
        // Older haptic actuator API
        await this.vibrationActuator.pulse(Math.max(weak, strong), duration);
      }
    } catch (e) {
      // Vibration may fail silently on some browsers
    }
  }

  /**
   * Stop all vibration
   */
  async stopAllVibration() {
    if (!this.vibrationActuator) return;

    try {
      if (this.vibrationActuator.reset) {
        await this.vibrationActuator.reset();
      } else {
        await this.playVibration(0, 0, 10);
      }
    } catch (e) {
      // Ignore errors
    }

    this.activeEffects.clear();
    this.currentVibration = { weak: 0, strong: 0 };
  }

  /**
   * Play engine rumble effect (continuous, based on RPM)
   * @param {number} rpm - Engine RPM (0-8000 typical range)
   * @param {number} maxRpm - Maximum RPM
   */
  playEngineRumble(rpm, maxRpm = 6000) {
    if (!this.ffbEnabled || !this.vibrationActuator) return;

    const rpmRatio = Math.min(1, rpm / maxRpm);
    // Low frequency rumble that increases with RPM
    const weak = 0.1 + rpmRatio * 0.2;
    const strong = rpmRatio * 0.15;

    this.activeEffects.set(FFBEffect.ENGINE_RUMBLE, { weak, strong });
    this._updateContinuousVibration();
  }

  /**
   * Play road surface effect (varies by surface type)
   * @param {string} surface - 'asphalt', 'gravel', 'dirt', 'cobblestone'
   * @param {number} speed - Current speed in km/h
   */
  playRoadSurface(surface, speed) {
    if (!this.ffbEnabled || !this.vibrationActuator) return;

    const speedFactor = Math.min(1, speed / 80);
    let weak = 0, strong = 0;

    switch (surface) {
      case 'asphalt':
        weak = 0.02 * speedFactor;
        strong = 0;
        break;
      case 'gravel':
        weak = 0.3 * speedFactor;
        strong = 0.1 * speedFactor;
        break;
      case 'dirt':
        weak = 0.2 * speedFactor;
        strong = 0.15 * speedFactor;
        break;
      case 'cobblestone':
        weak = 0.4 * speedFactor;
        strong = 0.2 * speedFactor;
        break;
      default:
        weak = 0.05 * speedFactor;
    }

    this.activeEffects.set(FFBEffect.ROAD_SURFACE, { weak, strong });
    this._updateContinuousVibration();
  }

  /**
   * Play collision impact effect (one-shot)
   * @param {number} intensity - Impact intensity (0-1)
   */
  playCollision(intensity) {
    if (!this.ffbEnabled) return;

    const strong = Math.min(1, intensity);
    const weak = strong * 0.5;

    // Strong initial pulse
    this.playVibration(weak, strong, 150);

    // Followed by decay
    setTimeout(() => {
      this.playVibration(weak * 0.5, strong * 0.3, 100);
    }, 150);
  }

  /**
   * Play braking feedback effect
   * @param {number} brakeForce - Brake force (0-1)
   * @param {boolean} abs - Whether ABS is active
   */
  playBrakeEffect(brakeForce, abs = false) {
    if (!this.ffbEnabled || !this.vibrationActuator) return;

    let weak = brakeForce * 0.2;
    let strong = brakeForce * 0.3;

    // ABS pulse effect
    if (abs && brakeForce > 0.5) {
      weak = 0.4;
      strong = 0.2;
    }

    this.activeEffects.set(FFBEffect.BRAKE, { weak, strong });
    this._updateContinuousVibration();
  }

  /**
   * Clear a continuous effect
   * @param {string} effect - Effect type from FFBEffect
   */
  clearEffect(effect) {
    this.activeEffects.delete(effect);
    this._updateContinuousVibration();
  }

  /**
   * Update continuous vibration by combining all active effects
   * @private
   */
  _updateContinuousVibration() {
    if (!this.vibrationActuator) return;

    let totalWeak = 0;
    let totalStrong = 0;

    // Sum all active effects
    for (const effect of this.activeEffects.values()) {
      totalWeak += effect.weak;
      totalStrong += effect.strong;
    }

    // Clamp to 0-1 range
    totalWeak = Math.min(1, totalWeak);
    totalStrong = Math.min(1, totalStrong);

    // Only update if changed significantly
    if (Math.abs(totalWeak - this.currentVibration.weak) > 0.05 ||
        Math.abs(totalStrong - this.currentVibration.strong) > 0.05) {
      this.currentVibration = { weak: totalWeak, strong: totalStrong };
      this.playVibration(totalWeak, totalStrong, 50);
    }
  }
}

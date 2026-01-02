/**
 * AudioManager - Handles all game audio using Web Audio API
 *
 * Manages sound effects, music, and ambient sounds with category-based volume control.
 */

// Sound categories
export const AudioCategory = {
  MASTER: 'master',
  MUSIC: 'music',
  SFX: 'sfx',
  AMBIENT: 'ambient',
  UI: 'ui',
};

export class AudioManager {
  constructor() {
    // Web Audio API context
    this.audioContext = null;
    this.initialized = false;

    // Master gain node
    this.masterGain = null;

    // Category gain nodes
    this.categoryGains = new Map();

    // Volume settings (0-1)
    this.volumes = {
      [AudioCategory.MASTER]: 1.0,
      [AudioCategory.MUSIC]: 0.5,
      [AudioCategory.SFX]: 0.8,
      [AudioCategory.AMBIENT]: 0.6,
      [AudioCategory.UI]: 0.7,
    };

    // Loaded audio buffers
    this.buffers = new Map();

    // Active sounds (for stopping/managing)
    this.activeSounds = new Map();

    // Sound pools for frequently used sounds
    this.soundPools = new Map();

    // Currently playing loops
    this.loops = new Map();
  }

  /**
   * Initialize the audio system (call on first user interaction)
   */
  async init() {
    if (this.initialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volumes[AudioCategory.MASTER];
      this.masterGain.connect(this.audioContext.destination);

      // Create category gain nodes
      for (const category of Object.values(AudioCategory)) {
        if (category === AudioCategory.MASTER) continue;

        const gain = this.audioContext.createGain();
        gain.gain.value = this.volumes[category];
        gain.connect(this.masterGain);
        this.categoryGains.set(category, gain);
      }

      // Resume context if suspended (required for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.initialized = true;
      console.log('Audio system initialized');

      // Load default volume settings
      this.loadSettings();
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  /**
   * Load an audio file
   * @param {string} id - Unique identifier for the sound
   * @param {string} url - URL to the audio file
   * @returns {Promise<AudioBuffer>}
   */
  async loadSound(id, url) {
    if (this.buffers.has(id)) {
      return this.buffers.get(id);
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(id, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load sound ${id}:`, error);
      return null;
    }
  }

  /**
   * Play a sound effect
   * @param {string} id - Sound identifier
   * @param {Object} options - Playback options
   * @returns {AudioBufferSourceNode|null}
   */
  playSound(id, options = {}) {
    if (!this.initialized) return null;

    const buffer = this.buffers.get(id);
    if (!buffer) {
      console.warn(`Sound not loaded: ${id}`);
      return null;
    }

    const {
      category = AudioCategory.SFX,
      volume = 1.0,
      loop = false,
      pitch = 1.0,
      pan = 0, // -1 (left) to 1 (right)
    } = options;

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = pitch;

    // Create individual gain for this sound
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    // Create panner for stereo positioning
    const pannerNode = this.audioContext.createStereoPanner();
    pannerNode.pan.value = pan;

    // Connect: source -> gain -> panner -> category gain -> master
    source.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.categoryGains.get(category) || this.masterGain);

    // Start playback
    source.start();

    // Track the sound
    const soundId = `${id}_${Date.now()}`;
    this.activeSounds.set(soundId, { source, gainNode, category });

    // Remove from tracking when done
    source.onended = () => {
      this.activeSounds.delete(soundId);
    };

    return source;
  }

  /**
   * Play a looping sound (returns handle for control)
   * @param {string} id - Sound identifier
   * @param {Object} options - Playback options
   * @returns {Object} - Control handle
   */
  playLoop(id, options = {}) {
    if (!this.initialized) return null;

    const buffer = this.buffers.get(id);
    if (!buffer) {
      console.warn(`Sound not loaded: ${id}`);
      return null;
    }

    // Stop existing loop with same ID
    if (this.loops.has(id)) {
      this.stopLoop(id);
    }

    const {
      category = AudioCategory.SFX,
      volume = 1.0,
      pitch = 1.0,
    } = options;

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = pitch;

    // Create gain for this loop
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    // Connect
    source.connect(gainNode);
    gainNode.connect(this.categoryGains.get(category) || this.masterGain);

    // Start playback
    source.start();

    // Store loop reference
    const loopHandle = {
      source,
      gainNode,
      category,
      setVolume: (v) => {
        gainNode.gain.setTargetAtTime(v, this.audioContext.currentTime, 0.1);
      },
      setPitch: (p) => {
        source.playbackRate.setTargetAtTime(p, this.audioContext.currentTime, 0.1);
      },
      stop: () => this.stopLoop(id),
    };

    this.loops.set(id, loopHandle);
    return loopHandle;
  }

  /**
   * Stop a looping sound
   * @param {string} id - Loop identifier
   */
  stopLoop(id) {
    const loop = this.loops.get(id);
    if (loop) {
      try {
        // Fade out before stopping
        loop.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
        setTimeout(() => {
          try {
            loop.source.stop();
          } catch (e) {
            // Already stopped
          }
        }, 150);
      } catch (e) {
        // Source may already be stopped
      }
      this.loops.delete(id);
    }
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    // Stop all one-shot sounds
    for (const [id, sound] of this.activeSounds) {
      try {
        sound.source.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.activeSounds.clear();

    // Stop all loops
    for (const [id, loop] of this.loops) {
      try {
        loop.source.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.loops.clear();
  }

  /**
   * Set volume for a category
   * @param {string} category - Audio category
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(category, volume) {
    volume = Math.max(0, Math.min(1, volume));
    this.volumes[category] = volume;

    if (category === AudioCategory.MASTER) {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
      }
    } else {
      const gain = this.categoryGains.get(category);
      if (gain) {
        gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
      }
    }
  }

  /**
   * Get volume for a category
   * @param {string} category - Audio category
   * @returns {number}
   */
  getVolume(category) {
    return this.volumes[category] || 0;
  }

  /**
   * Mute/unmute a category
   * @param {string} category - Audio category
   * @param {boolean} muted - Whether to mute
   */
  setMuted(category, muted) {
    const volume = muted ? 0 : this.volumes[category];
    if (category === AudioCategory.MASTER) {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
      }
    } else {
      const gain = this.categoryGains.get(category);
      if (gain) {
        gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
      }
    }
  }

  /**
   * Save volume settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('mts_audio_settings', JSON.stringify(this.volumes));
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
    }
  }

  /**
   * Load volume settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('mts_audio_settings');
      if (saved) {
        const volumes = JSON.parse(saved);
        for (const [category, volume] of Object.entries(volumes)) {
          this.setVolume(category, volume);
        }
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  /**
   * Suspend audio (when game loses focus)
   */
  suspend() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /**
   * Resume audio (when game gains focus)
   */
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Check if audio is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Cleanup audio system
   */
  dispose() {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.buffers.clear();
    this.initialized = false;
  }
}

// Sound IDs for game
export const GameSounds = {
  // Engine
  ENGINE_IDLE: 'engine_idle',
  ENGINE_REV: 'engine_rev',
  ENGINE_START: 'engine_start',

  // Vehicle
  HORN: 'horn',
  BRAKE_SCREECH: 'brake_screech',
  COLLISION: 'collision',
  TURN_SIGNAL: 'turn_signal',

  // Ambient
  WIND: 'wind',
  NATURE: 'nature',
  TRAFFIC: 'traffic',

  // UI
  UI_CLICK: 'ui_click',
  UI_HOVER: 'ui_hover',
  NOTIFICATION: 'notification',
  MONEY: 'money',
};

// Sound file paths
export const SoundFiles = {
  [GameSounds.ENGINE_IDLE]: '/audio/engine-6000.mp3',
  [GameSounds.ENGINE_REV]: '/audio/engine-47745.mp3',
  [GameSounds.ENGINE_START]: '/audio/engine-start-86242.mp3',
};

/**
 * Load all essential game sounds
 * @param {AudioManager} audioManager
 * @returns {Promise<void>}
 */
export async function loadGameSounds(audioManager) {
  if (!audioManager.isInitialized()) {
    await audioManager.init();
  }

  const loadPromises = [];

  for (const [id, path] of Object.entries(SoundFiles)) {
    loadPromises.push(
      audioManager.loadSound(id, path).catch(err => {
        console.warn(`Failed to load ${id}:`, err);
      })
    );
  }

  await Promise.all(loadPromises);
  console.log('Game sounds loaded');
}

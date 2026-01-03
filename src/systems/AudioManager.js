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

    // Spatial audio: listener position (updated by game)
    this.listenerPosition = { x: 0, y: 0, z: 0 };
    this.listenerForward = { x: 0, y: 0, z: -1 };
    this.listenerUp = { x: 0, y: 1, z: 0 };

    // Active 3D sounds
    this.spatial3DSounds = new Map();
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
   * Update listener position and orientation for 3D audio
   * @param {Object} position - {x, y, z} listener position
   * @param {Object} forward - {x, y, z} forward direction vector
   * @param {Object} up - {x, y, z} up direction vector
   */
  setListenerPosition(position, forward = null, up = null) {
    if (!this.initialized || !this.audioContext) return;

    this.listenerPosition = position;
    if (forward) this.listenerForward = forward;
    if (up) this.listenerUp = up;

    const listener = this.audioContext.listener;

    // Update listener position
    if (listener.positionX) {
      // New API
      listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
      listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
      listener.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
    } else {
      // Legacy API
      listener.setPosition(position.x, position.y, position.z);
    }

    // Update listener orientation
    if (forward && up) {
      if (listener.forwardX) {
        // New API
        listener.forwardX.setValueAtTime(forward.x, this.audioContext.currentTime);
        listener.forwardY.setValueAtTime(forward.y, this.audioContext.currentTime);
        listener.forwardZ.setValueAtTime(forward.z, this.audioContext.currentTime);
        listener.upX.setValueAtTime(up.x, this.audioContext.currentTime);
        listener.upY.setValueAtTime(up.y, this.audioContext.currentTime);
        listener.upZ.setValueAtTime(up.z, this.audioContext.currentTime);
      } else {
        // Legacy API
        listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
      }
    }
  }

  /**
   * Play a 3D positioned sound
   * @param {string} id - Sound identifier
   * @param {Object} position - {x, y, z} world position
   * @param {Object} options - Playback options
   * @returns {Object|null} - Sound handle
   */
  playSound3D(id, position, options = {}) {
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
      refDistance = 10, // Distance at which volume is 100%
      maxDistance = 1000, // Distance at which volume is 0
      rolloffFactor = 1.0, // How quickly volume drops with distance
    } = options;

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = pitch;

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    // Create 3D panner node
    const pannerNode = this.audioContext.createPanner();
    pannerNode.panningModel = 'HRTF'; // High quality positional audio
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = refDistance;
    pannerNode.maxDistance = maxDistance;
    pannerNode.rolloffFactor = rolloffFactor;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 360;
    pannerNode.coneOuterGain = 1;

    // Set initial position
    if (pannerNode.positionX) {
      pannerNode.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
      pannerNode.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
      pannerNode.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
    } else {
      pannerNode.setPosition(position.x, position.y, position.z);
    }

    // Connect: source -> gain -> panner -> category gain -> master
    source.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.categoryGains.get(category) || this.masterGain);

    // Start playback
    source.start();

    // Create handle for controlling the sound
    const soundId = `${id}_3d_${Date.now()}`;
    const handle = {
      id: soundId,
      source,
      gainNode,
      pannerNode,
      category,
      isPlaying: true,
      setPosition: (pos) => {
        if (pannerNode.positionX) {
          pannerNode.positionX.setValueAtTime(pos.x, this.audioContext.currentTime);
          pannerNode.positionY.setValueAtTime(pos.y, this.audioContext.currentTime);
          pannerNode.positionZ.setValueAtTime(pos.z, this.audioContext.currentTime);
        } else {
          pannerNode.setPosition(pos.x, pos.y, pos.z);
        }
      },
      setVolume: (v) => {
        gainNode.gain.setTargetAtTime(v, this.audioContext.currentTime, 0.05);
      },
      stop: () => {
        try {
          gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
          setTimeout(() => {
            try { source.stop(); } catch (e) {}
          }, 100);
        } catch (e) {}
        handle.isPlaying = false;
        this.spatial3DSounds.delete(soundId);
      },
    };

    this.spatial3DSounds.set(soundId, handle);

    // Cleanup when sound ends naturally
    source.onended = () => {
      handle.isPlaying = false;
      this.spatial3DSounds.delete(soundId);
    };

    return handle;
  }

  /**
   * Play a looping 3D positioned sound
   * @param {string} id - Sound identifier
   * @param {Object} position - {x, y, z} world position
   * @param {Object} options - Playback options
   * @returns {Object|null} - Sound handle
   */
  playLoop3D(id, position, options = {}) {
    return this.playSound3D(id, position, { ...options, loop: true });
  }

  /**
   * Stop all 3D sounds
   */
  stopAll3D() {
    for (const [id, handle] of this.spatial3DSounds) {
      handle.stop();
    }
    this.spatial3DSounds.clear();
  }

  /**
   * Get distance from listener to a position
   * @param {Object} position - {x, y, z}
   * @returns {number}
   */
  getDistanceToListener(position) {
    const dx = position.x - this.listenerPosition.x;
    const dy = position.y - this.listenerPosition.y;
    const dz = position.z - this.listenerPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Cleanup audio system
   */
  dispose() {
    this.stopAll();
    this.stopAll3D();
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

/**
 * EngineAudio - Manages engine sound with dynamic pitch/volume based on RPM
 */
export class EngineAudio {
  constructor(audioManager) {
    this.audio = audioManager;
    this.idleLoop = null;
    this.revLoop = null;
    this.isRunning = false;
    this.currentRpm = 0;
    this.targetRpm = 0;
    this.minRpm = 800;
    this.maxRpm = 6000;
  }

  /**
   * Start the engine
   */
  async start() {
    if (this.isRunning) return;

    // Play engine start sound
    this.audio.playSound(GameSounds.ENGINE_START, {
      category: AudioCategory.SFX,
      volume: 0.6,
    });

    // Wait for start sound to play a bit, then start loops
    setTimeout(() => {
      this.isRunning = true;
      this.startLoops();
    }, 500);
  }

  /**
   * Start engine loops
   */
  startLoops() {
    // Start idle loop
    this.idleLoop = this.audio.playLoop(GameSounds.ENGINE_IDLE, {
      category: AudioCategory.SFX,
      volume: 0.4,
      pitch: 1.0,
    });

    // Start rev loop (initially quiet)
    this.revLoop = this.audio.playLoop(GameSounds.ENGINE_REV, {
      category: AudioCategory.SFX,
      volume: 0.0,
      pitch: 0.8,
    });
  }

  /**
   * Stop the engine
   */
  stop() {
    this.isRunning = false;
    if (this.idleLoop) {
      this.idleLoop.stop();
      this.idleLoop = null;
    }
    if (this.revLoop) {
      this.revLoop.stop();
      this.revLoop = null;
    }
  }

  /**
   * Update engine audio based on speed and throttle
   * @param {number} speed - Current speed in m/s
   * @param {number} throttle - Throttle input (0-1)
   * @param {number} maxSpeed - Maximum speed in m/s
   */
  update(speed, throttle, maxSpeed = 30) {
    if (!this.isRunning) return;

    // Calculate target RPM based on speed and throttle
    const speedFactor = Math.min(speed / maxSpeed, 1);
    const throttleFactor = throttle * 0.3; // Throttle adds some RPM

    // RPM follows speed primarily, with throttle adding responsiveness
    this.targetRpm = this.minRpm + (this.maxRpm - this.minRpm) * (speedFactor * 0.7 + throttleFactor);

    // Smoothly interpolate to target RPM
    this.currentRpm += (this.targetRpm - this.currentRpm) * 0.1;

    // Calculate normalized RPM (0-1)
    const rpmNormalized = (this.currentRpm - this.minRpm) / (this.maxRpm - this.minRpm);

    // Update idle loop - quieter at higher RPM
    if (this.idleLoop) {
      const idleVolume = Math.max(0.1, 0.4 * (1 - rpmNormalized * 0.7));
      const idlePitch = 0.9 + rpmNormalized * 0.3;
      this.idleLoop.setVolume(idleVolume);
      this.idleLoop.setPitch(idlePitch);
    }

    // Update rev loop - louder at higher RPM
    if (this.revLoop) {
      const revVolume = Math.min(0.6, rpmNormalized * 0.8);
      const revPitch = 0.7 + rpmNormalized * 0.6;
      this.revLoop.setVolume(revVolume);
      this.revLoop.setPitch(revPitch);
    }
  }

  /**
   * Check if engine is running
   * @returns {boolean}
   */
  getIsRunning() {
    return this.isRunning;
  }
}

/**
 * HornAudio - Synthesizes a truck horn sound using Web Audio API
 */
export class HornAudio {
  constructor(audioManager) {
    this.audio = audioManager;
    this.oscillators = [];
    this.gainNode = null;
    this.isPlaying = false;
  }

  /**
   * Play the horn sound
   */
  play() {
    if (!this.audio.isInitialized() || this.isPlaying) return;

    const ctx = this.audio.audioContext;
    const sfxGain = this.audio.categoryGains.get(AudioCategory.SFX);

    // Create main gain node for horn
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    this.gainNode.connect(sfxGain || this.audio.masterGain);

    // Create multiple oscillators for a richer horn sound
    // Truck horn typically uses low frequencies
    const frequencies = [110, 147, 175]; // Low A, D, F - creates a deep horn chord

    for (const freq of frequencies) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Add slight detuning for richness
      osc.detune.setValueAtTime(Math.random() * 10 - 5, ctx.currentTime);

      oscGain.gain.setValueAtTime(0.3, ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      osc.start();

      this.oscillators.push({ osc, gain: oscGain });
    }

    this.isPlaying = true;
  }

  /**
   * Stop the horn sound
   */
  stop() {
    if (!this.isPlaying) return;

    const ctx = this.audio.audioContext;

    // Fade out
    if (this.gainNode) {
      this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    }

    // Stop oscillators after fade
    setTimeout(() => {
      for (const { osc } of this.oscillators) {
        try {
          osc.stop();
        } catch (e) {
          // Already stopped
        }
      }
      this.oscillators = [];
      this.gainNode = null;
      this.isPlaying = false;
    }, 150);
  }

  /**
   * Quick honk (play and auto-stop)
   * @param {number} duration - Duration in ms
   */
  honk(duration = 300) {
    this.play();
    setTimeout(() => this.stop(), duration);
  }
}

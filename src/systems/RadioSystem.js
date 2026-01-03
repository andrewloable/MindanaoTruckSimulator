/**
 * RadioSystem - In-game radio with multiple stations
 *
 * Manages background music playback with radio station concept.
 * Uses Web Audio API through AudioManager.
 */

import { AudioCategory } from './AudioManager.js';

// Radio station definitions with actual audio files
export const RadioStations = {
  OFF: {
    id: 'off',
    name: 'Radio Off',
    genre: null,
    tracks: [],
  },
  CHILL: {
    id: 'chill',
    name: 'Chill FM',
    genre: 'Relaxing',
    description: 'Smooth beats for the long road',
    tracks: [
      { id: 'march_pixels', name: 'March of Pixels', file: '/audio/radio/march_of_pixels.mp3', duration: 100 },
      { id: 'march_pixels_cover', name: 'March of Pixels (Cover)', file: '/audio/radio/march_of_pixels_cover.mp3', duration: 103 },
    ],
  },
  ROCK: {
    id: 'rock',
    name: 'Rock 101',
    genre: 'Rock',
    description: 'Classic rock for truckers',
    tracks: [
      { id: 'marching_forward', name: 'Marching Forward', file: '/audio/radio/marching_forward.mp3', duration: 70 },
      { id: 'marching_forward_alt', name: 'Marching Forward (Alt)', file: '/audio/radio/marching_forward_alt.mp3', duration: 111 },
    ],
  },
  POP: {
    id: 'pop',
    name: 'Pop Hits',
    genre: 'Pop',
    description: 'Today\'s hottest tracks',
    tracks: [
      { id: 'march_pixels_pop', name: 'March of Pixels', file: '/audio/radio/march_of_pixels_cover.mp3', duration: 103 },
      { id: 'marching_pop', name: 'Marching Forward', file: '/audio/radio/marching_forward.mp3', duration: 70 },
    ],
  },
  LOCAL: {
    id: 'local',
    name: 'Mindanao Vibes',
    genre: 'OPM/Local',
    description: 'Local Mindanao music',
    tracks: [
      { id: 'local1', name: 'March of Pixels', file: '/audio/radio/march_of_pixels.mp3', duration: 100 },
      { id: 'local2', name: 'Marching Forward', file: '/audio/radio/marching_forward_alt.mp3', duration: 111 },
    ],
  },
};

export class RadioSystem {
  constructor(audioManager) {
    this.audio = audioManager;

    // Current state
    this.currentStation = RadioStations.OFF;
    this.currentTrackIndex = 0;
    this.isPlaying = false;

    // Audio playback
    this.currentAudio = null;
    this.audioContext = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.loadedBuffers = new Map();

    // Track timing
    this.trackStartTime = 0;
    this.pausedAt = 0;

    // Event callbacks
    this.onStationChange = null;
    this.onTrackChange = null;

    // Station list (excluding OFF)
    this.stations = [
      RadioStations.CHILL,
      RadioStations.ROCK,
      RadioStations.POP,
      RadioStations.LOCAL,
    ];
    this.stationIndex = -1; // -1 = OFF

    // Volume
    this.volume = 0.5;
  }

  /**
   * Initialize the radio system
   */
  async init() {
    // Create audio context for radio playback
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      // Preload some tracks
      await this.preloadStationTracks(RadioStations.CHILL);

      console.log('RadioSystem initialized with audio playback');
    } catch (error) {
      console.warn('RadioSystem: Web Audio API not available', error);
    }
  }

  /**
   * Preload tracks for a station
   * @param {Object} station
   */
  async preloadStationTracks(station) {
    if (!station.tracks || !this.audioContext) return;

    for (const track of station.tracks) {
      if (this.loadedBuffers.has(track.id)) continue;

      try {
        const response = await fetch(track.file);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.loadedBuffers.set(track.id, audioBuffer);

        // Update duration from actual file
        track.duration = Math.floor(audioBuffer.duration);
      } catch (error) {
        console.warn(`Failed to load track: ${track.name}`, error);
      }
    }
  }

  /**
   * Get current station
   * @returns {Object}
   */
  getStation() {
    return this.currentStation;
  }

  /**
   * Get current track
   * @returns {Object|null}
   */
  getCurrentTrack() {
    if (this.currentStation === RadioStations.OFF) return null;
    if (!this.currentStation.tracks.length) return null;
    return this.currentStation.tracks[this.currentTrackIndex];
  }

  /**
   * Get track progress (0-1)
   * @returns {number}
   */
  getTrackProgress() {
    const track = this.getCurrentTrack();
    if (!track || !this.audioContext) return 0;

    if (!this.isPlaying) return this.pausedAt / track.duration;

    const elapsed = this.audioContext.currentTime - this.trackStartTime;
    return Math.min(1, elapsed / track.duration);
  }

  /**
   * Play a track
   * @param {Object} track
   */
  async playTrack(track) {
    if (!this.audioContext) return;

    // Stop current playback
    this.stopPlayback();

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Get buffer (load if needed)
    let buffer = this.loadedBuffers.get(track.id);
    if (!buffer) {
      try {
        const response = await fetch(track.file);
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.loadedBuffers.set(track.id, buffer);
        track.duration = Math.floor(buffer.duration);
      } catch (error) {
        console.warn(`Failed to load track: ${track.name}`, error);
        return;
      }
    }

    // Create source
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.loop = false;
    this.sourceNode.connect(this.gainNode);

    // Track end callback
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.nextTrack();
      }
    };

    // Start playback
    this.sourceNode.start(0);
    this.trackStartTime = this.audioContext.currentTime;
    this.isPlaying = true;

    console.log(`Now playing: ${track.name}`);

    if (this.onTrackChange) {
      this.onTrackChange(track);
    }
  }

  /**
   * Stop current playback
   */
  stopPlayback() {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
      } catch (e) {
        // Already stopped
      }
      this.sourceNode = null;
    }
  }

  /**
   * Tune to a specific station
   * @param {Object} station - Station object from RadioStations
   */
  async tuneStation(station) {
    if (this.currentStation === station) return;

    this.stopPlayback();
    this.currentStation = station;
    this.currentTrackIndex = 0;

    if (station === RadioStations.OFF) {
      this.isPlaying = false;
      this.stationIndex = -1;
      console.log('Radio: OFF');
    } else {
      this.stationIndex = this.stations.indexOf(station);
      console.log(`Radio: ${station.name} - ${station.description}`);

      // Preload and play first track
      await this.preloadStationTracks(station);
      const track = this.getCurrentTrack();
      if (track) {
        await this.playTrack(track);
      }
    }

    if (this.onStationChange) {
      this.onStationChange(station);
    }
  }

  /**
   * Tune to next station
   */
  async nextStation() {
    this.stationIndex++;
    if (this.stationIndex >= this.stations.length) {
      // Wrap to OFF
      await this.tuneStation(RadioStations.OFF);
    } else {
      await this.tuneStation(this.stations[this.stationIndex]);
    }
  }

  /**
   * Tune to previous station
   */
  async prevStation() {
    if (this.stationIndex < 0) {
      // From OFF, go to last station
      this.stationIndex = this.stations.length - 1;
    } else {
      this.stationIndex--;
    }

    if (this.stationIndex < 0) {
      await this.tuneStation(RadioStations.OFF);
    } else {
      await this.tuneStation(this.stations[this.stationIndex]);
    }
  }

  /**
   * Toggle radio on/off
   */
  async toggle() {
    if (this.currentStation === RadioStations.OFF) {
      // Turn on - tune to first station
      this.stationIndex = 0;
      await this.tuneStation(this.stations[0]);
    } else {
      // Turn off
      await this.tuneStation(RadioStations.OFF);
    }
  }

  /**
   * Skip to next track
   */
  async nextTrack() {
    if (this.currentStation === RadioStations.OFF) return;
    if (!this.currentStation.tracks.length) return;

    this.stopPlayback();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentStation.tracks.length;

    const track = this.getCurrentTrack();
    if (track) {
      await this.playTrack(track);
    }
  }

  /**
   * Set volume
   * @param {number} volume - 0 to 1
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get volume
   * @returns {number}
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Update radio system (called each frame)
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Track progress is handled by Web Audio API
    // onended callback handles track transitions
  }

  /**
   * Get formatted track time
   * @returns {string}
   */
  getFormattedTime() {
    const track = this.getCurrentTrack();
    if (!track || !this.audioContext) return '--:--';

    const elapsed = Math.floor(this.audioContext.currentTime - this.trackStartTime);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get formatted track duration
   * @returns {string}
   */
  getFormattedDuration() {
    const track = this.getCurrentTrack();
    if (!track) return '--:--';

    const minutes = Math.floor(track.duration / 60);
    const seconds = track.duration % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get all available stations (excluding OFF)
   * @returns {Array}
   */
  getStations() {
    return this.stations;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.stopPlayback();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.loadedBuffers.clear();
  }
}

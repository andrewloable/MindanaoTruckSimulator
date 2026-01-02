/**
 * RadioSystem - In-game radio with multiple stations
 *
 * Manages background music playback with radio station concept.
 * Uses Web Audio API through AudioManager.
 */

import { AudioCategory } from './AudioManager.js';

// Radio station definitions
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
      { name: 'Coastal Breeze', duration: 180 },
      { name: 'Mountain Vista', duration: 210 },
      { name: 'Sunset Drive', duration: 195 },
    ],
  },
  ROCK: {
    id: 'rock',
    name: 'Rock 101',
    genre: 'Rock',
    description: 'Classic rock for truckers',
    tracks: [
      { name: 'Highway Rider', duration: 200 },
      { name: 'Steel Wheels', duration: 185 },
      { name: 'Road Warrior', duration: 220 },
    ],
  },
  POP: {
    id: 'pop',
    name: 'Pop Hits',
    genre: 'Pop',
    description: 'Today\'s hottest tracks',
    tracks: [
      { name: 'Summer Nights', duration: 190 },
      { name: 'Feel Good', duration: 175 },
      { name: 'On The Road', duration: 205 },
    ],
  },
  LOCAL: {
    id: 'local',
    name: 'Mindanao Vibes',
    genre: 'OPM/Local',
    description: 'Local Mindanao music',
    tracks: [
      { name: 'Dabaw City Nights', duration: 215 },
      { name: 'Island Rhythm', duration: 188 },
      { name: 'Tropical Dreams', duration: 200 },
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

    // Simulated playback (no actual audio files yet)
    this.simulatedTime = 0;
    this.trackStartTime = 0;

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
  }

  /**
   * Initialize the radio system
   */
  init() {
    console.log('RadioSystem initialized');
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
    if (!track) return 0;

    const elapsed = this.simulatedTime - this.trackStartTime;
    return Math.min(1, elapsed / track.duration);
  }

  /**
   * Tune to a specific station
   * @param {Object} station - Station object from RadioStations
   */
  tuneStation(station) {
    if (this.currentStation === station) return;

    this.currentStation = station;
    this.currentTrackIndex = 0;
    this.trackStartTime = this.simulatedTime;

    if (station === RadioStations.OFF) {
      this.isPlaying = false;
      this.stationIndex = -1;
      console.log('Radio: OFF');
    } else {
      this.isPlaying = true;
      this.stationIndex = this.stations.indexOf(station);
      console.log(`Radio: ${station.name} - ${station.description}`);

      const track = this.getCurrentTrack();
      if (track) {
        console.log(`Now playing: ${track.name}`);
      }
    }

    if (this.onStationChange) {
      this.onStationChange(station);
    }
  }

  /**
   * Tune to next station
   */
  nextStation() {
    this.stationIndex++;
    if (this.stationIndex >= this.stations.length) {
      // Wrap to OFF
      this.tuneStation(RadioStations.OFF);
    } else {
      this.tuneStation(this.stations[this.stationIndex]);
    }
  }

  /**
   * Tune to previous station
   */
  prevStation() {
    if (this.stationIndex < 0) {
      // From OFF, go to last station
      this.stationIndex = this.stations.length - 1;
    } else {
      this.stationIndex--;
    }

    if (this.stationIndex < 0) {
      this.tuneStation(RadioStations.OFF);
    } else {
      this.tuneStation(this.stations[this.stationIndex]);
    }
  }

  /**
   * Toggle radio on/off
   */
  toggle() {
    if (this.currentStation === RadioStations.OFF) {
      // Turn on - tune to first station
      this.stationIndex = 0;
      this.tuneStation(this.stations[0]);
    } else {
      // Turn off
      this.tuneStation(RadioStations.OFF);
    }
  }

  /**
   * Skip to next track
   */
  nextTrack() {
    if (this.currentStation === RadioStations.OFF) return;
    if (!this.currentStation.tracks.length) return;

    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentStation.tracks.length;
    this.trackStartTime = this.simulatedTime;

    const track = this.getCurrentTrack();
    console.log(`Now playing: ${track.name}`);

    if (this.onTrackChange) {
      this.onTrackChange(track);
    }
  }

  /**
   * Update radio system (called each frame)
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    if (!this.isPlaying) return;

    this.simulatedTime += deltaTime;

    // Check if current track ended
    const track = this.getCurrentTrack();
    if (track) {
      const elapsed = this.simulatedTime - this.trackStartTime;
      if (elapsed >= track.duration) {
        this.nextTrack();
      }
    }
  }

  /**
   * Get formatted track time
   * @returns {string}
   */
  getFormattedTime() {
    const track = this.getCurrentTrack();
    if (!track) return '--:--';

    const elapsed = Math.floor(this.simulatedTime - this.trackStartTime);
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
}

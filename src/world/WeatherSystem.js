/**
 * WeatherSystem - Manages weather effects like rain
 *
 * Creates particle-based rain effects and adjusts scene atmosphere.
 */

import * as THREE from 'three';

// Weather types
export const WeatherType = {
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  LIGHT_RAIN: 'lightRain',
  HEAVY_RAIN: 'heavyRain',
};

export class WeatherSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Current weather state
    this.currentWeather = WeatherType.CLEAR;
    this.targetWeather = WeatherType.CLEAR;
    this.transitionProgress = 1.0;
    this.transitionSpeed = 0.5; // Weather changes over 2 seconds

    // Rain particle system
    this.rainParticles = null;
    this.rainGeometry = null;
    this.rainMaterial = null;
    this.rainCount = 10000;
    this.rainVelocities = [];

    // Rain configuration by weather type
    this.rainConfig = {
      [WeatherType.CLEAR]: { count: 0, speed: 0, opacity: 0 },
      [WeatherType.CLOUDY]: { count: 0, speed: 0, opacity: 0 },
      [WeatherType.LIGHT_RAIN]: { count: 3000, speed: 25, opacity: 0.4 },
      [WeatherType.HEAVY_RAIN]: { count: 10000, speed: 40, opacity: 0.6 },
    };

    // Splash effects
    this.splashPool = [];
    this.activeSplashes = [];
    this.maxSplashes = 50;

    // Fog settings by weather
    this.fogConfig = {
      [WeatherType.CLEAR]: { near: 100, far: 1000, color: 0x87CEEB },
      [WeatherType.CLOUDY]: { near: 80, far: 600, color: 0x9CA3AF },
      [WeatherType.LIGHT_RAIN]: { near: 50, far: 400, color: 0x6B7280 },
      [WeatherType.HEAVY_RAIN]: { near: 30, far: 200, color: 0x4B5563 },
    };

    // Current fog values for smooth transitions
    this.currentFog = { near: 100, far: 1000, color: new THREE.Color(0x87CEEB) };

    // Rain area (follows camera)
    this.rainAreaSize = 100;
    this.rainHeight = 50;
  }

  /**
   * Initialize the weather system
   */
  init() {
    this.createRainSystem();
    this.createSplashPool();
    console.log('WeatherSystem initialized');
  }

  /**
   * Create the rain particle system
   */
  createRainSystem() {
    // Create geometry with positions for rain drops
    this.rainGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      // Random positions in a box
      positions[i * 3] = (Math.random() - 0.5) * this.rainAreaSize;
      positions[i * 3 + 1] = Math.random() * this.rainHeight;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.rainAreaSize;

      // Random velocities (slight variation)
      this.rainVelocities[i] = 0.8 + Math.random() * 0.4;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create rain material - stretched lines
    this.rainMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.1,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
    });

    // Create particle system
    this.rainParticles = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.rainParticles.frustumCulled = false;
    this.scene.add(this.rainParticles);

    // Initially hidden
    this.rainParticles.visible = false;
  }

  /**
   * Create splash effect pool
   */
  createSplashPool() {
    const splashGeometry = new THREE.RingGeometry(0.1, 0.3, 8);
    const splashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < this.maxSplashes; i++) {
      const splash = new THREE.Mesh(splashGeometry, splashMaterial.clone());
      splash.rotation.x = -Math.PI / 2;
      splash.visible = false;
      splash.userData = { age: 0, maxAge: 0.3 };
      this.splashPool.push(splash);
      this.scene.add(splash);
    }
  }

  /**
   * Set the current weather
   * @param {string} weather - Weather type from WeatherType
   * @param {boolean} instant - If true, change instantly without transition
   */
  setWeather(weather, instant = false) {
    if (weather === this.targetWeather) return;

    this.targetWeather = weather;

    if (instant) {
      this.currentWeather = weather;
      this.transitionProgress = 1.0;
      this.applyWeatherSettings();
    } else {
      this.transitionProgress = 0;
    }

    console.log(`Weather changing to: ${weather}`);
  }

  /**
   * Apply current weather settings
   */
  applyWeatherSettings() {
    const config = this.rainConfig[this.currentWeather];

    // Update rain visibility and opacity
    this.rainParticles.visible = config.count > 0;
    this.rainMaterial.opacity = config.opacity;
  }

  /**
   * Update weather system
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Handle weather transitions
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + deltaTime * this.transitionSpeed);

      if (this.transitionProgress >= 1.0) {
        this.currentWeather = this.targetWeather;
      }

      this.updateTransition();
    }

    // Update rain particles
    this.updateRain(deltaTime);

    // Update splashes
    this.updateSplashes(deltaTime);

    // Update fog
    this.updateFog(deltaTime);

    // Keep rain centered on camera
    if (this.camera && this.rainParticles.visible) {
      this.rainParticles.position.x = this.camera.position.x;
      this.rainParticles.position.z = this.camera.position.z;
    }
  }

  /**
   * Update transition between weather states
   */
  updateTransition() {
    const fromConfig = this.rainConfig[this.currentWeather];
    const toConfig = this.rainConfig[this.targetWeather];
    const t = this.transitionProgress;

    // Interpolate rain opacity
    const opacity = fromConfig.opacity + (toConfig.opacity - fromConfig.opacity) * t;
    this.rainMaterial.opacity = opacity;

    // Show/hide rain
    this.rainParticles.visible = opacity > 0.01;
  }

  /**
   * Update rain particles
   * @param {number} deltaTime
   */
  updateRain(deltaTime) {
    if (!this.rainParticles.visible) return;

    const config = this.rainConfig[this.targetWeather];
    const positions = this.rainGeometry.attributes.position.array;
    const speed = config.speed;

    for (let i = 0; i < this.rainCount; i++) {
      // Move rain down
      positions[i * 3 + 1] -= speed * this.rainVelocities[i] * deltaTime;

      // Reset when hitting ground
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = this.rainHeight;

        // Randomize horizontal position
        positions[i * 3] = (Math.random() - 0.5) * this.rainAreaSize;
        positions[i * 3 + 2] = (Math.random() - 0.5) * this.rainAreaSize;

        // Create splash at impact point
        if (Math.random() < 0.02) { // 2% chance per raindrop
          this.createSplash(
            positions[i * 3] + this.rainParticles.position.x,
            0.01,
            positions[i * 3 + 2] + this.rainParticles.position.z
          );
        }
      }
    }

    this.rainGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * Create a splash effect at position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  createSplash(x, y, z) {
    // Find available splash from pool
    const splash = this.splashPool.find(s => !s.visible);
    if (!splash) return;

    splash.position.set(x, y, z);
    splash.scale.set(0.5, 0.5, 0.5);
    splash.material.opacity = 0.4;
    splash.visible = true;
    splash.userData.age = 0;

    this.activeSplashes.push(splash);
  }

  /**
   * Update splash effects
   * @param {number} deltaTime
   */
  updateSplashes(deltaTime) {
    for (let i = this.activeSplashes.length - 1; i >= 0; i--) {
      const splash = this.activeSplashes[i];
      splash.userData.age += deltaTime;

      const progress = splash.userData.age / splash.userData.maxAge;

      if (progress >= 1) {
        splash.visible = false;
        this.activeSplashes.splice(i, 1);
      } else {
        // Expand and fade
        const scale = 0.5 + progress * 1.5;
        splash.scale.set(scale, scale, scale);
        splash.material.opacity = 0.4 * (1 - progress);
      }
    }
  }

  /**
   * Update fog based on weather
   * @param {number} deltaTime
   */
  updateFog(deltaTime) {
    if (!this.scene.fog) return;

    const targetFog = this.fogConfig[this.targetWeather];
    const lerpSpeed = deltaTime * 2;

    // Smoothly interpolate fog values
    this.currentFog.near += (targetFog.near - this.currentFog.near) * lerpSpeed;
    this.currentFog.far += (targetFog.far - this.currentFog.far) * lerpSpeed;
    this.currentFog.color.lerp(new THREE.Color(targetFog.color), lerpSpeed);

    // Apply to scene fog
    this.scene.fog.near = this.currentFog.near;
    this.scene.fog.far = this.currentFog.far;
    this.scene.fog.color.copy(this.currentFog.color);
  }

  /**
   * Get current weather type
   * @returns {string}
   */
  getWeather() {
    return this.currentWeather;
  }

  /**
   * Check if it's raining
   * @returns {boolean}
   */
  isRaining() {
    return this.currentWeather === WeatherType.LIGHT_RAIN ||
           this.currentWeather === WeatherType.HEAVY_RAIN;
  }

  /**
   * Toggle through weather states (for testing)
   */
  cycleWeather() {
    const types = Object.values(WeatherType);
    const currentIndex = types.indexOf(this.currentWeather);
    const nextIndex = (currentIndex + 1) % types.length;
    this.setWeather(types[nextIndex]);
  }

  /**
   * Start random weather changes
   * @param {number} minInterval - Minimum time between changes (seconds)
   * @param {number} maxInterval - Maximum time between changes (seconds)
   */
  startRandomWeather(minInterval = 120, maxInterval = 300) {
    const changeWeather = () => {
      const types = Object.values(WeatherType);
      const randomType = types[Math.floor(Math.random() * types.length)];
      this.setWeather(randomType);

      // Schedule next change
      const nextInterval = minInterval + Math.random() * (maxInterval - minInterval);
      setTimeout(changeWeather, nextInterval * 1000);
    };

    // Start after initial delay
    setTimeout(changeWeather, (minInterval / 2) * 1000);
  }

  /**
   * Dispose of resources
   */
  dispose() {
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainGeometry.dispose();
      this.rainMaterial.dispose();
    }

    for (const splash of this.splashPool) {
      this.scene.remove(splash);
      splash.geometry.dispose();
      splash.material.dispose();
    }
  }
}

/**
 * SkySystem - Handles skybox and atmospheric rendering
 *
 * Creates a procedural sky with sun, clouds, and fog for the tropical
 * Mindanao environment.
 */

import * as THREE from 'three';

export class SkySystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Sky parameters
    this.parameters = {
      turbidity: 10,
      rayleigh: 2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      elevation: 45, // Sun elevation in degrees
      azimuth: 180,  // Sun azimuth in degrees
    };

    // References
    this.sky = null;
    this.sun = null;
    this.sunLight = null;

    // Colors
    this.skyColor = new THREE.Color(0x87CEEB);
    this.horizonColor = new THREE.Color(0xffffff);
    this.groundColor = new THREE.Color(0x3d5c3d);

    // Time of day (0-24 hours)
    this.timeOfDay = 10;
  }

  /**
   * Initialize the sky system
   */
  init() {
    this.createProceduralSky();
    this.createSun();
    this.updateFog();
  }

  /**
   * Create a procedural gradient sky sphere
   */
  createProceduralSky() {
    // Create sky dome geometry
    const skyGeo = new THREE.SphereGeometry(1000, 32, 32);

    // Create gradient shader material
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0x87CEEB) },
        horizonColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
        sunPosition: { value: new THREE.Vector3() },
        sunColor: { value: new THREE.Color(0xffffee) },
        sunIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        uniform vec3 sunPosition;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vSunDirection = normalize(sunPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        uniform float offset;
        uniform float exponent;
        uniform vec3 sunPosition;
        uniform vec3 sunColor;
        uniform float sunIntensity;

        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;

        void main() {
          // Calculate height factor
          float h = normalize(vWorldPosition + offset).y;

          // Create gradient from bottom to top
          vec3 skyGradient;
          if (h < 0.0) {
            // Below horizon - ground color
            skyGradient = bottomColor;
          } else if (h < 0.1) {
            // Near horizon - blend to horizon color
            float t = h / 0.1;
            skyGradient = mix(bottomColor, horizonColor, t);
          } else if (h < 0.4) {
            // Lower sky
            float t = (h - 0.1) / 0.3;
            skyGradient = mix(horizonColor, bottomColor, pow(t, exponent));
          } else {
            // Upper sky
            float t = (h - 0.4) / 0.6;
            skyGradient = mix(bottomColor, topColor, pow(t, 0.5));
          }

          // Add sun glow
          vec3 viewDirection = normalize(vWorldPosition);
          float sunAngle = dot(viewDirection, vSunDirection);

          // Sun disc
          if (sunAngle > 0.9995) {
            skyGradient = sunColor;
          } else if (sunAngle > 0.99) {
            // Sun halo
            float haloFactor = (sunAngle - 0.99) / 0.0095;
            skyGradient = mix(skyGradient, sunColor, haloFactor * 0.8);
          } else if (sunAngle > 0.9) {
            // Outer glow
            float glowFactor = (sunAngle - 0.9) / 0.09;
            skyGradient = mix(skyGradient, sunColor, glowFactor * 0.3 * sunIntensity);
          }

          gl_FragColor = vec4(skyGradient, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.renderOrder = -1000; // Render first
    this.scene.add(this.sky);
  }

  /**
   * Create sun position tracker
   */
  createSun() {
    this.sun = new THREE.Vector3();
    this.updateSunPosition();
  }

  /**
   * Update sun position based on elevation and azimuth
   */
  updateSunPosition() {
    const phi = THREE.MathUtils.degToRad(90 - this.parameters.elevation);
    const theta = THREE.MathUtils.degToRad(this.parameters.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);

    // Update sky shader
    if (this.sky) {
      this.sky.material.uniforms.sunPosition.value.copy(this.sun).multiplyScalar(1000);
    }

    // Update scene sun light if it exists
    if (this.sunLight) {
      this.sunLight.position.copy(this.sun).multiplyScalar(100);
    }
  }

  /**
   * Update fog settings
   */
  updateFog() {
    // Set fog to match sky colors for seamless blending
    const fogColor = this.skyColor.clone();
    this.scene.fog = new THREE.Fog(fogColor, 50, 800);
    this.scene.background = fogColor;
  }

  /**
   * Set the sun light reference (from Game.js)
   * @param {THREE.DirectionalLight} light
   */
  setSunLight(light) {
    this.sunLight = light;
    this.updateSunPosition();
  }

  /**
   * Set time of day (0-24 hours)
   * @param {number} hours - Time in hours (0-24)
   */
  setTimeOfDay(hours) {
    this.timeOfDay = hours;

    // Calculate sun elevation based on time
    // Sunrise at 6, noon at 12, sunset at 18
    const normalizedTime = ((hours - 6) / 12) * Math.PI; // 0 to PI from 6am to 6pm

    if (hours >= 6 && hours <= 18) {
      // Daytime
      this.parameters.elevation = Math.sin(normalizedTime) * 90;
      this.parameters.azimuth = 90 + (hours - 6) * 15; // Move across sky
    } else {
      // Night (sun below horizon)
      this.parameters.elevation = -10;
    }

    this.updateSunPosition();
    this.updateSkyColors();
  }

  /**
   * Update sky colors based on sun position
   */
  updateSkyColors() {
    const elevation = this.parameters.elevation;

    if (elevation > 30) {
      // Midday - bright blue sky
      this.sky.material.uniforms.topColor.value.setHex(0x0077ff);
      this.sky.material.uniforms.bottomColor.value.setHex(0x87CEEB);
      this.sky.material.uniforms.horizonColor.value.setHex(0xffffff);
      this.sky.material.uniforms.sunIntensity.value = 1.0;
    } else if (elevation > 10) {
      // Morning/evening
      this.sky.material.uniforms.topColor.value.setHex(0x4488cc);
      this.sky.material.uniforms.bottomColor.value.setHex(0xffaa66);
      this.sky.material.uniforms.horizonColor.value.setHex(0xffcc88);
      this.sky.material.uniforms.sunIntensity.value = 1.2;
    } else if (elevation > 0) {
      // Sunrise/sunset
      this.sky.material.uniforms.topColor.value.setHex(0x335588);
      this.sky.material.uniforms.bottomColor.value.setHex(0xff6644);
      this.sky.material.uniforms.horizonColor.value.setHex(0xffaa44);
      this.sky.material.uniforms.sunIntensity.value = 1.5;
    } else {
      // Night
      this.sky.material.uniforms.topColor.value.setHex(0x111122);
      this.sky.material.uniforms.bottomColor.value.setHex(0x222244);
      this.sky.material.uniforms.horizonColor.value.setHex(0x333355);
      this.sky.material.uniforms.sunIntensity.value = 0.0;
    }

    this.updateFog();
  }

  /**
   * Update (called each frame)
   * @param {number} deltaTime
   */
  update(deltaTime) {
    // Sky follows camera to create infinite sky illusion
    // (The sky sphere is large enough that this isn't strictly necessary,
    // but it helps prevent any potential clipping issues)
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.sky) {
      this.sky.geometry.dispose();
      this.sky.material.dispose();
      this.scene.remove(this.sky);
    }
  }
}

/**
 * Game - Main game controller
 *
 * Manages the game loop, scenes, and coordinates all game systems.
 */

import * as THREE from 'three';
import { updateLoadingProgress, hideLoadingScreen } from '../main.js';
import { InputManager, InputAction } from './InputManager.js';
import { SkySystem } from '../world/SkySystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { AudioManager, AudioCategory } from '../systems/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = null;
    this.isRunning = false;
    this.isPaused = false;

    // Game systems
    this.input = null;
    this.skySystem = null;
    this.physics = null;
    this.audio = null;
    this.ui = null;
    this.mainMenu = null;
    this.pauseMenu = null;
    this.hud = null;

    // Game state
    this.gameState = 'menu'; // menu, playing, paused

    // Test truck state
    this.testTruck = null;
    this.truckBody = null;
    this.truckSpeed = 0;
    this.headlightsOn = false;
    this.headlights = [];

    // Camera settings
    this.cameraMode = 'chase'; // chase, cockpit, orbit
    this.cameraOffset = new THREE.Vector3(0, 5, 12);
  }

  /**
   * Initialize the game
   */
  async init() {
    console.log('Initializing Mindanao Truck Simulator...');

    // Get canvas element
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    updateLoadingProgress(10);

    // Initialize input manager
    this.input = new InputManager();
    this.input.loadBindings();
    this.setupInputCallbacks();

    updateLoadingProgress(15);

    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    updateLoadingProgress(25);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

    updateLoadingProgress(35);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      2000 // Far plane
    );
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);

    updateLoadingProgress(45);

    // Create clock for delta time
    this.clock = new THREE.Clock();

    // Add basic lighting
    this.setupLighting();

    updateLoadingProgress(55);

    // Initialize sky system
    this.skySystem = new SkySystem(this.scene, this.renderer);
    this.skySystem.init();
    this.skySystem.setTimeOfDay(10); // 10 AM

    updateLoadingProgress(60);

    // Initialize physics system
    this.physics = new PhysicsSystem();
    this.physics.init();
    this.physics.createGroundPlane(0, 'ground');

    updateLoadingProgress(70);

    // Create audio manager (will be initialized on first user interaction)
    this.audio = new AudioManager();

    // Initialize UI
    this.initUI();

    updateLoadingProgress(80);

    // Add temporary ground plane for testing
    this.addTestScene();

    updateLoadingProgress(90);

    // Setup event listeners
    this.setupEventListeners();

    updateLoadingProgress(100);

    // Hide loading screen after a short delay
    await new Promise(resolve => setTimeout(resolve, 500));
    hideLoadingScreen();

    console.log('Game initialized successfully');
    console.log('Controls: WASD/Arrows to drive, Space for handbrake, H for horn, L for lights, C for camera');
  }

  /**
   * Setup input action callbacks
   */
  setupInputCallbacks() {
    // Horn - play sound on press
    this.input.onAction(InputAction.HORN, () => {
      console.log('HONK! 📯');
      // TODO: Play horn sound
    });

    // Toggle headlights
    this.input.onAction(InputAction.HEADLIGHTS, () => {
      this.headlightsOn = !this.headlightsOn;
      this.updateHeadlights();
      console.log(`Headlights: ${this.headlightsOn ? 'ON' : 'OFF'}`);
    });

    // Cycle camera
    this.input.onAction(InputAction.CAMERA_NEXT, () => {
      this.cycleCamera();
    });

    // Pause
    this.input.onAction(InputAction.PAUSE, () => {
      this.togglePause();
    });

    // Toggle map
    this.input.onAction(InputAction.TOGGLE_MAP, () => {
      console.log('Toggle minimap (not yet implemented)');
    });
  }

  /**
   * Initialize UI system
   */
  initUI() {
    // Create UI manager
    this.ui = new UIManager();
    this.ui.init();

    // Create main menu
    this.mainMenu = new MainMenu(this.ui, {
      onStart: () => this.startGame(),
      onOptions: () => {
        console.log('Options menu (not yet implemented)');
      },
      onAbout: () => {
        console.log('About screen (not yet implemented)');
      },
    });
    this.mainMenu.init();

    // Create pause menu
    this.pauseMenu = new PauseMenu(this.ui, {
      onResume: () => this.resumeGame(),
      onOptions: () => {
        console.log('Options menu (not yet implemented)');
      },
      onMainMenu: () => this.returnToMainMenu(),
    });
    this.pauseMenu.init();

    // Create HUD
    this.hud = new HUD(this.ui);
    this.hud.init();

    // Show main menu initially
    this.mainMenu.show();
  }

  /**
   * Start the game from main menu
   */
  async startGame() {
    // Initialize audio on first user interaction
    if (!this.audio.isInitialized()) {
      await this.audio.init();
    }

    this.gameState = 'playing';
    this.isPaused = false;
    this.mainMenu.hide();
    this.hud.show();
    console.log('Game started - WASD to drive!');
  }

  /**
   * Resume game from pause menu
   */
  resumeGame() {
    this.gameState = 'playing';
    this.isPaused = false;
    this.pauseMenu.hide();
    console.log('Game resumed');
  }

  /**
   * Return to main menu
   */
  returnToMainMenu() {
    this.gameState = 'menu';
    this.isPaused = true;
    this.pauseMenu.hide();
    this.hud.hide();
    this.mainMenu.show();

    // Reset truck position
    if (this.truckBody) {
      this.truckBody.position.set(0, 2.5, 0);
      this.truckBody.velocity.set(0, 0, 0);
      this.truckBody.angularVelocity.set(0, 0, 0);
      this.truckBody.quaternion.set(0, 0, 0, 1);
    }
    console.log('Returned to main menu');
  }

  /**
   * Setup scene lighting
   */
  setupLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);

    // Hemisphere light for sky/ground color variation
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c3d, 0.4);
    this.scene.add(hemiLight);
  }

  /**
   * Add test scene elements for initial development
   */
  addTestScene() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5c3d, // Grass green
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Test road strip
    const roadGeometry = new THREE.PlaneGeometry(10, 200);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333, // Asphalt gray
      roughness: 0.8,
      metalness: 0.1,
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01; // Slightly above ground to avoid z-fighting
    road.receiveShadow = true;
    this.scene.add(road);

    // Create truck group
    this.testTruck = new THREE.Group();

    // Truck body (cabin)
    const cabinGeometry = new THREE.BoxGeometry(2.4, 2.2, 3);
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x4CAF50, // Brand green
      roughness: 0.5,
      metalness: 0.3,
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 1.1, 1.5);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    this.testTruck.add(cabin);

    // Truck cargo area
    const cargoGeometry = new THREE.BoxGeometry(2.5, 2.8, 6);
    const cargoMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
      metalness: 0.2,
    });
    const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
    cargo.position.set(0, 1.4, -2.5);
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    this.testTruck.add(cargo);

    // Wheels (simple cylinders)
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
    });

    const wheelPositions = [
      { x: -1.3, y: 0.5, z: 2 },   // Front left
      { x: 1.3, y: 0.5, z: 2 },    // Front right
      { x: -1.3, y: 0.5, z: -1.5 }, // Rear left 1
      { x: 1.3, y: 0.5, z: -1.5 },  // Rear right 1
      { x: -1.3, y: 0.5, z: -3.5 }, // Rear left 2
      { x: 1.3, y: 0.5, z: -3.5 },  // Rear right 2
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.castShadow = true;
      this.testTruck.add(wheel);
    }

    // Headlights
    const headlightGeometry = new THREE.CircleGeometry(0.2, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial.clone());
    leftHeadlight.position.set(-0.8, 1, 3.01);
    this.testTruck.add(leftHeadlight);
    this.headlights.push(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial.clone());
    rightHeadlight.position.set(0.8, 1, 3.01);
    this.testTruck.add(rightHeadlight);
    this.headlights.push(rightHeadlight);

    // Position truck
    this.testTruck.position.set(0, 1.5, 0);
    this.scene.add(this.testTruck);

    // Create physics body for truck
    this.truckBody = this.physics.createVehicle(this.testTruck, {
      mass: 2000,
      width: 2.5,
      height: 2.5,
      length: 9,
    });
  }

  /**
   * Update headlight visuals
   */
  updateHeadlights() {
    for (const light of this.headlights) {
      light.material.emissive.setHex(this.headlightsOn ? 0xffffcc : 0x000000);
      light.material.emissiveIntensity = this.headlightsOn ? 1 : 0;
    }
  }

  /**
   * Cycle through camera modes
   */
  cycleCamera() {
    const modes = ['chase', 'cockpit', 'orbit'];
    const currentIndex = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(currentIndex + 1) % modes.length];
    console.log(`Camera mode: ${this.cameraMode}`);
  }

  /**
   * Setup window event listeners
   */
  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Handle visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    // Only toggle pause when playing
    if (this.gameState === 'menu') return;

    if (this.gameState === 'playing') {
      // Pause the game
      this.gameState = 'paused';
      this.isPaused = true;
      this.pauseMenu.show();
      console.log('Game PAUSED');
    } else if (this.gameState === 'paused') {
      // Resume the game
      this.resumeGame();
    }
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.clock.start();
    this.gameLoop();

    console.log('Game started');
  }

  /**
   * Pause the game
   */
  pause() {
    this.isRunning = false;
    console.log('Game paused');
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.clock.start();
      this.gameLoop();
      console.log('Game resumed');
    }
  }

  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.gameLoop());

    const deltaTime = this.clock.getDelta();

    // Update game systems
    this.update(deltaTime);

    // Render the scene
    this.render();
  }

  /**
   * Update game state
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Always process input (for pause toggle etc)
    this.input.update();

    // Don't update game logic if paused or in menu
    if (this.gameState !== 'playing') {
      return;
    }

    // Update truck based on input (apply forces)
    this.updateTruck(deltaTime);

    // Update physics simulation
    this.physics.update(deltaTime);

    // Update camera
    this.updateCamera(deltaTime);

    // Update HUD
    this.updateHUD();
  }

  /**
   * Update HUD display values
   */
  updateHUD() {
    if (!this.hud) return;

    // Update speed (convert from m/s to km/h done in HUD)
    this.hud.setSpeed(this.truckSpeed);

    // Update time from sky system
    if (this.skySystem) {
      this.hud.setTime(this.skySystem.timeOfDay);
    }
  }

  /**
   * Update truck movement based on input
   * Uses physics forces for realistic movement
   * @param {number} deltaTime
   */
  updateTruck(deltaTime) {
    if (!this.testTruck || !this.truckBody) return;

    // Get input values
    const throttle = this.input.getThrottleInput();
    const brake = this.input.getBrakeInput();
    const steering = this.input.getSteeringInput();
    const handbrake = this.input.isHandbrakeActive();

    // Physics constants
    const engineForce = 8000; // Newtons
    const brakeForce = 12000;
    const maxSteerTorque = 3000;
    const maxSpeed = 30; // m/s (~108 km/h)

    // Get current velocity
    const velocity = this.physics.getVelocity(this.truckBody);
    const currentSpeed = velocity.length();
    this.truckSpeed = currentSpeed;

    // Get forward direction from truck rotation
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.testTruck.quaternion);

    // Apply engine force (throttle)
    if (throttle > 0 && currentSpeed < maxSpeed) {
      const force = forward.clone().multiplyScalar(throttle * engineForce);
      this.physics.applyForce(this.truckBody, force);
    }

    // Apply braking force
    if (brake > 0) {
      if (currentSpeed > 0.5) {
        // Brake - apply force opposite to velocity
        const brakeDir = velocity.clone().normalize().multiplyScalar(-1);
        const force = brakeDir.multiplyScalar(brake * brakeForce);
        this.physics.applyForce(this.truckBody, force);
      } else if (currentSpeed < 0.5) {
        // Reverse
        const force = forward.clone().multiplyScalar(-brake * engineForce * 0.5);
        this.physics.applyForce(this.truckBody, force);
      }
    }

    // Apply handbrake (strong deceleration)
    if (handbrake && currentSpeed > 0.1) {
      this.truckBody.velocity.x *= 0.95;
      this.truckBody.velocity.z *= 0.95;
    }

    // Apply steering torque (only when moving)
    if (Math.abs(currentSpeed) > 0.5 && Math.abs(steering) > 0.01) {
      // Calculate steering based on speed (less steering at high speed)
      const speedFactor = Math.max(0.3, 1 - currentSpeed / maxSpeed);
      const steerTorque = -steering * maxSteerTorque * speedFactor;

      // Apply angular velocity for steering
      this.truckBody.angularVelocity.y = THREE.MathUtils.lerp(
        this.truckBody.angularVelocity.y,
        steerTorque * 0.001 * Math.sign(velocity.dot(forward)),
        0.1
      );
    } else {
      // Dampen angular velocity when not steering
      this.truckBody.angularVelocity.y *= 0.9;
    }

    // Keep truck upright (prevent rolling over too easily)
    this.truckBody.angularVelocity.x *= 0.9;
    this.truckBody.angularVelocity.z *= 0.9;
  }

  /**
   * Update camera position
   * @param {number} deltaTime
   */
  updateCamera(deltaTime) {
    if (!this.testTruck) return;

    const truckPos = this.testTruck.position;
    const truckRot = this.testTruck.rotation.y;

    switch (this.cameraMode) {
      case 'chase': {
        // Chase camera behind truck
        const offset = new THREE.Vector3(0, 5, 12);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), truckRot);
        const targetPos = truckPos.clone().add(offset);

        // Smooth camera movement
        this.camera.position.lerp(targetPos, 5 * deltaTime);
        this.camera.lookAt(truckPos.x, truckPos.y + 1, truckPos.z);
        break;
      }

      case 'cockpit': {
        // First-person from driver's position
        const cockpitOffset = new THREE.Vector3(0, 2.5, 2);
        cockpitOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), truckRot);
        this.camera.position.copy(truckPos).add(cockpitOffset);

        // Look forward
        const lookTarget = new THREE.Vector3(0, 2, 10);
        lookTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), truckRot);
        lookTarget.add(truckPos);
        this.camera.lookAt(lookTarget);
        break;
      }

      case 'orbit': {
        // Orbit camera around truck
        const time = this.clock.getElapsedTime();
        const orbitRadius = 20;
        this.camera.position.x = truckPos.x + Math.sin(time * 0.3) * orbitRadius;
        this.camera.position.y = truckPos.y + 10;
        this.camera.position.z = truckPos.z + Math.cos(time * 0.3) * orbitRadius;
        this.camera.lookAt(truckPos);
        break;
      }
    }
  }

  /**
   * Render the scene
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

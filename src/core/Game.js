/**
 * Game - Main game controller
 *
 * Manages the game loop, scenes, and coordinates all game systems.
 */

import * as THREE from 'three';
import { updateLoadingProgress, hideLoadingScreen } from '../main.js';
import { InputManager, InputAction } from './InputManager.js';
import { SkySystem } from '../world/SkySystem.js';
import { RoadGenerator } from '../world/RoadGenerator.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { AudioManager, AudioCategory } from '../systems/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { OptionsMenu } from '../ui/OptionsMenu.js';
import { HUD } from '../ui/HUD.js';
import { MiniMap } from '../ui/MiniMap.js';
import { JobMarket } from '../ui/JobMarket.js';
import { JobSystem } from '../systems/JobSystem.js';
import { RadioSystem } from '../systems/RadioSystem.js';
import { RadioWidget } from '../ui/RadioWidget.js';
import { Garage } from '../ui/Garage.js';
import { Truck, TruckTypes } from '../vehicles/Truck.js';
import { Trailer, TrailerTypes } from '../vehicles/Trailer.js';
import * as EnvironmentProps from '../world/EnvironmentProps.js';

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
    this.roadGenerator = null;
    this.physics = null;
    this.audio = null;
    this.ui = null;
    this.mainMenu = null;
    this.pauseMenu = null;
    this.optionsMenu = null;
    this.hud = null;
    this.miniMap = null;
    this.jobMarket = null;
    this.jobSystem = null;
    this.radioSystem = null;
    this.radioWidget = null;
    this.garage = null;

    // Game state
    this.gameState = 'menu'; // menu, playing, paused
    this.playerMoney = 5000; // Starting money (PHP)

    // Vehicle state
    this.truck = null;        // Truck class instance
    this.trailer = null;      // Trailer class instance
    this.testTruck = null;    // Three.js group (for compatibility)
    this.truckBody = null;    // Physics body
    this.truckSpeed = 0;
    this.headlightsOn = false;

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

    // Initialize road generator and try to load roads
    this.roadGenerator = new RoadGenerator(this.scene, this.physics);
    await this.loadRoads();

    updateLoadingProgress(75);

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

    // Toggle job market
    this.input.onAction(InputAction.TOGGLE_JOBS, () => {
      this.toggleJobMarket();
    });

    // Radio controls
    this.input.onAction(InputAction.RADIO_TOGGLE, () => {
      if (this.radioSystem) {
        this.radioSystem.toggle();
      }
    });

    this.input.onAction(InputAction.RADIO_NEXT, () => {
      if (this.radioSystem) {
        this.radioSystem.nextStation();
      }
    });

    this.input.onAction(InputAction.RADIO_PREV, () => {
      if (this.radioSystem) {
        this.radioSystem.prevStation();
      }
    });

    // Toggle garage
    this.input.onAction(InputAction.TOGGLE_GARAGE, () => {
      this.toggleGarage();
    });
  }

  /**
   * Initialize UI system
   */
  initUI() {
    // Create UI manager
    this.ui = new UIManager();
    this.ui.init();

    // Create options menu (needed by main menu and pause menu)
    this.optionsMenu = new OptionsMenu(this.ui, this.audio, this.input, {
      onClose: () => this.closeOptions(),
    });
    this.optionsMenu.init();

    // Create main menu
    this.mainMenu = new MainMenu(this.ui, {
      onStart: () => this.startGame(),
      onOptions: () => this.showOptions('menu'),
      onAbout: () => {
        console.log('About screen (not yet implemented)');
      },
    });
    this.mainMenu.init();

    // Create pause menu
    this.pauseMenu = new PauseMenu(this.ui, {
      onResume: () => this.resumeGame(),
      onOptions: () => this.showOptions('paused'),
      onMainMenu: () => this.returnToMainMenu(),
    });
    this.pauseMenu.init();

    // Create HUD
    this.hud = new HUD(this.ui);
    this.hud.init();

    // Create MiniMap
    this.miniMap = new MiniMap(this.ui);
    this.miniMap.init();

    // Create Job System
    this.jobSystem = new JobSystem();
    this.jobSystem.onJobCompleted = (job) => this.onJobCompleted(job);
    this.jobSystem.onJobFailed = (job) => this.onJobFailed(job);

    // Create Job Market
    this.jobMarket = new JobMarket(this.ui, this.jobSystem, {
      onJobAccepted: (job) => this.onJobAccepted(job),
      onClose: () => {
        // Resume game if it was paused for job market
      },
    });
    this.jobMarket.init();

    // Create Radio System
    this.radioSystem = new RadioSystem(this.audio);
    this.radioSystem.init();

    // Create Radio Widget
    this.radioWidget = new RadioWidget(this.ui, this.radioSystem);
    this.radioWidget.init();

    // Create Garage
    this.garage = new Garage(this.ui);
    this.garage.init();
    this.garage.updateBalance(this.playerMoney);
    this.garage.onPurchase = (truckId, price) => {
      this.playerMoney -= price;
      this.hud.updateMoney(this.playerMoney);
    };
    this.garage.onSelectTruck = (truckId) => {
      this.changeTruck(truckId);
    };

    // Show main menu initially
    this.mainMenu.show();
  }

  /**
   * Show options menu
   * @param {string} returnTo - Where to return after closing ('menu' or 'paused')
   */
  showOptions(returnTo) {
    this.optionsReturnTo = returnTo;
    this.optionsMenu.show();
  }

  /**
   * Close options menu and return to previous screen
   */
  closeOptions() {
    if (this.optionsReturnTo === 'menu') {
      this.mainMenu.show();
    } else if (this.optionsReturnTo === 'paused') {
      this.pauseMenu.show();
    }
  }

  /**
   * Load road data if available
   */
  async loadRoads() {
    try {
      const roadsLoaded = await this.roadGenerator.loadRoads('/data/processed/roads.json');
      if (roadsLoaded) {
        this.roadGenerator.generateRoads();
        await this.roadGenerator.loadPOIs('/data/processed/pois.json');
        this.roadGenerator.createPOIMarkers();

        // Pass road data to miniMap
        if (this.miniMap) {
          this.miniMap.setRoadData(
            this.roadGenerator.roads,
            this.roadGenerator.getBounds()
          );
          this.miniMap.setPOIData(this.roadGenerator.pois);
        }

        // Initialize job system with POI data
        if (this.jobSystem) {
          this.jobSystem.init(this.roadGenerator.pois);
        }
      }
    } catch (error) {
      console.log('No road data available yet. Run npm run osm:download && npm run osm:process');
    }
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
    this.hud.setMoney(this.playerMoney);
    this.miniMap.show();
    this.radioWidget.show();
    console.log('Game started - WASD to drive! Press J for Jobs, R for Radio');
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
    this.miniMap.hide();
    this.radioWidget.hide();
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
   * Toggle job market screen
   */
  toggleJobMarket() {
    if (this.gameState !== 'playing') return;

    // Don't open if there's already an active job
    if (this.jobSystem.activeJob) {
      console.log('Complete current job before accepting a new one');
      return;
    }

    this.jobMarket.show();
  }

  /**
   * Toggle garage screen
   */
  toggleGarage() {
    if (this.gameState !== 'playing') return;

    // Update balance before showing
    this.garage.updateBalance(this.playerMoney);
    this.garage.toggle();
  }

  /**
   * Change the player's truck
   * @param {string} truckId - ID of the truck type
   */
  changeTruck(truckId) {
    const truckType = Object.values(TruckTypes).find(t => t.id === truckId);
    if (!truckType) return;

    // Remove old truck from scene
    if (this.truck) {
      this.scene.remove(this.truck.getObject3D());
      this.truck.dispose();
    }

    // Create new truck
    this.truck = new Truck(truckType);
    this.testTruck = this.truck.getObject3D();
    this.scene.add(this.testTruck);

    // Position at current physics body position if exists
    if (this.truckBody) {
      this.testTruck.position.copy(this.truckBody.position);
      this.testTruck.quaternion.copy(this.truckBody.quaternion);
    }

    console.log(`Changed to truck: ${truckType.name}`);
  }

  /**
   * Called when a job is accepted
   * @param {Object} job
   */
  onJobAccepted(job) {
    console.log(`Job accepted: ${job.cargo.name} to ${job.destination.name}`);

    // Set route on minimap
    if (this.miniMap) {
      this.miniMap.setRoute(
        this.jobSystem.getRoutePoints(),
        job.destination
      );
    }

    // Update HUD with job info
    if (this.hud) {
      this.hud.setJobInfo(job);
    }
  }

  /**
   * Called when a job is completed
   * @param {Object} job
   */
  onJobCompleted(job) {
    console.log(`Job completed! Earned ₱${job.finalPayment}`);

    // Add payment to player money
    this.playerMoney += job.finalPayment;

    // Clear route from minimap
    if (this.miniMap) {
      this.miniMap.clearRoute();
    }

    // Clear job info from HUD
    if (this.hud) {
      this.hud.clearJobInfo();
      this.hud.setMoney(this.playerMoney);
    }

    // TODO: Show completion notification
  }

  /**
   * Called when a job fails
   * @param {Object} job
   */
  onJobFailed(job) {
    console.log(`Job failed: ${job.failReason}`);

    // Deduct penalty from player money
    if (job.penalty) {
      this.playerMoney = Math.max(0, this.playerMoney - job.penalty);
    }

    // Clear route from minimap
    if (this.miniMap) {
      this.miniMap.clearRoute();
    }

    // Clear job info from HUD
    if (this.hud) {
      this.hud.clearJobInfo();
      this.hud.setMoney(this.playerMoney);
    }

    // TODO: Show failure notification
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
    road.position.y = 0.01;
    road.receiveShadow = true;
    this.scene.add(road);

    // Road markings (center line)
    const markingMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.5,
    });
    for (let z = -95; z < 100; z += 8) {
      const marking = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 4),
        markingMaterial
      );
      marking.rotation.x = -Math.PI / 2;
      marking.position.set(0, 0.02, z);
      this.scene.add(marking);
    }

    // Create truck using new Truck class
    this.truck = new Truck(TruckTypes.STANDARD);
    this.testTruck = this.truck.getObject3D();
    this.testTruck.position.set(0, 0, 0);
    this.scene.add(this.testTruck);

    // Create physics body for truck
    const specs = this.truck.getSpecs();
    this.truckBody = this.physics.createVehicle(this.testTruck, {
      mass: specs.mass,
      width: 2.5,
      height: 2.5,
      length: 9,
    });

    // Add environment props
    this.addEnvironmentProps();
  }

  /**
   * Add environment props to the scene
   */
  addEnvironmentProps() {
    // Palm trees along the road
    for (let z = -90; z < 100; z += 15) {
      // Left side
      const leftTree = EnvironmentProps.createPalmTree(8 + Math.random() * 4);
      leftTree.position.set(-8 - Math.random() * 5, 0, z + Math.random() * 5);
      leftTree.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(leftTree);

      // Right side
      const rightTree = EnvironmentProps.createPalmTree(8 + Math.random() * 4);
      rightTree.position.set(8 + Math.random() * 5, 0, z + Math.random() * 5);
      rightTree.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(rightTree);
    }

    // Bushes
    for (let i = 0; i < 20; i++) {
      const bush = EnvironmentProps.createBush();
      const side = Math.random() > 0.5 ? 1 : -1;
      bush.position.set(
        side * (6 + Math.random() * 15),
        0,
        -80 + Math.random() * 160
      );
      this.scene.add(bush);
    }

    // Buildings in the distance
    const building1 = EnvironmentProps.createBuilding({
      width: 10,
      depth: 12,
      height: 8,
      floors: 2,
      color: 0xE8E8E8,
      hasBalcony: true,
    });
    building1.position.set(-30, 0, 50);
    building1.rotation.y = 0.3;
    this.scene.add(building1);

    const building2 = EnvironmentProps.createBuilding({
      width: 8,
      depth: 8,
      height: 5,
      floors: 1,
      color: 0xFFF8E1,
    });
    building2.position.set(25, 0, -40);
    building2.rotation.y = -0.2;
    this.scene.add(building2);

    // Warehouse
    const warehouse = EnvironmentProps.createWarehouse();
    warehouse.position.set(-40, 0, -60);
    warehouse.rotation.y = 0.1;
    this.scene.add(warehouse);

    // Gas station
    const gasStation = EnvironmentProps.createGasStation();
    gasStation.position.set(20, 0, 30);
    gasStation.rotation.y = Math.PI / 2;
    this.scene.add(gasStation);

    // Street lamps
    for (let z = -80; z < 90; z += 25) {
      const leftLamp = EnvironmentProps.createStreetLamp();
      leftLamp.position.set(-6, 0, z);
      leftLamp.rotation.y = Math.PI / 2;
      this.scene.add(leftLamp);

      const rightLamp = EnvironmentProps.createStreetLamp();
      rightLamp.position.set(6, 0, z);
      rightLamp.rotation.y = -Math.PI / 2;
      this.scene.add(rightLamp);
    }

    // Road signs
    const speedSign = EnvironmentProps.createRoadSign('60', 'speed');
    speedSign.position.set(-5.5, 0, 70);
    this.scene.add(speedSign);

    const citySign = EnvironmentProps.createRoadSign('Davao City', 'city');
    citySign.position.set(5.5, 0, -70);
    citySign.rotation.y = Math.PI;
    this.scene.add(citySign);
  }

  /**
   * Update headlight visuals
   */
  updateHeadlights() {
    if (this.truck) {
      this.truck.setHeadlights(this.headlightsOn);
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

    // Update job system
    if (this.jobSystem && this.testTruck) {
      this.jobSystem.update(
        this.testTruck.position.x,
        this.testTruck.position.z,
        deltaTime
      );

      // Update HUD job distance
      if (this.jobSystem.activeJob && this.hud) {
        const dist = this.jobSystem.getDistanceToDestination(
          this.testTruck.position.x,
          this.testTruck.position.z
        );
        this.hud.updateJobDistance(dist);
      }
    }

    // Update camera
    this.updateCamera(deltaTime);

    // Update radio system
    if (this.radioSystem) {
      this.radioSystem.update(deltaTime);
    }

    // Update radio widget
    if (this.radioWidget) {
      this.radioWidget.update();
    }

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

    // Update GPS location from truck position
    if (this.testTruck) {
      this.hud.setLocation(this.testTruck.position.x, this.testTruck.position.z);

      // Update minimap
      if (this.miniMap) {
        this.miniMap.setPlayerPosition(
          this.testTruck.position.x,
          this.testTruck.position.z,
          this.testTruck.rotation.y
        );
        this.miniMap.render();
      }
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

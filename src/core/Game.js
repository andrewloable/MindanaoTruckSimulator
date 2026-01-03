/**
 * Game - Main game controller
 *
 * Manages the game loop, scenes, and coordinates all game systems.
 */

import * as THREE from 'three';
import { updateLoadingProgress, hideLoadingScreen } from '../main.js';
import { InputManager, InputAction } from './InputManager.js';
import { SkySystem } from '../world/SkySystem.js';
import { WeatherSystem } from '../world/WeatherSystem.js';
import { TerrainSystem } from '../world/TerrainSystem.js';
import { RoadGenerator } from '../world/RoadGenerator.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { TrafficSystem } from '../systems/TrafficSystem.js';
import { AudioManager, AudioCategory, loadGameSounds, EngineAudio, HornAudio } from '../systems/AudioManager.js';
import { FuelSystem } from '../systems/FuelSystem.js';
import { MaintenanceSystem, TruckComponent } from '../systems/MaintenanceSystem.js';
import { Notification } from '../ui/Notification.js';
import { UIManager } from '../ui/UIManager.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { OptionsMenu } from '../ui/OptionsMenu.js';
import { HUD } from '../ui/HUD.js';
import { MiniMap } from '../ui/MiniMap.js';
import { JobMarket } from '../ui/JobMarket.js';
import { JobSystem } from '../systems/JobSystem.js';
import { Pathfinder } from '../systems/Pathfinder.js';
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
    this.weatherSystem = null;
    this.terrainSystem = null;
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
    this.pathfinder = null;
    this.radioSystem = null;
    this.radioWidget = null;
    this.garage = null;
    this.notification = null;
    this.engineAudio = null;
    this.hornAudio = null;
    this.fuelSystem = null;
    this.maintenanceSystem = null;
    this.chunkManager = null;
    this.trafficSystem = null;

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
    this.skySystem.setSunLight(this.sunLight);
    this.skySystem.setAmbientLight(this.ambientLight);

    // Initialize weather system
    this.weatherSystem = new WeatherSystem(this.scene, this.camera);
    this.weatherSystem.init();

    updateLoadingProgress(60);

    // Initialize physics system
    this.physics = new PhysicsSystem();
    this.physics.init();
    this.physics.createGroundPlane(0, 'ground');

    // Setup collision callback for cargo damage
    this.physics.onVehicleCollision = (damage, impactForce) => {
      if (this.jobSystem && this.jobSystem.activeJob) {
        const newDamage = this.jobSystem.applyDamage(damage);
        if (newDamage >= 0 && this.notification) {
          // Show damage notification for significant impacts
          if (damage >= 10) {
            this.notification.show({
              type: 'warning',
              title: 'Cargo Damaged!',
              message: `Impact damage: ${damage.toFixed(1)}% (Total: ${newDamage.toFixed(1)}%)`,
              icon: '📦',
              duration: 2000,
            });
          }
        }
      }
    };

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
      if (this.hornAudio) {
        this.hornAudio.honk(400);
      }
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

    // Refuel
    this.input.onAction(InputAction.REFUEL, () => {
      this.tryRefuel();
    });

    // Repair
    this.input.onAction(InputAction.REPAIR, () => {
      this.tryRepair();
    });

    // Weather cycle (for testing)
    this.input.onAction(InputAction.WEATHER_CYCLE, () => {
      if (this.weatherSystem) {
        this.weatherSystem.cycleWeather();
        if (this.notification) {
          this.notification.showInfo('Weather', `Changed to ${this.weatherSystem.getWeather()}`);
        }
      }
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
      if (this.notification) {
        this.notification.showMoneySpent(price, 'Truck purchase');
      }
    };
    this.garage.onSelectTruck = (truckId) => {
      this.changeTruck(truckId);
    };

    // Create Notification system
    this.notification = new Notification(this.ui);
    this.notification.init();

    // Create Fuel System
    this.fuelSystem = new FuelSystem();
    // Start with 50% fuel
    this.fuelSystem.setFuelLevel(this.fuelSystem.getTankCapacity() * 0.5);
    this.fuelSystem.onFuelLow = (level, percent) => {
      if (this.notification) {
        this.notification.show({
          type: 'warning',
          title: 'Low Fuel',
          message: `Only ${Math.round(level)}L remaining. Find a gas station!`,
          icon: '\u26FD',
          duration: 5000,
        });
      }
    };
    this.fuelSystem.onFuelEmpty = () => {
      if (this.notification) {
        this.notification.show({
          type: 'error',
          title: 'Out of Fuel',
          message: 'Your truck has run out of fuel!',
          icon: '\u26FD',
          duration: 0, // Don't auto-hide
        });
      }
    };
    this.fuelSystem.onRefuelAvailable = (station) => {
      if (this.notification) {
        this.notification.show({
          type: 'info',
          title: 'Gas Station',
          message: 'Press F to refuel',
          icon: '\u26FD',
          duration: 3000,
        });
      }
    };
    this.fuelSystem.onRefuelComplete = (liters, cost) => {
      if (this.notification) {
        this.notification.showMoneySpent(cost, `Refueled ${Math.round(liters)}L`);
      }
    };

    // Create Maintenance System
    this.maintenanceSystem = new MaintenanceSystem();
    this.maintenanceSystem.onComponentCritical = (component, condition) => {
      if (this.notification) {
        const names = {
          engine: 'Engine',
          tires: 'Tires',
          brakes: 'Brakes',
          body: 'Body',
          transmission: 'Transmission',
        };
        this.notification.show({
          type: 'error',
          title: 'Critical Damage',
          message: `${names[component] || component} is critically damaged! Find a service station.`,
          icon: '\u26A0',
          duration: 6000,
        });
      }
    };
    this.maintenanceSystem.onServiceAvailable = (station) => {
      if (this.maintenanceSystem.needsRepair() && this.notification) {
        this.notification.show({
          type: 'info',
          title: 'Service Station',
          message: 'Press N to repair',
          icon: '\uD83D\uDD27',
          duration: 3000,
        });
      }
    };
    this.maintenanceSystem.onRepairComplete = (component, cost) => {
      if (this.notification) {
        const message = component === 'all' ? 'Full service complete' : `${component} repaired`;
        this.notification.showMoneySpent(cost, message);
      }
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
        await this.roadGenerator.loadPOIs('/data/processed/pois.json');

        // Check if we should use chunk streaming (for large worlds)
        const bounds = this.roadGenerator.getBounds();
        const worldSize = Math.max(
          bounds.maxX - bounds.minX,
          bounds.maxZ - bounds.minZ
        );
        const useChunkStreaming = worldSize > 2000; // Use chunks for worlds > 2km

        if (useChunkStreaming) {
          // Initialize chunk manager for streaming
          this.chunkManager = new ChunkManager(this.scene);
          this.chunkManager.init(
            this.roadGenerator.roads,
            this.roadGenerator.pois,
            this.roadGenerator
          );
          console.log('Chunk-based streaming enabled for large world');
        } else {
          // Load all roads at once for small worlds
          this.roadGenerator.generateRoads();
          this.roadGenerator.createPOIMarkers();
        }

        // Build pathfinding graph from road data
        this.pathfinder = new Pathfinder();
        this.pathfinder.buildGraph(this.roadGenerator.roads);

        // Initialize terrain system with road elevation data
        this.terrainSystem = new TerrainSystem(this.scene);
        this.terrainSystem.init(
          this.roadGenerator.roads,
          bounds
        );

        // Pass road data to miniMap
        if (this.miniMap) {
          this.miniMap.setRoadData(
            this.roadGenerator.roads,
            bounds
          );
          this.miniMap.setPOIData(this.roadGenerator.pois);
        }

        // Initialize job system with POI data and pathfinder
        if (this.jobSystem) {
          this.jobSystem.init(this.roadGenerator.pois, this.pathfinder);
        }

        // Initialize traffic system
        this.trafficSystem = new TrafficSystem(this.scene);
        this.trafficSystem.init(this.roadGenerator.roads);
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
      // Load game sounds
      await loadGameSounds(this.audio);
      // Create engine and horn audio managers
      this.engineAudio = new EngineAudio(this.audio);
      this.hornAudio = new HornAudio(this.audio);
    }

    this.gameState = 'playing';
    this.isPaused = false;
    this.mainMenu.hide();
    this.hud.show();
    this.hud.setMoney(this.playerMoney);
    this.miniMap.show();
    this.radioWidget.show();

    // Start engine audio
    if (this.engineAudio && !this.engineAudio.getIsRunning()) {
      this.engineAudio.start();
    }

    console.log('Game started - WASD to drive, ESC to pause');
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

    // Stop engine audio
    if (this.engineAudio) {
      this.engineAudio.stop();
    }

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
   * Try to refuel at a gas station
   */
  tryRefuel() {
    if (this.gameState !== 'playing') return;
    if (!this.fuelSystem || !this.fuelSystem.canRefuel) return;

    const cost = this.fuelSystem.getFullTankCost();

    // Check if player has enough money
    if (this.playerMoney < cost) {
      if (this.notification) {
        this.notification.show({
          type: 'warning',
          title: 'Not Enough Money',
          message: `Need \u20B1${cost.toLocaleString()} to fill tank`,
          icon: '\uD83D\uDCB0',
        });
      }
      return;
    }

    // Refuel
    const result = this.fuelSystem.refuel();
    if (result.litersAdded > 0) {
      this.playerMoney -= result.cost;
      if (this.hud) {
        this.hud.setMoney(this.playerMoney);
        this.hud.setFuel(this.fuelSystem.getFuelPercent() * 100);
      }
    }
  }

  /**
   * Try to repair at a service station
   */
  tryRepair() {
    if (this.gameState !== 'playing') return;
    if (!this.maintenanceSystem || !this.maintenanceSystem.canRepair) return;

    const cost = this.maintenanceSystem.getTotalRepairCost();

    // Check if anything needs repair
    if (cost === 0) {
      if (this.notification) {
        this.notification.showInfo('No Repairs Needed', 'Your truck is in good condition!');
      }
      return;
    }

    // Check if player has enough money
    if (this.playerMoney < cost) {
      if (this.notification) {
        this.notification.show({
          type: 'warning',
          title: 'Not Enough Money',
          message: `Need \u20B1${cost.toLocaleString()} for full repair`,
          icon: '\uD83D\uDCB0',
        });
      }
      return;
    }

    // Perform repair
    const result = this.maintenanceSystem.repairAll();
    if (result.repaired) {
      this.playerMoney -= result.cost;
      if (this.hud) {
        this.hud.setMoney(this.playerMoney);
      }
    }
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
    console.log(`Job completed! Earned \u20B1${job.finalPayment}`);

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

    // Show completion notification
    if (this.notification) {
      this.notification.showJobCompleted(job);
    }
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

    // Show failure notification
    if (this.notification) {
      this.notification.showJobFailed(job);
    }
  }

  /**
   * Setup scene lighting
   */
  setupLighting() {
    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

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
    this.scene.add(this.sunLight.target); // Target must be added to scene

    // Hemisphere light for sky/ground color variation
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c3d, 0.4);
    this.scene.add(hemiLight);
  }

  /**
   * Add test scene elements for initial development
   */
  addTestScene() {
    // Determine truck start position first, then position ground around it
    let startX = 0, startY = 2, startZ = 0;
    console.log('addTestScene: roadGenerator exists:', !!this.roadGenerator);
    console.log('addTestScene: roads loaded:', this.roadGenerator?.roads?.length || 0);

    if (this.roadGenerator && this.roadGenerator.roads.length > 0) {
      const majorRoad = this.roadGenerator.roads.find(
        r => r.type === 'primary' || r.type === 'trunk'
      ) || this.roadGenerator.roads[0];

      console.log('addTestScene: found major road:', majorRoad?.name, majorRoad?.type);

      if (majorRoad && majorRoad.points && majorRoad.points.length > 0) {
        const midIndex = Math.floor(majorRoad.points.length / 2);
        const startPoint = majorRoad.points[midIndex];
        startX = startPoint[0];
        startY = (startPoint[1] || 0) + 2;
        startZ = startPoint[2];
        console.log('addTestScene: start position calculated:', { startX, startY, startZ });
      }
    } else {
      console.log('addTestScene: No roads loaded, using default position');
    }

    // Ground plane - position at truck location and road elevation
    const groundElevation = startY - 2; // Match road elevation
    const groundGeometry = new THREE.PlaneGeometry(5000, 5000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5c3d, // Grass green
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(startX, groundElevation, startZ);
    ground.receiveShadow = true;
    this.scene.add(ground);
    console.log(`Ground plane positioned at: (${startX.toFixed(0)}, ${groundElevation.toFixed(0)}, ${startZ.toFixed(0)})`);

    // Update physics ground to match road elevation
    // Remove old ground and create new one at correct height
    if (this.physics && this.physics.world) {
      // Find and remove the old ground body
      const groundBodies = this.physics.world.bodies.filter(b => b.type === 0); // STATIC = 0
      groundBodies.forEach(b => this.physics.world.removeBody(b));
      // Create new ground at road elevation
      this.physics.createGroundPlane(groundElevation, 'ground');
      console.log(`Physics ground updated to elevation: ${groundElevation.toFixed(0)}`);
    }

    // Only add test road if no real roads loaded
    if (!this.roadGenerator || this.roadGenerator.roads.length === 0) {
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
    }

    // Create truck using new Truck class
    this.truck = new Truck(TruckTypes.STANDARD);
    this.testTruck = this.truck.getObject3D();

    // Position truck using the same coordinates calculated above for ground
    this.testTruck.position.set(startX, startY, startZ);
    console.log(`Truck positioned at: (${startX.toFixed(0)}, ${startY.toFixed(1)}, ${startZ.toFixed(0)})`);
    this.scene.add(this.testTruck);

    // Position camera near the truck initially
    this.camera.position.set(startX, startY + 10, startZ + 20);
    this.camera.lookAt(startX, startY, startZ);

    // Position sun light at truck location for proper lighting
    if (this.sunLight) {
      this.sunLight.position.set(startX + 50, startY + 100, startZ + 50);
      this.sunLight.target.position.set(startX, startY, startZ);
      this.sunLight.target.updateMatrixWorld();
    }

    // Create physics body for truck
    const specs = this.truck.getSpecs();
    this.truckBody = this.physics.createVehicle(this.testTruck, {
      mass: specs.mass,
      width: 2.5,
      height: 2.5,
      length: 9,
    });

    // Trigger initial chunk loading at truck position
    if (this.chunkManager) {
      this.chunkManager.update(startX, startZ, true); // Force update
      console.log('Initial chunk loading triggered at truck position');
    }

    // Add environment props only if no real roads loaded
    if (!this.roadGenerator || this.roadGenerator.roads.length === 0) {
      this.addEnvironmentProps();
    }
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

    // Update chunk streaming based on player position
    if (this.chunkManager && this.testTruck) {
      this.chunkManager.update(
        this.testTruck.position.x,
        this.testTruck.position.z
      );
    }

    // Update AI traffic
    if (this.trafficSystem && this.testTruck) {
      this.trafficSystem.update(deltaTime, this.testTruck.position);
    }

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

    // Update sun light position to follow truck for proper shadows
    if (this.sunLight && this.testTruck) {
      const truckPos = this.testTruck.position;
      this.sunLight.position.set(truckPos.x + 50, truckPos.y + 100, truckPos.z + 50);
      this.sunLight.target.position.copy(truckPos);
      this.sunLight.target.updateMatrixWorld();
    }

    // Update audio listener position (for 3D spatial audio)
    if (this.audio && this.audio.isInitialized() && this.camera) {
      // Get camera forward direction
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(this.camera.quaternion);

      this.audio.setListenerPosition(
        { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
        { x: forward.x, y: forward.y, z: forward.z },
        { x: 0, y: 1, z: 0 }
      );
    }

    // Update sky system (day/night cycle)
    if (this.skySystem) {
      this.skySystem.update(deltaTime);

      // Auto-enable headlights at night
      if (this.skySystem.isNight() && !this.headlightsOn) {
        this.headlightsOn = true;
        this.updateHeadlights();
      }
    }

    // Update weather system
    if (this.weatherSystem) {
      this.weatherSystem.update(deltaTime);

      // Auto-enable headlights in heavy rain
      if (this.weatherSystem.isRaining() && !this.headlightsOn) {
        this.headlightsOn = true;
        this.updateHeadlights();
      }
    }

    // Update radio system
    if (this.radioSystem) {
      this.radioSystem.update(deltaTime);
    }

    // Update radio widget
    if (this.radioWidget) {
      this.radioWidget.update();
    }

    // Update engine audio based on speed and throttle
    if (this.engineAudio) {
      const throttle = this.input.getThrottleInput();
      this.engineAudio.update(this.truckSpeed, throttle, 30);
    }

    // Update fuel system
    if (this.fuelSystem) {
      const throttle = this.input.getThrottleInput();
      this.fuelSystem.update(this.truckSpeed, throttle, deltaTime);

      // Check if near gas station using real POI data
      if (this.testTruck) {
        const gasStations = this.roadGenerator
          ? this.roadGenerator.getFuelStations()
          : [{ x: 20, z: 30, name: 'Test Gas Station' }]; // Fallback for testing
        this.fuelSystem.checkNearGasStation(
          this.testTruck.position.x,
          this.testTruck.position.z,
          gasStations
        );
      }
    }

    // Update maintenance system
    if (this.maintenanceSystem && this.testTruck) {
      // Calculate distance traveled this frame (convert m/s to km)
      const distanceKm = this.truckSpeed * deltaTime / 1000;

      // Get driving conditions
      const braking = this.input.getBrakeInput() > 0;
      const isRaining = this.weatherSystem ? this.weatherSystem.isRaining() : false;

      // Update wear
      if (distanceKm > 0) {
        this.maintenanceSystem.updateWear(distanceKm, {
          speed: this.truckSpeed * 3.6, // Convert m/s to km/h
          braking,
          offroad: false, // TODO: detect when off-road
          rain: isRaining,
        });
      }

      // Check if near service station (using gas stations as service stations for now)
      const serviceStations = this.roadGenerator
        ? this.roadGenerator.getFuelStations()
        : [{ x: 20, z: 30, name: 'Test Service Station' }];
      this.maintenanceSystem.checkNearServiceStation(
        this.testTruck.position.x,
        this.testTruck.position.z,
        serviceStations
      );
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

    // Update fuel from fuel system (getFuelPercent returns 0-1, setFuel expects 0-100)
    if (this.fuelSystem) {
      this.hud.setFuel(this.fuelSystem.getFuelPercent() * 100);
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

    // DEBUG: Log input once per second when there's input
    if ((throttle > 0 || brake > 0 || steering !== 0) && !this._lastInputLog) {
      console.log('Input received:', { throttle, brake, steering, handbrake });
      this._lastInputLog = Date.now();
    }
    if (this._lastInputLog && Date.now() - this._lastInputLog > 1000) {
      this._lastInputLog = null;
    }

    // Physics constants (base values)
    let engineForce = 8000; // Newtons
    let brakeForce = 12000;
    const maxSteerTorque = 3000;
    let maxSpeed = 30; // m/s (~108 km/h)

    // Apply maintenance damage multipliers
    if (this.maintenanceSystem) {
      const accelMult = this.maintenanceSystem.getPerformanceMultiplier('acceleration');
      const speedMult = this.maintenanceSystem.getPerformanceMultiplier('maxSpeed');
      const brakeMult = this.maintenanceSystem.getPerformanceMultiplier('braking');

      engineForce *= accelMult;
      maxSpeed *= speedMult;
      brakeForce *= brakeMult;
    }

    // Get current velocity
    const velocity = this.physics.getVelocity(this.truckBody);
    const currentSpeed = velocity.length();
    this.truckSpeed = currentSpeed;

    // Get forward direction from truck rotation (Y-axis only, keep horizontal)
    // Extract yaw rotation only to prevent force going vertical when truck tips
    const euler = new THREE.Euler().setFromQuaternion(this.testTruck.quaternion, 'YXZ');
    const yawOnly = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(yawOnly);

    // Apply engine force (throttle)
    if (throttle > 0 && currentSpeed < maxSpeed) {
      const force = forward.clone().multiplyScalar(throttle * engineForce);
      this.physics.applyForce(this.truckBody, force);
      // DEBUG: Log force application occasionally
      if (!this._lastForceLog || Date.now() - this._lastForceLog > 2000) {
        console.log('Applying force:', force.x.toFixed(0), force.y.toFixed(0), force.z.toFixed(0), 'Speed:', currentSpeed.toFixed(2));
        console.log('Body velocity:', this.truckBody.velocity.x.toFixed(2), this.truckBody.velocity.y.toFixed(2), this.truckBody.velocity.z.toFixed(2));
        console.log('Body position:', this.truckBody.position.x.toFixed(0), this.truckBody.position.y.toFixed(0), this.truckBody.position.z.toFixed(0));
        console.log('Body mass:', this.truckBody.mass, 'Type:', this.truckBody.type);
        this._lastForceLog = Date.now();
      }
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

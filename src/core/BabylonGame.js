/**
 * BabylonGame - Main game controller using Babylon.js and Havok Physics
 *
 * Replaces Three.js with Babylon.js for proper vehicle physics via Havok.
 */

import * as BABYLON from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/loaders/glTF';

import { updateLoadingProgress, hideLoadingScreen } from '../main.js';
import { InputManager, InputAction } from './InputManager.js';
import { AudioManager, loadGameSounds, EngineAudio, HornAudio } from '../systems/AudioManager.js';
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
import { FuelSystem } from '../systems/FuelSystem.js';
import { Notification } from '../ui/Notification.js';

export class BabylonGame {
  constructor() {
    this.canvas = null;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.havokInstance = null;
    this.isRunning = false;
    this.isPaused = false;

    // Game systems
    this.input = null;
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

    // Road data
    this.roadData = null;
    this.poiData = null;
    this.roadMeshes = [];

    // Game state
    this.gameState = 'menu';
    this.playerMoney = 5000;

    // Vehicle
    this.vehicleMesh = null;
    this.vehicleBody = null;
    this.wheelMeshes = [];
    this.wheelBodies = [];
    this.truckSpeed = 0;
    this.headlightsOn = false;

    // Camera settings
    this.cameraMode = 'chase';

    // Last frame time for delta calculation
    this.lastTime = 0;
  }

  /**
   * Initialize the game
   */
  async init() {
    console.log('Initializing Mindanao Truck Simulator (Babylon.js + Havok)...');

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

    // Initialize Babylon.js engine
    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    updateLoadingProgress(25);

    // Initialize Havok physics
    console.log('Loading Havok physics...');
    this.havokInstance = await HavokPhysics();
    console.log('Havok physics loaded');

    updateLoadingProgress(35);

    // Create scene with physics
    await this.createScene();

    updateLoadingProgress(55);

    // Load road data
    await this.loadRoads();

    updateLoadingProgress(70);

    // Create vehicle
    this.createVehicle();

    updateLoadingProgress(80);

    // Create audio manager
    this.audio = new AudioManager();

    // Initialize UI
    this.initUI();

    updateLoadingProgress(90);

    // Setup event listeners
    this.setupEventListeners();

    updateLoadingProgress(100);

    await new Promise(resolve => setTimeout(resolve, 500));
    hideLoadingScreen();

    console.log('Game initialized successfully (Babylon.js + Havok)');
    console.log('Controls: WASD/Arrows to drive, Space for handbrake, H for horn, L for lights, C for camera');
  }

  /**
   * Create the Babylon.js scene with Havok physics
   */
  async createScene() {
    this.scene = new BABYLON.Scene(this.engine);

    // Enable Havok physics
    const havokPlugin = new HavokPlugin(true, this.havokInstance);
    this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

    // Sky color
    this.scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.92, 1);

    // Create camera
    this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 10, 20), this.scene);
    this.camera.attachControl(this.canvas, false);

    // Lighting
    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.6;

    const sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.5), this.scene);
    sunLight.intensity = 1.0;
    sunLight.position = new BABYLON.Vector3(50, 100, 50);

    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, sunLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator = shadowGenerator;

    // Create ground
    await this.createGround();

    console.log('Scene created with Havok physics');
  }

  /**
   * Create ground plane with physics
   */
  async createGround() {
    // Determine ground position from road data
    let groundY = 0;
    let groundX = 0;
    let groundZ = 0;

    if (this.roadData && this.roadData.length > 0) {
      const firstRoad = this.roadData[0];
      if (firstRoad.points && firstRoad.points.length > 0) {
        const point = firstRoad.points[0];
        groundX = point[0];
        groundY = point[1] || 0;
        groundZ = point[2];
      }
    }

    // Large ground plane
    const ground = BABYLON.MeshBuilder.CreateGround('ground', {
      width: 5000,
      height: 5000,
    }, this.scene);

    ground.position = new BABYLON.Vector3(groundX, groundY, groundZ);

    // Ground material
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.24, 0.36, 0.24);
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Ground physics (static)
    const groundAggregate = new BABYLON.PhysicsAggregate(
      ground,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0, friction: 0.8, restitution: 0.1 },
      this.scene
    );

    this.ground = ground;
    this.groundPosition = { x: groundX, y: groundY, z: groundZ };
  }

  /**
   * Load road data
   */
  async loadRoads() {
    try {
      const response = await fetch('/data/processed/roads.json');
      if (response.ok) {
        this.roadData = await response.json();
        console.log(`Loaded ${this.roadData.length} roads`);

        // Load POIs
        const poiResponse = await fetch('/data/processed/pois.json');
        if (poiResponse.ok) {
          this.poiData = await poiResponse.json();
          console.log(`Loaded ${this.poiData.length} POIs`);
        }

        // Render roads
        this.renderRoads();

        // Update ground position based on road data
        if (this.roadData.length > 0) {
          const majorRoad = this.roadData.find(r => r.type === 'primary' || r.type === 'trunk') || this.roadData[0];
          if (majorRoad && majorRoad.points && majorRoad.points.length > 0) {
            const midIndex = Math.floor(majorRoad.points.length / 2);
            const point = majorRoad.points[midIndex];
            this.startPosition = {
              x: point[0],
              y: (point[1] || 0) + 2,
              z: point[2],
            };

            // Reposition ground
            if (this.ground) {
              this.ground.position = new BABYLON.Vector3(point[0], point[1] || 0, point[2]);
            }
          }
        }

        // Initialize job system
        this.pathfinder = new Pathfinder();
        this.pathfinder.buildGraph(this.roadData);

        if (this.miniMap) {
          this.miniMap.setRoadData(this.roadData, this.getBounds());
          this.miniMap.setPOIData(this.poiData);
        }
      }
    } catch (error) {
      console.log('No road data available:', error);
      this.startPosition = { x: 0, y: 2, z: 0 };
    }
  }

  /**
   * Get road bounds
   */
  getBounds() {
    if (!this.roadData || this.roadData.length === 0) {
      return { minX: -500, maxX: 500, minZ: -500, maxZ: 500 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const road of this.roadData) {
      if (!road.points) continue;
      for (const point of road.points) {
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minZ = Math.min(minZ, point[2]);
        maxZ = Math.max(maxZ, point[2]);
      }
    }

    return { minX, maxX, minZ, maxZ };
  }

  /**
   * Render roads using Babylon.js meshes
   */
  renderRoads() {
    if (!this.roadData) return;

    const roadColors = {
      motorway: new BABYLON.Color3(0.2, 0.2, 0.2),
      trunk: new BABYLON.Color3(0.25, 0.25, 0.25),
      primary: new BABYLON.Color3(0.3, 0.3, 0.3),
      secondary: new BABYLON.Color3(0.35, 0.35, 0.35),
      tertiary: new BABYLON.Color3(0.4, 0.4, 0.4),
      default: new BABYLON.Color3(0.45, 0.45, 0.45),
    };

    const roadWidths = {
      motorway: 16,
      trunk: 14,
      primary: 12,
      secondary: 10,
      tertiary: 8,
      default: 6,
    };

    let roadCount = 0;

    for (const road of this.roadData) {
      if (!road.points || road.points.length < 2) continue;

      const width = roadWidths[road.type] || roadWidths.default;
      const color = roadColors[road.type] || roadColors.default;

      // Create path from points
      const path = road.points.map(p => new BABYLON.Vector3(p[0], (p[1] || 0) + 0.1, p[2]));

      // Create ribbon for road
      try {
        const roadMesh = BABYLON.MeshBuilder.CreateTube(`road_${roadCount}`, {
          path: path,
          radius: width / 2,
          tessellation: 4,
          cap: BABYLON.Mesh.NO_CAP,
          sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        }, this.scene);

        // Flatten the tube to make it a road
        roadMesh.scaling.y = 0.1;

        const material = new BABYLON.StandardMaterial(`roadMat_${roadCount}`, this.scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        roadMesh.material = material;
        roadMesh.receiveShadows = true;

        this.roadMeshes.push(roadMesh);
        roadCount++;
      } catch (e) {
        // Skip invalid roads
      }
    }

    console.log(`Rendered ${roadCount} roads`);
  }

  /**
   * Create vehicle with Havok physics
   */
  createVehicle() {
    const startPos = this.startPosition || { x: 0, y: 2, z: 0 };

    // Create chassis mesh
    const chassisWidth = 2.5;
    const chassisHeight = 1.5;
    const chassisLength = 6;

    const chassis = BABYLON.MeshBuilder.CreateBox('chassis', {
      width: chassisWidth,
      height: chassisHeight,
      depth: chassisLength,
    }, this.scene);

    // Truck color (green like branding)
    const chassisMaterial = new BABYLON.StandardMaterial('chassisMat', this.scene);
    chassisMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.69, 0.31);
    chassis.material = chassisMaterial;
    chassis.position = new BABYLON.Vector3(startPos.x, startPos.y, startPos.z);

    // Add cabin
    const cabin = BABYLON.MeshBuilder.CreateBox('cabin', {
      width: chassisWidth,
      height: 1,
      depth: 2,
    }, this.scene);
    cabin.material = chassisMaterial;
    cabin.position = new BABYLON.Vector3(0, chassisHeight / 2 + 0.5, chassisLength / 2 - 1.5);
    cabin.parent = chassis;

    // Add shadows
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(chassis);
      this.shadowGenerator.addShadowCaster(cabin);
    }

    this.vehicleMesh = chassis;

    // Create physics body for chassis
    const chassisAggregate = new BABYLON.PhysicsAggregate(
      chassis,
      BABYLON.PhysicsShapeType.BOX,
      {
        mass: 2000,
        friction: 0.5,
        restitution: 0.1,
      },
      this.scene
    );

    this.vehicleBody = chassisAggregate.body;

    // Increase angular damping to prevent flipping
    this.vehicleBody.setLinearDamping(0.3);
    this.vehicleBody.setAngularDamping(0.9);

    // Create wheels
    this.createWheels(chassis, chassisAggregate);

    // Position camera
    this.camera.position = new BABYLON.Vector3(startPos.x, startPos.y + 10, startPos.z + 20);
    this.camera.setTarget(chassis.position);

    console.log(`Vehicle created at (${startPos.x.toFixed(0)}, ${startPos.y.toFixed(0)}, ${startPos.z.toFixed(0)})`);
  }

  /**
   * Create wheels with physics constraints
   */
  createWheels(chassis, chassisAggregate) {
    const wheelRadius = 0.5;
    const wheelWidth = 0.4;
    const chassisWidth = 2.5;
    const chassisLength = 6;

    // Wheel positions relative to chassis (front-left, front-right, back-left, back-right)
    const wheelPositions = [
      { x: -chassisWidth / 2 - wheelWidth / 2, y: -0.5, z: chassisLength / 2 - 1, isFront: true },
      { x: chassisWidth / 2 + wheelWidth / 2, y: -0.5, z: chassisLength / 2 - 1, isFront: true },
      { x: -chassisWidth / 2 - wheelWidth / 2, y: -0.5, z: -chassisLength / 2 + 1, isFront: false },
      { x: chassisWidth / 2 + wheelWidth / 2, y: -0.5, z: -chassisLength / 2 + 1, isFront: false },
    ];

    const wheelMaterial = new BABYLON.StandardMaterial('wheelMat', this.scene);
    wheelMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);

    for (let i = 0; i < wheelPositions.length; i++) {
      const pos = wheelPositions[i];

      // Create wheel mesh
      const wheel = BABYLON.MeshBuilder.CreateCylinder(`wheel_${i}`, {
        height: wheelWidth,
        diameter: wheelRadius * 2,
        tessellation: 16,
      }, this.scene);

      wheel.rotation.z = Math.PI / 2;
      wheel.material = wheelMaterial;

      // Position wheel relative to chassis world position
      const worldPos = new BABYLON.Vector3(
        chassis.position.x + pos.x,
        chassis.position.y + pos.y,
        chassis.position.z + pos.z
      );
      wheel.position = worldPos;

      if (this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(wheel);
      }

      this.wheelMeshes.push({ mesh: wheel, isFront: pos.isFront, localPos: pos });

      // Create wheel physics
      const wheelAggregate = new BABYLON.PhysicsAggregate(
        wheel,
        BABYLON.PhysicsShapeType.CYLINDER,
        {
          mass: 20,
          friction: 0.8,
          restitution: 0.1,
        },
        this.scene
      );

      this.wheelBodies.push({ body: wheelAggregate.body, isFront: pos.isFront });

      // Create 6DoF constraint for suspension
      // This connects the wheel to the chassis with spring-like behavior
      const jointData = {
        pivotA: new BABYLON.Vector3(pos.x, pos.y, pos.z),
        pivotB: new BABYLON.Vector3(0, 0, 0),
        axisA: new BABYLON.Vector3(1, 0, 0),
        axisB: new BABYLON.Vector3(1, 0, 0),
      };

      // Use a hinge constraint for wheel rotation around axle
      const constraint = new BABYLON.Physics6DoFConstraint(
        jointData,
        [
          { axis: BABYLON.PhysicsConstraintAxis.LINEAR_Y, minLimit: -0.3, maxLimit: 0.1 }, // Suspension travel
          { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_X, minLimit: -Math.PI * 2, maxLimit: Math.PI * 2 }, // Wheel rotation
        ],
        this.scene
      );

      chassisAggregate.body.addConstraint(wheelAggregate.body, constraint);
    }

    console.log('Wheels created with 6DoF constraints');
  }

  /**
   * Setup input callbacks
   */
  setupInputCallbacks() {
    this.input.onAction(InputAction.HORN, () => {
      if (this.hornAudio) {
        this.hornAudio.honk(400);
      }
    });

    this.input.onAction(InputAction.HEADLIGHTS, () => {
      this.headlightsOn = !this.headlightsOn;
      console.log(`Headlights: ${this.headlightsOn ? 'ON' : 'OFF'}`);
    });

    this.input.onAction(InputAction.CAMERA_NEXT, () => {
      this.cycleCamera();
    });

    this.input.onAction(InputAction.PAUSE, () => {
      this.togglePause();
    });

    this.input.onAction(InputAction.TOGGLE_JOBS, () => {
      this.toggleJobMarket();
    });

    this.input.onAction(InputAction.RADIO_TOGGLE, () => {
      if (this.radioSystem) this.radioSystem.toggle();
    });

    this.input.onAction(InputAction.RADIO_NEXT, () => {
      if (this.radioSystem) this.radioSystem.nextStation();
    });

    this.input.onAction(InputAction.RADIO_PREV, () => {
      if (this.radioSystem) this.radioSystem.prevStation();
    });

    this.input.onAction(InputAction.TOGGLE_GARAGE, () => {
      this.toggleGarage();
    });
  }

  /**
   * Initialize UI
   */
  initUI() {
    this.ui = new UIManager();
    this.ui.init();

    this.optionsMenu = new OptionsMenu(this.ui, this.audio, this.input, {
      onClose: () => this.closeOptions(),
    });
    this.optionsMenu.init();

    this.mainMenu = new MainMenu(this.ui, {
      onStart: () => this.startGame(),
      onOptions: () => this.showOptions('menu'),
      onAbout: () => console.log('About'),
    });
    this.mainMenu.init();

    this.pauseMenu = new PauseMenu(this.ui, {
      onResume: () => this.resumeGame(),
      onOptions: () => this.showOptions('paused'),
      onMainMenu: () => this.returnToMainMenu(),
    });
    this.pauseMenu.init();

    this.hud = new HUD(this.ui);
    this.hud.init();

    this.miniMap = new MiniMap(this.ui);
    this.miniMap.init();

    this.jobSystem = new JobSystem();
    this.jobSystem.onJobCompleted = (job) => this.onJobCompleted(job);
    this.jobSystem.onJobFailed = (job) => this.onJobFailed(job);

    this.jobMarket = new JobMarket(this.ui, this.jobSystem, {
      onJobAccepted: (job) => this.onJobAccepted(job),
      onClose: () => {},
    });
    this.jobMarket.init();

    this.radioSystem = new RadioSystem(this.audio);
    this.radioSystem.init();

    this.radioWidget = new RadioWidget(this.ui, this.radioSystem);
    this.radioWidget.init();

    this.garage = new Garage(this.ui);
    this.garage.init();
    this.garage.updateBalance(this.playerMoney);

    this.notification = new Notification(this.ui);
    this.notification.init();

    this.fuelSystem = new FuelSystem();
    this.fuelSystem.setFuelLevel(this.fuelSystem.getTankCapacity() * 0.5);

    if (this.poiData && this.pathfinder) {
      this.jobSystem.init(this.poiData, this.pathfinder);
    }

    this.mainMenu.show();
  }

  /**
   * Show options menu
   */
  showOptions(returnTo) {
    this.optionsReturnTo = returnTo;
    this.optionsMenu.show();
  }

  /**
   * Close options menu
   */
  closeOptions() {
    if (this.optionsReturnTo === 'menu') {
      this.mainMenu.show();
    } else if (this.optionsReturnTo === 'paused') {
      this.pauseMenu.show();
    }
  }

  /**
   * Start the game
   */
  async startGame() {
    if (!this.audio.isInitialized()) {
      await this.audio.init();
      await loadGameSounds(this.audio);
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

    if (this.engineAudio && !this.engineAudio.getIsRunning()) {
      this.engineAudio.start();
    }

    console.log('Game started - WASD to drive, ESC to pause');
  }

  /**
   * Resume game
   */
  resumeGame() {
    this.gameState = 'playing';
    this.isPaused = false;
    this.pauseMenu.hide();
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

    if (this.engineAudio) {
      this.engineAudio.stop();
    }

    // Reset vehicle position
    if (this.vehicleMesh && this.vehicleBody) {
      const startPos = this.startPosition || { x: 0, y: 2, z: 0 };
      this.vehicleMesh.position = new BABYLON.Vector3(startPos.x, startPos.y, startPos.z);
      this.vehicleBody.setLinearVelocity(BABYLON.Vector3.Zero());
      this.vehicleBody.setAngularVelocity(BABYLON.Vector3.Zero());
    }
  }

  /**
   * Toggle pause
   */
  togglePause() {
    if (this.gameState === 'menu') return;

    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.isPaused = true;
      this.pauseMenu.show();
    } else if (this.gameState === 'paused') {
      this.resumeGame();
    }
  }

  /**
   * Toggle job market
   */
  toggleJobMarket() {
    if (this.gameState !== 'playing') return;
    if (this.jobSystem.activeJob) return;
    this.jobMarket.show();
  }

  /**
   * Toggle garage
   */
  toggleGarage() {
    if (this.gameState !== 'playing') return;
    this.garage.updateBalance(this.playerMoney);
    this.garage.toggle();
  }

  /**
   * Cycle camera mode
   */
  cycleCamera() {
    const modes = ['chase', 'cockpit', 'orbit'];
    const currentIndex = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(currentIndex + 1) % modes.length];
    console.log(`Camera mode: ${this.cameraMode}`);
  }

  /**
   * Job callbacks
   */
  onJobAccepted(job) {
    console.log(`Job accepted: ${job.cargo.name}`);
    if (this.miniMap) {
      this.miniMap.setRoute(this.jobSystem.getRoutePoints(), job.destination);
    }
    if (this.hud) {
      this.hud.setJobInfo(job);
    }
  }

  onJobCompleted(job) {
    this.playerMoney += job.finalPayment;
    if (this.miniMap) this.miniMap.clearRoute();
    if (this.hud) {
      this.hud.clearJobInfo();
      this.hud.setMoney(this.playerMoney);
    }
    if (this.notification) {
      this.notification.showJobCompleted(job);
    }
  }

  onJobFailed(job) {
    if (job.penalty) {
      this.playerMoney = Math.max(0, this.playerMoney - job.penalty);
    }
    if (this.miniMap) this.miniMap.clearRoute();
    if (this.hud) {
      this.hud.clearJobInfo();
      this.hud.setMoney(this.playerMoney);
    }
    if (this.notification) {
      this.notification.showJobFailed(job);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.update(deltaTime);
      this.scene.render();
    });

    console.log('Game loop started');
  }

  /**
   * Pause the game
   */
  pause() {
    this.isRunning = false;
    this.engine.stopRenderLoop();
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.engine.runRenderLoop(() => {
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.update(deltaTime);
        this.scene.render();
      });
    }
  }

  /**
   * Update game state
   */
  update(deltaTime) {
    this.input.update();

    if (this.gameState !== 'playing') return;

    this.updateVehicle(deltaTime);
    this.updateCamera(deltaTime);
    this.updateHUD();

    // Update engine audio
    if (this.engineAudio) {
      const throttle = this.input.getThrottleInput();
      this.engineAudio.update(this.truckSpeed, throttle, 30);
    }

    // Update fuel
    if (this.fuelSystem) {
      const throttle = this.input.getThrottleInput();
      this.fuelSystem.update(this.truckSpeed, throttle, deltaTime);
    }

    // Update radio
    if (this.radioSystem) this.radioSystem.update(deltaTime);
    if (this.radioWidget) this.radioWidget.update();

    // Update job system
    if (this.jobSystem && this.vehicleMesh) {
      this.jobSystem.update(
        this.vehicleMesh.position.x,
        this.vehicleMesh.position.z,
        deltaTime
      );
    }
  }

  /**
   * Update vehicle physics
   */
  updateVehicle(deltaTime) {
    if (!this.vehicleMesh || !this.vehicleBody) return;

    const throttle = this.input.getThrottleInput();
    const brake = this.input.getBrakeInput();
    const steering = this.input.getSteeringInput();
    const handbrake = this.input.isHandbrakeActive();

    // Get current velocity
    const velocity = this.vehicleBody.getLinearVelocity();
    const speed = velocity.length();
    this.truckSpeed = speed;

    // Get forward direction from vehicle rotation
    const forward = this.vehicleMesh.forward.clone();

    // Engine force
    const engineForce = 15000;
    const maxSpeed = 30;

    if (throttle > 0 && speed < maxSpeed) {
      const force = forward.scale(throttle * engineForce);
      this.vehicleBody.applyForce(force, this.vehicleMesh.position);
    }

    // Braking
    if (brake > 0) {
      if (speed > 0.5) {
        // Brake
        const brakeDir = velocity.normalize().scale(-1);
        const brakeForce = brakeDir.scale(brake * 20000);
        this.vehicleBody.applyForce(brakeForce, this.vehicleMesh.position);
      } else {
        // Reverse
        const force = forward.scale(-brake * engineForce * 0.5);
        this.vehicleBody.applyForce(force, this.vehicleMesh.position);
      }
    }

    // Handbrake
    if (handbrake && speed > 0.1) {
      const currentVel = this.vehicleBody.getLinearVelocity();
      this.vehicleBody.setLinearVelocity(currentVel.scale(0.95));
    }

    // Steering (apply torque)
    if (Math.abs(speed) > 0.5 && Math.abs(steering) > 0.01) {
      const steerTorque = new BABYLON.Vector3(0, -steering * 3000, 0);
      this.vehicleBody.applyForce(steerTorque, this.vehicleMesh.position.add(forward));
    }

    // Keep upright - apply corrective torque if tilting
    const up = this.vehicleMesh.up;
    const tiltAngle = Math.acos(BABYLON.Vector3.Dot(up, BABYLON.Vector3.Up()));
    if (tiltAngle > 0.1) {
      const correctiveAxis = BABYLON.Vector3.Cross(up, BABYLON.Vector3.Up());
      const correctiveTorque = correctiveAxis.scale(tiltAngle * 5000);
      this.vehicleBody.applyForce(correctiveTorque, this.vehicleMesh.position);
    }
  }

  /**
   * Update camera position
   */
  updateCamera(deltaTime) {
    if (!this.vehicleMesh) return;

    const vehiclePos = this.vehicleMesh.position;
    const vehicleRot = this.vehicleMesh.rotationQuaternion
      ? this.vehicleMesh.rotationQuaternion.toEulerAngles().y
      : this.vehicleMesh.rotation.y;

    switch (this.cameraMode) {
      case 'chase': {
        const offset = new BABYLON.Vector3(0, 5, 12);
        const rotMatrix = BABYLON.Matrix.RotationY(vehicleRot);
        const rotatedOffset = BABYLON.Vector3.TransformCoordinates(offset, rotMatrix);
        const targetPos = vehiclePos.add(rotatedOffset);

        this.camera.position = BABYLON.Vector3.Lerp(this.camera.position, targetPos, 5 * deltaTime);
        this.camera.setTarget(vehiclePos.add(new BABYLON.Vector3(0, 1, 0)));
        break;
      }

      case 'cockpit': {
        const cockpitOffset = new BABYLON.Vector3(0, 2.5, 2);
        const rotMatrix = BABYLON.Matrix.RotationY(vehicleRot);
        const rotatedOffset = BABYLON.Vector3.TransformCoordinates(cockpitOffset, rotMatrix);
        this.camera.position = vehiclePos.add(rotatedOffset);

        const lookOffset = new BABYLON.Vector3(0, 2, 10);
        const rotatedLook = BABYLON.Vector3.TransformCoordinates(lookOffset, rotMatrix);
        this.camera.setTarget(vehiclePos.add(rotatedLook));
        break;
      }

      case 'orbit': {
        const time = performance.now() / 1000;
        const radius = 20;
        this.camera.position = new BABYLON.Vector3(
          vehiclePos.x + Math.sin(time * 0.3) * radius,
          vehiclePos.y + 10,
          vehiclePos.z + Math.cos(time * 0.3) * radius
        );
        this.camera.setTarget(vehiclePos);
        break;
      }
    }
  }

  /**
   * Update HUD
   */
  updateHUD() {
    if (!this.hud) return;

    this.hud.setSpeed(this.truckSpeed);

    if (this.fuelSystem) {
      this.hud.setFuel(this.fuelSystem.getFuelPercent() * 100);
    }

    if (this.vehicleMesh) {
      this.hud.setLocation(this.vehicleMesh.position.x, this.vehicleMesh.position.z);

      if (this.miniMap) {
        const rot = this.vehicleMesh.rotationQuaternion
          ? this.vehicleMesh.rotationQuaternion.toEulerAngles().y
          : this.vehicleMesh.rotation.y;
        this.miniMap.setPlayerPosition(
          this.vehicleMesh.position.x,
          this.vehicleMesh.position.z,
          rot
        );
        this.miniMap.render();
      }
    }
  }
}

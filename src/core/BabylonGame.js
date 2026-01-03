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
import { EnvironmentProps } from '../world/EnvironmentProps.js';

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

    // Environment
    this.environmentProps = null;

    // Game state
    this.gameState = 'menu';
    this.playerMoney = 5000;

    // Vehicle
    this.vehicleMesh = null;
    this.vehicleBody = null;
    this.vehicleContainer = null;
    this.truckModel = null;
    this.wheelMeshes = [];
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

    // Initialize Havok physics with explicit WASM path
    console.log('Loading Havok physics...');
    this.havokInstance = await HavokPhysics({
      locateFile: () => '/HavokPhysics.wasm'
    });
    console.log('Havok physics loaded');

    updateLoadingProgress(35);

    // Create scene with physics (no ground yet)
    await this.createScene();

    updateLoadingProgress(55);

    // Load road data first (needed to position ground correctly)
    await this.loadRoads();

    updateLoadingProgress(65);

    // Create ground AFTER roads are loaded so we know the correct elevation
    await this.createGround();

    updateLoadingProgress(70);

    // Generate environment props (trees, buildings)
    await this.generateEnvironment();

    updateLoadingProgress(75);

    // Create vehicle
    await this.createVehicle();

    updateLoadingProgress(85);

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

    // Create camera with extended view distance for large world
    this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 10, 20), this.scene);
    this.camera.attachControl(this.canvas, false);
    this.camera.minZ = 0.5;
    this.camera.maxZ = 50000; // 50km view distance

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

    console.log('Scene created with Havok physics');
  }

  /**
   * Create ground plane with physics
   */
  async createGround() {
    // Calculate ground position and size from road bounds
    const bounds = this.getBounds();
    const groundX = (bounds.minX + bounds.maxX) / 2;
    const groundZ = (bounds.minZ + bounds.maxZ) / 2;
    const groundY = (this.startPosition?.y || 0) - 5; // Ground slightly below spawn point

    // Ground size with margin
    const groundWidth = (bounds.maxX - bounds.minX) + 2000;
    const groundDepth = (bounds.maxZ - bounds.minZ) + 2000;

    console.log(`Creating ground at (${groundX.toFixed(0)}, ${groundY.toFixed(0)}, ${groundZ.toFixed(0)}) size ${groundWidth.toFixed(0)}x${groundDepth.toFixed(0)}`);

    // Large ground plane covering all roads
    const ground = BABYLON.MeshBuilder.CreateGround('ground', {
      width: groundWidth,
      height: groundDepth,
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
        const data = await response.json();
        // Handle both formats: { roads: [...] } or just [...]
        this.roadData = data.roads || data;
        console.log(`Loaded ${this.roadData.length} roads`);

        // Load POIs
        const poiResponse = await fetch('/data/processed/pois.json');
        if (poiResponse.ok) {
          const poiData = await poiResponse.json();
          // Handle both formats: { pois: [...] } or just [...]
          this.poiData = poiData.pois || poiData;
          console.log(`Loaded ${this.poiData.length} POIs`);
        }

        // Render roads
        this.renderRoads();

        // Set spawn position from road data
        if (this.roadData.length > 0) {
          const majorRoad = this.roadData.find(r => r.type === 'primary' || r.type === 'trunk') || this.roadData[0];
          if (majorRoad && majorRoad.points && majorRoad.points.length > 0) {
            const midIndex = Math.floor(majorRoad.points.length / 2);
            const point = majorRoad.points[midIndex];
            // Spawn 5 meters above road surface to ensure truck lands on road
            this.startPosition = {
              x: point[0],
              y: (point[1] || 0) + 5,
              z: point[2],
            };
            console.log(`Start position set to (${point[0].toFixed(0)}, ${((point[1] || 0) + 5).toFixed(0)}, ${point[2].toFixed(0)})`);
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
   * Render roads using Babylon.js ribbon meshes with lane markings
   */
  renderRoads() {
    if (!this.roadData) {
      console.warn('No road data to render');
      return;
    }

    console.log(`Rendering ${this.roadData.length} roads...`);

    // Asphalt colors - visible gray tones
    const roadColors = {
      motorway: new BABYLON.Color3(0.25, 0.25, 0.28),
      trunk: new BABYLON.Color3(0.28, 0.28, 0.30),
      primary: new BABYLON.Color3(0.30, 0.30, 0.32),
      secondary: new BABYLON.Color3(0.32, 0.32, 0.34),
      tertiary: new BABYLON.Color3(0.35, 0.35, 0.37),
      default: new BABYLON.Color3(0.38, 0.38, 0.40),
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
    let errorCount = 0;

    // Shared materials
    const lineMaterial = new BABYLON.StandardMaterial('roadLineMat', this.scene);
    lineMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0.9); // Slightly warm white/yellow
    lineMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.2);
    lineMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    lineMaterial.backFaceCulling = false;

    const edgeLineMaterial = new BABYLON.StandardMaterial('edgeLineMat', this.scene);
    edgeLineMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    edgeLineMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    edgeLineMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    edgeLineMaterial.backFaceCulling = false;

    for (const road of this.roadData) {
      if (!road.points || road.points.length < 2) continue;

      const width = roadWidths[road.type] || roadWidths.default;
      const color = roadColors[road.type] || roadColors.default;
      const halfWidth = width / 2;

      try {
        // Create paths for road and lines
        const leftPath = [];
        const rightPath = [];
        const centerPath = [];
        const leftEdgePath = [];
        const rightEdgePath = [];

        for (let i = 0; i < road.points.length; i++) {
          const p = road.points[i];
          const baseY = (p[1] || 0) + 0.15;
          const curr = new BABYLON.Vector3(p[0], baseY, p[2]);

          // Get direction to next/prev point for perpendicular offset
          let dir;
          if (i < road.points.length - 1) {
            const next = road.points[i + 1];
            dir = new BABYLON.Vector3(next[0] - p[0], 0, next[2] - p[2]);
          } else {
            const prev = road.points[i - 1];
            dir = new BABYLON.Vector3(p[0] - prev[0], 0, p[2] - prev[2]);
          }

          // Handle zero-length direction
          if (dir.length() < 0.001) {
            dir = new BABYLON.Vector3(1, 0, 0);
          }
          dir.normalize();

          // Perpendicular vector (rotate 90 degrees in XZ plane)
          const perp = new BABYLON.Vector3(-dir.z, 0, dir.x);

          leftPath.push(curr.add(perp.scale(halfWidth)));
          rightPath.push(curr.subtract(perp.scale(halfWidth)));

          // Center line (slightly above road)
          const lineY = baseY + 0.02;
          centerPath.push(new BABYLON.Vector3(p[0], lineY, p[2]));

          // Edge lines
          leftEdgePath.push(new BABYLON.Vector3(
            p[0] + perp.x * (halfWidth - 0.3),
            lineY,
            p[2] + perp.z * (halfWidth - 0.3)
          ));
          rightEdgePath.push(new BABYLON.Vector3(
            p[0] - perp.x * (halfWidth - 0.3),
            lineY,
            p[2] - perp.z * (halfWidth - 0.3)
          ));
        }

        // Need at least 2 points for a ribbon
        if (leftPath.length < 2) continue;

        // Create road surface ribbon mesh
        const roadMesh = BABYLON.MeshBuilder.CreateRibbon(`road_${roadCount}`, {
          pathArray: [leftPath, rightPath],
          sideOrientation: BABYLON.Mesh.DOUBLESIDE,
          updatable: false,
        }, this.scene);

        const material = new BABYLON.StandardMaterial(`roadMat_${roadCount}`, this.scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        material.backFaceCulling = false;
        material.emissiveColor = color.scale(0.15); // Slight ambient for visibility
        roadMesh.material = material;
        roadMesh.receiveShadows = true;

        this.roadMeshes.push(roadMesh);

        // Create center line (dashed effect using tube)
        if (centerPath.length >= 2) {
          const centerLine = BABYLON.MeshBuilder.CreateTube(`centerLine_${roadCount}`, {
            path: centerPath,
            radius: 0.15,
            tessellation: 6,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
          }, this.scene);
          centerLine.material = lineMaterial;
          this.roadMeshes.push(centerLine);
        }

        // Create edge lines for major roads
        if ((road.type === 'motorway' || road.type === 'trunk' || road.type === 'primary') && leftEdgePath.length >= 2) {
          const leftLine = BABYLON.MeshBuilder.CreateTube(`leftEdge_${roadCount}`, {
            path: leftEdgePath,
            radius: 0.1,
            tessellation: 6,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
          }, this.scene);
          leftLine.material = edgeLineMaterial;
          this.roadMeshes.push(leftLine);

          const rightLine = BABYLON.MeshBuilder.CreateTube(`rightEdge_${roadCount}`, {
            path: rightEdgePath,
            radius: 0.1,
            tessellation: 6,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
          }, this.scene);
          rightLine.material = edgeLineMaterial;
          this.roadMeshes.push(rightLine);
        }

        roadCount++;
      } catch (e) {
        errorCount++;
        if (errorCount < 5) {
          console.warn('Failed to create road:', e.message);
        }
      }
    }

    console.log(`Rendered ${roadCount} roads with lane markings (${errorCount} errors)`);

    // Log first road position for debugging
    if (this.roadData.length > 0 && this.roadData[0].points && this.roadData[0].points.length > 0) {
      const firstPoint = this.roadData[0].points[0];
      console.log(`First road point: (${firstPoint[0]?.toFixed(0)}, ${firstPoint[1]?.toFixed(0)}, ${firstPoint[2]?.toFixed(0)})`);
    }
  }

  /**
   * Generate environment props (trees, buildings)
   */
  async generateEnvironment() {
    if (!this.roadData || this.roadData.length === 0) {
      console.log('No road data for environment generation');
      return;
    }

    this.environmentProps = new EnvironmentProps(this.scene, this.shadowGenerator);
    await this.environmentProps.generate(this.roadData);
  }

  /**
   * Create vehicle with Havok physics
   */
  async createVehicle() {
    const startPos = this.startPosition || { x: 0, y: 2, z: 0 };

    // Create a container for the vehicle
    this.vehicleContainer = new BABYLON.TransformNode('vehicleContainer', this.scene);
    this.vehicleContainer.position = new BABYLON.Vector3(startPos.x, startPos.y, startPos.z);

    // Create invisible physics box for collision
    const chassisWidth = 2.5;
    const chassisHeight = 1.5;
    const chassisLength = 4;

    const physicsBox = BABYLON.MeshBuilder.CreateBox('physicsBox', {
      width: chassisWidth,
      height: chassisHeight,
      depth: chassisLength,
    }, this.scene);
    physicsBox.visibility = 0; // Invisible
    physicsBox.position = new BABYLON.Vector3(startPos.x, startPos.y, startPos.z);

    // Create physics body for the invisible box
    const chassisAggregate = new BABYLON.PhysicsAggregate(
      physicsBox,
      BABYLON.PhysicsShapeType.BOX,
      {
        mass: 2000,
        friction: 0.8,
        restitution: 0.1,
      },
      this.scene
    );

    this.vehicleBody = chassisAggregate.body;
    this.vehicleMesh = physicsBox;

    // Disable sleeping so vehicle always responds to input
    this.vehicleBody.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
    this.vehicleBody.disablePreStep = false;

    // Increase damping to prevent flipping
    this.vehicleBody.setLinearDamping(0.3);
    this.vehicleBody.setAngularDamping(0.95);

    // Load GLB truck model
    let modelLoaded = false;
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync('', '/models/vehicles/', 'vehicle-truck.glb', this.scene);

      if (result.meshes.length > 0) {
        this.truckModel = result.meshes[0];
        this.truckModel.parent = this.vehicleContainer;
        this.truckModel.position = new BABYLON.Vector3(0, -0.7, 0);
        this.truckModel.scaling = new BABYLON.Vector3(2.0, 2.0, 2.0);
        // Rotate 180 degrees so model faces Z+ (forward direction)
        this.truckModel.rotation = new BABYLON.Vector3(0, Math.PI, 0);

        // Enable shadows on all meshes
        result.meshes.forEach(mesh => {
          if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
          }
          mesh.receiveShadows = true;
        });

        console.log('Truck GLB model loaded with', result.meshes.length, 'meshes');
        modelLoaded = true;
      }
    } catch (e) {
      console.warn('Failed to load truck model, using fallback:', e);
    }

    // Only create fallback truck and wheels if GLB model failed
    if (!modelLoaded) {
      this.createFallbackTruck();
      this.createWheels();
    }

    // Position camera behind the truck (Z- is behind since vehicle faces Z+)
    this.camera.position = new BABYLON.Vector3(startPos.x, startPos.y + 10, startPos.z - 20);
    this.camera.setTarget(physicsBox.position);

    console.log(`Vehicle created at (${startPos.x.toFixed(0)}, ${startPos.y.toFixed(0)}, ${startPos.z.toFixed(0)})`);
  }

  /**
   * Create fallback truck if GLB fails to load
   */
  createFallbackTruck() {
    const chassisMaterial = new BABYLON.StandardMaterial('chassisMat', this.scene);
    chassisMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.69, 0.31);

    // Body
    const body = BABYLON.MeshBuilder.CreateBox('truckBody', {
      width: 2,
      height: 1,
      depth: 3.5,
    }, this.scene);
    body.material = chassisMaterial;
    body.position.y = 0;
    body.parent = this.vehicleContainer;

    // Cabin
    const cabin = BABYLON.MeshBuilder.CreateBox('truckCabin', {
      width: 2,
      height: 0.8,
      depth: 1.2,
    }, this.scene);
    cabin.material = chassisMaterial;
    cabin.position = new BABYLON.Vector3(0, 0.9, 1);
    cabin.parent = this.vehicleContainer;

    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(body);
      this.shadowGenerator.addShadowCaster(cabin);
    }
  }

  /**
   * Create visual wheels (parented to vehicle, no physics)
   */
  createWheels() {
    const wheelRadius = 0.4;
    const wheelWidth = 0.3;

    // Wheel positions relative to vehicle center
    const wheelPositions = [
      { x: -1.0, y: -0.6, z: 1.2, isFront: true },   // Front-left
      { x: 1.0, y: -0.6, z: 1.2, isFront: true },    // Front-right
      { x: -1.0, y: -0.6, z: -1.2, isFront: false }, // Back-left
      { x: 1.0, y: -0.6, z: -1.2, isFront: false },  // Back-right
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
      wheel.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);
      wheel.parent = this.vehicleContainer; // Parent to vehicle, moves with it

      if (this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(wheel);
      }

      this.wheelMeshes.push({ mesh: wheel, isFront: pos.isFront, localPos: pos });
    }

    console.log('Visual wheels created (no physics)');
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
      onAbout: () => this.showAbout(),
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
   * Show about dialog
   */
  showAbout() {
    // Create about overlay if it doesn't exist
    if (!this.aboutOverlay) {
      this.aboutOverlay = document.createElement('div');
      this.aboutOverlay.id = 'about-overlay';
      this.aboutOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      const aboutBox = document.createElement('div');
      aboutBox.style.cssText = `
        background: linear-gradient(145deg, #2a3a2a, #1a2a1a);
        border: 2px solid #4CAF50;
        border-radius: 12px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        color: #fff;
        font-family: 'Segoe UI', sans-serif;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      `;

      // Logo
      const logo = document.createElement('img');
      logo.src = '/images/mts-logo.png';
      logo.alt = 'MTS Logo';
      logo.style.cssText = 'width: 120px; height: 120px; margin-bottom: 20px;';
      aboutBox.appendChild(logo);

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Mindanao Truck Simulator';
      title.style.cssText = 'color: #4CAF50; margin: 0 0 10px 0; font-size: 24px;';
      aboutBox.appendChild(title);

      // Version
      const version = document.createElement('p');
      version.textContent = 'Version 0.1.0';
      version.style.cssText = 'color: #888; margin: 0 0 20px 0; font-size: 14px;';
      aboutBox.appendChild(version);

      // Description
      const desc = document.createElement('p');
      desc.textContent = 'Experience the scenic roads of Mindanao, Philippines in this relaxing truck driving simulator. Deliver cargo across cities, enjoy the tropical scenery, and build your trucking empire.';
      desc.style.cssText = 'line-height: 1.6; margin-bottom: 20px;';
      aboutBox.appendChild(desc);

      // Credits
      const credits = document.createElement('p');
      credits.style.cssText = 'color: #888; font-size: 13px; margin-bottom: 25px;';
      credits.appendChild(document.createTextNode('Powered by Babylon.js & Havok Physics'));
      credits.appendChild(document.createElement('br'));
      credits.appendChild(document.createTextNode('Road data from OpenStreetMap'));
      credits.appendChild(document.createElement('br'));
      credits.appendChild(document.createTextNode('3D models by Kenney.nl (CC0)'));
      aboutBox.appendChild(credits);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 40px;
        font-size: 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      closeBtn.addEventListener('click', () => this.hideAbout());
      closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#45a049');
      closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = '#4CAF50');
      aboutBox.appendChild(closeBtn);

      this.aboutOverlay.appendChild(aboutBox);
      document.body.appendChild(this.aboutOverlay);

      // Click outside to close
      this.aboutOverlay.addEventListener('click', (e) => {
        if (e.target === this.aboutOverlay) {
          this.hideAbout();
        }
      });
    }

    this.aboutOverlay.style.display = 'flex';
  }

  /**
   * Hide about dialog
   */
  hideAbout() {
    if (this.aboutOverlay) {
      this.aboutOverlay.style.display = 'none';
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

    // Get forward direction from vehicle mesh (Z+ is forward in Babylon.js)
    const rotQuat = this.vehicleMesh.rotationQuaternion || BABYLON.Quaternion.FromEulerAngles(
      this.vehicleMesh.rotation.x,
      this.vehicleMesh.rotation.y,
      this.vehicleMesh.rotation.z
    );
    const forward = new BABYLON.Vector3(0, 0, 1); // Z+ is forward
    forward.rotateByQuaternionToRef(rotQuat, forward);
    forward.y = 0; // Keep horizontal
    forward.normalize();

    // Engine force - 120 km/h = 33.33 m/s
    const engineForce = 25000;
    const maxSpeed = 33.33; // 120 km/h

    // Wake up physics body if there's any input
    if (throttle > 0 || brake > 0 || Math.abs(steering) > 0.01) {
      this.vehicleBody.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
    }

    if (throttle > 0 && speed < maxSpeed) {
      // Progressive force based on speed (more power at low speed)
      const speedFactor = 1 - (speed / maxSpeed) * 0.3;
      const force = forward.scale(throttle * engineForce * speedFactor);
      this.vehicleBody.applyForce(force, this.vehicleMesh.position);
    }

    // Braking
    if (brake > 0) {
      if (speed > 0.5) {
        // Brake - apply force opposite to velocity
        const brakeDir = velocity.clone();
        brakeDir.normalize();
        brakeDir.scaleInPlace(-1);
        const brakeForce = brakeDir.scale(brake * 30000);
        this.vehicleBody.applyForce(brakeForce, this.vehicleMesh.position);
      } else {
        // Reverse (max 30 km/h = 8.33 m/s)
        const reverseMaxSpeed = 8.33;
        if (speed < reverseMaxSpeed) {
          const force = forward.scale(-brake * engineForce * 0.4);
          this.vehicleBody.applyForce(force, this.vehicleMesh.position);
        }
      }
    }

    // Handbrake
    if (handbrake && speed > 0.1) {
      const currentVel = this.vehicleBody.getLinearVelocity();
      this.vehicleBody.setLinearVelocity(currentVel.scale(0.85));
    }

    // Improved steering with smoother response
    const currentAngVel = this.vehicleBody.getAngularVelocity();

    if (Math.abs(steering) > 0.01 && speed > 0.5) {
      // Steering rate decreases at higher speeds for stability
      // Max turn rate ~1.2 rad/s at low speed, ~0.4 rad/s at max speed
      const speedFactor = Math.max(0.35, 1 - (speed / maxSpeed) * 0.7);
      const targetSteerRate = steering * 1.2 * speedFactor;

      // Smooth interpolation towards target steering (prevents jerky turns)
      const currentYaw = currentAngVel.y;
      const steerRate = currentYaw + (targetSteerRate - currentYaw) * 0.15;

      this.vehicleBody.setAngularVelocity(new BABYLON.Vector3(
        currentAngVel.x * 0.9,
        steerRate,
        currentAngVel.z * 0.9
      ));
    } else if (speed > 0.5) {
      // Auto-center when no steering input - gradual return to straight
      this.vehicleBody.setAngularVelocity(new BABYLON.Vector3(
        currentAngVel.x * 0.9,
        currentAngVel.y * 0.92, // Gentle damping for smooth centering
        currentAngVel.z * 0.9
      ));
    }

    // Sync visual container with physics body
    if (this.vehicleContainer) {
      this.vehicleContainer.position.copyFrom(this.vehicleMesh.position);
      if (this.vehicleMesh.rotationQuaternion) {
        this.vehicleContainer.rotationQuaternion = this.vehicleMesh.rotationQuaternion.clone();
      }
    }

    // Animate wheel rotation based on speed (only for fallback wheels)
    if (this.wheelMeshes.length > 0) {
      const wheelRadius = 0.4;
      const wheelRotationSpeed = speed / wheelRadius * deltaTime;
      for (const wheelData of this.wheelMeshes) {
        // Rotate wheel around X axis (forward roll)
        wheelData.mesh.rotation.x += wheelRotationSpeed;

        // Front wheels also turn for steering
        if (wheelData.isFront) {
          wheelData.mesh.rotation.y = -steering * 0.5;
        }
      }
    }

    // Keep upright - limit rotation on X and Z axes
    if (this.vehicleMesh.rotationQuaternion) {
      const euler = this.vehicleMesh.rotationQuaternion.toEulerAngles();
      if (Math.abs(euler.x) > 0.3 || Math.abs(euler.z) > 0.3) {
        // Apply corrective angular velocity
        const angVel = this.vehicleBody.getAngularVelocity();
        this.vehicleBody.setAngularVelocity(new BABYLON.Vector3(
          angVel.x * 0.8 - euler.x * 2,
          angVel.y,
          angVel.z * 0.8 - euler.z * 2
        ));
      }
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
        // Camera behind and above the vehicle (Z- is behind since vehicle faces Z+)
        const offset = new BABYLON.Vector3(0, 6, -15);
        const rotMatrix = BABYLON.Matrix.RotationY(vehicleRot);
        const rotatedOffset = BABYLON.Vector3.TransformCoordinates(offset, rotMatrix);
        const targetPos = vehiclePos.add(rotatedOffset);

        this.camera.position = BABYLON.Vector3.Lerp(this.camera.position, targetPos, 5 * deltaTime);
        // Look at a point slightly in front of vehicle (Z+)
        const lookAhead = new BABYLON.Vector3(0, 1, 10);
        const rotatedLook = BABYLON.Vector3.TransformCoordinates(lookAhead, rotMatrix);
        this.camera.setTarget(vehiclePos.add(rotatedLook));
        break;
      }

      case 'cockpit': {
        // Inside the cabin looking forward (Z+)
        const cockpitOffset = new BABYLON.Vector3(0, 2, -1);
        const rotMatrix = BABYLON.Matrix.RotationY(vehicleRot);
        const rotatedOffset = BABYLON.Vector3.TransformCoordinates(cockpitOffset, rotMatrix);
        this.camera.position = vehiclePos.add(rotatedOffset);

        const lookOffset = new BABYLON.Vector3(0, 1.5, 20);
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

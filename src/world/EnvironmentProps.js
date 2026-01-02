/**
 * EnvironmentProps - Low-poly environment objects
 *
 * Creates trees, buildings, and other scenery for the game world.
 * Uses GLB models from Kenney's asset packs (CC0 License)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Shared GLTFLoader instance
const gltfLoader = new GLTFLoader();

// Model cache for instancing
const modelCache = {};

/**
 * Load a GLB model with caching
 * @param {string} path - Path to GLB file
 * @returns {Promise<THREE.Group>}
 */
async function loadModel(path) {
  if (modelCache[path]) {
    return modelCache[path].clone();
  }

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        modelCache[path] = gltf.scene;
        resolve(gltf.scene.clone());
      },
      undefined,
      reject
    );
  });
}

/**
 * Create a tree using GLB model
 * @param {string} type - 'regular' | 'pine'
 * @param {number} scale - Scale factor
 * @returns {Promise<THREE.Group>}
 */
export async function createTreeGLB(type = 'regular', scale = 1.5) {
  const path = type === 'pine'
    ? '/models/environment/tree-pine.glb'
    : '/models/environment/tree.glb';

  try {
    const model = await loadModel(path);
    model.scale.set(scale, scale, scale);

    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return model;
  } catch (error) {
    console.warn('Failed to load tree GLB, using fallback:', error);
    return type === 'pine' ? createPineTree(8 * scale) : createPalmTree(10 * scale);
  }
}

/**
 * Create a building using GLB model
 * @param {string} variant - 'a' | 'b' | 'c' | 'd'
 * @param {number} scale - Scale factor
 * @returns {Promise<THREE.Group>}
 */
export async function createBuildingGLB(variant = 'a', scale = 2.0) {
  const path = `/models/buildings/building-${variant}.glb`;

  try {
    const model = await loadModel(path);
    model.scale.set(scale, scale, scale);

    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return model;
  } catch (error) {
    console.warn('Failed to load building GLB, using fallback:', error);
    return createBuilding({ height: 6 * scale });
  }
}

/**
 * Create a low-poly palm tree
 * @param {number} height - Tree height (default 8-12)
 * @returns {THREE.Group}
 */
export function createPalmTree(height = 10) {
  const tree = new THREE.Group();
  tree.name = 'palm_tree';

  // Trunk
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.0,
  });

  // Curved trunk segments
  const segments = 5;
  const segmentHeight = height / segments;
  let prevTop = new THREE.Vector3(0, 0, 0);

  for (let i = 0; i < segments; i++) {
    const bottomRadius = 0.3 - i * 0.04;
    const topRadius = 0.3 - (i + 1) * 0.04;
    const segGeometry = new THREE.CylinderGeometry(topRadius, bottomRadius, segmentHeight, 8);

    const segment = new THREE.Mesh(segGeometry, trunkMaterial);

    // Slight curve
    const curveOffset = Math.sin((i / segments) * Math.PI) * 0.5;
    segment.position.set(
      prevTop.x + curveOffset * 0.3,
      prevTop.y + segmentHeight / 2,
      prevTop.z
    );
    segment.rotation.z = (curveOffset - 0.5) * 0.1;
    segment.castShadow = true;

    tree.add(segment);

    prevTop.set(
      segment.position.x + curveOffset * 0.2,
      segment.position.y + segmentHeight / 2,
      0
    );
  }

  // Palm fronds (leaves)
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const numFronds = 7;
  for (let i = 0; i < numFronds; i++) {
    const angle = (i / numFronds) * Math.PI * 2;
    const frond = createPalmFrond(leafMaterial, 3 + Math.random());

    frond.position.copy(prevTop);
    frond.rotation.y = angle;
    frond.rotation.x = -0.3 - Math.random() * 0.4;

    tree.add(frond);
  }

  // Coconuts
  const coconutMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.7,
  });
  const coconutGeometry = new THREE.SphereGeometry(0.15, 8, 6);

  for (let i = 0; i < 3; i++) {
    const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
    const angle = (i / 3) * Math.PI * 2;
    coconut.position.set(
      prevTop.x + Math.cos(angle) * 0.3,
      prevTop.y - 0.3,
      prevTop.z + Math.sin(angle) * 0.3
    );
    tree.add(coconut);
  }

  return tree;
}

/**
 * Create a palm frond (leaf)
 */
function createPalmFrond(material, length) {
  const frond = new THREE.Group();

  // Stem
  const stemGeometry = new THREE.CylinderGeometry(0.02, 0.04, length, 4);
  const stem = new THREE.Mesh(stemGeometry, material);
  stem.rotation.x = Math.PI / 2;
  stem.position.z = length / 2;
  frond.add(stem);

  // Leaves along stem
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.3, 0.5, 0, 1);
  leafShape.quadraticCurveTo(-0.3, 0.5, 0, 0);

  const leafGeometry = new THREE.ShapeGeometry(leafShape);

  for (let i = 0; i < 8; i++) {
    const t = (i + 1) / 9;
    const leafSize = 0.4 + (1 - t) * 0.4;

    // Left leaf
    const leftLeaf = new THREE.Mesh(leafGeometry, material);
    leftLeaf.scale.set(leafSize, leafSize * 1.5, 1);
    leftLeaf.position.set(-0.1, 0, t * length);
    leftLeaf.rotation.set(-0.5, -0.8, 0);
    frond.add(leftLeaf);

    // Right leaf
    const rightLeaf = new THREE.Mesh(leafGeometry, material);
    rightLeaf.scale.set(leafSize, leafSize * 1.5, 1);
    rightLeaf.position.set(0.1, 0, t * length);
    rightLeaf.rotation.set(-0.5, 0.8, 0);
    frond.add(rightLeaf);
  }

  return frond;
}

/**
 * Create a simple conical tree (pine-style)
 * @param {number} height
 * @returns {THREE.Group}
 */
export function createPineTree(height = 8) {
  const tree = new THREE.Group();
  tree.name = 'pine_tree';

  // Trunk
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x4A3728,
    roughness: 0.9,
  });
  const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, height * 0.3, 8);
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = height * 0.15;
  trunk.castShadow = true;
  tree.add(trunk);

  // Foliage layers
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x2E7D32,
    roughness: 0.8,
  });

  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const layerHeight = height * 0.3;
    const bottomRadius = (1.5 - i * 0.3) * (height / 8);
    const topRadius = 0.1;
    const y = height * 0.3 + i * layerHeight * 0.7;

    const coneGeometry = new THREE.ConeGeometry(bottomRadius, layerHeight, 8);
    const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
    cone.position.y = y + layerHeight / 2;
    cone.castShadow = true;
    cone.receiveShadow = true;
    tree.add(cone);
  }

  return tree;
}

/**
 * Create a simple bush
 * @returns {THREE.Group}
 */
export function createBush() {
  const bush = new THREE.Group();
  bush.name = 'bush';

  const material = new THREE.MeshStandardMaterial({
    color: 0x3D8B3D,
    roughness: 0.9,
  });

  // Multiple overlapping spheres
  const positions = [
    { x: 0, y: 0.4, z: 0, r: 0.5 },
    { x: 0.3, y: 0.3, z: 0.2, r: 0.35 },
    { x: -0.25, y: 0.35, z: 0.15, r: 0.4 },
    { x: 0.1, y: 0.25, z: -0.3, r: 0.35 },
  ];

  for (const pos of positions) {
    const geometry = new THREE.SphereGeometry(pos.r, 8, 6);
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(pos.x, pos.y, pos.z);
    sphere.castShadow = true;
    bush.add(sphere);
  }

  return bush;
}

/**
 * Create a simple building
 * @param {Object} options
 * @returns {THREE.Group}
 */
export function createBuilding(options = {}) {
  const {
    width = 8,
    depth = 10,
    height = 6,
    floors = 2,
    color = 0xE0E0E0,
    roofColor = 0x8B4513,
    hasBalcony = false,
  } = options;

  const building = new THREE.Group();
  building.name = 'building';

  // Main structure
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.9,
    metalness: 0.0,
  });

  const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
  const main = new THREE.Mesh(buildingGeometry, wallMaterial);
  main.position.y = height / 2;
  main.castShadow = true;
  main.receiveShadow = true;
  building.add(main);

  // Roof
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.8,
  });

  // Sloped roof
  const roofHeight = height * 0.3;
  const roofGeometry = new THREE.ConeGeometry(
    Math.max(width, depth) * 0.75,
    roofHeight,
    4
  );
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = height + roofHeight / 2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  building.add(roof);

  // Windows
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x87CEEB,
    roughness: 0.1,
    metalness: 0.5,
    transparent: true,
    opacity: 0.7,
  });

  const windowWidth = 0.8;
  const windowHeight = 1.2;
  const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);

  const floorHeight = height / floors;

  // Front and back windows
  for (let floor = 0; floor < floors; floor++) {
    const y = floorHeight * (floor + 0.6);
    const numWindows = Math.floor(width / 2.5);

    for (let i = 0; i < numWindows; i++) {
      const x = (i - (numWindows - 1) / 2) * 2.2;

      // Front
      const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
      frontWindow.position.set(x, y, depth / 2 + 0.01);
      building.add(frontWindow);

      // Back
      const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
      backWindow.position.set(x, y, -depth / 2 - 0.01);
      backWindow.rotation.y = Math.PI;
      building.add(backWindow);
    }
  }

  // Door
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x5D4037,
    roughness: 0.8,
  });
  const doorGeometry = new THREE.PlaneGeometry(1.2, 2.2);
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, 1.1, depth / 2 + 0.02);
  building.add(door);

  // Balcony (optional)
  if (hasBalcony && floors > 1) {
    const balconyMaterial = new THREE.MeshStandardMaterial({
      color: 0x9E9E9E,
      roughness: 0.7,
    });

    const balconyFloor = new THREE.BoxGeometry(width * 0.6, 0.1, 1.5);
    const balcony = new THREE.Mesh(balconyFloor, balconyMaterial);
    balcony.position.set(0, floorHeight, depth / 2 + 0.75);
    balcony.castShadow = true;
    building.add(balcony);

    // Railing
    const railGeometry = new THREE.BoxGeometry(width * 0.6, 0.8, 0.05);
    const rail = new THREE.Mesh(railGeometry, balconyMaterial);
    rail.position.set(0, floorHeight + 0.4, depth / 2 + 1.45);
    building.add(rail);
  }

  return building;
}

/**
 * Create a gas station
 * @returns {THREE.Group}
 */
export function createGasStation() {
  const station = new THREE.Group();
  station.name = 'gas_station';

  // Main building
  const building = createBuilding({
    width: 6,
    depth: 4,
    height: 3,
    floors: 1,
    color: 0xFAFAFA,
    roofColor: 0xE53935,
  });
  building.position.z = -5;
  station.add(building);

  // Canopy
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0xE53935,
    roughness: 0.5,
  });

  const canopyGeometry = new THREE.BoxGeometry(10, 0.3, 8);
  const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
  canopy.position.set(0, 4, 0);
  canopy.castShadow = true;
  station.add(canopy);

  // Canopy supports
  const supportMaterial = new THREE.MeshStandardMaterial({
    color: 0x9E9E9E,
    roughness: 0.6,
    metalness: 0.4,
  });
  const supportGeometry = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);

  const supportPositions = [
    { x: -4, z: -3 },
    { x: 4, z: -3 },
    { x: -4, z: 3 },
    { x: 4, z: 3 },
  ];

  for (const pos of supportPositions) {
    const support = new THREE.Mesh(supportGeometry, supportMaterial);
    support.position.set(pos.x, 2, pos.z);
    support.castShadow = true;
    station.add(support);
  }

  // Fuel pumps
  const pumpMaterial = new THREE.MeshStandardMaterial({
    color: 0x424242,
    roughness: 0.6,
  });

  for (let i = -1; i <= 1; i += 2) {
    const pumpGroup = new THREE.Group();

    // Pump body
    const pumpBody = new THREE.BoxGeometry(0.8, 1.8, 0.5);
    const pump = new THREE.Mesh(pumpBody, pumpMaterial);
    pump.position.y = 0.9;
    pump.castShadow = true;
    pumpGroup.add(pump);

    // Screen
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x00E676,
      emissive: 0x00E676,
      emissiveIntensity: 0.3,
    });
    const screen = new THREE.BoxGeometry(0.5, 0.3, 0.05);
    const screenMesh = new THREE.Mesh(screen, screenMaterial);
    screenMesh.position.set(0, 1.4, 0.28);
    pumpGroup.add(screenMesh);

    pumpGroup.position.set(i * 3, 0, 0);
    station.add(pumpGroup);
  }

  return station;
}

/**
 * Create a simple warehouse
 * @returns {THREE.Group}
 */
export function createWarehouse() {
  const warehouse = new THREE.Group();
  warehouse.name = 'warehouse';

  // Main structure
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x78909C,
    roughness: 0.8,
  });

  const width = 20;
  const depth = 30;
  const height = 8;

  // Walls
  const wallGeometry = new THREE.BoxGeometry(width, height, depth);
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.position.y = height / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  warehouse.add(walls);

  // Corrugated effect (ridges)
  const ridgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x607D8B,
    roughness: 0.7,
  });
  const ridgeGeometry = new THREE.BoxGeometry(0.1, height - 1, depth - 2);

  for (let x = -width / 2 + 1; x < width / 2; x += 1.5) {
    const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
    ridge.position.set(x, height / 2, 0);
    warehouse.add(ridge);
  }

  // Large doors
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x455A64,
    roughness: 0.6,
  });

  const doorGeometry = new THREE.PlaneGeometry(5, 6);
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, 3, depth / 2 + 0.1);
  warehouse.add(door);

  // Roof
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x546E7A,
    roughness: 0.6,
  });
  const roofGeometry = new THREE.BoxGeometry(width + 1, 0.3, depth + 1);
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = height + 0.15;
  roof.castShadow = true;
  warehouse.add(roof);

  return warehouse;
}

/**
 * Create a road sign
 * @param {string} text - Sign text
 * @param {string} type - 'speed' | 'city' | 'warning'
 * @returns {THREE.Group}
 */
export function createRoadSign(text = '60', type = 'speed') {
  const sign = new THREE.Group();
  sign.name = 'road_sign';

  // Post
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x9E9E9E,
    roughness: 0.6,
    metalness: 0.4,
  });
  const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8);
  const post = new THREE.Mesh(postGeometry, postMaterial);
  post.position.y = 1.25;
  post.castShadow = true;
  sign.add(post);

  // Sign face
  let signColor, signShape;

  switch (type) {
    case 'speed':
      signColor = 0xFFFFFF;
      signShape = 'circle';
      break;
    case 'city':
      signColor = 0x4CAF50;
      signShape = 'rect';
      break;
    case 'warning':
      signColor = 0xFFEB3B;
      signShape = 'triangle';
      break;
    default:
      signColor = 0xFFFFFF;
      signShape = 'rect';
  }

  const signMaterial = new THREE.MeshStandardMaterial({
    color: signColor,
    roughness: 0.5,
  });

  let signMesh;
  if (signShape === 'circle') {
    const signGeometry = new THREE.CircleGeometry(0.4, 16);
    signMesh = new THREE.Mesh(signGeometry, signMaterial);

    // Red border for speed signs
    const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xE53935 });
    const borderGeometry = new THREE.RingGeometry(0.35, 0.42, 16);
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.z = 0.01;
    signMesh.add(border);
  } else if (signShape === 'rect') {
    const signGeometry = new THREE.PlaneGeometry(1.2, 0.6);
    signMesh = new THREE.Mesh(signGeometry, signMaterial);
  } else {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.4);
    shape.lineTo(-0.35, -0.2);
    shape.lineTo(0.35, -0.2);
    shape.closePath();
    const signGeometry = new THREE.ShapeGeometry(shape);
    signMesh = new THREE.Mesh(signGeometry, signMaterial);
  }

  signMesh.position.set(0, 2.5, 0);
  sign.add(signMesh);

  return sign;
}

/**
 * Create a street lamp
 * @returns {THREE.Group}
 */
export function createStreetLamp() {
  const lamp = new THREE.Group();
  lamp.name = 'street_lamp';

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x424242,
    roughness: 0.6,
    metalness: 0.4,
  });

  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.08, 0.1, 6, 8);
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 3;
  pole.castShadow = true;
  lamp.add(pole);

  // Arm
  const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6);
  const arm = new THREE.Mesh(armGeometry, poleMaterial);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.75, 5.8, 0);
  lamp.add(arm);

  // Light housing
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: 0x212121,
    roughness: 0.5,
  });
  const housingGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.3);
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  housing.position.set(1.5, 5.7, 0);
  lamp.add(housing);

  // Light (emissive)
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFCC,
    emissive: 0xFFFFCC,
    emissiveIntensity: 0.5,
  });
  const lightGeometry = new THREE.PlaneGeometry(0.5, 0.25);
  const light = new THREE.Mesh(lightGeometry, lightMaterial);
  light.rotation.x = -Math.PI / 2;
  light.position.set(1.5, 5.62, 0);
  lamp.add(light);

  return lamp;
}

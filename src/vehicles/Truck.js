/**
 * Truck - Low-poly truck model with physics
 *
 * Loads GLB models from Kenney's Toy Car Kit (CC0 License)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// GLB model paths
const TruckModels = {
  standard: '/models/vehicles/vehicle-truck.glb',
  heavy: '/models/vehicles/vehicle-monster-truck.glb',
  fast: '/models/vehicles/vehicle-racer.glb',
};

// Truck configurations
export const TruckTypes = {
  STANDARD: {
    id: 'standard',
    name: 'Mindanao Hauler',
    description: 'Reliable workhorse for any cargo',
    price: 0, // Starting truck
    model: TruckModels.standard,
    scale: 2.5,
    color: 0x4CAF50, // Brand green
    specs: {
      mass: 8000,
      enginePower: 350, // HP
      maxSpeed: 90, // km/h
      fuelCapacity: 300, // liters
      fuelEfficiency: 3, // km per liter
    },
  },
  HEAVY: {
    id: 'heavy',
    name: 'Davao Titan',
    description: 'Heavy-duty truck for maximum cargo',
    price: 150000,
    model: TruckModels.heavy,
    scale: 2.0,
    color: 0x1565C0, // Blue
    specs: {
      mass: 12000,
      enginePower: 450,
      maxSpeed: 80,
      fuelCapacity: 400,
      fuelEfficiency: 2.5,
    },
  },
  FAST: {
    id: 'fast',
    name: 'Island Express',
    description: 'Fast delivery truck for time-sensitive cargo',
    price: 200000,
    model: TruckModels.fast,
    scale: 2.2,
    color: 0xD32F2F, // Red
    specs: {
      mass: 6000,
      enginePower: 400,
      maxSpeed: 110,
      fuelCapacity: 250,
      fuelEfficiency: 2.8,
    },
  },
};

// Shared GLTFLoader instance
const gltfLoader = new GLTFLoader();

export class Truck {
  constructor(type = TruckTypes.STANDARD) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `truck_${type.id}`;

    // Model reference
    this.model = null;
    this.wheels = [];
    this.loaded = false;
    this.onLoadCallback = null;

    // State
    this.headlightsOn = false;
    this.brakeLightsOn = false;

    // Physics body reference (set externally)
    this.physicsBody = null;

    // Build the truck
    this.build();
  }

  /**
   * Build the truck by loading GLB model
   */
  build() {
    this.loadModel();
  }

  /**
   * Load GLB model
   */
  loadModel() {
    gltfLoader.load(
      this.type.model,
      (gltf) => {
        this.model = gltf.scene;

        // Apply scale
        const scale = this.type.scale;
        this.model.scale.set(scale, scale, scale);

        // Rotate to face forward (Z+ direction)
        this.model.rotation.y = Math.PI;

        // Position adjustment - center and lift
        this.model.position.y = 0.0;

        // Apply custom color to body parts
        this.applyColor(this.type.color);

        // Enable shadows
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Find wheel meshes for rotation
        this.findWheels();

        this.group.add(this.model);
        this.loaded = true;

        if (this.onLoadCallback) {
          this.onLoadCallback(this);
        }
      },
      undefined,
      (error) => {
        console.error('Error loading truck model:', error);
        // Fallback to simple box
        this.createFallbackModel();
      }
    );
  }

  /**
   * Apply color to the truck body
   */
  applyColor(color) {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone material to avoid affecting other instances
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }

        // Apply color to non-black, non-gray materials (likely body panels)
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (mat.color) {
          const hsl = {};
          mat.color.getHSL(hsl);
          // Only recolor if it's a colored part (not too dark or too light)
          if (hsl.s > 0.2 && hsl.l > 0.2 && hsl.l < 0.8) {
            mat.color.setHex(color);
          }
        }
      }
    });
  }

  /**
   * Find wheel meshes in the model for rotation
   */
  findWheels() {
    if (!this.model) return;

    this.model.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        if (name.includes('wheel') || name.includes('tire')) {
          this.wheels.push({
            mesh: child,
            isFront: name.includes('front') || name.includes('fl') || name.includes('fr'),
          });
        }
      }
    });
  }

  /**
   * Create fallback model if GLB fails to load
   */
  createFallbackModel() {
    const material = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.6,
      metalness: 0.3,
    });

    // Simple box truck
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.5, 4),
      material
    );
    body.position.y = 1;
    body.castShadow = true;
    this.group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 1.5),
      material
    );
    cabin.position.set(0, 2, 1);
    cabin.castShadow = true;
    this.group.add(cabin);

    this.loaded = true;
    if (this.onLoadCallback) {
      this.onLoadCallback(this);
    }
  }

  /**
   * Set callback for when model loads
   */
  onLoad(callback) {
    this.onLoadCallback = callback;
    if (this.loaded) {
      callback(this);
    }
  }

  /**
   * Toggle headlights (visual only - GLB models don't have emissive lights)
   */
  setHeadlights(on) {
    this.headlightsOn = on;
  }

  /**
   * Set brake lights (visual only - GLB models don't have emissive lights)
   */
  setBrakeLights(on) {
    this.brakeLightsOn = on;
  }

  /**
   * Rotate wheels based on speed
   * @param {number} speed - Speed in m/s
   * @param {number} deltaTime - Time delta
   */
  updateWheels(speed, deltaTime) {
    const wheelRadius = 0.3 * this.type.scale; // Approximate wheel radius
    const rotationSpeed = speed / wheelRadius;

    for (const wheel of this.wheels) {
      if (wheel.mesh) {
        wheel.mesh.rotation.x += rotationSpeed * deltaTime;
      }
    }
  }

  /**
   * Set steering angle for front wheels
   * @param {number} angle - Steering angle in radians
   */
  setSteering(angle) {
    for (const wheel of this.wheels) {
      if (wheel.isFront && wheel.mesh) {
        wheel.mesh.rotation.y = angle * 0.5;
      }
    }
  }

  /**
   * Get the Three.js group
   * @returns {THREE.Group}
   */
  getObject3D() {
    return this.group;
  }

  /**
   * Get truck specs
   * @returns {Object}
   */
  getSpecs() {
    return this.type.specs;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

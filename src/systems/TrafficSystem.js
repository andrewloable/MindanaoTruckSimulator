/**
 * TrafficSystem - Manages AI traffic vehicles on roads
 *
 * Spawns and controls NPC vehicles that drive along road networks.
 */

import * as THREE from 'three';

// Vehicle types for traffic
export const TrafficVehicleType = {
  CAR: {
    id: 'car',
    name: 'Car',
    length: 4.5,
    width: 1.8,
    height: 1.4,
    maxSpeed: 20, // m/s (~72 km/h)
    acceleration: 3,
    colors: [0x2196F3, 0xF44336, 0x4CAF50, 0xFFEB3B, 0x9C27B0, 0xFF9800, 0x607D8B],
  },
  JEEPNEY: {
    id: 'jeepney',
    name: 'Jeepney',
    length: 5.5,
    width: 2.0,
    height: 2.2,
    maxSpeed: 15, // m/s (~54 km/h)
    acceleration: 2,
    colors: [0xE91E63, 0x00BCD4, 0xFFEB3B, 0x8BC34A, 0xFF5722],
  },
  TRICYCLE: {
    id: 'tricycle',
    name: 'Tricycle',
    length: 2.5,
    width: 1.4,
    height: 1.6,
    maxSpeed: 10, // m/s (~36 km/h)
    acceleration: 2.5,
    colors: [0x03A9F4, 0xCDDC39, 0xE91E63],
  },
  BUS: {
    id: 'bus',
    name: 'Bus',
    length: 10,
    width: 2.5,
    height: 3.2,
    maxSpeed: 18, // m/s (~65 km/h)
    acceleration: 1.5,
    colors: [0x3F51B5, 0x009688, 0x795548],
  },
  TRUCK: {
    id: 'truck',
    name: 'Truck',
    length: 8,
    width: 2.4,
    height: 3.0,
    maxSpeed: 16, // m/s (~58 km/h)
    acceleration: 1.2,
    colors: [0x607D8B, 0x795548, 0x4CAF50],
  },
};

// AI vehicle class
class TrafficVehicle {
  constructor(type, startPosition, roadPath) {
    this.type = type;
    this.mesh = null;
    this.position = startPosition.clone();
    this.velocity = new THREE.Vector3();
    this.rotation = 0;
    this.speed = 0;
    this.targetSpeed = type.maxSpeed * (0.6 + Math.random() * 0.4);

    // Path following
    this.roadPath = roadPath;
    this.pathIndex = 0;
    this.pathProgress = 0;

    // State
    this.isActive = true;
    this.isBraking = false;
    this.distanceTraveled = 0;

    // Create mesh
    this.createMesh();
  }

  createMesh() {
    const type = this.type;
    const group = new THREE.Group();

    // Random color from type's palette
    const color = type.colors[Math.floor(Math.random() * type.colors.length)];

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.3,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.6,
    });

    // Build based on vehicle type
    switch (type.id) {
      case 'car':
        this.buildCar(group, bodyMaterial, darkMaterial, glassMaterial);
        break;
      case 'jeepney':
        this.buildJeepney(group, bodyMaterial, darkMaterial);
        break;
      case 'tricycle':
        this.buildTricycle(group, bodyMaterial, darkMaterial);
        break;
      case 'bus':
        this.buildBus(group, bodyMaterial, darkMaterial, glassMaterial);
        break;
      case 'truck':
        this.buildTruck(group, bodyMaterial, darkMaterial);
        break;
      default:
        this.buildCar(group, bodyMaterial, darkMaterial, glassMaterial);
    }

    group.position.copy(this.position);
    group.castShadow = true;
    this.mesh = group;
  }

  buildCar(group, bodyMat, darkMat, glassMat) {
    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.8, 4),
      bodyMat
    );
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 2),
      bodyMat
    );
    cabin.position.set(0, 1.15, -0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Windows
    const frontWindow = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.5, 0.05),
      glassMat
    );
    frontWindow.position.set(0, 1.1, 0.7);
    frontWindow.rotation.x = 0.3;
    group.add(frontWindow);

    // Wheels
    this.addWheels(group, darkMat, 0.3, [
      { x: -0.8, z: 1.3 },
      { x: 0.8, z: 1.3 },
      { x: -0.8, z: -1.3 },
      { x: 0.8, z: -1.3 },
    ]);
  }

  buildJeepney(group, bodyMat, darkMat) {
    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.6, 5),
      bodyMat
    );
    base.position.y = 0.5;
    base.castShadow = true;
    group.add(base);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.1, 4),
      bodyMat
    );
    roof.position.set(0, 1.8, -0.3);
    group.add(roof);

    // Front hood
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.8, 1.2),
      bodyMat
    );
    hood.position.set(0, 0.8, 2);
    hood.castShadow = true;
    group.add(hood);

    // Side rails (open sides)
    const railGeom = new THREE.BoxGeometry(0.1, 1.0, 4);
    const leftRail = new THREE.Mesh(railGeom, bodyMat);
    leftRail.position.set(-0.95, 1.3, -0.3);
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeom, bodyMat);
    rightRail.position.set(0.95, 1.3, -0.3);
    group.add(rightRail);

    // Chrome decorations
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      roughness: 0.2,
      metalness: 0.9,
    });
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.15, 0.1),
      chromeMat
    );
    bumper.position.set(0, 0.3, 2.6);
    group.add(bumper);

    // Wheels
    this.addWheels(group, darkMat, 0.35, [
      { x: -0.9, z: 1.8 },
      { x: 0.9, z: 1.8 },
      { x: -0.9, z: -1.5 },
      { x: 0.9, z: -1.5 },
    ]);
  }

  buildTricycle(group, bodyMat, darkMat) {
    // Motorcycle base
    const bike = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.6, 1.5),
      darkMat
    );
    bike.position.set(-0.4, 0.5, 0);
    group.add(bike);

    // Sidecar
    const sidecar = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.8, 1.4),
      bodyMat
    );
    sidecar.position.set(0.4, 0.6, 0);
    sidecar.castShadow = true;
    group.add(sidecar);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 1.2),
      bodyMat
    );
    roof.position.set(0.3, 1.3, 0);
    group.add(roof);

    // Wheels (3)
    const wheelGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12);

    const frontWheel = new THREE.Mesh(wheelGeom, darkMat);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(-0.4, 0.25, 0.6);
    group.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeom, darkMat);
    rearWheel.rotation.z = Math.PI / 2;
    rearWheel.position.set(-0.4, 0.25, -0.5);
    group.add(rearWheel);

    const sideWheel = new THREE.Mesh(wheelGeom, darkMat);
    sideWheel.rotation.z = Math.PI / 2;
    sideWheel.position.set(0.7, 0.25, -0.3);
    group.add(sideWheel);
  }

  buildBus(group, bodyMat, darkMat, glassMat) {
    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.5, 9),
      bodyMat
    );
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Windows (side)
    const windowGeom = new THREE.BoxGeometry(0.05, 1.0, 0.8);
    for (let z = -3; z <= 3; z += 1.2) {
      const leftWin = new THREE.Mesh(windowGeom, glassMat);
      leftWin.position.set(-1.28, 1.8, z);
      group.add(leftWin);

      const rightWin = new THREE.Mesh(windowGeom, glassMat);
      rightWin.position.set(1.28, 1.8, z);
      group.add(rightWin);
    }

    // Front window
    const frontWindow = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 0.05),
      glassMat
    );
    frontWindow.position.set(0, 2.0, 4.55);
    group.add(frontWindow);

    // Wheels
    this.addWheels(group, darkMat, 0.45, [
      { x: -1.1, z: 3 },
      { x: 1.1, z: 3 },
      { x: -1.1, z: -3 },
      { x: 1.1, z: -3 },
    ]);
  }

  buildTruck(group, bodyMat, darkMat) {
    // Cab
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 2.5),
      bodyMat
    );
    cab.position.set(0, 1.3, 2.5);
    cab.castShadow = true;
    group.add(cab);

    // Cargo bed
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.5, 5),
      new THREE.MeshStandardMaterial({
        color: 0x5D4037,
        roughness: 0.8,
      })
    );
    bed.position.set(0, 1.0, -1);
    bed.castShadow = true;
    group.add(bed);

    // Wheels
    this.addWheels(group, darkMat, 0.4, [
      { x: -1.0, z: 2.5 },
      { x: 1.0, z: 2.5 },
      { x: -1.0, z: -2.5 },
      { x: 1.0, z: -2.5 },
    ]);
  }

  addWheels(group, material, radius, positions) {
    const wheelGeom = new THREE.CylinderGeometry(radius, radius, 0.2, 12);

    for (const pos of positions) {
      const wheel = new THREE.Mesh(wheelGeom, material);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, radius, pos.z);
      group.add(wheel);
    }
  }

  update(deltaTime, playerPosition, otherVehicles) {
    if (!this.isActive || !this.roadPath || this.roadPath.length < 2) return;

    // Get current and next waypoint
    const currentPoint = this.roadPath[this.pathIndex];
    const nextIndex = Math.min(this.pathIndex + 1, this.roadPath.length - 1);
    const nextPoint = this.roadPath[nextIndex];

    // Calculate direction to next point
    const targetX = nextPoint[0];
    const targetZ = nextPoint[1];
    const dx = targetX - this.position.x;
    const dz = targetZ - this.position.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);

    // Check if we reached the waypoint
    if (distToTarget < 5) {
      this.pathIndex++;
      if (this.pathIndex >= this.roadPath.length - 1) {
        // Reached end of path
        this.isActive = false;
        return;
      }
    }

    // Calculate target rotation
    const targetRotation = Math.atan2(dx, dz);

    // Smooth rotation
    let rotDiff = targetRotation - this.rotation;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.rotation += rotDiff * 3 * deltaTime;

    // Check for obstacles ahead
    this.isBraking = false;
    const lookAhead = 20; // meters

    // Check distance to player
    if (playerPosition) {
      const toPlayer = new THREE.Vector3(
        playerPosition.x - this.position.x,
        0,
        playerPosition.z - this.position.z
      );
      const distToPlayer = toPlayer.length();

      // Check if player is ahead
      const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
      const dot = forward.dot(toPlayer.normalize());

      if (distToPlayer < lookAhead && dot > 0.5) {
        this.isBraking = true;
        this.targetSpeed = Math.max(0, (distToPlayer - 5) / lookAhead * this.type.maxSpeed);
      }
    }

    // Check distance to other vehicles
    for (const other of otherVehicles) {
      if (other === this || !other.isActive) continue;

      const toOther = new THREE.Vector3(
        other.position.x - this.position.x,
        0,
        other.position.z - this.position.z
      );
      const distToOther = toOther.length();

      const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
      const dot = forward.dot(toOther.normalize());

      if (distToOther < lookAhead && dot > 0.5) {
        this.isBraking = true;
        this.targetSpeed = Math.min(
          this.targetSpeed,
          Math.max(0, (distToOther - 8) / lookAhead * this.type.maxSpeed)
        );
      }
    }

    // Accelerate or brake
    if (this.isBraking) {
      this.speed = Math.max(this.targetSpeed, this.speed - this.type.acceleration * 2 * deltaTime);
    } else {
      this.speed = Math.min(this.targetSpeed, this.speed + this.type.acceleration * deltaTime);
    }

    // Move
    const moveX = Math.sin(this.rotation) * this.speed * deltaTime;
    const moveZ = Math.cos(this.rotation) * this.speed * deltaTime;
    this.position.x += moveX;
    this.position.z += moveZ;
    this.distanceTraveled += this.speed * deltaTime;

    // Update mesh
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.rotation;
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.traverse((child) => {
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
}

export class TrafficSystem {
  constructor(scene) {
    this.scene = scene;

    // Traffic configuration
    this.maxVehicles = 20;
    this.spawnDistance = 150; // Spawn vehicles this far from player
    this.despawnDistance = 250; // Remove vehicles beyond this distance
    this.spawnInterval = 2000; // ms between spawn attempts

    // Active vehicles
    this.vehicles = [];
    this.vehicleGroup = new THREE.Group();
    this.vehicleGroup.name = 'traffic';
    scene.add(this.vehicleGroup);

    // Road data
    this.roads = [];
    this.roadPaths = new Map(); // roadId -> path points

    // Spawn tracking
    this.lastSpawnTime = 0;

    // Vehicle type weights for spawning
    this.spawnWeights = {
      [TrafficVehicleType.CAR.id]: 0.35,
      [TrafficVehicleType.JEEPNEY.id]: 0.25,
      [TrafficVehicleType.TRICYCLE.id]: 0.20,
      [TrafficVehicleType.BUS.id]: 0.10,
      [TrafficVehicleType.TRUCK.id]: 0.10,
    };
  }

  /**
   * Initialize with road data
   * @param {Array} roads - Road data from RoadGenerator
   */
  init(roads) {
    this.roads = roads;

    // Build path cache
    for (const road of roads) {
      if (road.points && road.points.length >= 2) {
        this.roadPaths.set(road.id, road.points);
      }
    }

    console.log(`TrafficSystem initialized with ${this.roadPaths.size} road paths`);
  }

  /**
   * Update traffic simulation
   * @param {number} deltaTime
   * @param {THREE.Vector3} playerPosition
   */
  update(deltaTime, playerPosition) {
    if (!playerPosition) return;

    // Update existing vehicles
    for (const vehicle of this.vehicles) {
      vehicle.update(deltaTime, playerPosition, this.vehicles);
    }

    // Remove inactive or distant vehicles
    this.vehicles = this.vehicles.filter((vehicle) => {
      if (!vehicle.isActive) {
        this.removeVehicle(vehicle);
        return false;
      }

      const dist = vehicle.position.distanceTo(playerPosition);
      if (dist > this.despawnDistance) {
        this.removeVehicle(vehicle);
        return false;
      }

      return true;
    });

    // Try to spawn new vehicles
    const now = Date.now();
    if (now - this.lastSpawnTime > this.spawnInterval) {
      this.lastSpawnTime = now;
      if (this.vehicles.length < this.maxVehicles) {
        this.trySpawnVehicle(playerPosition);
      }
    }
  }

  /**
   * Try to spawn a vehicle near the player
   * @param {THREE.Vector3} playerPosition
   */
  trySpawnVehicle(playerPosition) {
    // Find a road near spawn distance
    const candidateRoads = [];

    for (const road of this.roads) {
      if (!road.points || road.points.length < 2) continue;

      // Check if road passes near spawn radius
      for (let i = 0; i < road.points.length; i++) {
        const point = road.points[i];
        const dx = point[0] - playerPosition.x;
        const dz = point[1] - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > this.spawnDistance * 0.8 && dist < this.spawnDistance * 1.2) {
          candidateRoads.push({ road, pointIndex: i });
          break;
        }
      }
    }

    if (candidateRoads.length === 0) return;

    // Pick random road
    const { road, pointIndex } = candidateRoads[Math.floor(Math.random() * candidateRoads.length)];

    // Pick random vehicle type based on weights
    const vehicleType = this.pickRandomVehicleType();

    // Create path from this point (forward or backward)
    const goForward = Math.random() > 0.5;
    let path;

    if (goForward) {
      path = road.points.slice(pointIndex);
    } else {
      path = road.points.slice(0, pointIndex + 1).reverse();
    }

    if (path.length < 2) return;

    // Create spawn position
    const startPoint = path[0];
    const spawnPos = new THREE.Vector3(startPoint[0], 0, startPoint[1]);

    // Check if spawn point is too close to existing vehicles
    for (const vehicle of this.vehicles) {
      if (vehicle.position.distanceTo(spawnPos) < 15) {
        return; // Too close, skip spawn
      }
    }

    // Spawn the vehicle
    this.spawnVehicle(vehicleType, spawnPos, path);
  }

  /**
   * Pick a random vehicle type based on weights
   * @returns {Object}
   */
  pickRandomVehicleType() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [typeId, weight] of Object.entries(this.spawnWeights)) {
      cumulative += weight;
      if (rand < cumulative) {
        return Object.values(TrafficVehicleType).find(t => t.id === typeId);
      }
    }

    return TrafficVehicleType.CAR;
  }

  /**
   * Spawn a vehicle
   * @param {Object} type
   * @param {THREE.Vector3} position
   * @param {Array} path
   */
  spawnVehicle(type, position, path) {
    const vehicle = new TrafficVehicle(type, position, path);
    this.vehicles.push(vehicle);
    this.vehicleGroup.add(vehicle.mesh);
  }

  /**
   * Remove a vehicle
   * @param {TrafficVehicle} vehicle
   */
  removeVehicle(vehicle) {
    if (vehicle.mesh) {
      this.vehicleGroup.remove(vehicle.mesh);
    }
    vehicle.dispose();
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      activeVehicles: this.vehicles.length,
      maxVehicles: this.maxVehicles,
    };
  }

  /**
   * Set traffic density
   * @param {number} density - 0 to 1
   */
  setDensity(density) {
    this.maxVehicles = Math.round(density * 30);
    this.spawnInterval = Math.round(3000 - density * 2000);
  }

  /**
   * Clear all traffic
   */
  clear() {
    for (const vehicle of this.vehicles) {
      this.removeVehicle(vehicle);
    }
    this.vehicles = [];
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.clear();
    this.scene.remove(this.vehicleGroup);
  }
}

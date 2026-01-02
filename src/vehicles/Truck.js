/**
 * Truck - Low-poly truck model with physics
 *
 * Creates a detailed truck mesh with cabin, chassis, wheels, and lights.
 */

import * as THREE from 'three';

// Truck configurations
export const TruckTypes = {
  STANDARD: {
    id: 'standard',
    name: 'Mindanao Hauler',
    description: 'Reliable workhorse for any cargo',
    price: 0, // Starting truck
    cabinColor: 0x4CAF50, // Brand green
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
    cabinColor: 0x1565C0, // Blue
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
    cabinColor: 0xD32F2F, // Red
    specs: {
      mass: 6000,
      enginePower: 400,
      maxSpeed: 110,
      fuelCapacity: 250,
      fuelEfficiency: 2.8,
    },
  },
};

export class Truck {
  constructor(type = TruckTypes.STANDARD) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `truck_${type.id}`;

    // Components
    this.cabin = null;
    this.chassis = null;
    this.wheels = [];
    this.headlights = [];
    this.taillights = [];
    this.mirrors = [];

    // State
    this.headlightsOn = false;
    this.brakeLightsOn = false;
    this.turnSignalLeft = false;
    this.turnSignalRight = false;

    // Physics body reference (set externally)
    this.physicsBody = null;

    // Build the truck
    this.build();
  }

  /**
   * Build the truck model
   */
  build() {
    this.createChassis();
    this.createCabin();
    this.createWheels();
    this.createLights();
    this.createDetails();
  }

  /**
   * Create the truck chassis/frame
   */
  createChassis() {
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    // Main frame rails (two parallel beams)
    const railGeometry = new THREE.BoxGeometry(0.15, 0.2, 8);

    const leftRail = new THREE.Mesh(railGeometry, chassisMaterial);
    leftRail.position.set(-0.5, 0.4, -1);
    leftRail.castShadow = true;
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeometry, chassisMaterial);
    rightRail.position.set(0.5, 0.4, -1);
    rightRail.castShadow = true;
    this.group.add(rightRail);

    // Cross members
    const crossGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.15);
    for (let z = 2; z >= -4; z -= 1.5) {
      const cross = new THREE.Mesh(crossGeometry, chassisMaterial);
      cross.position.set(0, 0.35, z);
      this.group.add(cross);
    }

    // Fuel tanks (cylindrical, on sides)
    const tankGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 12);
    const tankMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.6,
      metalness: 0.4,
    });

    const leftTank = new THREE.Mesh(tankGeometry, tankMaterial);
    leftTank.rotation.z = Math.PI / 2;
    leftTank.position.set(-0.9, 0.5, -1);
    leftTank.castShadow = true;
    this.group.add(leftTank);

    const rightTank = new THREE.Mesh(tankGeometry, tankMaterial);
    rightTank.rotation.z = Math.PI / 2;
    rightTank.position.set(0.9, 0.5, -1);
    rightTank.castShadow = true;
    this.group.add(rightTank);
  }

  /**
   * Create the cabin
   */
  createCabin() {
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: this.type.cabinColor,
      roughness: 0.4,
      metalness: 0.3,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.6,
    });

    // Main cabin body
    const cabinGeometry = new THREE.BoxGeometry(2.2, 1.8, 2.2);
    this.cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    this.cabin.position.set(0, 1.5, 1.8);
    this.cabin.castShadow = true;
    this.cabin.receiveShadow = true;
    this.group.add(this.cabin);

    // Cabin roof (slightly larger)
    const roofGeometry = new THREE.BoxGeometry(2.3, 0.15, 2.3);
    const roof = new THREE.Mesh(roofGeometry, cabinMaterial);
    roof.position.set(0, 2.45, 1.8);
    roof.castShadow = true;
    this.group.add(roof);

    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(1.8, 1.2);
    const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0, 1.8, 2.91);
    windshield.rotation.x = -0.1;
    this.group.add(windshield);

    // Side windows
    const sideWindowGeometry = new THREE.PlaneGeometry(1.5, 0.8);

    const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    leftWindow.position.set(-1.11, 1.9, 1.8);
    leftWindow.rotation.y = Math.PI / 2;
    this.group.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    rightWindow.position.set(1.11, 1.9, 1.8);
    rightWindow.rotation.y = -Math.PI / 2;
    this.group.add(rightWindow);

    // Hood/engine cover
    const hoodGeometry = new THREE.BoxGeometry(2.0, 0.8, 1.2);
    const hood = new THREE.Mesh(hoodGeometry, cabinMaterial);
    hood.position.set(0, 0.9, 3.3);
    hood.castShadow = true;
    this.group.add(hood);

    // Grille
    const grilleMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
      metalness: 0.1,
    });
    const grilleGeometry = new THREE.BoxGeometry(1.6, 0.6, 0.1);
    const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
    grille.position.set(0, 0.9, 3.91);
    this.group.add(grille);

    // Bumper
    const bumperMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.2,
    });
    const bumperGeometry = new THREE.BoxGeometry(2.4, 0.25, 0.15);
    const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper.position.set(0, 0.45, 4.0);
    this.group.add(bumper);
  }

  /**
   * Create wheels with hub detail
   */
  createWheels() {
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.0,
    });

    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.4,
      metalness: 0.6,
    });

    // Wheel positions: [x, y, z, isFront, isDouble]
    const wheelPositions = [
      { x: -1.0, y: 0.45, z: 3.0, front: true, double: false },  // Front left
      { x: 1.0, y: 0.45, z: 3.0, front: true, double: false },   // Front right
      { x: -1.0, y: 0.45, z: -0.5, front: false, double: true }, // Rear left 1
      { x: 1.0, y: 0.45, z: -0.5, front: false, double: true },  // Rear right 1
      { x: -1.0, y: 0.45, z: -2.0, front: false, double: true }, // Rear left 2
      { x: 1.0, y: 0.45, z: -2.0, front: false, double: true },  // Rear right 2
    ];

    for (const pos of wheelPositions) {
      const wheelGroup = new THREE.Group();

      if (pos.double) {
        // Dual wheels for rear axles
        this.createWheel(wheelGroup, tireMaterial, hubMaterial, -0.15, pos.x < 0);
        this.createWheel(wheelGroup, tireMaterial, hubMaterial, 0.15, pos.x < 0);
      } else {
        // Single wheel for front
        this.createWheel(wheelGroup, tireMaterial, hubMaterial, 0, pos.x < 0);
      }

      wheelGroup.position.set(pos.x, pos.y, pos.z);
      wheelGroup.userData = { isFront: pos.front };
      this.wheels.push(wheelGroup);
      this.group.add(wheelGroup);
    }
  }

  /**
   * Create a single wheel
   */
  createWheel(parent, tireMaterial, hubMaterial, offsetX, flipHub) {
    // Tire
    const tireGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.position.x = offsetX;
    tire.castShadow = true;
    parent.add(tire);

    // Hub
    const hubGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8);
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = offsetX + (flipHub ? -0.01 : 0.01);
    parent.add(hub);

    // Lug nuts
    const lugGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeometry, hubMaterial);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(
        offsetX + (flipHub ? -0.16 : 0.16),
        Math.sin(angle) * 0.12,
        Math.cos(angle) * 0.12
      );
      parent.add(lug);
    }
  }

  /**
   * Create lights (headlights, taillights, turn signals)
   */
  createLights() {
    // Headlights
    const headlightGeometry = new THREE.CircleGeometry(0.12, 12);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

    const headlightPositions = [
      { x: -0.7, y: 0.9, z: 3.92 },
      { x: 0.7, y: 0.9, z: 3.92 },
    ];

    for (const pos of headlightPositions) {
      const light = new THREE.Mesh(headlightGeometry, headlightMaterial.clone());
      light.position.set(pos.x, pos.y, pos.z);
      this.headlights.push(light);
      this.group.add(light);
    }

    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.05);
    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0x220000,
      emissiveIntensity: 0.3,
    });

    const taillightPositions = [
      { x: -0.9, y: 0.7, z: -5.0 },
      { x: 0.9, y: 0.7, z: -5.0 },
    ];

    for (const pos of taillightPositions) {
      const light = new THREE.Mesh(taillightGeometry, taillightMaterial.clone());
      light.position.set(pos.x, pos.y, pos.z);
      this.taillights.push(light);
      this.group.add(light);
    }
  }

  /**
   * Create additional details (mirrors, exhaust, etc.)
   */
  createDetails() {
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.8,
    });

    // Side mirrors
    const mirrorGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.05);
    const mirrorArmGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.05);

    for (const side of [-1, 1]) {
      const mirrorArm = new THREE.Mesh(mirrorArmGeometry, metalMaterial);
      mirrorArm.position.set(side * 1.3, 2.0, 2.5);
      this.group.add(mirrorArm);

      const mirror = new THREE.Mesh(mirrorGeometry, metalMaterial);
      mirror.position.set(side * 1.5, 2.0, 2.5);
      this.mirrors.push(mirror);
      this.group.add(mirror);
    }

    // Exhaust pipes
    const exhaustGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
    const exhaustMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.5,
      metalness: 0.5,
    });

    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.position.set(-1.0, 1.2, 0.5);
    exhaust.castShadow = true;
    this.group.add(exhaust);

    // Exhaust tip
    const tipGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.1, 8);
    const tip = new THREE.Mesh(tipGeometry, metalMaterial);
    tip.position.set(-1.0, 2.0, 0.5);
    this.group.add(tip);

    // Air horn on roof
    const hornGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
    const horn1 = new THREE.Mesh(hornGeometry, metalMaterial);
    horn1.position.set(-0.3, 2.6, 1.8);
    this.group.add(horn1);

    const horn2 = new THREE.Mesh(hornGeometry, metalMaterial);
    horn2.position.set(0.3, 2.6, 1.8);
    this.group.add(horn2);

    // Sun visor
    const visorGeometry = new THREE.BoxGeometry(2.0, 0.1, 0.4);
    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 2.5, 2.9);
    visor.rotation.x = -0.3;
    this.group.add(visor);
  }

  /**
   * Toggle headlights
   */
  setHeadlights(on) {
    this.headlightsOn = on;
    for (const light of this.headlights) {
      light.material.emissive.setHex(on ? 0xffffcc : 0x000000);
      light.material.emissiveIntensity = on ? 1.5 : 0;
    }
  }

  /**
   * Set brake lights
   */
  setBrakeLights(on) {
    this.brakeLightsOn = on;
    for (const light of this.taillights) {
      light.material.emissive.setHex(on ? 0xff0000 : 0x220000);
      light.material.emissiveIntensity = on ? 1.0 : 0.3;
    }
  }

  /**
   * Rotate wheels based on speed
   * @param {number} speed - Speed in m/s
   * @param {number} deltaTime - Time delta
   */
  updateWheels(speed, deltaTime) {
    const wheelRadius = 0.45;
    const rotationSpeed = speed / wheelRadius;

    for (const wheel of this.wheels) {
      // Rotate all children (the actual wheel meshes)
      wheel.children.forEach(child => {
        if (child.geometry.type === 'CylinderGeometry') {
          child.rotation.x += rotationSpeed * deltaTime;
        }
      });
    }
  }

  /**
   * Set steering angle for front wheels
   * @param {number} angle - Steering angle in radians
   */
  setSteering(angle) {
    for (const wheel of this.wheels) {
      if (wheel.userData.isFront) {
        wheel.rotation.y = angle * 0.5; // Limit steering angle
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

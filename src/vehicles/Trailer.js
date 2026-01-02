/**
 * Trailer - Low-poly trailer models for cargo
 *
 * Creates different trailer types for various cargo.
 */

import * as THREE from 'three';

// Trailer configurations
export const TrailerTypes = {
  CONTAINER: {
    id: 'container',
    name: 'Container Trailer',
    cargoTypes: ['container', 'electronics'],
    length: 12,
    color: 0x2196F3, // Blue
  },
  FLATBED: {
    id: 'flatbed',
    name: 'Flatbed Trailer',
    cargoTypes: ['lumber', 'construction'],
    length: 10,
    color: 0x795548, // Brown
  },
  TANKER: {
    id: 'tanker',
    name: 'Tanker Trailer',
    cargoTypes: ['fuel'],
    length: 10,
    color: 0x9E9E9E, // Gray
  },
  REFRIGERATED: {
    id: 'refrigerated',
    name: 'Refrigerated Trailer',
    cargoTypes: ['produce', 'fish'],
    length: 11,
    color: 0xFFFFFF, // White
  },
  COVERED: {
    id: 'covered',
    name: 'Covered Trailer',
    cargoTypes: ['rice'],
    length: 9,
    color: 0x8BC34A, // Light green
  },
};

export class Trailer {
  constructor(type = TrailerTypes.CONTAINER) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `trailer_${type.id}`;

    // Components
    this.body = null;
    this.wheels = [];

    // Build the trailer
    this.build();
  }

  /**
   * Build the trailer model
   */
  build() {
    switch (this.type.id) {
      case 'container':
        this.buildContainerTrailer();
        break;
      case 'flatbed':
        this.buildFlatbedTrailer();
        break;
      case 'tanker':
        this.buildTankerTrailer();
        break;
      case 'refrigerated':
        this.buildRefrigeratedTrailer();
        break;
      case 'covered':
        this.buildCoveredTrailer();
        break;
      default:
        this.buildContainerTrailer();
    }

    this.createWheels();
    this.createLights();
  }

  /**
   * Build container trailer
   */
  buildContainerTrailer() {
    const length = this.type.length;

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const frameGeometry = new THREE.BoxGeometry(2.4, 0.2, length);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.6, -length / 2);
    frame.castShadow = true;
    this.group.add(frame);

    // Container
    const containerMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.6,
      metalness: 0.2,
    });

    const containerGeometry = new THREE.BoxGeometry(2.4, 2.6, length - 0.5);
    this.body = new THREE.Mesh(containerGeometry, containerMaterial);
    this.body.position.set(0, 2.0, -length / 2);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    // Container ridges
    const ridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1976D2,
      roughness: 0.5,
    });
    const ridgeGeometry = new THREE.BoxGeometry(0.05, 2.4, length - 1);

    for (let x = -1.0; x <= 1.0; x += 0.25) {
      const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
      ridge.position.set(x, 2.0, -length / 2);
      this.group.add(ridge);
    }

    // Door bars at rear
    const barGeometry = new THREE.BoxGeometry(0.05, 2.4, 0.1);
    for (let x = -0.8; x <= 0.8; x += 0.4) {
      const bar = new THREE.Mesh(barGeometry, frameMaterial);
      bar.position.set(x, 2.0, -length + 0.2);
      this.group.add(bar);
    }
  }

  /**
   * Build flatbed trailer
   */
  buildFlatbedTrailer() {
    const length = this.type.length;

    // Frame/bed
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const bedGeometry = new THREE.BoxGeometry(2.4, 0.15, length);
    const bed = new THREE.Mesh(bedGeometry, frameMaterial);
    bed.position.set(0, 0.8, -length / 2);
    bed.castShadow = true;
    this.group.add(bed);

    // Wood planks on bed
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.9,
      metalness: 0.0,
    });

    const plankGeometry = new THREE.BoxGeometry(2.3, 0.08, 0.25);
    for (let z = 0.3; z < length - 0.3; z += 0.3) {
      const plank = new THREE.Mesh(plankGeometry, woodMaterial);
      plank.position.set(0, 0.92, -z);
      this.group.add(plank);
    }

    // Side stakes
    const stakeGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.08);
    const stakeMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
    });

    for (let z = 1; z < length - 1; z += 2) {
      const leftStake = new THREE.Mesh(stakeGeometry, stakeMaterial);
      leftStake.position.set(-1.15, 1.3, -z);
      this.group.add(leftStake);

      const rightStake = new THREE.Mesh(stakeGeometry, stakeMaterial);
      rightStake.position.set(1.15, 1.3, -z);
      this.group.add(rightStake);
    }

    // Sample cargo - lumber stack
    const lumberMaterial = new THREE.MeshStandardMaterial({
      color: 0xDEB887,
      roughness: 0.9,
    });
    const lumberGeometry = new THREE.BoxGeometry(2.0, 0.15, length - 2);

    for (let y = 0; y < 5; y++) {
      const lumber = new THREE.Mesh(lumberGeometry, lumberMaterial);
      lumber.position.set(0, 1.1 + y * 0.2, -length / 2);
      lumber.castShadow = true;
      this.group.add(lumber);
    }

    this.body = bed;
  }

  /**
   * Build tanker trailer
   */
  buildTankerTrailer() {
    const length = this.type.length;

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const frameGeometry = new THREE.BoxGeometry(2.0, 0.15, length);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.6, -length / 2);
    frame.castShadow = true;
    this.group.add(frame);

    // Tank (cylinder)
    const tankMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.3,
      metalness: 0.7,
    });

    const tankGeometry = new THREE.CylinderGeometry(1.1, 1.1, length - 1, 16);
    this.body = new THREE.Mesh(tankGeometry, tankMaterial);
    this.body.rotation.x = Math.PI / 2;
    this.body.position.set(0, 1.8, -length / 2);
    this.body.castShadow = true;
    this.group.add(this.body);

    // End caps
    const capGeometry = new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);

    const frontCap = new THREE.Mesh(capGeometry, tankMaterial);
    frontCap.rotation.x = -Math.PI / 2;
    frontCap.position.set(0, 1.8, -0.5);
    this.group.add(frontCap);

    const rearCap = new THREE.Mesh(capGeometry, tankMaterial);
    rearCap.rotation.x = Math.PI / 2;
    rearCap.position.set(0, 1.8, -length + 0.5);
    this.group.add(rearCap);

    // Hazmat labels
    const labelMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF5722,
      roughness: 0.5,
    });
    const labelGeometry = new THREE.PlaneGeometry(0.5, 0.5);

    const leftLabel = new THREE.Mesh(labelGeometry, labelMaterial);
    leftLabel.position.set(-1.12, 1.8, -length / 2);
    leftLabel.rotation.y = Math.PI / 2;
    this.group.add(leftLabel);

    const rightLabel = new THREE.Mesh(labelGeometry, labelMaterial);
    rightLabel.position.set(1.12, 1.8, -length / 2);
    rightLabel.rotation.y = -Math.PI / 2;
    this.group.add(rightLabel);
  }

  /**
   * Build refrigerated trailer
   */
  buildRefrigeratedTrailer() {
    const length = this.type.length;

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const frameGeometry = new THREE.BoxGeometry(2.4, 0.2, length);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.6, -length / 2);
    frame.castShadow = true;
    this.group.add(frame);

    // Insulated container (white)
    const containerMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.4,
      metalness: 0.1,
    });

    const containerGeometry = new THREE.BoxGeometry(2.4, 2.6, length - 0.5);
    this.body = new THREE.Mesh(containerGeometry, containerMaterial);
    this.body.position.set(0, 2.0, -length / 2);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    // Refrigeration unit on front
    const unitMaterial = new THREE.MeshStandardMaterial({
      color: 0x607D8B,
      roughness: 0.5,
      metalness: 0.3,
    });

    const unitGeometry = new THREE.BoxGeometry(2.0, 1.0, 0.4);
    const unit = new THREE.Mesh(unitGeometry, unitMaterial);
    unit.position.set(0, 2.8, -0.2);
    unit.castShadow = true;
    this.group.add(unit);

    // Vent grilles on unit
    const ventMaterial = new THREE.MeshStandardMaterial({
      color: 0x37474F,
      roughness: 0.8,
    });
    const ventGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.05);

    for (let x = -0.5; x <= 0.5; x += 0.5) {
      const vent = new THREE.Mesh(ventGeometry, ventMaterial);
      vent.position.set(x, 2.8, -0.01);
      this.group.add(vent);
    }

    // Blue stripe
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196F3,
      roughness: 0.5,
    });
    const stripeGeometry = new THREE.BoxGeometry(2.42, 0.3, length - 0.4);
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0, 1.5, -length / 2);
    this.group.add(stripe);
  }

  /**
   * Build covered trailer
   */
  buildCoveredTrailer() {
    const length = this.type.length;

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const frameGeometry = new THREE.BoxGeometry(2.4, 0.2, length);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.6, -length / 2);
    frame.castShadow = true;
    this.group.add(frame);

    // Tarp/cover (curved top)
    const coverMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Create curved tarp shape
    const shape = new THREE.Shape();
    shape.moveTo(-1.2, 0);
    shape.lineTo(-1.2, 1.5);
    shape.quadraticCurveTo(-1.2, 2.2, 0, 2.4);
    shape.quadraticCurveTo(1.2, 2.2, 1.2, 1.5);
    shape.lineTo(1.2, 0);
    shape.lineTo(-1.2, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length - 0.5,
      bevelEnabled: false,
    };

    const coverGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    this.body = new THREE.Mesh(coverGeometry, coverMaterial);
    this.body.rotation.x = -Math.PI / 2;
    this.body.position.set(0, 0.8, -0.25);
    this.body.castShadow = true;
    this.group.add(this.body);

    // Rope ties
    const ropeMaterial = new THREE.MeshStandardMaterial({
      color: 0x8D6E63,
      roughness: 0.9,
    });
    const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2.6, 6);

    for (let z = 1; z < length - 1; z += 1.5) {
      const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
      rope.rotation.z = Math.PI / 2;
      rope.position.set(0, 2.2, -z);
      this.group.add(rope);
    }
  }

  /**
   * Create wheels for trailer
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

    const length = this.type.length;

    // Wheel positions (dual wheels)
    const wheelPositions = [
      { x: -1.0, y: 0.45, z: -length + 2 },
      { x: 1.0, y: 0.45, z: -length + 2 },
      { x: -1.0, y: 0.45, z: -length + 3.5 },
      { x: 1.0, y: 0.45, z: -length + 3.5 },
    ];

    for (const pos of wheelPositions) {
      const wheelGroup = new THREE.Group();

      // Dual wheels
      this.createWheel(wheelGroup, tireMaterial, hubMaterial, -0.15);
      this.createWheel(wheelGroup, tireMaterial, hubMaterial, 0.15);

      wheelGroup.position.set(pos.x, pos.y, pos.z);
      this.wheels.push(wheelGroup);
      this.group.add(wheelGroup);
    }
  }

  /**
   * Create a single wheel
   */
  createWheel(parent, tireMaterial, hubMaterial, offsetX) {
    const tireGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.position.x = offsetX;
    tire.castShadow = true;
    parent.add(tire);

    const hubGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8);
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = offsetX;
    parent.add(hub);
  }

  /**
   * Create tail lights
   */
  createLights() {
    const length = this.type.length;

    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0x220000,
      emissiveIntensity: 0.3,
    });

    const lightGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.05);

    const positions = [
      { x: -1.1, y: 0.8 },
      { x: 1.1, y: 0.8 },
      { x: -1.1, y: 1.2 },
      { x: 1.1, y: 1.2 },
    ];

    for (const pos of positions) {
      const light = new THREE.Mesh(lightGeometry, lightMaterial.clone());
      light.position.set(pos.x, pos.y, -length + 0.02);
      this.group.add(light);
    }
  }

  /**
   * Rotate wheels based on speed
   */
  updateWheels(speed, deltaTime) {
    const wheelRadius = 0.45;
    const rotationSpeed = speed / wheelRadius;

    for (const wheel of this.wheels) {
      wheel.children.forEach(child => {
        if (child.geometry.type === 'CylinderGeometry') {
          child.rotation.x += rotationSpeed * deltaTime;
        }
      });
    }
  }

  /**
   * Get the Three.js group
   */
  getObject3D() {
    return this.group;
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

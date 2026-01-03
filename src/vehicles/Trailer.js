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
    cargoTypes: ['lumber', 'construction', 'rubber'],
    length: 10,
    color: 0x795548, // Brown
  },
  TANKER: {
    id: 'tanker',
    name: 'Tanker Trailer',
    cargoTypes: ['fuel', 'palm_oil'],
    length: 10,
    color: 0x9E9E9E, // Gray
  },
  REFRIGERATED: {
    id: 'refrigerated',
    name: 'Refrigerated Trailer',
    cargoTypes: ['produce', 'fish', 'bananas', 'durian', 'pineapple'],
    length: 11,
    color: 0xFFFFFF, // White
  },
  COVERED: {
    id: 'covered',
    name: 'Covered Trailer',
    cargoTypes: ['rice', 'coconut', 'coffee', 'abaca', 'cacao'],
    length: 9,
    color: 0x8BC34A, // Light green
  },
  LIVESTOCK: {
    id: 'livestock',
    name: 'Livestock Trailer',
    cargoTypes: ['livestock'],
    length: 10,
    color: 0xA1887F, // Brown
  },
  DUMP: {
    id: 'dump',
    name: 'Dump Trailer',
    cargoTypes: ['mining'],
    length: 8,
    color: 0xFFC107, // Amber
  },
  LOGGING: {
    id: 'logging',
    name: 'Logging Trailer',
    cargoTypes: ['logs'],
    length: 14,
    color: 0x5D4037, // Dark brown
  },
  LOWBOY: {
    id: 'lowboy',
    name: 'Lowboy Trailer',
    cargoTypes: ['heavy_equipment'],
    length: 13,
    color: 0xFF5722, // Deep orange
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
      case 'livestock':
        this.buildLivestockTrailer();
        break;
      case 'dump':
        this.buildDumpTrailer();
        break;
      case 'logging':
        this.buildLoggingTrailer();
        break;
      case 'lowboy':
        this.buildLowboyTrailer();
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
   * Build livestock trailer
   */
  buildLivestockTrailer() {
    const length = this.type.length;

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const frameGeometry = new THREE.BoxGeometry(2.4, 0.15, length);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.6, -length / 2);
    frame.castShadow = true;
    this.group.add(frame);

    // Side walls with ventilation slats
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Floor
    const floorGeometry = new THREE.BoxGeometry(2.3, 0.1, length - 0.5);
    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.position.set(0, 0.75, -length / 2);
    this.group.add(floor);

    // Create slatted walls
    const slatMaterial = new THREE.MeshStandardMaterial({
      color: 0x8D6E63,
      roughness: 0.9,
    });

    // Vertical posts
    const postGeometry = new THREE.BoxGeometry(0.08, 1.8, 0.08);
    for (let z = 0.5; z < length - 0.5; z += 1.5) {
      const leftPost = new THREE.Mesh(postGeometry, frameMaterial);
      leftPost.position.set(-1.15, 1.6, -z);
      this.group.add(leftPost);

      const rightPost = new THREE.Mesh(postGeometry, frameMaterial);
      rightPost.position.set(1.15, 1.6, -z);
      this.group.add(rightPost);
    }

    // Horizontal slats (for ventilation)
    const slatGeometry = new THREE.BoxGeometry(0.05, 0.08, length - 1);
    for (let y = 0; y < 6; y++) {
      // Left side
      const leftSlat = new THREE.Mesh(slatGeometry, slatMaterial);
      leftSlat.position.set(-1.18, 0.9 + y * 0.25, -length / 2);
      this.group.add(leftSlat);

      // Right side
      const rightSlat = new THREE.Mesh(slatGeometry, slatMaterial);
      rightSlat.position.set(1.18, 0.9 + y * 0.25, -length / 2);
      this.group.add(rightSlat);
    }

    // Roof frame
    const roofGeometry = new THREE.BoxGeometry(2.5, 0.05, length - 0.3);
    const roof = new THREE.Mesh(roofGeometry, frameMaterial);
    roof.position.set(0, 2.5, -length / 2);
    roof.castShadow = true;
    this.group.add(roof);

    this.body = frame;
  }

  /**
   * Build dump trailer
   */
  buildDumpTrailer() {
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

    // Dump bed (tapered)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.5,
      metalness: 0.4,
    });

    // Create dump body shape
    const bedShape = new THREE.Shape();
    bedShape.moveTo(-1.1, 0);
    bedShape.lineTo(-1.3, 1.5);
    bedShape.lineTo(1.3, 1.5);
    bedShape.lineTo(1.1, 0);
    bedShape.lineTo(-1.1, 0);

    const bedSettings = {
      steps: 1,
      depth: length - 1,
      bevelEnabled: false,
    };

    const bedGeometry = new THREE.ExtrudeGeometry(bedShape, bedSettings);
    this.body = new THREE.Mesh(bedGeometry, bodyMaterial);
    this.body.rotation.x = -Math.PI / 2;
    this.body.position.set(0, 0.8, -0.5);
    this.body.castShadow = true;
    this.group.add(this.body);

    // Back door (hinged at bottom)
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0xE65100,
      roughness: 0.6,
      metalness: 0.3,
    });

    const doorGeometry = new THREE.BoxGeometry(2.4, 1.5, 0.08);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.55, -length + 0.5);
    this.group.add(door);

    // Mining ore cargo
    const oreMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      roughness: 0.95,
    });

    // Random ore chunks
    for (let i = 0; i < 15; i++) {
      const size = 0.2 + Math.random() * 0.3;
      const oreGeometry = new THREE.DodecahedronGeometry(size);
      const ore = new THREE.Mesh(oreGeometry, oreMaterial);
      ore.position.set(
        (Math.random() - 0.5) * 1.8,
        1.5 + Math.random() * 0.5,
        -1 - Math.random() * (length - 3)
      );
      ore.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.group.add(ore);
    }
  }

  /**
   * Build logging trailer
   */
  buildLoggingTrailer() {
    const length = this.type.length;

    // Main spine/beam
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const spineGeometry = new THREE.BoxGeometry(0.4, 0.3, length);
    const spine = new THREE.Mesh(spineGeometry, frameMaterial);
    spine.position.set(0, 0.6, -length / 2);
    spine.castShadow = true;
    this.group.add(spine);

    // Bolsters (cross beams for logs)
    const bolsterGeometry = new THREE.BoxGeometry(2.6, 0.2, 0.4);
    const bolsterPositions = [-2, -length / 2, -length + 2];

    for (const z of bolsterPositions) {
      const bolster = new THREE.Mesh(bolsterGeometry, frameMaterial);
      bolster.position.set(0, 0.8, z);
      this.group.add(bolster);

      // Uprights (stakes)
      const stakeGeometry = new THREE.BoxGeometry(0.1, 1.8, 0.1);
      const leftStake = new THREE.Mesh(stakeGeometry, frameMaterial);
      leftStake.position.set(-1.2, 1.7, z);
      this.group.add(leftStake);

      const rightStake = new THREE.Mesh(stakeGeometry, frameMaterial);
      rightStake.position.set(1.2, 1.7, z);
      this.group.add(rightStake);
    }

    // Logs cargo
    const logMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.9,
    });

    const barkMaterial = new THREE.MeshStandardMaterial({
      color: 0x3E2723,
      roughness: 0.95,
    });

    // Create log stack
    const logRadius = 0.35;
    const logLength = length - 2;

    // Bottom row (4 logs)
    for (let i = 0; i < 4; i++) {
      const logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 8);
      const log = new THREE.Mesh(logGeometry, barkMaterial);
      log.rotation.x = Math.PI / 2;
      log.position.set(-1.0 + i * 0.7, 1.25, -length / 2);
      log.castShadow = true;
      this.group.add(log);
    }

    // Second row (3 logs)
    for (let i = 0; i < 3; i++) {
      const logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 8);
      const log = new THREE.Mesh(logGeometry, barkMaterial);
      log.rotation.x = Math.PI / 2;
      log.position.set(-0.65 + i * 0.7, 1.85, -length / 2);
      log.castShadow = true;
      this.group.add(log);
    }

    // Top row (2 logs)
    for (let i = 0; i < 2; i++) {
      const logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 8);
      const log = new THREE.Mesh(logGeometry, barkMaterial);
      log.rotation.x = Math.PI / 2;
      log.position.set(-0.35 + i * 0.7, 2.45, -length / 2);
      log.castShadow = true;
      this.group.add(log);
    }

    this.body = spine;
  }

  /**
   * Build lowboy trailer (for heavy equipment)
   */
  buildLowboyTrailer() {
    const length = this.type.length;

    // Frame material
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: this.type.color,
      roughness: 0.6,
      metalness: 0.4,
    });

    // Gooseneck (front raised section)
    const neckGeometry = new THREE.BoxGeometry(2.4, 0.15, 3);
    const neck = new THREE.Mesh(neckGeometry, frameMaterial);
    neck.position.set(0, 1.0, -1.5);
    neck.castShadow = true;
    this.group.add(neck);

    // Transition ramp
    const rampShape = new THREE.Shape();
    rampShape.moveTo(0, 1.0);
    rampShape.lineTo(0, 0.4);
    rampShape.lineTo(2, 0.4);
    rampShape.lineTo(2, 1.0);
    rampShape.lineTo(0, 1.0);

    const rampSettings = {
      steps: 1,
      depth: 2.4,
      bevelEnabled: false,
    };

    const rampGeometry = new THREE.ExtrudeGeometry(rampShape, rampSettings);
    const ramp = new THREE.Mesh(rampGeometry, frameMaterial);
    ramp.rotation.y = Math.PI / 2;
    ramp.position.set(1.2, 0, -3);
    this.group.add(ramp);

    // Low deck (main platform)
    const deckGeometry = new THREE.BoxGeometry(2.6, 0.15, length - 6);
    const deck = new THREE.Mesh(deckGeometry, frameMaterial);
    deck.position.set(0, 0.4, -length / 2 - 1);
    deck.castShadow = true;
    this.group.add(deck);

    // Rear ramp
    const rearRampGeometry = new THREE.BoxGeometry(2.6, 0.1, 2);
    const rearRamp = new THREE.Mesh(rearRampGeometry, frameMaterial);
    rearRamp.position.set(0, 0.35, -length + 1);
    rearRamp.rotation.x = -0.15;
    this.group.add(rearRamp);

    // Side rails
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.3,
    });

    const railGeometry = new THREE.BoxGeometry(0.1, 0.4, length - 4);
    const leftRail = new THREE.Mesh(railGeometry, railMaterial);
    leftRail.position.set(-1.25, 0.65, -length / 2);
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeometry, railMaterial);
    rightRail.position.set(1.25, 0.65, -length / 2);
    this.group.add(rightRail);

    // Heavy equipment cargo (bulldozer representation)
    const equipMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD54F, // CAT yellow
      roughness: 0.6,
      metalness: 0.2,
    });

    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
    });

    // Bulldozer body
    const bodyGeometry = new THREE.BoxGeometry(1.8, 1.0, 2.5);
    const bulldozerBody = new THREE.Mesh(bodyGeometry, equipMaterial);
    bulldozerBody.position.set(0, 1.0, -length / 2);
    bulldozerBody.castShadow = true;
    this.group.add(bulldozerBody);

    // Cabin
    const cabinGeometry = new THREE.BoxGeometry(1.4, 0.9, 1.2);
    const cabin = new THREE.Mesh(cabinGeometry, equipMaterial);
    cabin.position.set(0, 1.95, -length / 2 + 0.4);
    cabin.castShadow = true;
    this.group.add(cabin);

    // Tracks
    const trackGeometry = new THREE.BoxGeometry(0.4, 0.5, 2.8);
    const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
    leftTrack.position.set(-0.9, 0.7, -length / 2);
    this.group.add(leftTrack);

    const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
    rightTrack.position.set(0.9, 0.7, -length / 2);
    this.group.add(rightTrack);

    // Blade
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x424242,
      roughness: 0.4,
      metalness: 0.6,
    });

    const bladeGeometry = new THREE.BoxGeometry(2.2, 0.8, 0.15);
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.9, -length / 2 - 1.5);
    this.group.add(blade);

    this.body = deck;
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

/**
 * PhysicsSystem - Handles physics simulation using Cannon.js
 *
 * Manages the physics world, rigid bodies, and synchronization
 * with Three.js meshes.
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class PhysicsSystem {
  constructor() {
    this.world = null;
    this.bodies = new Map(); // Map of Three.js mesh UUID -> CANNON.Body
    this.meshes = new Map(); // Map of CANNON.Body id -> Three.js mesh

    // Physics settings
    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 3;

    // Materials
    this.materials = {};
    this.contactMaterials = [];
  }

  /**
   * Initialize the physics world
   */
  init() {
    // Create physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    // Broadphase for collision detection
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Enable sleeping for performance
    this.world.allowSleep = true;

    // Setup materials
    this.setupMaterials();

    console.log('Physics system initialized');
  }

  /**
   * Setup physics materials for different surfaces
   */
  setupMaterials() {
    // Default material
    this.materials.default = new CANNON.Material('default');

    // Ground material (asphalt/road)
    this.materials.ground = new CANNON.Material('ground');

    // Vehicle material
    this.materials.vehicle = new CANNON.Material('vehicle');

    // Grass/off-road material
    this.materials.grass = new CANNON.Material('grass');

    // Create contact materials (define interactions between materials)

    // Vehicle on ground (road) - good grip
    const vehicleGroundContact = new CANNON.ContactMaterial(
      this.materials.vehicle,
      this.materials.ground,
      {
        friction: 0.8,
        restitution: 0.1,
      }
    );
    this.world.addContactMaterial(vehicleGroundContact);

    // Vehicle on grass - less grip
    const vehicleGrassContact = new CANNON.ContactMaterial(
      this.materials.vehicle,
      this.materials.grass,
      {
        friction: 0.4,
        restitution: 0.1,
      }
    );
    this.world.addContactMaterial(vehicleGrassContact);

    // Default contact
    this.world.defaultContactMaterial.friction = 0.5;
    this.world.defaultContactMaterial.restitution = 0.3;
  }

  /**
   * Create a static ground plane
   * @param {number} y - Y position of ground
   * @param {string} materialType - Material type ('ground' or 'grass')
   * @returns {CANNON.Body}
   */
  createGroundPlane(y = 0, materialType = 'ground') {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: groundShape,
      material: this.materials[materialType] || this.materials.default,
    });

    // Rotate to be horizontal (facing up)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, y, 0);

    this.world.addBody(groundBody);
    return groundBody;
  }

  /**
   * Create a box physics body
   * @param {THREE.Mesh} mesh - Three.js mesh to add physics to
   * @param {Object} options - Physics options
   * @returns {CANNON.Body}
   */
  createBox(mesh, options = {}) {
    const {
      mass = 1,
      material = 'default',
      fixedRotation = false,
    } = options;

    // Get dimensions from mesh geometry
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const halfExtents = new CANNON.Vec3(
      (box.max.x - box.min.x) / 2,
      (box.max.y - box.min.y) / 2,
      (box.max.z - box.min.z) / 2
    );

    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({
      mass: mass,
      shape: shape,
      material: this.materials[material] || this.materials.default,
      fixedRotation: fixedRotation,
    });

    // Set initial position from mesh
    body.position.copy(mesh.position);
    body.quaternion.copy(mesh.quaternion);

    this.world.addBody(body);
    this.linkMeshToBody(mesh, body);

    return body;
  }

  /**
   * Create a vehicle physics body (simplified box for now)
   * @param {THREE.Object3D} vehicleMesh - Vehicle mesh group
   * @param {Object} options - Vehicle options
   * @returns {CANNON.Body}
   */
  createVehicle(vehicleMesh, options = {}) {
    const {
      mass = 1500, // kg
      width = 2.5,
      height = 2,
      length = 8,
    } = options;

    // Create chassis shape
    const chassisShape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, length / 2));

    const chassisBody = new CANNON.Body({
      mass: mass,
      shape: chassisShape,
      material: this.materials.vehicle,
      linearDamping: 0.1,
      angularDamping: 0.5,
      allowSleep: false, // Keep vehicle always active
    });

    // Set initial position
    chassisBody.position.set(
      vehicleMesh.position.x,
      vehicleMesh.position.y + height / 2,
      vehicleMesh.position.z
    );

    this.world.addBody(chassisBody);
    this.linkMeshToBody(vehicleMesh, chassisBody);

    return chassisBody;
  }

  /**
   * Link a Three.js mesh to a Cannon.js body
   * @param {THREE.Object3D} mesh
   * @param {CANNON.Body} body
   */
  linkMeshToBody(mesh, body) {
    this.bodies.set(mesh.uuid, body);
    this.meshes.set(body.id, mesh);
  }

  /**
   * Unlink and remove a physics body
   * @param {THREE.Object3D} mesh
   */
  removeBody(mesh) {
    const body = this.bodies.get(mesh.uuid);
    if (body) {
      this.world.removeBody(body);
      this.meshes.delete(body.id);
      this.bodies.delete(mesh.uuid);
    }
  }

  /**
   * Get physics body for a mesh
   * @param {THREE.Object3D} mesh
   * @returns {CANNON.Body|undefined}
   */
  getBody(mesh) {
    return this.bodies.get(mesh.uuid);
  }

  /**
   * Apply force to a body
   * @param {CANNON.Body} body
   * @param {THREE.Vector3} force - Force vector
   * @param {THREE.Vector3} [worldPoint] - Point to apply force at (optional)
   */
  applyForce(body, force, worldPoint = null) {
    // Wake up the body if it's sleeping
    if (body.sleepState === CANNON.Body.SLEEPING) {
      body.wakeUp();
    }

    const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);

    if (worldPoint) {
      const cannonPoint = new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
      body.applyForce(cannonForce, cannonPoint);
    } else {
      // Apply force at center of mass
      body.applyForce(cannonForce, body.position);
    }
  }

  /**
   * Apply impulse to a body
   * @param {CANNON.Body} body
   * @param {THREE.Vector3} impulse
   * @param {THREE.Vector3} [worldPoint]
   */
  applyImpulse(body, impulse, worldPoint = null) {
    const cannonImpulse = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);

    if (worldPoint) {
      const cannonPoint = new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
      body.applyImpulse(cannonImpulse, cannonPoint);
    } else {
      body.applyImpulse(cannonImpulse);
    }
  }

  /**
   * Set body velocity
   * @param {CANNON.Body} body
   * @param {THREE.Vector3} velocity
   */
  setVelocity(body, velocity) {
    body.velocity.set(velocity.x, velocity.y, velocity.z);
  }

  /**
   * Get body velocity as Three.js vector
   * @param {CANNON.Body} body
   * @returns {THREE.Vector3}
   */
  getVelocity(body) {
    return new THREE.Vector3(body.velocity.x, body.velocity.y, body.velocity.z);
  }

  /**
   * Update physics simulation
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Step the physics world
    this.world.step(this.fixedTimeStep, deltaTime, this.maxSubSteps);

    // Sync Three.js meshes with physics bodies
    this.syncMeshes();
  }

  /**
   * Synchronize Three.js meshes with physics bodies
   */
  syncMeshes() {
    for (const [bodyId, mesh] of this.meshes) {
      const body = this.world.bodies.find(b => b.id === bodyId);
      if (body) {
        // Manually copy values from Cannon.js Vec3/Quaternion to Three.js
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
      }
    }
  }

  /**
   * Raycast into the physics world
   * @param {THREE.Vector3} from - Start position
   * @param {THREE.Vector3} to - End position
   * @returns {Object|null} - Hit result or null
   */
  raycast(from, to) {
    const raycastResult = new CANNON.RaycastResult();
    const cannonFrom = new CANNON.Vec3(from.x, from.y, from.z);
    const cannonTo = new CANNON.Vec3(to.x, to.y, to.z);

    this.world.raycastClosest(cannonFrom, cannonTo, {}, raycastResult);

    if (raycastResult.hasHit) {
      return {
        point: new THREE.Vector3().copy(raycastResult.hitPointWorld),
        normal: new THREE.Vector3().copy(raycastResult.hitNormalWorld),
        distance: raycastResult.distance,
        body: raycastResult.body,
      };
    }

    return null;
  }

  /**
   * Cleanup physics system
   */
  dispose() {
    // Remove all bodies
    for (const body of this.world.bodies) {
      this.world.removeBody(body);
    }
    this.bodies.clear();
    this.meshes.clear();
  }
}

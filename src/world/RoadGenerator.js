/**
 * RoadGenerator - Generates and renders roads from processed OSM data
 *
 * Creates 3D road meshes from road network JSON data.
 */

import * as THREE from 'three';

export class RoadGenerator {
  constructor(scene, physicsSystem) {
    this.scene = scene;
    this.physics = physicsSystem;

    // Road meshes
    this.roadMeshes = [];
    this.roadGroup = new THREE.Group();
    this.roadGroup.name = 'roads';

    // Road data
    this.roads = [];
    this.pois = [];
    this.meta = null;

    // Materials by road type
    this.materials = this.createMaterials();

    // Configuration
    this.roadHeightOffset = 0.05; // Slight elevation above terrain to prevent z-fighting
  }

  /**
   * Create materials for different road types
   */
  createMaterials() {
    return {
      motorway: new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.9,
        metalness: 0.0,
      }),
      trunk: new THREE.MeshStandardMaterial({
        color: 0x3d3d3d,
        roughness: 0.9,
        metalness: 0.0,
      }),
      primary: new THREE.MeshStandardMaterial({
        color: 0x363636,
        roughness: 0.85,
        metalness: 0.0,
      }),
      secondary: new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.85,
        metalness: 0.0,
      }),
      tertiary: new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        roughness: 0.8,
        metalness: 0.0,
      }),
      default: new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.85,
        metalness: 0.0,
      }),
    };
  }

  /**
   * Load road data from JSON
   * @param {string} url - URL to roads.json
   */
  async loadRoads(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load roads: ${response.status}`);
      }

      const data = await response.json();
      this.meta = data.meta;
      this.roads = data.roads || [];

      console.log(`Loaded ${this.roads.length} roads`);
      console.log(`Bounds: ${this.meta.bounds.minX.toFixed(0)}m to ${this.meta.bounds.maxX.toFixed(0)}m (X)`);
      console.log(`Elevation: ${this.meta.bounds.minY.toFixed(1)}m to ${this.meta.bounds.maxY.toFixed(1)}m`);

      return true;
    } catch (error) {
      console.warn('Could not load roads.json:', error.message);
      return false;
    }
  }

  /**
   * Load POI data from JSON
   * @param {string} url - URL to pois.json
   */
  async loadPOIs(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load POIs: ${response.status}`);
      }

      const data = await response.json();
      this.pois = data.pois || [];

      console.log(`Loaded ${this.pois.length} POIs`);
      return true;
    } catch (error) {
      console.warn('Could not load pois.json:', error.message);
      return false;
    }
  }

  /**
   * Generate all road meshes
   */
  generateRoads() {
    console.log('Generating road meshes...');

    for (const road of this.roads) {
      const mesh = this.createRoadMesh(road);
      if (mesh) {
        this.roadGroup.add(mesh);
        this.roadMeshes.push(mesh);
      }
    }

    this.scene.add(this.roadGroup);
    console.log(`Generated ${this.roadMeshes.length} road meshes`);
  }

  /**
   * Create a mesh for a single road
   * Road points are now [x, y, z] where y is elevation
   * @param {Object} road - Road data
   * @returns {THREE.Mesh|null}
   */
  createRoadMesh(road) {
    if (!road.points || road.points.length < 2) return null;

    const halfWidth = road.width / 2;
    const vertices = [];
    const indices = [];
    const uvs = [];

    // Generate vertices along the road
    let totalLength = 0;

    for (let i = 0; i < road.points.length; i++) {
      // Points are now [x, y, z] format - y is elevation
      const [x, y, z] = road.points[i];
      const elevation = y + this.roadHeightOffset; // Add small offset to prevent z-fighting

      // Calculate perpendicular direction (in XZ plane)
      let perpX, perpZ;

      if (i === 0) {
        // First point - use direction to next point
        const nextX = road.points[1][0];
        const nextZ = road.points[1][2];
        const dx = nextX - x;
        const dz = nextZ - z;
        const len = Math.sqrt(dx * dx + dz * dz);
        perpX = -dz / len;
        perpZ = dx / len;
      } else if (i === road.points.length - 1) {
        // Last point - use direction from previous point
        const prevX = road.points[i - 1][0];
        const prevZ = road.points[i - 1][2];
        const dx = x - prevX;
        const dz = z - prevZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        perpX = -dz / len;
        perpZ = dx / len;
        totalLength += len;
      } else {
        // Middle point - average of incoming and outgoing directions
        const prevX = road.points[i - 1][0];
        const prevZ = road.points[i - 1][2];
        const nextX = road.points[i + 1][0];
        const nextZ = road.points[i + 1][2];

        const dx1 = x - prevX;
        const dz1 = z - prevZ;
        const len1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
        totalLength += len1;

        const dx2 = nextX - x;
        const dz2 = nextZ - z;
        const len2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);

        // Average direction
        const dx = (dx1 / len1 + dx2 / len2) / 2;
        const dz = (dz1 / len1 + dz2 / len2) / 2;
        const len = Math.sqrt(dx * dx + dz * dz);

        perpX = -dz / len;
        perpZ = dx / len;
      }

      // Left and right vertices with elevation
      vertices.push(x - perpX * halfWidth, elevation, z - perpZ * halfWidth);
      vertices.push(x + perpX * halfWidth, elevation, z + perpZ * halfWidth);

      // UVs
      const u = totalLength / road.width;
      uvs.push(0, u);
      uvs.push(1, u);

      // Create triangles (two per segment)
      if (i > 0) {
        const baseIndex = (i - 1) * 2;
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
      }
    }

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Get material based on road type
    const material = this.materials[road.type] || this.materials.default;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = road.name || `road_${road.id}`;
    mesh.userData = { roadId: road.id, roadType: road.type };

    return mesh;
  }

  /**
   * Create POI markers
   */
  createPOIMarkers() {
    const markerGroup = new THREE.Group();
    markerGroup.name = 'pois';

    for (const poi of this.pois) {
      const marker = this.createPOIMarker(poi);
      if (marker) {
        markerGroup.add(marker);
      }
    }

    this.scene.add(markerGroup);
    console.log(`Created ${this.pois.length} POI markers`);
  }

  /**
   * Create a marker for a POI
   * POIs now include y coordinate for elevation
   * @param {Object} poi
   * @returns {THREE.Object3D}
   */
  createPOIMarker(poi) {
    let color;
    let height;

    switch (poi.type) {
      case 'city':
        color = 0xff6600;
        height = 50;
        break;
      case 'town':
        color = 0xffaa00;
        height = 30;
        break;
      case 'fuel':
        color = 0x00ff00;
        height = 10;
        break;
      default:
        color = 0xffffff;
        height = 10;
    }

    // Simple cylinder marker
    const geometry = new THREE.CylinderGeometry(5, 5, height, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });

    // Use elevation (y) from POI data, default to 0 if not present
    const elevation = poi.y || 0;
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(poi.x, elevation + height / 2 + 1, poi.z);
    marker.name = poi.name || poi.type;
    marker.userData = poi;

    return marker;
  }

  /**
   * Get bounds of loaded road network
   * @returns {Object|null}
   */
  getBounds() {
    return this.meta ? this.meta.bounds : null;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    for (const mesh of this.roadMeshes) {
      mesh.geometry.dispose();
    }
    this.roadMeshes = [];

    if (this.roadGroup.parent) {
      this.scene.remove(this.roadGroup);
    }

    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
  }
}

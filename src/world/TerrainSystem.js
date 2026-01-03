/**
 * TerrainSystem - Generates terrain that conforms to road elevations
 *
 * Creates a heightmap-based terrain mesh that smoothly integrates
 * with road geometry for realistic ground surfaces.
 */

import * as THREE from 'three';

export class TerrainSystem {
  constructor(scene) {
    this.scene = scene;

    // Terrain settings
    this.size = 4000; // Terrain size in meters
    this.segments = 128; // Grid resolution (128x128 vertices)
    this.heightOffset = -0.1; // Terrain sits slightly below roads

    // Heightmap data
    this.heightmap = null;
    this.heightmapSize = this.segments + 1;

    // Terrain mesh
    this.terrain = null;
    this.geometry = null;

    // Road influence settings
    this.roadInfluenceRadius = 30; // How far from roads terrain conforms
    this.roadBlendFalloff = 20; // Smooth transition distance

    // Materials
    this.material = this.createMaterial();
  }

  /**
   * Create terrain material
   * @returns {THREE.Material}
   */
  createMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x3d5c3d, // Grass green
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false,
    });
  }

  /**
   * Initialize terrain with road data
   * @param {Array} roads - Road data from RoadGenerator
   * @param {Object} bounds - Map bounds {minX, maxX, minZ, maxZ, minY, maxY}
   */
  init(roads, bounds) {
    console.log('Initializing terrain system...');

    // Initialize heightmap with base elevation
    this.initializeHeightmap(bounds);

    // Carve roads into terrain
    if (roads && roads.length > 0) {
      this.carveRoads(roads);
    }

    // Generate terrain mesh
    this.generateMesh(bounds);

    console.log(`Terrain generated: ${this.size}m x ${this.size}m, ${this.segments}x${this.segments} segments`);
  }

  /**
   * Initialize heightmap with slight variations
   * @param {Object} bounds - Map bounds
   */
  initializeHeightmap(bounds) {
    this.heightmap = new Float32Array(this.heightmapSize * this.heightmapSize);

    // Base elevation from bounds
    const baseElevation = bounds ? (bounds.minY || 0) : 0;

    // Fill with base elevation and slight noise
    for (let z = 0; z < this.heightmapSize; z++) {
      for (let x = 0; x < this.heightmapSize; x++) {
        const idx = z * this.heightmapSize + x;

        // Simple noise for natural variation
        const noise = this.simplerNoise(x * 0.1, z * 0.1) * 2;

        this.heightmap[idx] = baseElevation + noise;
      }
    }
  }

  /**
   * Simple noise function for terrain variation
   * @param {number} x
   * @param {number} z
   * @returns {number}
   */
  simplerNoise(x, z) {
    // Simple pseudo-random noise based on position
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return (n - Math.floor(n)) - 0.5;
  }

  /**
   * Carve road elevations into heightmap
   * @param {Array} roads - Road data
   */
  carveRoads(roads) {
    const cellSize = this.size / this.segments;
    const halfSize = this.size / 2;

    // Build road elevation lookup
    const roadPoints = [];

    for (const road of roads) {
      if (!road.points || road.points.length < 2) continue;

      for (const point of road.points) {
        const [x, y, z] = point;
        roadPoints.push({
          x, y, z,
          width: road.width || 8,
        });
      }
    }

    // For each heightmap cell, find influence from nearby roads
    for (let gz = 0; gz < this.heightmapSize; gz++) {
      for (let gx = 0; gx < this.heightmapSize; gx++) {
        // World position of this heightmap cell
        const worldX = (gx / this.segments) * this.size - halfSize;
        const worldZ = (gz / this.segments) * this.size - halfSize;

        let totalWeight = 0;
        let weightedElevation = 0;

        // Find nearby road points
        for (const rp of roadPoints) {
          const dx = worldX - rp.x;
          const dz = worldZ - rp.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          const influenceRadius = rp.width + this.roadInfluenceRadius;

          if (dist < influenceRadius) {
            // Calculate weight based on distance
            const normalizedDist = dist / influenceRadius;
            // Smooth falloff using smoothstep
            const weight = 1 - normalizedDist * normalizedDist * (3 - 2 * normalizedDist);

            totalWeight += weight;
            weightedElevation += rp.y * weight;
          }
        }

        // Apply road influence
        if (totalWeight > 0) {
          const idx = gz * this.heightmapSize + gx;
          const roadElevation = weightedElevation / totalWeight;
          const currentElevation = this.heightmap[idx];

          // Blend based on total weight (roads have stronger influence when closer)
          const blendFactor = Math.min(1, totalWeight);
          this.heightmap[idx] = currentElevation * (1 - blendFactor) +
                               (roadElevation + this.heightOffset) * blendFactor;
        }
      }
    }
  }

  /**
   * Generate terrain mesh from heightmap
   * @param {Object} bounds - Map bounds for centering
   */
  generateMesh(bounds) {
    // Dispose old geometry if exists
    if (this.geometry) {
      this.geometry.dispose();
    }

    // Create plane geometry
    this.geometry = new THREE.PlaneGeometry(
      this.size, this.size,
      this.segments, this.segments
    );

    // Apply heightmap to vertices
    const positionAttr = this.geometry.attributes.position;
    const vertices = positionAttr.array;

    for (let i = 0; i < positionAttr.count; i++) {
      // PlaneGeometry is XY by default, we'll rotate to XZ
      // Vertex indices: [x, y, z] for each vertex
      const x = i % this.heightmapSize;
      const z = Math.floor(i / this.heightmapSize);

      // Get height from heightmap
      const height = this.heightmap[z * this.heightmapSize + x];

      // Set Y (which becomes height after rotation)
      vertices[i * 3 + 2] = height;
    }

    // Update normals
    positionAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // Create mesh
    this.terrain = new THREE.Mesh(this.geometry, this.material);
    this.terrain.rotation.x = -Math.PI / 2; // Rotate to lay flat
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';

    // Center on bounds if available
    if (bounds) {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      this.terrain.position.set(centerX, 0, centerZ);
    }

    this.scene.add(this.terrain);
  }

  /**
   * Get terrain elevation at world position
   * @param {number} worldX
   * @param {number} worldZ
   * @returns {number} Elevation at position
   */
  getElevation(worldX, worldZ) {
    if (!this.terrain || !this.heightmap) return 0;

    // Convert world coords to heightmap coords
    const terrainPos = this.terrain.position;
    const localX = worldX - terrainPos.x + this.size / 2;
    const localZ = worldZ - terrainPos.z + this.size / 2;

    // Normalize to heightmap indices
    const gx = (localX / this.size) * this.segments;
    const gz = (localZ / this.size) * this.segments;

    // Bounds check
    if (gx < 0 || gx >= this.segments || gz < 0 || gz >= this.segments) {
      return 0;
    }

    // Bilinear interpolation
    const x0 = Math.floor(gx);
    const x1 = Math.min(x0 + 1, this.segments);
    const z0 = Math.floor(gz);
    const z1 = Math.min(z0 + 1, this.segments);

    const fx = gx - x0;
    const fz = gz - z0;

    const h00 = this.heightmap[z0 * this.heightmapSize + x0];
    const h10 = this.heightmap[z0 * this.heightmapSize + x1];
    const h01 = this.heightmap[z1 * this.heightmapSize + x0];
    const h11 = this.heightmap[z1 * this.heightmapSize + x1];

    // Interpolate
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  /**
   * Update terrain quality based on distance (LOD)
   * @param {THREE.Vector3} cameraPosition
   */
  updateLOD(cameraPosition) {
    // Could implement LOD here for performance
    // For now, single detail level
  }

  /**
   * Dispose of terrain resources
   */
  dispose() {
    if (this.terrain) {
      this.scene.remove(this.terrain);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    this.heightmap = null;
  }
}

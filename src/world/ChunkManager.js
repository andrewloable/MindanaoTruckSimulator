/**
 * ChunkManager - Manages chunk-based world streaming
 *
 * Divides the world into chunks and loads/unloads them based on
 * player position to manage memory and rendering performance.
 */

import * as THREE from 'three';

// Chunk states
export const ChunkState = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  UNLOADING: 'unloading',
};

export class ChunkManager {
  constructor(scene) {
    this.scene = scene;

    // Chunk configuration
    this.chunkSize = 500; // Size of each chunk in meters
    this.loadDistance = 2; // Load chunks within N chunks of player
    this.unloadDistance = 4; // Unload chunks beyond N chunks

    // Active chunks Map<chunkKey, Chunk>
    this.chunks = new Map();

    // Chunk groups in scene
    this.chunkGroup = new THREE.Group();
    this.chunkGroup.name = 'chunks';
    scene.add(this.chunkGroup);

    // Data sources
    this.roadData = null;
    this.poiData = null;
    this.roadGenerator = null;

    // Spatial index for quick road lookup
    this.roadIndex = new Map(); // chunkKey -> road indices

    // Player position (in chunk coordinates)
    this.playerChunkX = 0;
    this.playerChunkZ = 0;

    // Performance tracking
    this.chunksLoaded = 0;
    this.chunksUnloaded = 0;

    // Update throttling
    this.lastUpdateTime = 0;
    this.updateInterval = 500; // ms between chunk updates

    // Callbacks
    this.onChunkLoaded = null;
    this.onChunkUnloaded = null;
  }

  /**
   * Initialize with road and POI data
   * @param {Array} roads - Road data array
   * @param {Array} pois - POI data array
   * @param {Object} roadGenerator - Reference to RoadGenerator for mesh creation
   */
  init(roads, pois, roadGenerator) {
    this.roadData = roads;
    this.poiData = pois;
    this.roadGenerator = roadGenerator;

    // Build spatial index for roads
    this.buildRoadIndex();

    console.log(`ChunkManager initialized with ${this.roadIndex.size} chunk indices`);
  }

  /**
   * Build spatial index mapping chunks to roads
   */
  buildRoadIndex() {
    if (!this.roadData) return;

    for (let i = 0; i < this.roadData.length; i++) {
      const road = this.roadData[i];
      if (!road.points || road.points.length === 0) continue;

      // Get bounding box of road
      const chunks = this.getRoadChunks(road);

      // Add road index to each chunk it touches
      for (const chunkKey of chunks) {
        if (!this.roadIndex.has(chunkKey)) {
          this.roadIndex.set(chunkKey, []);
        }
        this.roadIndex.get(chunkKey).push(i);
      }
    }
  }

  /**
   * Get all chunks a road passes through
   * @param {Object} road - Road data object
   * @returns {Set<string>} Set of chunk keys
   */
  getRoadChunks(road) {
    const chunks = new Set();

    for (const point of road.points) {
      const chunkX = Math.floor(point[0] / this.chunkSize);
      const chunkZ = Math.floor(point[1] / this.chunkSize);
      chunks.add(this.getChunkKey(chunkX, chunkZ));
    }

    return chunks;
  }

  /**
   * Get chunk key from coordinates
   * @param {number} x - Chunk X coordinate
   * @param {number} z - Chunk Z coordinate
   * @returns {string} Chunk key
   */
  getChunkKey(x, z) {
    return `${x},${z}`;
  }

  /**
   * Parse chunk key to coordinates
   * @param {string} key - Chunk key
   * @returns {Object} { x, z }
   */
  parseChunkKey(key) {
    const [x, z] = key.split(',').map(Number);
    return { x, z };
  }

  /**
   * Update chunk loading/unloading based on player position
   * @param {number} playerX - World X position
   * @param {number} playerZ - World Z position
   */
  update(playerX, playerZ) {
    // Throttle updates
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    this.lastUpdateTime = now;

    // Calculate player chunk coordinates
    const newChunkX = Math.floor(playerX / this.chunkSize);
    const newChunkZ = Math.floor(playerZ / this.chunkSize);

    // Check if player moved to a new chunk
    if (newChunkX !== this.playerChunkX || newChunkZ !== this.playerChunkZ) {
      this.playerChunkX = newChunkX;
      this.playerChunkZ = newChunkZ;
      this.updateChunks();
    }
  }

  /**
   * Update which chunks are loaded
   */
  updateChunks() {
    const chunksToLoad = new Set();
    const chunksToUnload = new Set();

    // Determine which chunks should be loaded
    for (let dx = -this.loadDistance; dx <= this.loadDistance; dx++) {
      for (let dz = -this.loadDistance; dz <= this.loadDistance; dz++) {
        const chunkX = this.playerChunkX + dx;
        const chunkZ = this.playerChunkZ + dz;
        const key = this.getChunkKey(chunkX, chunkZ);

        // Only load if there's data for this chunk
        if (this.roadIndex.has(key) || this.hasPOIsInChunk(chunkX, chunkZ)) {
          chunksToLoad.add(key);
        }
      }
    }

    // Check existing chunks for unloading
    for (const [key, chunk] of this.chunks) {
      const { x, z } = this.parseChunkKey(key);
      const dx = Math.abs(x - this.playerChunkX);
      const dz = Math.abs(z - this.playerChunkZ);

      if (dx > this.unloadDistance || dz > this.unloadDistance) {
        chunksToUnload.add(key);
      }
    }

    // Load new chunks
    for (const key of chunksToLoad) {
      if (!this.chunks.has(key)) {
        this.loadChunk(key);
      }
    }

    // Unload distant chunks
    for (const key of chunksToUnload) {
      this.unloadChunk(key);
    }
  }

  /**
   * Check if chunk contains any POIs
   * @param {number} chunkX
   * @param {number} chunkZ
   * @returns {boolean}
   */
  hasPOIsInChunk(chunkX, chunkZ) {
    if (!this.poiData) return false;

    const minX = chunkX * this.chunkSize;
    const minZ = chunkZ * this.chunkSize;
    const maxX = minX + this.chunkSize;
    const maxZ = minZ + this.chunkSize;

    return this.poiData.some(
      (poi) => poi.x >= minX && poi.x < maxX && poi.z >= minZ && poi.z < maxZ
    );
  }

  /**
   * Get POIs in a chunk
   * @param {number} chunkX
   * @param {number} chunkZ
   * @returns {Array}
   */
  getPOIsInChunk(chunkX, chunkZ) {
    if (!this.poiData) return [];

    const minX = chunkX * this.chunkSize;
    const minZ = chunkZ * this.chunkSize;
    const maxX = minX + this.chunkSize;
    const maxZ = minZ + this.chunkSize;

    return this.poiData.filter(
      (poi) => poi.x >= minX && poi.x < maxX && poi.z >= minZ && poi.z < maxZ
    );
  }

  /**
   * Load a chunk
   * @param {string} key - Chunk key
   */
  loadChunk(key) {
    const { x, z } = this.parseChunkKey(key);

    // Create chunk object
    const chunk = {
      key,
      x,
      z,
      state: ChunkState.LOADING,
      group: new THREE.Group(),
      meshes: [],
      roadIndices: [],
    };

    chunk.group.name = `chunk_${key}`;
    chunk.group.position.set(0, 0, 0);

    // Get road indices for this chunk
    const roadIndices = this.roadIndex.get(key) || [];
    chunk.roadIndices = roadIndices;

    // Create road meshes for this chunk
    if (this.roadGenerator && roadIndices.length > 0) {
      for (const roadIndex of roadIndices) {
        const road = this.roadData[roadIndex];
        if (!road) continue;

        // Clip road to chunk boundaries (optional, for cleaner edges)
        const mesh = this.roadGenerator.createRoadMesh(road, 1);
        if (mesh) {
          chunk.meshes.push(mesh);
          chunk.group.add(mesh);
        }
      }
    }

    // Create POI markers
    const pois = this.getPOIsInChunk(x, z);
    for (const poi of pois) {
      const marker = this.createPOIMarker(poi);
      if (marker) {
        chunk.meshes.push(marker);
        chunk.group.add(marker);
      }
    }

    // Add to scene
    this.chunkGroup.add(chunk.group);
    this.chunks.set(key, chunk);
    chunk.state = ChunkState.LOADED;

    this.chunksLoaded++;

    if (this.onChunkLoaded) {
      this.onChunkLoaded(chunk);
    }
  }

  /**
   * Unload a chunk
   * @param {string} key - Chunk key
   */
  unloadChunk(key) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    chunk.state = ChunkState.UNLOADING;

    // Dispose of meshes
    for (const mesh of chunk.meshes) {
      if (mesh.geometry) mesh.geometry.dispose();
      // Don't dispose shared materials
    }

    // Remove from scene
    this.chunkGroup.remove(chunk.group);
    this.chunks.delete(key);

    this.chunksUnloaded++;

    if (this.onChunkUnloaded) {
      this.onChunkUnloaded(chunk);
    }
  }

  /**
   * Create a POI marker
   * @param {Object} poi - POI data
   * @returns {THREE.Object3D}
   */
  createPOIMarker(poi) {
    const markerGroup = new THREE.Group();

    // Different markers for different POI types
    let color = 0x4CAF50; // Default green
    let height = 50;

    switch (poi.type) {
      case 'city':
        color = 0xFF5722;
        height = 100;
        break;
      case 'town':
        color = 0xFF9800;
        height = 75;
        break;
      case 'fuel_station':
        color = 0x2196F3;
        height = 50;
        break;
      case 'port':
        color = 0x3F51B5;
        height = 80;
        break;
    }

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(1, 1, height, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.8,
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(0, height / 2, 0);
    markerGroup.add(pole);

    // Marker sphere
    const markerGeometry = new THREE.SphereGeometry(5, 12, 8);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(0, height + 5, 0);
    markerGroup.add(marker);

    markerGroup.position.set(poi.x, 0, poi.z);
    markerGroup.userData = { poi };

    return markerGroup;
  }

  /**
   * Force reload all chunks around player
   */
  reloadAllChunks() {
    // Unload all
    for (const key of [...this.chunks.keys()]) {
      this.unloadChunk(key);
    }

    // Reload
    this.updateChunks();
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      activeChunks: this.chunks.size,
      totalLoaded: this.chunksLoaded,
      totalUnloaded: this.chunksUnloaded,
      playerChunk: { x: this.playerChunkX, z: this.playerChunkZ },
      chunkSize: this.chunkSize,
    };
  }

  /**
   * Set chunk parameters
   * @param {Object} params
   */
  setParameters(params) {
    if (params.chunkSize !== undefined) {
      this.chunkSize = params.chunkSize;
      this.buildRoadIndex(); // Rebuild index with new size
    }
    if (params.loadDistance !== undefined) {
      this.loadDistance = params.loadDistance;
    }
    if (params.unloadDistance !== undefined) {
      this.unloadDistance = params.unloadDistance;
    }
  }

  /**
   * Check if a position is in a loaded chunk
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  isPositionLoaded(x, z) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    const key = this.getChunkKey(chunkX, chunkZ);
    return this.chunks.has(key);
  }

  /**
   * Get loaded chunk at position
   * @param {number} x
   * @param {number} z
   * @returns {Object|null}
   */
  getChunkAtPosition(x, z) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    const key = this.getChunkKey(chunkX, chunkZ);
    return this.chunks.get(key) || null;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    for (const key of [...this.chunks.keys()]) {
      this.unloadChunk(key);
    }
    this.scene.remove(this.chunkGroup);
    this.roadIndex.clear();
  }
}

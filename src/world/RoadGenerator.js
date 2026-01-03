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
    this.markingHeightOffset = 0.02; // Additional offset for markings above road surface

    // Road marking meshes
    this.markingMeshes = [];
    this.markingGroup = new THREE.Group();
    this.markingGroup.name = 'roadMarkings';

    // Marking materials
    this.markingMaterials = {
      white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      yellow: new THREE.MeshBasicMaterial({ color: 0xffcc00 }),
    };

    // Intersection meshes
    this.intersectionMeshes = [];
    this.intersectionGroup = new THREE.Group();
    this.intersectionGroup.name = 'intersections';

    // Intersection material (slightly darker than roads)
    this.intersectionMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.0,
    });

    // LOD configuration
    this.lodLevels = [
      { distance: 0, simplification: 1 },      // Full detail up close
      { distance: 200, simplification: 2 },    // Half detail at 200m
      { distance: 500, simplification: 4 },    // Quarter detail at 500m
      { distance: 1000, simplification: 8 },   // Eighth detail at 1000m
    ];
    this.lodGroups = new Map(); // Map<roadId, THREE.LOD>
    this.useLOD = true; // Enable/disable LOD
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
      if (this.useLOD) {
        // Create LOD object with multiple detail levels
        const lod = this.createRoadLOD(road);
        if (lod) {
          this.roadGroup.add(lod);
          this.lodGroups.set(road.id, lod);
        }
      } else {
        // Original single-mesh approach
        const mesh = this.createRoadMesh(road, 1);
        if (mesh) {
          this.roadGroup.add(mesh);
          this.roadMeshes.push(mesh);
        }
      }

      // Generate road markings (only for major roads to save performance)
      if (['motorway', 'trunk', 'primary'].includes(road.type)) {
        const markings = this.createRoadMarkings(road);
        for (const marking of markings) {
          this.markingGroup.add(marking);
          this.markingMeshes.push(marking);
        }
      }
    }

    // Generate intersection geometry
    this.generateIntersections();

    this.scene.add(this.roadGroup);
    this.scene.add(this.markingGroup);
    this.scene.add(this.intersectionGroup);
    console.log(`Generated ${this.useLOD ? this.lodGroups.size + ' LOD groups' : this.roadMeshes.length + ' road meshes'}, ${this.markingMeshes.length} marking segments, ${this.intersectionMeshes.length} intersections`);
  }

  /**
   * Create LOD object for a road with multiple detail levels
   * @param {Object} road - Road data
   * @returns {THREE.LOD|null}
   */
  createRoadLOD(road) {
    if (!road.points || road.points.length < 2) return null;

    const lod = new THREE.LOD();

    // Calculate road center for LOD distance calculations
    let centerX = 0, centerZ = 0;
    for (const point of road.points) {
      centerX += point[0];
      centerZ += point[2];
    }
    centerX /= road.points.length;
    centerZ /= road.points.length;

    // Create mesh for each LOD level
    for (const level of this.lodLevels) {
      const mesh = this.createRoadMesh(road, level.simplification);
      if (mesh) {
        lod.addLevel(mesh, level.distance);
        this.roadMeshes.push(mesh);
      }
    }

    // Position LOD at road center (LOD calculates distance from this point)
    lod.position.set(centerX, 0, centerZ);

    // Offset all meshes back since LOD moves them
    for (const level of lod.levels) {
      if (level.object) {
        level.object.position.x -= centerX;
        level.object.position.z -= centerZ;
      }
    }

    lod.name = road.name || `road_lod_${road.id}`;
    return lod;
  }

  /**
   * Generate intersection geometry at road junctions
   */
  generateIntersections() {
    // Build a map of road endpoints and their positions
    const nodeMap = new Map(); // key: "x,z" -> { x, y, z, roads: [], maxWidth }
    const nodeThreshold = 10; // Merge nodes within 10 meters

    for (const road of this.roads) {
      if (!road.points || road.points.length < 2) continue;

      // Get start and end points
      const endpoints = [
        { point: road.points[0], isStart: true },
        { point: road.points[road.points.length - 1], isStart: false },
      ];

      for (const { point, isStart } of endpoints) {
        const [x, y, z] = point;

        // Find existing node nearby
        let foundNode = null;
        for (const [key, node] of nodeMap) {
          const dist = Math.sqrt((node.x - x) ** 2 + (node.z - z) ** 2);
          if (dist < nodeThreshold) {
            foundNode = key;
            break;
          }
        }

        if (foundNode) {
          // Add to existing node
          const node = nodeMap.get(foundNode);
          node.roads.push({ road, isStart });
          node.maxWidth = Math.max(node.maxWidth, road.width);
          // Average position
          const count = node.roads.length;
          node.x = (node.x * (count - 1) + x) / count;
          node.y = (node.y * (count - 1) + y) / count;
          node.z = (node.z * (count - 1) + z) / count;
        } else {
          // Create new node
          const key = `${Math.round(x)},${Math.round(z)}`;
          nodeMap.set(key, {
            x, y, z,
            roads: [{ road, isStart }],
            maxWidth: road.width,
          });
        }
      }
    }

    // Generate intersection geometry for nodes with 3+ roads (true intersections)
    for (const [key, node] of nodeMap) {
      if (node.roads.length >= 3) {
        const mesh = this.createIntersectionMesh(node);
        if (mesh) {
          this.intersectionGroup.add(mesh);
          this.intersectionMeshes.push(mesh);
        }
      }
    }
  }

  /**
   * Create intersection mesh at a junction
   * @param {Object} node - Node data { x, y, z, roads, maxWidth }
   * @returns {THREE.Mesh|null}
   */
  createIntersectionMesh(node) {
    // Calculate radius based on widest road
    const radius = node.maxWidth * 0.8;

    // Create circular intersection geometry
    const segments = Math.max(8, node.roads.length * 4);
    const geometry = new THREE.CircleGeometry(radius, segments);

    // Rotate to lay flat
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, this.intersectionMaterial);
    mesh.position.set(node.x, node.y + this.roadHeightOffset + 0.01, node.z);
    mesh.receiveShadow = true;
    mesh.name = `intersection_${node.roads.length}way`;

    return mesh;
  }

  /**
   * Create road markings for a road segment
   * @param {Object} road - Road data
   * @returns {Array<THREE.Mesh>} - Array of marking meshes
   */
  createRoadMarkings(road) {
    const markings = [];
    if (!road.points || road.points.length < 2) return markings;

    const halfWidth = road.width / 2;
    const markingWidth = 0.15; // 15cm wide markings
    const dashLength = 3.0; // 3m dashes
    const gapLength = 6.0; // 6m gaps
    const edgeLineOffset = 0.3; // 30cm from road edge

    // Determine marking style based on road type
    const isMajorRoad = ['motorway', 'trunk', 'primary'].includes(road.type);
    const hasCenterLine = road.width >= 6; // Center line for roads 6m or wider
    const hasEdgeLines = isMajorRoad;

    // Calculate segments along the road
    let accumulatedLength = 0;

    for (let i = 0; i < road.points.length - 1; i++) {
      const [x1, y1, z1] = road.points[i];
      const [x2, y2, z2] = road.points[i + 1];

      const dx = x2 - x1;
      const dz = z2 - z1;
      const segmentLength = Math.sqrt(dx * dx + dz * dz);
      if (segmentLength < 0.1) continue;

      const dirX = dx / segmentLength;
      const dirZ = dz / segmentLength;
      const perpX = -dirZ;
      const perpZ = dirX;

      const avgElevation = (y1 + y2) / 2 + this.roadHeightOffset + this.markingHeightOffset;

      // Center line (dashed for two-way roads)
      if (hasCenterLine) {
        // Calculate dash pattern position
        const patternLength = dashLength + gapLength;
        const startOffset = accumulatedLength % patternLength;

        let pos = 0;
        while (pos < segmentLength) {
          const patternPos = (accumulatedLength + pos) % patternLength;

          if (patternPos < dashLength) {
            // We're in a dash segment
            const dashStart = pos;
            const remainingDash = dashLength - patternPos;
            const dashEnd = Math.min(pos + remainingDash, segmentLength);
            const actualDashLength = dashEnd - dashStart;

            if (actualDashLength > 0.1) {
              const centerX = x1 + dirX * (dashStart + actualDashLength / 2);
              const centerZ = z1 + dirZ * (dashStart + actualDashLength / 2);

              const dashMesh = this.createMarkingSegment(
                centerX, avgElevation, centerZ,
                actualDashLength, markingWidth,
                Math.atan2(dirX, dirZ),
                isMajorRoad ? 'yellow' : 'white'
              );
              markings.push(dashMesh);
            }
            pos = dashEnd;
          } else {
            // We're in a gap
            pos += gapLength - (patternPos - dashLength);
          }
        }
      }

      // Edge lines (solid for major roads)
      if (hasEdgeLines) {
        // Left edge line
        const leftEdgeX = (x1 + x2) / 2 - perpX * (halfWidth - edgeLineOffset);
        const leftEdgeZ = (z1 + z2) / 2 - perpZ * (halfWidth - edgeLineOffset);
        const leftEdge = this.createMarkingSegment(
          leftEdgeX, avgElevation, leftEdgeZ,
          segmentLength, markingWidth,
          Math.atan2(dirX, dirZ),
          'white'
        );
        markings.push(leftEdge);

        // Right edge line
        const rightEdgeX = (x1 + x2) / 2 + perpX * (halfWidth - edgeLineOffset);
        const rightEdgeZ = (z1 + z2) / 2 + perpZ * (halfWidth - edgeLineOffset);
        const rightEdge = this.createMarkingSegment(
          rightEdgeX, avgElevation, rightEdgeZ,
          segmentLength, markingWidth,
          Math.atan2(dirX, dirZ),
          'white'
        );
        markings.push(rightEdge);
      }

      accumulatedLength += segmentLength;
    }

    return markings;
  }

  /**
   * Create a single road marking segment
   * @param {number} x - Center X position
   * @param {number} y - Y position (elevation)
   * @param {number} z - Center Z position
   * @param {number} length - Length of marking
   * @param {number} width - Width of marking
   * @param {number} rotation - Rotation in radians
   * @param {string} color - 'white' or 'yellow'
   * @returns {THREE.Mesh}
   */
  createMarkingSegment(x, y, z, length, width, rotation, color = 'white') {
    const geometry = new THREE.PlaneGeometry(width, length);
    const material = this.markingMaterials[color] || this.markingMaterials.white;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Lay flat
    mesh.rotation.z = rotation;
    mesh.position.set(x, y, z);

    return mesh;
  }

  /**
   * Create a mesh for a single road
   * Road points are now [x, y, z] where y is elevation
   * @param {Object} road - Road data
   * @param {number} simplification - Point skip factor (1 = full detail, 2 = half, etc.)
   * @returns {THREE.Mesh|null}
   */
  createRoadMesh(road, simplification = 1) {
    if (!road.points || road.points.length < 2) return null;

    // Simplify points by skipping based on simplification factor
    let points = road.points;
    if (simplification > 1 && points.length > 2) {
      const simplified = [points[0]]; // Always include start
      for (let i = simplification; i < points.length - 1; i += simplification) {
        simplified.push(points[i]);
      }
      simplified.push(points[points.length - 1]); // Always include end
      points = simplified;
    }

    const halfWidth = road.width / 2;
    const vertices = [];
    const indices = [];
    const uvs = [];

    // Generate vertices along the road (using simplified points)
    let totalLength = 0;

    for (let i = 0; i < points.length; i++) {
      // Points are now [x, y, z] format - y is elevation
      const [x, y, z] = points[i];
      const elevation = y + this.roadHeightOffset; // Add small offset to prevent z-fighting

      // Calculate perpendicular direction (in XZ plane)
      let perpX, perpZ;

      if (i === 0) {
        // First point - use direction to next point
        const nextX = points[1][0];
        const nextZ = points[1][2];
        const dx = nextX - x;
        const dz = nextZ - z;
        const len = Math.sqrt(dx * dx + dz * dz);
        perpX = -dz / len;
        perpZ = dx / len;
      } else if (i === points.length - 1) {
        // Last point - use direction from previous point
        const prevX = points[i - 1][0];
        const prevZ = points[i - 1][2];
        const dx = x - prevX;
        const dz = z - prevZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        perpX = -dz / len;
        perpZ = dx / len;
        totalLength += len;
      } else {
        // Middle point - average of incoming and outgoing directions
        const prevX = points[i - 1][0];
        const prevZ = points[i - 1][2];
        const nextX = points[i + 1][0];
        const nextZ = points[i + 1][2];

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
   * Get fuel station POIs
   * @returns {Array} - Array of {x, z, name} objects
   */
  getFuelStations() {
    return this.pois
      .filter(poi => poi.type === 'fuel')
      .map(poi => ({
        x: poi.x,
        z: poi.z,
        name: poi.name || 'Gas Station',
      }));
  }

  /**
   * Get all POIs of a specific type
   * @param {string} type - POI type (city, town, fuel)
   * @returns {Array}
   */
  getPOIsByType(type) {
    return this.pois.filter(poi => poi.type === type);
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Dispose road meshes
    for (const mesh of this.roadMeshes) {
      mesh.geometry.dispose();
    }
    this.roadMeshes = [];

    // Dispose marking meshes
    for (const mesh of this.markingMeshes) {
      mesh.geometry.dispose();
    }
    this.markingMeshes = [];

    // Dispose intersection meshes
    for (const mesh of this.intersectionMeshes) {
      mesh.geometry.dispose();
    }
    this.intersectionMeshes = [];

    // Remove groups from scene
    if (this.roadGroup.parent) {
      this.scene.remove(this.roadGroup);
    }
    if (this.markingGroup.parent) {
      this.scene.remove(this.markingGroup);
    }
    if (this.intersectionGroup.parent) {
      this.scene.remove(this.intersectionGroup);
    }

    // Dispose materials
    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
    for (const material of Object.values(this.markingMaterials)) {
      material.dispose();
    }
    this.intersectionMaterial.dispose();
  }
}

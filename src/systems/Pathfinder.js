/**
 * Pathfinder - A* pathfinding along road network
 *
 * Builds a graph from road data and finds shortest paths
 * between locations for GPS navigation.
 */

export class Pathfinder {
  constructor() {
    // Graph nodes: Map<nodeId, {x, y, z, edges: [{nodeId, distance, roadId}]}>
    this.nodes = new Map();

    // Spatial grid for fast nearest-node lookup
    this.spatialGrid = new Map();
    this.gridCellSize = 100; // 100m cells

    // Road reference for path reconstruction
    this.roads = [];

    // Stats
    this.nodeCount = 0;
    this.edgeCount = 0;
  }

  /**
   * Build the road graph from road data
   * @param {Array} roads - Array of road objects with points
   */
  buildGraph(roads) {
    console.log('Building pathfinding graph...');
    this.roads = roads;
    this.nodes.clear();
    this.spatialGrid.clear();

    const nodeThreshold = 5; // Merge nodes within 5 meters

    // First pass: create nodes from road endpoints and key points
    for (const road of roads) {
      if (!road.points || road.points.length < 2) continue;

      // Add nodes at intervals along the road (every ~50m for detail)
      const nodeInterval = 50;
      let lastNodeId = null;
      let distSinceLastNode = 0;

      for (let i = 0; i < road.points.length; i++) {
        const [x, y, z] = road.points[i];
        const isEndpoint = i === 0 || i === road.points.length - 1;

        // Calculate distance from last point
        if (i > 0) {
          const [px, py, pz] = road.points[i - 1];
          distSinceLastNode += Math.sqrt(
            (x - px) ** 2 + (z - pz) ** 2
          );
        }

        // Add node at endpoints or when interval reached
        if (isEndpoint || distSinceLastNode >= nodeInterval) {
          const nodeId = this.findOrCreateNode(x, y, z, nodeThreshold);

          // Connect to previous node on this road
          if (lastNodeId !== null && lastNodeId !== nodeId) {
            this.addEdge(lastNodeId, nodeId, distSinceLastNode, road.id);
          }

          lastNodeId = nodeId;
          distSinceLastNode = 0;
        }
      }
    }

    // Second pass: detect and merge intersection nodes
    this.mergeIntersections(nodeThreshold);

    this.nodeCount = this.nodes.size;
    this.edgeCount = Array.from(this.nodes.values())
      .reduce((sum, node) => sum + node.edges.length, 0) / 2;

    console.log(`Pathfinding graph built: ${this.nodeCount} nodes, ${this.edgeCount} edges`);
  }

  /**
   * Find existing node near position or create new one
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} threshold - Distance to merge nodes
   * @returns {string} Node ID
   */
  findOrCreateNode(x, y, z, threshold) {
    // Check spatial grid for nearby nodes
    const cellX = Math.floor(x / this.gridCellSize);
    const cellZ = Math.floor(z / this.gridCellSize);

    // Check surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cellKey = `${cellX + dx},${cellZ + dz}`;
        const cellNodes = this.spatialGrid.get(cellKey);
        if (!cellNodes) continue;

        for (const nodeId of cellNodes) {
          const node = this.nodes.get(nodeId);
          const dist = Math.sqrt(
            (node.x - x) ** 2 + (node.z - z) ** 2
          );
          if (dist < threshold) {
            return nodeId;
          }
        }
      }
    }

    // Create new node
    const nodeId = `n${this.nodes.size}`;
    this.nodes.set(nodeId, {
      x, y, z,
      edges: [],
    });

    // Add to spatial grid
    const cellKey = `${cellX},${cellZ}`;
    if (!this.spatialGrid.has(cellKey)) {
      this.spatialGrid.set(cellKey, []);
    }
    this.spatialGrid.get(cellKey).push(nodeId);

    return nodeId;
  }

  /**
   * Add bidirectional edge between nodes
   * @param {string} nodeA
   * @param {string} nodeB
   * @param {number} distance
   * @param {string} roadId
   */
  addEdge(nodeA, nodeB, distance, roadId) {
    const a = this.nodes.get(nodeA);
    const b = this.nodes.get(nodeB);

    // Check if edge already exists
    if (a.edges.some(e => e.nodeId === nodeB)) return;

    a.edges.push({ nodeId: nodeB, distance, roadId });
    b.edges.push({ nodeId: nodeA, distance, roadId });
  }

  /**
   * Merge nodes that are close together (intersections)
   * @param {number} threshold
   */
  mergeIntersections(threshold) {
    // For simplicity, this is handled in findOrCreateNode
    // More sophisticated merging could be done here
  }

  /**
   * Find nearest node to a position
   * @param {number} x
   * @param {number} z
   * @returns {{nodeId: string, distance: number}|null}
   */
  findNearestNode(x, z) {
    let nearest = null;
    let nearestDist = Infinity;

    // Check nearby grid cells in expanding search
    const cellX = Math.floor(x / this.gridCellSize);
    const cellZ = Math.floor(z / this.gridCellSize);

    // Search in expanding radius
    for (let radius = 0; radius <= 20; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (radius > 0 && Math.abs(dx) < radius && Math.abs(dz) < radius) continue;

          const cellKey = `${cellX + dx},${cellZ + dz}`;
          const cellNodes = this.spatialGrid.get(cellKey);
          if (!cellNodes) continue;

          for (const nodeId of cellNodes) {
            const node = this.nodes.get(nodeId);
            const dist = Math.sqrt((node.x - x) ** 2 + (node.z - z) ** 2);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = { nodeId, distance: dist };
            }
          }
        }
      }

      // If we found something within reasonable distance, stop
      if (nearest && nearestDist < this.gridCellSize * (radius + 1)) {
        break;
      }
    }

    return nearest;
  }

  /**
   * Find path between two world positions using A*
   * @param {number} startX
   * @param {number} startZ
   * @param {number} endX
   * @param {number} endZ
   * @returns {Array|null} Array of [x, y, z] points or null if no path
   */
  findPath(startX, startZ, endX, endZ) {
    // Find nearest nodes to start and end positions
    const startNode = this.findNearestNode(startX, startZ);
    const endNode = this.findNearestNode(endX, endZ);

    if (!startNode || !endNode) {
      console.warn('Pathfinder: Could not find nodes near start or end position');
      return null;
    }

    // A* algorithm
    const openSet = new Set([startNode.nodeId]);
    const cameFrom = new Map();
    const gScore = new Map(); // Cost from start to node
    const fScore = new Map(); // gScore + heuristic

    gScore.set(startNode.nodeId, 0);
    fScore.set(startNode.nodeId, this.heuristic(startNode.nodeId, endNode.nodeId));

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current = null;
      let lowestF = Infinity;
      for (const nodeId of openSet) {
        const f = fScore.get(nodeId) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = nodeId;
        }
      }

      if (current === endNode.nodeId) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, current, startX, startZ, endX, endZ);
      }

      openSet.delete(current);
      const currentNode = this.nodes.get(current);

      for (const edge of currentNode.edges) {
        const tentativeG = (gScore.get(current) ?? Infinity) + edge.distance;

        if (tentativeG < (gScore.get(edge.nodeId) ?? Infinity)) {
          cameFrom.set(edge.nodeId, current);
          gScore.set(edge.nodeId, tentativeG);
          fScore.set(edge.nodeId, tentativeG + this.heuristic(edge.nodeId, endNode.nodeId));
          openSet.add(edge.nodeId);
        }
      }
    }

    // No path found
    console.warn('Pathfinder: No path found');
    return null;
  }

  /**
   * Heuristic function (Euclidean distance)
   * @param {string} nodeA
   * @param {string} nodeB
   * @returns {number}
   */
  heuristic(nodeA, nodeB) {
    const a = this.nodes.get(nodeA);
    const b = this.nodes.get(nodeB);
    return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }

  /**
   * Reconstruct path from A* result
   * @param {Map} cameFrom
   * @param {string} current
   * @param {number} startX
   * @param {number} startZ
   * @param {number} endX
   * @param {number} endZ
   * @returns {Array} Array of [x, z] points
   */
  reconstructPath(cameFrom, current, startX, startZ, endX, endZ) {
    const path = [];
    const nodeSequence = [current];

    // Build node sequence
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      nodeSequence.unshift(current);
    }

    // Add start position
    path.push([startX, endZ]);

    // Add all node positions
    for (const nodeId of nodeSequence) {
      const node = this.nodes.get(nodeId);
      path.push([node.x, node.z]);
    }

    // Add end position
    path.push([endX, endZ]);

    // Simplify path (remove collinear points)
    return this.simplifyPath(path);
  }

  /**
   * Simplify path by removing unnecessary intermediate points
   * @param {Array} path
   * @returns {Array}
   */
  simplifyPath(path) {
    if (path.length <= 2) return path;

    const simplified = [path[0]];
    const tolerance = 5; // 5 meter tolerance

    for (let i = 1; i < path.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = path[i];
      const next = path[i + 1];

      // Check if point deviates significantly from line between prev and next
      const deviation = this.pointToLineDistance(
        curr[0], curr[1],
        prev[0], prev[1],
        next[0], next[1]
      );

      if (deviation > tolerance) {
        simplified.push(curr);
      }
    }

    simplified.push(path[path.length - 1]);
    return simplified;
  }

  /**
   * Calculate distance from point to line segment
   * @param {number} px - Point X
   * @param {number} pz - Point Z
   * @param {number} x1 - Line start X
   * @param {number} z1 - Line start Z
   * @param {number} x2 - Line end X
   * @param {number} z2 - Line end Z
   * @returns {number}
   */
  pointToLineDistance(px, pz, x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);

    if (len === 0) {
      return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2);
    }

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (len * len)));
    const nearestX = x1 + t * dx;
    const nearestZ = z1 + t * dz;

    return Math.sqrt((px - nearestX) ** 2 + (pz - nearestZ) ** 2);
  }

  /**
   * Get total path distance
   * @param {Array} path - Array of [x, z] points
   * @returns {number} Distance in meters
   */
  getPathDistance(path) {
    if (!path || path.length < 2) return 0;

    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      const [x1, z1] = path[i - 1];
      const [x2, z2] = path[i];
      distance += Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    }
    return distance;
  }

  /**
   * Check if pathfinder is ready
   * @returns {boolean}
   */
  isReady() {
    return this.nodes.size > 0;
  }

  /**
   * Get graph statistics
   * @returns {Object}
   */
  getStats() {
    return {
      nodes: this.nodeCount,
      edges: this.edgeCount,
      gridCells: this.spatialGrid.size,
    };
  }
}

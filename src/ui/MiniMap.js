/**
 * MiniMap - A 2D overhead map showing roads, POIs, and player position
 *
 * Renders to a canvas element positioned in the HUD.
 */

export class MiniMap {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.element = null;
    this.canvas = null;
    this.ctx = null;

    // Map data (set from RoadGenerator)
    this.roads = [];
    this.pois = [];
    this.bounds = null;

    // Player state
    this.playerX = 0;
    this.playerZ = 0;
    this.playerRotation = 0; // radians

    // Active route (for navigation)
    this.routePoints = null;
    this.destination = null;

    // Map settings
    this.size = 180; // Canvas size in pixels
    this.zoom = 2000; // Meters visible on map (radius from player)
    this.zoomLevels = [500, 1000, 2000, 5000, 10000];
    this.zoomIndex = 2;

    // Colors
    this.colors = {
      background: 'rgba(20, 30, 20, 0.85)',
      road: {
        motorway: '#666666',
        trunk: '#555555',
        primary: '#444444',
        secondary: '#333333',
        tertiary: '#2a2a2a',
        default: '#333333',
      },
      player: '#4CAF50',
      city: '#ff6600',
      town: '#ffaa00',
      fuel: '#00cc00',
      route: '#3399ff',
      destination: '#ff3333',
      compass: 'rgba(255, 255, 255, 0.5)',
    };
  }

  /**
   * Initialize the mini-map
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerOverlay('minimap', this.element);
    this.addStyles();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('minimap-styles')) return;

    const style = document.createElement('style');
    style.id = 'minimap-styles';
    style.textContent = `
      .minimap {
        position: absolute;
        bottom: 30px;
        right: 190px;
        width: 180px;
        height: 180px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
      }
      .minimap__canvas {
        width: 100%;
        height: 100%;
      }
      .minimap__compass {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }
      .minimap__zoom {
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the mini-map element
   * @returns {HTMLElement}
   */
  createElement() {
    const container = document.createElement('div');
    container.className = 'minimap';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap__canvas';
    this.canvas.width = this.size * 2; // Higher resolution for sharper rendering
    this.canvas.height = this.size * 2;
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Compass indicator
    const compass = document.createElement('div');
    compass.className = 'minimap__compass';
    compass.textContent = 'N';
    container.appendChild(compass);

    // Zoom indicator
    this.zoomLabel = document.createElement('div');
    this.zoomLabel.className = 'minimap__zoom';
    this.updateZoomLabel();
    container.appendChild(this.zoomLabel);

    // Click to zoom
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleZoom();
    });

    return container;
  }

  /**
   * Update zoom label text
   */
  updateZoomLabel() {
    if (this.zoomLabel) {
      const km = this.zoom / 1000;
      this.zoomLabel.textContent = km >= 1 ? `${km}km` : `${this.zoom}m`;
    }
  }

  /**
   * Cycle through zoom levels
   */
  cycleZoom() {
    this.zoomIndex = (this.zoomIndex + 1) % this.zoomLevels.length;
    this.zoom = this.zoomLevels[this.zoomIndex];
    this.updateZoomLabel();
    this.render();
  }

  /**
   * Set road data from RoadGenerator
   * @param {Array} roads - Array of road objects
   * @param {Object} bounds - Map bounds {minX, maxX, minZ, maxZ}
   */
  setRoadData(roads, bounds) {
    this.roads = roads || [];
    this.bounds = bounds;
  }

  /**
   * Set POI data
   * @param {Array} pois - Array of POI objects
   */
  setPOIData(pois) {
    this.pois = pois || [];
  }

  /**
   * Update player position and rotation
   * @param {number} x - World X position
   * @param {number} z - World Z position
   * @param {number} rotation - Y rotation in radians
   */
  setPlayerPosition(x, z, rotation) {
    this.playerX = x;
    this.playerZ = z;
    this.playerRotation = rotation;
  }

  /**
   * Set navigation route
   * @param {Array} points - Array of [x, y, z] or [x, z] points forming the route
   * @param {Object} dest - Destination POI
   */
  setRoute(points, dest) {
    this.routePoints = points;
    this.destination = dest;
  }

  /**
   * Clear navigation route
   */
  clearRoute() {
    this.routePoints = null;
    this.destination = null;
  }

  /**
   * Convert world coordinates to canvas coordinates
   * @param {number} worldX
   * @param {number} worldZ
   * @returns {{x: number, y: number}}
   */
  worldToCanvas(worldX, worldZ) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const scale = this.canvas.width / (this.zoom * 2);

    // Offset from player position
    const dx = worldX - this.playerX;
    const dz = worldZ - this.playerZ;

    // Rotate to keep north up (player rotation affects the map)
    // Actually, keep map north-up, player rotates
    const canvasX = centerX + dx * scale;
    const canvasY = centerY + dz * scale;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Check if a point is visible on the map
   * @param {number} x - Canvas X
   * @param {number} y - Canvas Y
   * @returns {boolean}
   */
  isVisible(x, y) {
    const margin = 50;
    return x >= -margin && x <= this.canvas.width + margin &&
           y >= -margin && y <= this.canvas.height + margin;
  }

  /**
   * Render the mini-map
   */
  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    // Clear canvas
    ctx.fillStyle = this.colors.background;
    ctx.fillRect(0, 0, w, h);

    // Apply circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw roads
    this.renderRoads(ctx);

    // Draw route if active
    if (this.routePoints) {
      this.renderRoute(ctx);
    }

    // Draw POIs
    this.renderPOIs(ctx);

    // Draw destination marker
    if (this.destination) {
      this.renderDestination(ctx);
    }

    // Draw player
    this.renderPlayer(ctx, centerX, centerY);

    ctx.restore();

    // Draw compass directions
    this.renderCompass(ctx, centerX, centerY, w / 2 - 15);
  }

  /**
   * Render roads on the map
   * Road points are [x, y, z] format - we use x and z for 2D map
   * @param {CanvasRenderingContext2D} ctx
   */
  renderRoads(ctx) {
    for (const road of this.roads) {
      if (!road.points || road.points.length < 2) continue;

      // Check if any part of the road is visible
      let anyVisible = false;
      for (const point of road.points) {
        const x = point[0];
        const z = point[2]; // z is at index 2 in [x, y, z] format
        const dist = Math.sqrt(
          Math.pow(x - this.playerX, 2) + Math.pow(z - this.playerZ, 2)
        );
        if (dist < this.zoom * 1.5) {
          anyVisible = true;
          break;
        }
      }
      if (!anyVisible) continue;

      // Get road color and width
      const color = this.colors.road[road.type] || this.colors.road.default;
      const lineWidth = this.getRoadLineWidth(road.type);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      let started = false;

      for (const point of road.points) {
        const x = point[0];
        const z = point[2]; // z is at index 2 in [x, y, z] format
        const pos = this.worldToCanvas(x, z);
        if (!started) {
          ctx.moveTo(pos.x, pos.y);
          started = true;
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }

      ctx.stroke();
    }
  }

  /**
   * Get line width for road type
   * @param {string} type
   * @returns {number}
   */
  getRoadLineWidth(type) {
    const baseScale = this.canvas.width / (this.zoom * 2);
    const widths = {
      motorway: 14,
      trunk: 12,
      primary: 10,
      secondary: 8,
      tertiary: 6,
      default: 6,
    };
    const meters = widths[type] || widths.default;
    return Math.max(2, meters * baseScale * 0.8);
  }

  /**
   * Render navigation route
   * Handles both [x, z] and [x, y, z] point formats
   * @param {CanvasRenderingContext2D} ctx
   */
  renderRoute(ctx) {
    if (!this.routePoints || this.routePoints.length < 2) return;

    ctx.strokeStyle = this.colors.route;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);

    ctx.beginPath();
    let started = false;

    for (const point of this.routePoints) {
      // Handle both [x, z] and [x, y, z] formats
      const x = point[0];
      const z = point.length === 3 ? point[2] : point[1];
      const pos = this.worldToCanvas(x, z);
      if (!started) {
        ctx.moveTo(pos.x, pos.y);
        started = true;
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Render POI markers
   * @param {CanvasRenderingContext2D} ctx
   */
  renderPOIs(ctx) {
    for (const poi of this.pois) {
      const pos = this.worldToCanvas(poi.x, poi.z);
      if (!this.isVisible(pos.x, pos.y)) continue;

      let color;
      let radius;

      switch (poi.type) {
        case 'city':
          color = this.colors.city;
          radius = 8;
          break;
        case 'town':
          color = this.colors.town;
          radius = 6;
          break;
        case 'fuel':
          color = this.colors.fuel;
          radius = 4;
          break;
        default:
          color = '#ffffff';
          radius = 4;
      }

      // Draw POI marker
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw POI name for cities/towns at higher zoom
      if ((poi.type === 'city' || poi.type === 'town') && this.zoom <= 5000 && poi.name) {
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(poi.name, pos.x, pos.y - radius - 4);
      }
    }
  }

  /**
   * Render destination marker
   * @param {CanvasRenderingContext2D} ctx
   */
  renderDestination(ctx) {
    const pos = this.worldToCanvas(this.destination.x, this.destination.z);

    // Pulsing effect
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;

    ctx.fillStyle = this.colors.destination;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Inner marker
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render player marker (arrow pointing in direction of travel)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @param {number} centerY
   */
  renderPlayer(ctx, centerX, centerY) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.playerRotation);

    // Draw arrow
    ctx.fillStyle = this.colors.player;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -12); // Tip pointing up (forward)
    ctx.lineTo(-8, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(8, 10);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render compass indicators
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} radius
   */
  renderCompass(ctx, cx, cy, radius) {
    ctx.fillStyle = this.colors.compass;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // N is already shown by CSS, add E, S, W
    ctx.fillText('E', cx + radius - 5, cy);
    ctx.fillText('S', cx, cy + radius - 5);
    ctx.fillText('W', cx - radius + 5, cy);
  }

  /**
   * Show the mini-map
   */
  show() {
    this.uiManager.showOverlay('minimap');
  }

  /**
   * Hide the mini-map
   */
  hide() {
    this.uiManager.hideOverlay('minimap');
  }
}

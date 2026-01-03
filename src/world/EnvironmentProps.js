/**
 * EnvironmentProps - Generates and places environmental objects along roads
 *
 * Uses GLB models from the toy-car-kit and city-kit with instancing for performance.
 * Creates trees, buildings, and props to make the world feel alive.
 */

import * as BABYLON from '@babylonjs/core';

export class EnvironmentProps {
  constructor(scene, shadowGenerator) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;

    // Loaded model templates (for instancing)
    this.templates = {};

    // Generated instances
    this.instances = [];

    // Generation settings
    this.treeSpacing = 15; // meters between trees
    this.treeDensity = 0.55; // probability of placing tree at valid spot
    this.buildingSpacing = 60; // meters between buildings
    this.buildingDensity = 0.4; // probability of placing building

    // Distance from road center
    this.treeMinDist = 10;
    this.treeMaxDist = 30;
    this.buildingMinDist = 18;
    this.buildingMaxDist = 45;

    // Model scales
    this.treeScale = 2.5;
    this.buildingScale = 2.0;
  }

  /**
   * Load model templates for instancing
   */
  async loadModels() {
    console.log('Loading environment models...');

    const modelPaths = {
      // Trees
      tree: '/models/environment/tree.glb',
      treePine: '/models/environment/tree-pine.glb',
      // Buildings
      buildingA: '/models/environment/building-a.glb',
      buildingB: '/models/environment/building-b.glb',
      buildingC: '/models/environment/building-c.glb',
      buildingD: '/models/environment/building-d.glb',
      buildingE: '/models/environment/building-e.glb',
      buildingWide: '/models/environment/building-wide-a.glb',
      // Props
      cone: '/models/environment/item-cone.glb',
    };

    for (const [name, path] of Object.entries(modelPaths)) {
      try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', path, this.scene);
        if (result.meshes.length > 0) {
          // Find the first mesh with geometry for instancing
          let templateMesh = null;
          for (const mesh of result.meshes) {
            if (mesh.geometry) {
              templateMesh = mesh;
              break;
            }
          }

          if (templateMesh) {
            templateMesh.isVisible = false;
            templateMesh.setEnabled(false);
            templateMesh.name = `template_${name}`;
            this.templates[name] = templateMesh;
            console.log(`Loaded template: ${name}`);

            // Hide other meshes from this model
            result.meshes.forEach(m => {
              if (m !== templateMesh) {
                m.isVisible = false;
                m.setEnabled(false);
              }
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to load model ${name}:`, e.message);
      }
    }

    console.log(`Loaded ${Object.keys(this.templates).length} environment model templates`);
  }

  /**
   * Generate all environment props along roads
   * @param {Array} roads - Road data array
   */
  async generate(roads) {
    if (!roads || roads.length === 0) {
      console.warn('No roads provided for environment generation');
      return;
    }

    // Load models first
    await this.loadModels();

    console.log('Generating environment props...');

    let treeCount = 0;
    let buildingCount = 0;

    // Use seeded random for consistent generation
    const seededRandom = this.createSeededRandom(42);

    for (const road of roads) {
      if (!road.points || road.points.length < 2) continue;

      // Generate trees along all roads
      treeCount += this.generateTreesAlongRoad(road, seededRandom);

      // Generate buildings for major roads
      if (road.type === 'primary' || road.type === 'trunk' || road.type === 'secondary' || road.type === 'motorway') {
        buildingCount += this.generateBuildingsAlongRoad(road, seededRandom);
      }
    }

    console.log(`Environment generated: ${treeCount} trees, ${buildingCount} buildings`);
  }

  /**
   * Create a seeded random number generator
   */
  createSeededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Generate trees along a road using GLB instances
   */
  generateTreesAlongRoad(road, random) {
    let count = 0;
    const points = road.points;

    // Get available tree templates
    const treeTemplates = [];
    if (this.templates.tree) treeTemplates.push(this.templates.tree);
    if (this.templates.treePine) treeTemplates.push(this.templates.treePine);

    if (treeTemplates.length === 0) {
      return 0;
    }

    for (let i = 0; i < points.length - 1; i += 2) {
      const p = points[i];
      const pNext = points[Math.min(i + 1, points.length - 1)];

      // Get road direction and perpendicular
      const dx = pNext[0] - p[0];
      const dz = pNext[2] - p[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.1) continue;

      const dirX = dx / len;
      const dirZ = dz / len;
      const perpX = -dirZ;
      const perpZ = dirX;

      // Place trees on both sides
      for (let side = -1; side <= 1; side += 2) {
        if (random() > this.treeDensity) continue;

        const dist = this.treeMinDist + random() * (this.treeMaxDist - this.treeMinDist);
        const offsetAlongRoad = (random() - 0.5) * this.treeSpacing;

        const x = p[0] + perpX * dist * side + dirX * offsetAlongRoad;
        const y = (p[1] || 0);
        const z = p[2] + perpZ * dist * side + dirZ * offsetAlongRoad;

        // Choose random tree template
        const template = treeTemplates[Math.floor(random() * treeTemplates.length)];
        this.createInstance(template, x, y, z, random, this.treeScale);
        count++;
      }
    }

    return count;
  }

  /**
   * Generate buildings along a road using GLB instances
   */
  generateBuildingsAlongRoad(road, random) {
    let count = 0;
    const points = road.points;

    // Get available building templates
    const buildingTemplates = [];
    ['buildingA', 'buildingB', 'buildingC', 'buildingD', 'buildingE', 'buildingWide'].forEach(name => {
      if (this.templates[name]) buildingTemplates.push(this.templates[name]);
    });

    if (buildingTemplates.length === 0) {
      return 0;
    }

    for (let i = 0; i < points.length - 1; i += 6) {
      const p = points[i];
      const pNext = points[Math.min(i + 1, points.length - 1)];

      if (random() > this.buildingDensity) continue;

      // Get road direction and perpendicular
      const dx = pNext[0] - p[0];
      const dz = pNext[2] - p[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.1) continue;

      const dirX = dx / len;
      const dirZ = dz / len;
      const perpX = -dirZ;
      const perpZ = dirX;

      // Place building on one side (or both for major roads)
      const sides = (road.type === 'primary' || road.type === 'trunk') ? [-1, 1] : [random() > 0.5 ? 1 : -1];

      for (const side of sides) {
        if (random() > 0.7) continue; // Skip some for variety

        const dist = this.buildingMinDist + random() * (this.buildingMaxDist - this.buildingMinDist);
        const offsetAlongRoad = (random() - 0.5) * 10;

        const x = p[0] + perpX * dist * side + dirX * offsetAlongRoad;
        const y = (p[1] || 0);
        const z = p[2] + perpZ * dist * side + dirZ * offsetAlongRoad;

        // Calculate rotation to face road
        const rotY = Math.atan2(-perpX * side, -perpZ * side);

        // Choose random building template
        const template = buildingTemplates[Math.floor(random() * buildingTemplates.length)];

        // Random scale variation
        const scale = this.buildingScale * (0.8 + random() * 0.5);

        this.createBuildingInstance(template, x, y, z, rotY, scale);
        count++;
      }
    }

    return count;
  }

  /**
   * Create an instance from template (for trees)
   */
  createInstance(template, x, y, z, random, baseScale) {
    if (!template || !template.createInstance) return;

    const instance = template.createInstance(`env_${this.instances.length}`);
    instance.isVisible = true;
    instance.setEnabled(true);

    // Position
    instance.position = new BABYLON.Vector3(x, y, z);

    // Random rotation
    instance.rotation = new BABYLON.Vector3(0, random() * Math.PI * 2, 0);

    // Random scale variation
    const scale = baseScale * (0.7 + random() * 0.6);
    instance.scaling = new BABYLON.Vector3(scale, scale, scale);

    // Shadows
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(instance);
    }
    instance.receiveShadows = true;

    this.instances.push(instance);
  }

  /**
   * Create a building instance with specific rotation
   */
  createBuildingInstance(template, x, y, z, rotY, scale) {
    if (!template || !template.createInstance) return;

    const instance = template.createInstance(`building_${this.instances.length}`);
    instance.isVisible = true;
    instance.setEnabled(true);

    // Position
    instance.position = new BABYLON.Vector3(x, y, z);

    // Face the road
    instance.rotation = new BABYLON.Vector3(0, rotY, 0);

    // Scale
    instance.scaling = new BABYLON.Vector3(scale, scale, scale);

    // Shadows
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(instance);
    }
    instance.receiveShadows = true;

    this.instances.push(instance);
  }

  /**
   * Dispose of all generated meshes
   */
  dispose() {
    // Dispose instances
    this.instances.forEach(instance => {
      instance.dispose();
    });
    this.instances = [];

    // Dispose template meshes
    Object.values(this.templates).forEach(template => {
      template.dispose();
    });
    this.templates = {};
  }
}

#!/usr/bin/env node
/**
 * OSM Data Processing Tool
 *
 * Converts downloaded OSM data into game-ready road network format.
 *
 * Usage: npm run osm:process
 *        npm run osm:process -- --input=data/raw/test.osm
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  inputDir: path.join(__dirname, '..', 'data', 'raw'),
  outputDir: path.join(__dirname, '..', 'data', 'processed'),
  origin: { lat: 7.5, lon: 124.5 },
  metersPerDegreeLat: 111320,
  metersPerDegreeLon: 109540,
  roadWidths: {
    motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 6, default: 6,
  },
  speedLimits: {
    motorway: 100, trunk: 80, primary: 60, secondary: 50, tertiary: 40, default: 40,
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { input: null, help: false };
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--input=')) options.input = arg.split('=')[1];
  }
  return options;
}

function findLatestOsmFile() {
  if (!fs.existsSync(CONFIG.inputDir)) return null;
  const files = fs.readdirSync(CONFIG.inputDir)
    .filter(f => f.endsWith('.osm'))
    .map(f => ({ path: path.join(CONFIG.inputDir, f), mtime: fs.statSync(path.join(CONFIG.inputDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? files[0].path : null;
}

function parseOSM(xml) {
  const nodes = new Map();
  const ways = [];
  const pois = [];
  const elevationPoints = []; // Nodes with elevation data

  // Parse nodes with regex
  const nodePattern = /<node id="(-?\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*(?:\/>|>([\s\S]*?)<\/node>)/g;
  let m;
  while ((m = nodePattern.exec(xml)) !== null) {
    const id = m[1], lat = parseFloat(m[2]), lon = parseFloat(m[3]), content = m[4] || '';

    // Check for elevation tag
    const eleMatch = content.match(/<tag k="ele" v="([^"]+)"/);
    const elevation = eleMatch ? parseFloat(eleMatch[1]) : null;

    nodes.set(id, { lat, lon, ele: elevation });

    // Store elevation points for interpolation
    if (elevation !== null) {
      elevationPoints.push({ lat, lon, ele: elevation });
    }

    const nameMatch = content.match(/<tag k="name" v="([^"]+)"/);
    const placeMatch = content.match(/<tag k="place" v="([^"]+)"/);
    const amenityMatch = content.match(/<tag k="amenity" v="([^"]+)"/);
    if (placeMatch) pois.push({ id, lat, lon, ele: elevation, type: placeMatch[1], name: nameMatch ? nameMatch[1] : null });
    else if (amenityMatch && amenityMatch[1] === 'fuel') pois.push({ id, lat, lon, ele: elevation, type: 'fuel', name: nameMatch ? nameMatch[1] : 'Gas Station' });
  }

  // Parse ways
  const wayPattern = /<way id="(-?\d+)"[^>]*>([\s\S]*?)<\/way>/g;
  while ((m = wayPattern.exec(xml)) !== null) {
    const id = m[1], content = m[2];
    const nodeRefs = [];
    const ndPattern = /<nd ref="(-?\d+)"/g;
    let nd;
    while ((nd = ndPattern.exec(content)) !== null) nodeRefs.push(nd[1]);
    const tags = {};
    const tagPattern = /<tag k="([^"]+)" v="([^"]+)"/g;
    let t;
    while ((t = tagPattern.exec(content)) !== null) tags[t[1]] = t[2];
    if (tags.highway) ways.push({ id, nodeRefs, tags });
  }

  console.log(`  Elevation points found: ${elevationPoints.length}`);
  return { nodes, ways, pois, elevationPoints };
}

function toGameCoords(lat, lon, ele = null) {
  return {
    x: (lon - CONFIG.origin.lon) * CONFIG.metersPerDegreeLon,
    y: ele !== null ? ele : 0, // Use elevation if available, default to 0
    z: -(lat - CONFIG.origin.lat) * CONFIG.metersPerDegreeLat,
  };
}

/**
 * Interpolate elevation for a point using nearby known elevation points
 * Uses inverse distance weighting (IDW)
 */
function interpolateElevation(lat, lon, elevationPoints, maxDistance = 0.1) {
  if (elevationPoints.length === 0) return 0;

  let weightSum = 0;
  let valueSum = 0;
  let foundNearby = false;

  for (const ep of elevationPoints) {
    const dLat = lat - ep.lat;
    const dLon = lon - ep.lon;
    const distance = Math.sqrt(dLat * dLat + dLon * dLon);

    if (distance < 0.0001) {
      // Very close, use this value directly
      return ep.ele;
    }

    if (distance < maxDistance) {
      foundNearby = true;
      const weight = 1 / (distance * distance); // Inverse distance squared
      weightSum += weight;
      valueSum += weight * ep.ele;
    }
  }

  if (foundNearby && weightSum > 0) {
    return valueSum / weightSum;
  }

  return 0; // No nearby elevation data, default to sea level
}

function processData(data) {
  const roads = [];
  let totalPoints = 0;
  let pointsWithElevation = 0;

  for (const way of data.ways) {
    const points = [];
    for (const ref of way.nodeRefs) {
      const node = data.nodes.get(ref);
      if (node) {
        let elevation = node.ele;

        // If no direct elevation, try to interpolate from nearby points
        if (elevation === null && data.elevationPoints.length > 0) {
          elevation = interpolateElevation(node.lat, node.lon, data.elevationPoints);
        }

        if (elevation !== null && elevation !== 0) {
          pointsWithElevation++;
        }

        const c = toGameCoords(node.lat, node.lon, elevation);
        // Store as [x, y, z] - y is elevation
        points.push([c.x, c.y, c.z]);
      }
    }
    if (points.length >= 2) {
      const t = way.tags.highway;
      roads.push({
        id: way.id,
        type: t,
        name: way.tags.name || way.tags.ref || null,
        width: CONFIG.roadWidths[t] || CONFIG.roadWidths.default,
        speedLimit: parseInt(way.tags.maxspeed) || CONFIG.speedLimits[t] || CONFIG.speedLimits.default,
        lanes: parseInt(way.tags.lanes) || 2,
        surface: way.tags.surface || 'asphalt',
        points, // Now [x, y, z] format
      });
      totalPoints += points.length;
    }
  }

  // Process POIs with elevation
  const processedPois = data.pois.map(p => {
    let elevation = p.ele;
    if (elevation === null && data.elevationPoints.length > 0) {
      elevation = interpolateElevation(p.lat, p.lon, data.elevationPoints);
    }
    const coords = toGameCoords(p.lat, p.lon, elevation);
    return { id: p.id, type: p.type, name: p.name, x: coords.x, y: coords.y, z: coords.z };
  });

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const r of roads) {
    for (const [x, y, z] of r.points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  console.log(`  Points with elevation data: ${pointsWithElevation} / ${totalPoints}`);
  console.log(`  Elevation range: ${minY.toFixed(1)}m to ${maxY.toFixed(1)}m`);

  return {
    meta: {
      origin: CONFIG.origin,
      bounds: { minX, maxX, minY, maxY, minZ, maxZ },
      totalRoads: roads.length,
      totalPoints,
      pointsWithElevation,
      totalPois: processedPois.length,
    },
    roads,
    pois: processedPois,
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Mindanao Truck Simulator - OSM Processing Tool');
  console.log('='.repeat(60));
  const options = parseArgs();
  if (options.help) { console.log('\nUsage: npm run osm:process [--input=file.osm]\n'); process.exit(0); }
  let inputFile = options.input || findLatestOsmFile();
  if (!inputFile || !fs.existsSync(inputFile)) { console.error('No .osm file found. Run npm run osm:download first.'); process.exit(1); }
  console.log('\nInput:', inputFile);
  const xml = fs.readFileSync(inputFile, 'utf8');
  console.log('Parsing OSM data...');
  const parsed = parseOSM(xml);
  console.log('  Nodes:', parsed.nodes.size, '| Ways:', parsed.ways.length, '| POIs:', parsed.pois.length);
  console.log('Converting to game format...');
  const processed = processData(parsed);
  console.log('  Roads:', processed.meta.totalRoads, '| Points:', processed.meta.totalPoints);
  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.writeFileSync(path.join(CONFIG.outputDir, 'roads.json'), JSON.stringify({ meta: processed.meta, roads: processed.roads }, null, 2));
  fs.writeFileSync(path.join(CONFIG.outputDir, 'pois.json'), JSON.stringify({ origin: processed.meta.origin, pois: processed.pois }, null, 2));
  console.log('\nSaved to:', CONFIG.outputDir);
  console.log('Processing complete!');
}

main().catch(console.error);

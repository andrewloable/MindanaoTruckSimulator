#!/usr/bin/env node
/**
 * OSM Data Download Tool
 *
 * Downloads OpenStreetMaps road data for Mindanao region using Overpass API.
 *
 * Usage: npm run osm:download
 *        npm run osm:download -- --region=davao
 *        npm run osm:download -- --help
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Overpass API endpoints (multiple for fallback)
  overpassEndpoints: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ],

  // Output directory
  outputDir: path.join(__dirname, '..', 'data', 'raw'),

  // Predefined regions - All Mindanao administrative regions
  regions: {
    // Full Mindanao island
    mindanao: {
      name: 'Full Mindanao Island',
      bbox: { south: 5.5, north: 9.8, west: 121.9, east: 126.6 },
    },

    // Region IX - Zamboanga Peninsula
    zamboanga: {
      name: 'Zamboanga Peninsula (Region IX)',
      bbox: { south: 6.5, north: 8.2, west: 121.9, east: 123.5 },
    },

    // Region X - Northern Mindanao (includes CDO, Iligan)
    northern: {
      name: 'Northern Mindanao (Region X)',
      bbox: { south: 7.5, north: 9.0, west: 123.5, east: 125.5 },
    },

    // Region XI - Davao Region (includes Davao City)
    davao: {
      name: 'Davao Region (Region XI)',
      bbox: { south: 5.5, north: 7.8, west: 125.0, east: 126.6 },
    },

    // Region XII - SOCCSKSARGEN (includes General Santos, Koronadal)
    soccsksargen: {
      name: 'SOCCSKSARGEN (Region XII)',
      bbox: { south: 5.8, north: 7.5, west: 124.0, east: 125.5 },
    },

    // Region XIII - Caraga (includes Butuan, Surigao)
    caraga: {
      name: 'Caraga (Region XIII)',
      bbox: { south: 7.5, north: 9.8, west: 125.2, east: 126.6 },
    },

    // BARMM - Bangsamoro Autonomous Region
    barmm: {
      name: 'Bangsamoro (BARMM)',
      bbox: { south: 5.5, north: 8.0, west: 119.5, east: 124.5 },
    },

    // City-specific regions for quick testing
    cdo: {
      name: 'Cagayan de Oro City',
      bbox: { south: 8.2, north: 8.6, west: 124.4, east: 124.8 },
    },
    davaocity: {
      name: 'Davao City',
      bbox: { south: 6.9, north: 7.2, west: 125.4, east: 125.7 },
    },
    gensan: {
      name: 'General Santos City',
      bbox: { south: 5.9, north: 6.2, west: 125.0, east: 125.3 },
    },
    zamcity: {
      name: 'Zamboanga City',
      bbox: { south: 6.8, north: 7.1, west: 121.9, east: 122.2 },
    },

    // Small test area for development
    test: {
      name: 'Test Area (small)',
      bbox: { south: 7.0, north: 7.2, west: 125.5, east: 125.7 },
    },
  },

  // Road types to download
  roadTypes: [
    'motorway',
    'trunk',
    'primary',
    'secondary',
    'tertiary',
  ],

  // Request timeout (5 minutes for large areas)
  timeout: 300000,
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    region: 'test', // Default to small test region
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--region=')) {
      options.region = arg.split('=')[1];
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
OSM Data Download Tool for Mindanao Truck Simulator

Usage:
  npm run osm:download                    Download test region (small)
  npm run osm:download -- --region=davao  Download Davao region
  npm run osm:download -- --region=mindanao  Download full Mindanao
  npm run osm:download -- --help          Show this help

Available regions:
  Full Island:
    mindanao     - Full Mindanao island (large, may take time)

  Administrative Regions:
    zamboanga    - Zamboanga Peninsula (Region IX)
    northern     - Northern Mindanao (Region X) - includes Cagayan de Oro
    davao        - Davao Region (Region XI) - includes Davao City
    soccsksargen - SOCCSKSARGEN (Region XII) - includes General Santos
    caraga       - Caraga (Region XIII) - includes Butuan, Surigao
    barmm        - Bangsamoro (BARMM) - includes Cotabato City

  Cities (for quick testing):
    cdo          - Cagayan de Oro City area
    davaocity    - Davao City area
    gensan       - General Santos City area
    zamcity      - Zamboanga City area
    test         - Small test area (~10km x 20km)

Output:
  data/raw/<region>.osm
`);
}

/**
 * Build Overpass query for road data
 * @param {Object} bbox - Bounding box { south, north, west, east }
 * @param {string[]} roadTypes - Array of highway types
 * @returns {string} Overpass QL query
 */
function buildQuery(bbox, roadTypes) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const highwayTypes = roadTypes.join('|');

  return `
[out:xml][timeout:300];
(
  // Roads with all tags including elevation
  way["highway"~"^(${highwayTypes})$"](${bboxStr});

  // Cities and towns
  node["place"~"^(city|town)$"](${bboxStr});

  // Fuel stations
  node["amenity"="fuel"](${bboxStr});
  way["amenity"="fuel"](${bboxStr});

  // Elevation points (peaks, passes, viewpoints with ele tag)
  node["ele"](${bboxStr});
);
out body;
>;
out skel qt;
`.trim();
}

/**
 * Download data from Overpass API with retry logic
 * @param {string} query - Overpass QL query
 * @returns {Promise<string>} OSM XML data
 */
async function downloadFromOverpass(query) {
  let lastError;

  for (const endpoint of CONFIG.overpassEndpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();

      // Check for Overpass error responses
      if (data.includes('<remark>')) {
        const remarkMatch = data.match(/<remark>(.*?)<\/remark>/s);
        if (remarkMatch) {
          throw new Error(`Overpass API error: ${remarkMatch[1]}`);
        }
      }

      return data;
    } catch (error) {
      console.log(`  Failed: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(`All endpoints failed. Last error: ${lastError.message}`);
}

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Count elements in OSM data
 * @param {string} data - OSM XML data
 * @returns {Object} Counts of different element types
 */
function countElements(data) {
  const counts = {
    nodes: (data.match(/<node /g) || []).length,
    ways: (data.match(/<way /g) || []).length,
    relations: (data.match(/<relation /g) || []).length,
  };
  counts.total = counts.nodes + counts.ways + counts.relations;
  return counts;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Mindanao Truck Simulator - OSM Data Download Tool');
  console.log('='.repeat(60));
  console.log('');

  // Parse arguments
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Get region config
  const region = CONFIG.regions[options.region];
  if (!region) {
    console.error(`Unknown region: ${options.region}`);
    console.error(`Available regions: ${Object.keys(CONFIG.regions).join(', ')}`);
    process.exit(1);
  }

  console.log(`Region: ${region.name}`);
  console.log(`Bounds: ${region.bbox.south}°N to ${region.bbox.north}°N, ${region.bbox.west}°E to ${region.bbox.east}°E`);
  console.log(`Road types: ${CONFIG.roadTypes.join(', ')}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`Created directory: ${CONFIG.outputDir}`);
  }

  // Build query
  console.log('Building Overpass query...');
  const query = buildQuery(region.bbox, CONFIG.roadTypes);

  // Download data
  console.log('Downloading from Overpass API...');
  console.log('(This may take a few minutes for large regions)');
  console.log('');

  const startTime = Date.now();

  try {
    const data = await downloadFromOverpass(query);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Count elements
    const counts = countElements(data);
    console.log('');
    console.log('Download complete!');
    console.log(`  Time: ${elapsed}s`);
    console.log(`  Size: ${formatSize(data.length)}`);
    console.log(`  Elements: ${counts.total} (${counts.nodes} nodes, ${counts.ways} ways)`);

    // Save to file
    const outputFile = path.join(CONFIG.outputDir, `${options.region}.osm`);
    fs.writeFileSync(outputFile, data, 'utf8');
    console.log('');
    console.log(`Saved to: ${outputFile}`);

    console.log('');
    console.log('Next step: npm run osm:process');
  } catch (error) {
    console.error('');
    console.error('Download failed:', error.message);
    process.exit(1);
  }
}

// Run
main().catch(console.error);

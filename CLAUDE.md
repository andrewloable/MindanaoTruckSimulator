# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mindanao Truck Simulator is a web-based driving simulation game inspired by Euro Truck Simulator, focused on the island of Mindanao in the Philippines. It features procedurally generated roads from OpenStreetMaps data with a casual, relaxing driving experience similar to slowroads.io.

## Technology Stack

- **Platform**: Web browsers (Chrome, Firefox, Safari, Edge) with WebGL
- **Language**: JavaScript
- **3D Rendering**: Three.js
- **Physics**: Cannon.js or Rapier.js
- **Map Data**: OpenStreetMaps (OSM) for Mindanao road networks
- **Hosting**: Cloudflare Pages (static site)
- **Domain**: mindanao-truck-simulator.repetitive.games
- **Deployment**: Wrangler CLI

## Build Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run deploy       # Deploy to Cloudflare Pages
npm run osm:download # Download OSM data for Mindanao
npm run osm:process  # Process OSM data into game format
```

## Project Structure

```
├── public/              # Static assets served as-is
├── src/
│   ├── core/            # Game engine core (renderer, loop, input)
│   ├── systems/         # Game systems (physics, audio, economy)
│   ├── world/           # World generation and road rendering
│   ├── ui/              # UI screens and HUD components
│   ├── vehicles/        # Truck and trailer logic
│   └── utils/           # Shared utilities
├── scripts/             # Build-time tools
│   ├── osm-download.js  # OSM data downloader
│   └── osm-process.js   # OSM to game format converter
├── data/
│   ├── raw/             # Downloaded OSM files (.osm, .pbf)
│   └── processed/       # Game-ready data (roads.json, pois.json, chunks/)
├── images/              # Branding assets
│   ├── mts-logo.png     # Circular badge logo
│   └── mts-cover.png    # Wide banner for backgrounds
└── assets/              # Game assets (models, textures, sounds)
```

## Architecture

### World Generation Pipeline

**1. OSM Download Tool** (`npm run osm:download`)
- Downloads road data from Overpass API or Geofabrik
- Geographic bounds: 5.5°N to 9.8°N, 121.9°E to 126.6°E
- Extracts: motorway, trunk, primary, secondary, tertiary roads
- Captures POIs: cities, towns, fuel stations
- Output: `data/raw/*.osm` or `*.pbf`

**2. OSM Processing Pipeline** (`npm run osm:process`)
- Converts lat/lon to game coordinates (meters from origin)
- Builds road graph (nodes, edges, intersections)
- Generates cubic splines for smooth road curves
- Creates spatial chunks for streaming
- Output: `data/processed/roads.json`, `pois.json`, `chunks/`

**3. Runtime Road Generation**
- Chunk-based loading near player position
- Extrudes 3D road meshes from spline data
- Generates collision geometry for physics
- LOD system (high detail near, simplified far)

### Core Systems

- **Driving/Physics**: Arcade-style physics for acceleration, braking, turning, collision
- **Job System**: Cargo pickup/delivery between cities with currency rewards
- **Economy**: Currency for deliveries, penalties for damage/late delivery, truck purchases
- **Navigation**: Mini-map with GPS route highlighting
- **Audio**: Engine sounds, ambient audio, UI sounds, horn, background music
  - Volume categories: Master, Music, SFX, Ambient, UI
  - Audio engine: Web Audio API or Howler.js

### Controls

**Keyboard:**
| Key | Action |
|-----|--------|
| W / Up | Accelerate |
| S / Down | Brake / Reverse |
| A / Left | Steer left |
| D / Right | Steer right |
| Space | Handbrake |
| L | Toggle headlights |
| H | Horn |
| C | Cycle camera views |
| ESC | Pause menu |
| M | Toggle mini-map |

**Gamepad (Xbox/PlayStation):**
| Input | Action |
|-------|--------|
| Left Stick / D-pad | Steering |
| RT / R2 | Accelerate |
| LT / L2 | Brake / Reverse |
| A / X | Handbrake |
| B / Circle | Horn |
| Y / Triangle | Camera view |
| X / Square | Headlights |
| Start | Pause menu |

**Racing Wheels (Logitech G29, etc.):**
- Steering wheel: Analog steering (900° support)
- Gas/Brake pedals: Analog throttle/brake
- Force feedback: Road surface, collisions, weight transfer

### UI Screens

- **Main Menu**: Start Game, Options, About (with logo and cover background)
- **In-Game HUD**: Speedometer, fuel gauge, mini-map, cargo info, currency, time
- **Job Market**: Available jobs with cargo, origin, destination, payout
- **Garage/Dealership**: View and purchase trucks
- **Pause Menu**: Resume, Options, Return to Main Menu

### Branding Assets

- **Logo**: `images/mts-logo.png` - circular badge for menus, loading, favicon
- **Cover**: `images/mts-cover.png` - wide banner for backgrounds, Open Graph
- **Color palette**: Primary green (#4CAF50), earth brown, sky blue, tropical greens

### Art Direction

- Low-poly, stylized aesthetic for web performance
- Primary truck model should match green truck in branding
- Simple textures, skybox for distant scenery

## MVP Scope

- Single playable truck with simplified physics
- Procedural roads for Davao-Cagayan de Oro region
- Basic job system (pickup cargo, deliver, earn money)
- In-game HUD with mini-map and job selection screen
- Main menu with logo and cover image
- Basic audio (engine, UI sounds)

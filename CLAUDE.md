# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mindanao Truck Simulator is a web-based driving simulation game inspired by Euro Truck Simulator, focused on the island of Mindanao in the Philippines. It features procedurally generated roads from OpenStreetMaps data with a casual, relaxing driving experience similar to slowroads.io.

## Technology Stack

- **Platform**: Web browsers (WebGL)
- **Language**: JavaScript
- **3D Rendering**: Three.js
- **Physics**: Cannon.js or Rapier.js (lightweight JS physics)
- **Map Data**: OpenStreetMaps (OSM) for Mindanao road networks

## Architecture

### World Generation Pipeline
1. Offline script downloads/parses OSM data for Mindanao (highways, primary, secondary roads)
2. Data converted to simplified format (connected nodes/splines)
3. Runtime procedural generation of 3D world from processed data

### Core Systems
- **Driving/Physics**: Arcade-style physics for acceleration, braking, turning, collision
- **Job System**: Cargo pickup/delivery between cities with currency rewards
- **Economy**: Currency for deliveries, penalties for damage/late delivery, truck purchases
- **Navigation**: Mini-map with GPS route highlighting

### Art Direction
- Low-poly, stylized aesthetic for web performance
- Simple textures, skybox for distant scenery

## MVP Scope

- Single playable truck with simplified physics
- Procedural roads for Davao-Cagayan de Oro region
- Basic job system (pickup cargo, deliver, earn money)
- In-game HUD with mini-map and job selection screen

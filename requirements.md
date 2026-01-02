# Mindanao Truck Simulator - Project Requirements

## 1. Vision

**Mindanao Truck Simulator** is a web-based driving simulation game inspired by titles like *Euro Truck Simulator* and *American Truck Simulator*, with a unique focus on the island of Mindanao in the Philippines. The game will feature a procedurally generated road network based on real-world data from OpenStreetMaps, offering a casual and accessible driving experience directly in the browser, similar to the feel of *slowroads.io*.

The primary goal is to create a relaxing and engaging game that allows players to explore the scenic routes of Mindanao, manage a virtual trucking career, and deliver various types of cargo between cities.

## 2. Core Gameplay Mechanics

### 2.1. Driving & Physics
- **Vehicle Control:** Players will control a truck using keyboard inputs (WASD for acceleration/steering, etc.). Gamepad support is a post-MVP goal.
- **Physics Model:** A simplified, arcade-style physics model will be implemented. The focus is on a satisfying driving feel rather than hyper-realism. Physics should govern acceleration, braking, turning, and basic collision detection.
- **Transmission:** Simple automatic transmission will be the default.

### 2.2. Cargo & Economy
- **Job System:** Players can pick up jobs from a "Job Market". Each job consists of a specific cargo type, a pickup location, and a destination.
- **Cargo Types:** A variety of cargo types with different visual representations (e.g., containers, flatbeds with goods, tankers).
- **Economy:**
    - Players earn in-game currency for successfully completing deliveries.
    - Penalties (currency deduction) will be applied for damaging cargo or late deliveries.
    - The earned currency can be used to buy new trucks or upgrade existing ones.

### 2.3. Navigation & World
- **Map:** The game world will be a procedurally generated representation of Mindanao.
- **GPS/Navigation:** An in-game UI element will display a mini-map and a highlighted route to the player's current destination.
- **Points of Interest (POIs):** Major cities and landmarks in Mindanao will serve as cargo hubs, depots, and destinations (e.g., Davao City, Cagayan de Oro, Zamboanga City).

## 3. Technical Requirements

### 3.1. Platform & Technology
- **Platform:** Modern web browsers (Chrome, Firefox, Safari, Edge) supporting WebGL.
- **Core Engine:** JavaScript.
- **3D Rendering:** **Three.js** is the preferred library for its extensive documentation and community support. Babylon.js is an alternative.
- **Physics Engine:** A lightweight JavaScript physics library (e.g., Cannon.js or Rapier.js) will be integrated for collision detection and vehicle dynamics.

### 3.2. World Generation

#### 3.2.1. OSM Data Download Tool
A CLI tool to download OpenStreetMaps road data for Mindanao:
- **Data Source:** Overpass API or Geofabrik regional extracts for Philippines/Mindanao
- **Geographic Bounds:** Mindanao island bounding box (approximately 5.5°N to 9.8°N, 121.9°E to 126.6°E)
- **Road Types to Extract:**
    - `highway=motorway` / `highway=trunk` (major highways)
    - `highway=primary` (primary roads)
    - `highway=secondary` (secondary roads)
    - `highway=tertiary` (tertiary roads, optional for MVP)
- **Data to Capture per Road:**
    - Node coordinates (latitude, longitude)
    - Road name and reference number
    - Road type/classification
    - Number of lanes (if available)
    - Speed limit (if available)
    - Surface type (paved, unpaved)
- **POI Extraction:**
    - Cities and towns (`place=city`, `place=town`)
    - Fuel stations (`amenity=fuel`)
- **Output Format:** Raw OSM data saved as `.osm` (XML) or `.pbf` (binary) file
- **Tool Requirements:**
    - Runnable via `npm run osm:download`
    - Progress indication for large downloads
    - Resume capability for interrupted downloads
    - Configurable bounding box for testing with smaller areas

#### 3.2.2. OSM Data Processing Pipeline
An offline script to convert raw OSM data into game-ready format:
- **Input:** Raw `.osm` or `.pbf` file from download tool
- **Coordinate Transformation:**
    - Convert lat/lon to local game coordinates (meters from origin)
    - Use Mercator or equirectangular projection
    - Define origin point (e.g., center of Mindanao)
- **Road Graph Structure:**
    - Nodes: unique points with (x, y, z) game coordinates
    - Edges: road segments connecting nodes with metadata
    - Intersections: nodes where multiple roads meet
- **Road Metadata per Segment:**
    - Road width based on type (motorway: 12m, primary: 8m, secondary: 6m)
    - Speed limit (default by road type if not specified)
    - Surface type for physics/visuals
    - Elevation (flat for MVP, terrain-following post-MVP)
- **Spline Generation:**
    - Convert node sequences to smooth cubic splines
    - Generate control points for curve interpolation
    - Ensure smooth transitions at intersections
- **Spatial Partitioning:**
    - Divide world into grid cells/chunks for streaming
    - Calculate bounding boxes per chunk
    - Generate chunk neighbor relationships
- **POI Data:**
    - City/town positions with names for job destinations
    - Fuel station positions for gameplay
- **Output Format:** Optimized JSON or binary format
    - `roads.json` - road network graph
    - `pois.json` - points of interest
    - `chunks/` - spatial partition data for streaming
- **Tool Requirements:**
    - Runnable via `npm run osm:process`
    - Memory-efficient streaming parser for large files
    - Validation of output data integrity
    - Statistics output (total roads, nodes, chunks, etc.)

#### 3.2.3. Runtime Road Generation
The game engine generates 3D road geometry from processed data:
- **Chunk-Based Loading:**
    - Load road data for chunks near player position
    - Unload distant chunks to manage memory
    - Preload chunks in player's direction of travel
- **Road Mesh Generation:**
    - Extrude road geometry from spline data
    - Generate proper UV coordinates for road textures
    - Create road surface, shoulder, and edge geometry
- **Intersection Handling:**
    - Generate intersection geometry where roads meet
    - Create proper lane merging visuals
- **Road Markings:**
    - Center lines, lane dividers
    - Edge lines and shoulder markings
    - Apply via textures or decals
- **Collision Geometry:**
    - Generate simplified collision meshes for physics
    - Road boundaries for keeping vehicles on road
- **Terrain Integration:**
    - Generate basic terrain mesh around roads
    - Blend road edges into surrounding terrain
- **LOD (Level of Detail):**
    - High detail roads near player
    - Simplified geometry for distant roads
    - Billboard or flat representations at far distances

### 3.3. Hosting & Deployment
- **Domain:** `mindanao-truck-simulator.repetitive.games`
- **Hosting:** The game will be hosted as a static site on **Cloudflare Pages**.
- **Deployment:** Deployments will be managed using **Wrangler** CLI.
- **Build Output:** Static assets (HTML, JS bundles, textures, models) optimized for CDN delivery.
- **No Server-Side Logic:** All game logic runs client-side; no backend required for MVP.

### 3.4. Controls

#### 3.4.1. Keyboard Controls (Primary)
- WASD / Arrow keys for movement (accelerate, brake, steer)
- Additional keys for camera, lights, horn, and UI navigation

#### 3.4.2. Gamepad & Racing Wheel Support
Support for game input devices via the Web Gamepad API:
- **Standard Gamepads:**
    - Xbox controllers (Xbox One, Xbox Series X|S)
    - PlayStation controllers (DualShock 4, DualSense)
    - Generic USB/Bluetooth gamepads
- **Racing Wheels:**
    - Logitech G29 / G920 / G923
    - Thrustmaster wheels
    - Other force feedback wheels
- **Gamepad Mapping:**
    - Left stick / D-pad: Steering
    - Right trigger (RT/R2): Accelerate
    - Left trigger (LT/L2): Brake/Reverse
    - A/X button: Confirm / Handbrake
    - B/Circle button: Cancel / Horn
    - Y/Triangle button: Toggle camera view
    - X/Square button: Toggle headlights
    - Start button: Pause menu
    - Bumpers (LB/RB): Shift gears (if manual mode added)
- **Racing Wheel Mapping:**
    - Steering wheel: Analog steering input (900° rotation support)
    - Gas pedal: Accelerate (analog input)
    - Brake pedal: Brake (analog input)
    - Clutch pedal: Optional, for future manual transmission
    - Paddle shifters: Shift gears (if manual mode added)
    - Wheel buttons: Mapped to common actions (horn, lights, camera)
- **Force Feedback (Racing Wheels):**
    - Road surface vibration feedback
    - Collision impact feedback
    - Centering spring force
    - Weight transfer during turns
- **Features:**
    - Auto-detect connected controllers on game start
    - Hot-plug support (connect/disconnect during gameplay)
    - Controller configuration screen in Options menu
    - Deadzone configuration for analog sticks
    - Sensitivity adjustment for steering
    - Button remapping support
    - Display controller-specific button prompts in UI

#### 3.4.3. Mouse Controls
- UI interaction (menus, buttons)
- Optional camera control (freelook mode)

## 4. User Interface (UI)

- **Main Menu:** Simple interface with options for "Start Game," "Options," and "About."
- **In-Game HUD (Heads-Up Display):**
    - Speedometer.
    - Mini-map / GPS route display.
    - Fuel gauge.
    - Current cargo and destination information.
    - In-game time and currency balance.
- **Job Market Screen:** A list of available jobs, showing cargo, origin, destination, and payout.
- **Garage/Dealership Screen:** A simple interface for viewing and purchasing new trucks.
- **Pause Menu:** Options to "Resume," "Return to Main Menu," and adjust basic settings (e.g., volume).

## 5. Art & Asset Requirements

### 5.1. Branding Assets
- **Logo:** `images/mts-logo.png` - Circular badge logo with green truck, Mindanao silhouette, mountains, and palm trees. Use for:
    - Main menu title/header
    - Loading screen
    - Browser favicon (generate smaller sizes)
    - About screen
- **Cover Image:** `images/mts-cover.png` - Wide banner with tropical Mindanao scenery. Use for:
    - Main menu background
    - Social media/Open Graph meta tags
    - Loading screen background
- **Color Palette** (derived from branding):
    - Primary green: truck color (#4CAF50 range)
    - Earth brown: road/text accents
    - Sky blue: backgrounds
    - Tropical greens: foliage/environment

### 5.2. Art Style
- **Style:** Low-poly, stylized aesthetic to ensure high performance on the web.

### 5.3. 3D Models
- **Trucks:** 2-3 unique, low-poly truck models at launch. Primary truck should match the green truck in branding.
- **Trailers:** Various trailer models corresponding to cargo types.
- **Environment:** Modular sets for simple buildings, trees, road signs, and other environmental props.

### 5.4. Textures
- Simple, clean textures matching the stylized art direction.
- A skybox will be used for the sky and distant scenery.

### 5.5. Sound & Audio

#### 5.5.1. Sound Assets
- **Engine Sounds:**
    - Idle engine loop
    - Acceleration (pitch/volume varies with RPM)
    - Deceleration / engine braking
    - Gear shift sounds (if manual mode added)
- **Vehicle Sounds:**
    - Horn (multiple tones optional)
    - Turn signal clicks
    - Braking / tire screech
    - Collision impacts
- **Ambient Sounds:**
    - Wind (intensity based on speed)
    - Nature sounds (birds, insects)
    - Distant traffic / city ambiance
    - Rain (when weather system added)
- **UI Sounds:**
    - Button clicks and hovers
    - Menu transitions
    - Notification chimes
    - Job complete / money earned
- **Music:**
    - Background music tracks (relaxing, road trip style)
    - Radio station concept (multiple music styles)

#### 5.5.2. Audio Management System
- **Audio Engine:** Web Audio API or Howler.js
- **Audio Categories:**
    - Master volume (controls all audio)
    - Music volume (background music/radio)
    - SFX volume (engine, horn, collisions)
    - Ambient volume (environment sounds)
    - UI volume (menu sounds, notifications)
- **Features:**
    - Independent volume sliders for each category (0-100%)
    - Mute toggles for each category
    - Audio context initialization on first user interaction
    - Sound pooling for frequently played sounds
    - Seamless audio loops (engine, ambient)
    - Spatial audio for 3D sound positioning
    - Dynamic audio mixing based on game state
- **Settings Persistence:**
    - Save audio preferences to localStorage
    - Remember mute states between sessions
- **Accessibility:**
    - Visual indicators when audio is muted
    - Subtitles option for important audio cues (post-MVP)

## 6. Minimum Viable Product (MVP) Features

The goal of the MVP is to deliver a playable core loop.

- **One (1) playable truck model.**
- **A functional driving experience** with simplified physics.
- **Procedurally generated road network** for a small, representative section of Mindanao (e.g., the area between Davao and Cagayan de Oro).
- **A basic job system:** Pick up cargo from one city, deliver to another.
- **A simple economy:** Earn money from jobs.
- **Core UI:** In-game HUD with a mini-map, and a simple job selection screen.
- **Basic assets:** Low-poly models for the truck, one trailer type, and essential environment props (trees, a few building types).

## 7. Post-MVP & Future Features

- **Expanded Map:** Include the entire road network of Mindanao.
- **More Trucks & Upgrades:** A wider variety of trucks and visual/performance customization options.
- **More Cargo Types:** Different types of trailers and goods.
- **AI Traffic:** Simple AI-controlled vehicles on the roads to make the world feel more alive.
- **Weather System:** Dynamic weather effects like rain.
- **Day/Night Cycle:** A full cycle affecting visibility and requiring headlights.
- **Improved Economy:** Fuel costs, truck maintenance, and business management features.
- **Gamepad Support.**
- **More Detailed Scenery:** Adding more unique landmarks and varied environments.

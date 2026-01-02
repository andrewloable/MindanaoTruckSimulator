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
- **Data Source:** **OpenStreetMaps (OSM)** will be the primary source for road network data in Mindanao.
- **Data Processing:**
    1.  An offline script will be used to download and parse OSM data for the Mindanao region (highways, primary, and secondary roads).
    2.  This data will be converted into a simplified format (e.g., a series of connected nodes or splines) that the game engine can use.
    3.  The game will procedurally generate the 3D world (road geometry, terrain, basic placement of buildings and foliage) based on this processed data at runtime. This keeps the initial download small and allows for a vast game world.

### 3.3. Controls
- **Primary:** Keyboard (WASD for movement, other keys for camera, lights, horn).
- **Secondary (Post-MVP):** Mouse for UI interaction and potential camera control.
- **Tertiary (Post-MVP):** Basic gamepad support.

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

- **Style:** Low-poly, stylized aesthetic to ensure high performance on the web.
- **3D Models:**
    - **Trucks:** 2-3 unique, low-poly truck models at launch.
    - **Trailers:** Various trailer models corresponding to cargo types.
    - **Environment:** Modular sets for simple buildings, trees, road signs, and other environmental props.
- **Textures:** Simple, clean textures. A skybox will be used for the sky and distant scenery.
- **Sound:**
    - Basic engine sounds (idle, accelerating).
    - Ambient environmental sounds.
    - UI click sounds.
    - A simple horn sound.

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

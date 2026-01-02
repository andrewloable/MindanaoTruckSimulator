/**
 * FuelSystem - Manages truck fuel consumption and refueling
 *
 * Tracks fuel level, calculates consumption based on speed/throttle,
 * and handles refueling at gas stations.
 */

export class FuelSystem {
  constructor() {
    // Fuel tank capacity in liters
    this.tankCapacity = 400;

    // Current fuel level in liters
    this.fuelLevel = 400;

    // Fuel consumption rate (liters per km at cruise speed)
    this.baseConsumption = 0.35; // ~35L/100km for a truck

    // Fuel price per liter (PHP)
    this.fuelPrice = 65;

    // Accumulated distance for consumption calculation
    this.distanceTraveled = 0;

    // Gas station interaction range (meters)
    this.refuelRange = 30;

    // Near gas station state
    this.nearGasStation = null;
    this.canRefuel = false;

    // Callbacks
    this.onFuelEmpty = null;
    this.onFuelLow = null;
    this.onRefuelAvailable = null;
    this.onRefuelComplete = null;

    // Low fuel warning threshold (percentage)
    this.lowFuelThreshold = 0.15;
    this.lowFuelWarned = false;
  }

  /**
   * Update fuel consumption based on driving
   * @param {number} speed - Current speed in m/s
   * @param {number} throttle - Throttle input (0-1)
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(speed, throttle, deltaTime) {
    if (this.fuelLevel <= 0) return;

    // Calculate distance traveled this frame (in km)
    const distanceKm = (speed * deltaTime) / 1000;
    this.distanceTraveled += distanceKm;

    // Calculate fuel consumption
    // Base consumption modified by throttle (more throttle = more fuel)
    // Also affected by speed (optimal consumption at moderate speeds)
    const speedKmh = speed * 3.6;
    let consumptionMultiplier = 1.0;

    // Throttle impact
    consumptionMultiplier *= 0.5 + throttle * 0.5;

    // Speed efficiency curve (most efficient around 60-80 km/h)
    if (speedKmh < 30) {
      consumptionMultiplier *= 1.3; // City driving inefficiency
    } else if (speedKmh > 80) {
      consumptionMultiplier *= 1.0 + (speedKmh - 80) * 0.01; // Highway wind resistance
    }

    // Idle consumption when stationary but engine running
    if (speed < 0.5) {
      const idleConsumption = 0.001 * deltaTime; // ~1L per hour idle
      this.fuelLevel = Math.max(0, this.fuelLevel - idleConsumption);
    } else {
      // Calculate fuel used
      const fuelUsed = distanceKm * this.baseConsumption * consumptionMultiplier;
      this.fuelLevel = Math.max(0, this.fuelLevel - fuelUsed);
    }

    // Check for low fuel warning
    const fuelPercent = this.fuelLevel / this.tankCapacity;
    if (fuelPercent <= this.lowFuelThreshold && !this.lowFuelWarned) {
      this.lowFuelWarned = true;
      if (this.onFuelLow) {
        this.onFuelLow(this.fuelLevel, fuelPercent);
      }
    } else if (fuelPercent > this.lowFuelThreshold) {
      this.lowFuelWarned = false;
    }

    // Check for empty tank
    if (this.fuelLevel <= 0) {
      this.fuelLevel = 0;
      if (this.onFuelEmpty) {
        this.onFuelEmpty();
      }
    }
  }

  /**
   * Check if player is near a gas station
   * @param {number} playerX - Player X position
   * @param {number} playerZ - Player Z position
   * @param {Array} gasStations - Array of gas station positions [{x, z, name}]
   */
  checkNearGasStation(playerX, playerZ, gasStations) {
    if (!gasStations || gasStations.length === 0) {
      this.nearGasStation = null;
      this.canRefuel = false;
      return;
    }

    let nearestStation = null;
    let nearestDistance = Infinity;

    for (const station of gasStations) {
      const dx = playerX - station.x;
      const dz = playerZ - station.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestStation = station;
      }
    }

    const wasNearStation = this.canRefuel;

    if (nearestDistance <= this.refuelRange) {
      this.nearGasStation = nearestStation;
      this.canRefuel = true;

      if (!wasNearStation && this.onRefuelAvailable) {
        this.onRefuelAvailable(nearestStation);
      }
    } else {
      this.nearGasStation = null;
      this.canRefuel = false;
    }
  }

  /**
   * Refuel the truck
   * @param {number} amount - Amount to refuel in liters (or full tank if not specified)
   * @returns {Object} - { litersAdded, cost }
   */
  refuel(amount = null) {
    if (!this.canRefuel) {
      return { litersAdded: 0, cost: 0, error: 'Not near a gas station' };
    }

    // Calculate how much fuel is needed
    const fuelNeeded = this.tankCapacity - this.fuelLevel;

    if (fuelNeeded <= 0) {
      return { litersAdded: 0, cost: 0, error: 'Tank is already full' };
    }

    // Determine amount to add
    const litersToAdd = amount !== null
      ? Math.min(amount, fuelNeeded)
      : fuelNeeded;

    // Calculate cost
    const cost = Math.ceil(litersToAdd * this.fuelPrice);

    // Add fuel
    this.fuelLevel = Math.min(this.tankCapacity, this.fuelLevel + litersToAdd);

    // Reset low fuel warning
    this.lowFuelWarned = false;

    if (this.onRefuelComplete) {
      this.onRefuelComplete(litersToAdd, cost);
    }

    return { litersAdded: litersToAdd, cost };
  }

  /**
   * Get current fuel level as percentage (0-1)
   * @returns {number}
   */
  getFuelPercent() {
    return this.fuelLevel / this.tankCapacity;
  }

  /**
   * Get current fuel level in liters
   * @returns {number}
   */
  getFuelLevel() {
    return this.fuelLevel;
  }

  /**
   * Get tank capacity
   * @returns {number}
   */
  getTankCapacity() {
    return this.tankCapacity;
  }

  /**
   * Check if tank is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.fuelLevel <= 0;
  }

  /**
   * Check if fuel is low
   * @returns {boolean}
   */
  isLow() {
    return this.getFuelPercent() <= this.lowFuelThreshold;
  }

  /**
   * Get estimated range in km based on current fuel
   * @returns {number}
   */
  getEstimatedRange() {
    return this.fuelLevel / this.baseConsumption;
  }

  /**
   * Get cost to fill tank completely
   * @returns {number}
   */
  getFullTankCost() {
    const fuelNeeded = this.tankCapacity - this.fuelLevel;
    return Math.ceil(fuelNeeded * this.fuelPrice);
  }

  /**
   * Set fuel level directly (for save/load)
   * @param {number} level
   */
  setFuelLevel(level) {
    this.fuelLevel = Math.max(0, Math.min(this.tankCapacity, level));
  }

  /**
   * Reset to full tank
   */
  reset() {
    this.fuelLevel = this.tankCapacity;
    this.distanceTraveled = 0;
    this.lowFuelWarned = false;
  }
}

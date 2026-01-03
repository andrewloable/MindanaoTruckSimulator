/**
 * MaintenanceSystem - Manages truck damage, wear, and repairs
 *
 * Tracks vehicle condition including engine, tires, brakes, and body.
 * Handles collision damage, wear over time, and repair at service stations.
 */

// Component types that can be damaged/repaired
export const TruckComponent = {
  ENGINE: 'engine',
  TIRES: 'tires',
  BRAKES: 'brakes',
  BODY: 'body',
  TRANSMISSION: 'transmission',
};

// Damage severity levels
export const DamageSeverity = {
  NONE: 'none',
  MINOR: 'minor',
  MODERATE: 'moderate',
  SEVERE: 'severe',
  CRITICAL: 'critical',
};

export class MaintenanceSystem {
  constructor() {
    // Component condition (0-100, 100 = perfect)
    this.components = {
      [TruckComponent.ENGINE]: 100,
      [TruckComponent.TIRES]: 100,
      [TruckComponent.BRAKES]: 100,
      [TruckComponent.BODY]: 100,
      [TruckComponent.TRANSMISSION]: 100,
    };

    // Wear rates per km driven
    this.wearRates = {
      [TruckComponent.ENGINE]: 0.002,      // Very slow
      [TruckComponent.TIRES]: 0.005,       // Moderate
      [TruckComponent.BRAKES]: 0.003,      // Slow
      [TruckComponent.BODY]: 0.001,        // Very slow (rust/wear)
      [TruckComponent.TRANSMISSION]: 0.002, // Very slow
    };

    // Repair costs per condition point (PHP)
    this.repairCosts = {
      [TruckComponent.ENGINE]: 50,
      [TruckComponent.TIRES]: 20,
      [TruckComponent.BRAKES]: 30,
      [TruckComponent.BODY]: 25,
      [TruckComponent.TRANSMISSION]: 45,
    };

    // Performance impact when damaged
    this.performanceImpact = {
      [TruckComponent.ENGINE]: { maxSpeed: 0.4, acceleration: 0.5 },
      [TruckComponent.TIRES]: { grip: 0.5, topSpeed: 0.2 },
      [TruckComponent.BRAKES]: { braking: 0.6 },
      [TruckComponent.BODY]: { fuelEfficiency: 0.2 },
      [TruckComponent.TRANSMISSION]: { acceleration: 0.3, topSpeed: 0.2 },
    };

    // Distance tracking
    this.totalDistance = 0;
    this.distanceSinceLastService = 0;

    // Service station interaction
    this.nearServiceStation = null;
    this.canRepair = false;
    this.serviceRange = 40; // meters

    // Warning thresholds
    this.warningThreshold = 30;
    this.criticalThreshold = 10;

    // Callbacks
    this.onComponentDamaged = null;
    this.onComponentCritical = null;
    this.onRepairComplete = null;
    this.onServiceAvailable = null;
  }

  /**
   * Update wear based on distance traveled
   * @param {number} distanceKm - Distance traveled in km
   * @param {Object} conditions - Driving conditions
   */
  updateWear(distanceKm, conditions = {}) {
    const {
      speed = 0,         // Current speed km/h
      braking = false,   // Is braking
      offroad = false,   // Driving off-road
      rain = false,      // Raining
    } = conditions;

    this.totalDistance += distanceKm;
    this.distanceSinceLastService += distanceKm;

    // Apply wear to each component
    for (const [component, baseRate] of Object.entries(this.wearRates)) {
      let wearMultiplier = 1.0;

      // Speed affects engine and transmission wear
      if (component === TruckComponent.ENGINE || component === TruckComponent.TRANSMISSION) {
        if (speed > 80) wearMultiplier *= 1.5;
        if (speed > 100) wearMultiplier *= 2.0;
      }

      // Braking affects brake wear
      if (component === TruckComponent.BRAKES && braking) {
        wearMultiplier *= 3.0;
      }

      // Off-road affects tires and body
      if (offroad) {
        if (component === TruckComponent.TIRES) wearMultiplier *= 3.0;
        if (component === TruckComponent.BODY) wearMultiplier *= 2.0;
      }

      // Rain affects tires (hydroplaning stress)
      if (rain && component === TruckComponent.TIRES) {
        wearMultiplier *= 1.5;
      }

      // Apply wear
      const wear = baseRate * distanceKm * wearMultiplier;
      this.components[component] = Math.max(0, this.components[component] - wear);

      // Check for critical condition
      if (this.components[component] <= this.criticalThreshold) {
        if (this.onComponentCritical) {
          this.onComponentCritical(component, this.components[component]);
        }
      }
    }
  }

  /**
   * Apply collision damage
   * @param {number} impactForce - Collision force (0-1 normalized)
   * @param {string} impactType - Type of collision
   */
  applyCollisionDamage(impactForce, impactType = 'general') {
    // Scale damage based on impact force
    const baseDamage = impactForce * 30;

    // Different impact types affect different components
    switch (impactType) {
      case 'frontal':
        this.damageComponent(TruckComponent.ENGINE, baseDamage * 0.8);
        this.damageComponent(TruckComponent.BODY, baseDamage);
        break;
      case 'rear':
        this.damageComponent(TruckComponent.BODY, baseDamage);
        this.damageComponent(TruckComponent.TRANSMISSION, baseDamage * 0.3);
        break;
      case 'side':
        this.damageComponent(TruckComponent.BODY, baseDamage * 0.8);
        this.damageComponent(TruckComponent.TIRES, baseDamage * 0.4);
        break;
      default:
        // General damage affects body primarily
        this.damageComponent(TruckComponent.BODY, baseDamage);
        break;
    }
  }

  /**
   * Apply damage to a specific component
   * @param {string} component
   * @param {number} damage
   */
  damageComponent(component, damage) {
    const before = this.components[component];
    this.components[component] = Math.max(0, this.components[component] - damage);

    if (damage > 5 && this.onComponentDamaged) {
      this.onComponentDamaged(component, damage, this.components[component]);
    }

    if (before > this.criticalThreshold && this.components[component] <= this.criticalThreshold) {
      if (this.onComponentCritical) {
        this.onComponentCritical(component, this.components[component]);
      }
    }
  }

  /**
   * Get overall truck condition (0-100)
   * @returns {number}
   */
  getOverallCondition() {
    const values = Object.values(this.components);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get condition of a specific component
   * @param {string} component
   * @returns {number}
   */
  getComponentCondition(component) {
    return this.components[component] ?? 100;
  }

  /**
   * Get damage severity for a component
   * @param {string} component
   * @returns {string}
   */
  getComponentSeverity(component) {
    const condition = this.components[component];
    if (condition >= 80) return DamageSeverity.NONE;
    if (condition >= 60) return DamageSeverity.MINOR;
    if (condition >= 40) return DamageSeverity.MODERATE;
    if (condition >= 20) return DamageSeverity.SEVERE;
    return DamageSeverity.CRITICAL;
  }

  /**
   * Get performance multiplier based on damage
   * @param {string} stat - Performance stat (maxSpeed, acceleration, grip, braking, fuelEfficiency)
   * @returns {number} Multiplier (0-1)
   */
  getPerformanceMultiplier(stat) {
    let multiplier = 1.0;

    for (const [component, impacts] of Object.entries(this.performanceImpact)) {
      if (impacts[stat]) {
        const condition = this.components[component] / 100;
        // Damage only affects performance when condition < 50%
        if (condition < 0.5) {
          const damageEffect = (0.5 - condition) * 2; // 0-1 scale
          multiplier -= damageEffect * impacts[stat];
        }
      }
    }

    return Math.max(0.3, multiplier); // Never reduce below 30%
  }

  /**
   * Check if near a service station
   * @param {number} playerX
   * @param {number} playerZ
   * @param {Array} serviceStations - Array of {x, z, name}
   */
  checkNearServiceStation(playerX, playerZ, serviceStations) {
    if (!serviceStations || serviceStations.length === 0) {
      this.nearServiceStation = null;
      this.canRepair = false;
      return;
    }

    let nearest = null;
    let nearestDist = Infinity;

    for (const station of serviceStations) {
      const dx = playerX - station.x;
      const dz = playerZ - station.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    }

    const wasNearStation = this.canRepair;

    if (nearestDist <= this.serviceRange) {
      this.nearServiceStation = nearest;
      this.canRepair = true;

      if (!wasNearStation && this.onServiceAvailable) {
        this.onServiceAvailable(nearest);
      }
    } else {
      this.nearServiceStation = null;
      this.canRepair = false;
    }
  }

  /**
   * Get repair cost for a component
   * @param {string} component
   * @returns {number} Cost in PHP
   */
  getRepairCost(component) {
    const damage = 100 - this.components[component];
    return Math.ceil(damage * this.repairCosts[component]);
  }

  /**
   * Get total repair cost for all components
   * @returns {number}
   */
  getTotalRepairCost() {
    let total = 0;
    for (const component of Object.keys(this.components)) {
      total += this.getRepairCost(component);
    }
    return total;
  }

  /**
   * Repair a specific component
   * @param {string} component
   * @returns {Object} { cost, repaired }
   */
  repairComponent(component) {
    if (!this.canRepair) {
      return { cost: 0, repaired: false, error: 'Not at service station' };
    }

    const cost = this.getRepairCost(component);
    if (cost === 0) {
      return { cost: 0, repaired: false, error: 'Component is already fully repaired' };
    }

    this.components[component] = 100;

    if (this.onRepairComplete) {
      this.onRepairComplete(component, cost);
    }

    return { cost, repaired: true };
  }

  /**
   * Repair all components
   * @returns {Object} { cost, repaired }
   */
  repairAll() {
    if (!this.canRepair) {
      return { cost: 0, repaired: false, error: 'Not at service station' };
    }

    const cost = this.getTotalRepairCost();
    if (cost === 0) {
      return { cost: 0, repaired: false, error: 'Truck is already fully repaired' };
    }

    for (const component of Object.keys(this.components)) {
      this.components[component] = 100;
    }

    this.distanceSinceLastService = 0;

    if (this.onRepairComplete) {
      this.onRepairComplete('all', cost);
    }

    return { cost, repaired: true };
  }

  /**
   * Check if any component needs repair
   * @returns {boolean}
   */
  needsRepair() {
    return Object.values(this.components).some(c => c < 80);
  }

  /**
   * Check if any component is in critical condition
   * @returns {boolean}
   */
  hasCriticalDamage() {
    return Object.values(this.components).some(c => c <= this.criticalThreshold);
  }

  /**
   * Get list of components needing attention
   * @returns {Array}
   */
  getComponentsNeedingAttention() {
    return Object.entries(this.components)
      .filter(([_, condition]) => condition < 50)
      .map(([component, condition]) => ({
        component,
        condition,
        severity: this.getComponentSeverity(component),
        repairCost: this.getRepairCost(component),
      }))
      .sort((a, b) => a.condition - b.condition);
  }

  /**
   * Set component condition directly (for save/load)
   * @param {string} component
   * @param {number} condition
   */
  setComponentCondition(component, condition) {
    this.components[component] = Math.max(0, Math.min(100, condition));
  }

  /**
   * Reset all components to perfect condition
   */
  reset() {
    for (const component of Object.keys(this.components)) {
      this.components[component] = 100;
    }
    this.distanceSinceLastService = 0;
  }

  /**
   * Get save data
   * @returns {Object}
   */
  getSaveData() {
    return {
      components: { ...this.components },
      totalDistance: this.totalDistance,
      distanceSinceLastService: this.distanceSinceLastService,
    };
  }

  /**
   * Load save data
   * @param {Object} data
   */
  loadSaveData(data) {
    if (data.components) {
      this.components = { ...this.components, ...data.components };
    }
    if (data.totalDistance) {
      this.totalDistance = data.totalDistance;
    }
    if (data.distanceSinceLastService) {
      this.distanceSinceLastService = data.distanceSinceLastService;
    }
  }
}

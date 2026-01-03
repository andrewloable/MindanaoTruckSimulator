/**
 * JobSystem - Manages cargo delivery jobs
 *
 * Handles job generation, tracking, and completion.
 */

// Cargo types with their characteristics
export const CargoTypes = {
  CONTAINER: {
    id: 'container',
    name: 'Container',
    description: 'Standard shipping container',
    basePayRate: 10, // PHP per km
    weight: 'heavy',
    trailerType: 'container',
  },
  PRODUCE: {
    id: 'produce',
    name: 'Fresh Produce',
    description: 'Fruits and vegetables from local farms',
    basePayRate: 15,
    weight: 'medium',
    timeSensitive: true,
    trailerType: 'refrigerated',
  },
  FISH: {
    id: 'fish',
    name: 'Fresh Fish',
    description: 'Seafood from coastal markets',
    basePayRate: 18,
    weight: 'medium',
    timeSensitive: true,
    trailerType: 'refrigerated',
  },
  FUEL: {
    id: 'fuel',
    name: 'Fuel Tanker',
    description: 'Petroleum products',
    basePayRate: 20,
    weight: 'heavy',
    hazardous: true,
    trailerType: 'tanker',
  },
  LUMBER: {
    id: 'lumber',
    name: 'Lumber',
    description: 'Timber and wood products',
    basePayRate: 8,
    weight: 'heavy',
    trailerType: 'flatbed',
  },
  ELECTRONICS: {
    id: 'electronics',
    name: 'Electronics',
    description: 'Consumer electronics and appliances',
    basePayRate: 25,
    weight: 'light',
    fragile: true,
    trailerType: 'container',
  },
  RICE: {
    id: 'rice',
    name: 'Rice Sacks',
    description: 'Rice harvest from local farms',
    basePayRate: 12,
    weight: 'heavy',
    trailerType: 'covered',
  },
  CONSTRUCTION: {
    id: 'construction',
    name: 'Construction Materials',
    description: 'Cement, steel, and building supplies',
    basePayRate: 9,
    weight: 'heavy',
    trailerType: 'flatbed',
  },
  // Mindanao-specific cargo
  BANANAS: {
    id: 'bananas',
    name: 'Bananas',
    description: 'Cavendish bananas for export',
    basePayRate: 14,
    weight: 'medium',
    timeSensitive: true,
    trailerType: 'refrigerated',
  },
  COCONUT: {
    id: 'coconut',
    name: 'Coconut Products',
    description: 'Copra and coconut oil',
    basePayRate: 11,
    weight: 'medium',
    trailerType: 'covered',
  },
  DURIAN: {
    id: 'durian',
    name: 'Durian',
    description: 'Fresh durian from Davao',
    basePayRate: 22,
    weight: 'medium',
    timeSensitive: true,
    fragile: true,
    trailerType: 'refrigerated',
  },
  PINEAPPLE: {
    id: 'pineapple',
    name: 'Pineapples',
    description: 'Del Monte pineapples from Bukidnon',
    basePayRate: 13,
    weight: 'medium',
    timeSensitive: true,
    trailerType: 'refrigerated',
  },
  COFFEE: {
    id: 'coffee',
    name: 'Coffee Beans',
    description: 'Arabica coffee from the highlands',
    basePayRate: 20,
    weight: 'light',
    trailerType: 'covered',
  },
  PALM_OIL: {
    id: 'palm_oil',
    name: 'Palm Oil',
    description: 'Crude palm oil from plantations',
    basePayRate: 16,
    weight: 'heavy',
    trailerType: 'tanker',
  },
  RUBBER: {
    id: 'rubber',
    name: 'Rubber',
    description: 'Natural rubber sheets',
    basePayRate: 15,
    weight: 'medium',
    trailerType: 'flatbed',
  },
  MINING: {
    id: 'mining',
    name: 'Mining Ore',
    description: 'Nickel and copper ore',
    basePayRate: 7,
    weight: 'very_heavy',
    trailerType: 'dump',
  },
  LIVESTOCK: {
    id: 'livestock',
    name: 'Livestock',
    description: 'Cattle and pigs for market',
    basePayRate: 18,
    weight: 'heavy',
    timeSensitive: true,
    trailerType: 'livestock',
  },
  LOGS: {
    id: 'logs',
    name: 'Logs',
    description: 'Timber logs from sustainable forests',
    basePayRate: 6,
    weight: 'very_heavy',
    trailerType: 'logging',
  },
  HEAVY_EQUIPMENT: {
    id: 'heavy_equipment',
    name: 'Heavy Equipment',
    description: 'Bulldozers and excavators',
    basePayRate: 30,
    weight: 'very_heavy',
    oversized: true,
    trailerType: 'lowboy',
  },
  ABACA: {
    id: 'abaca',
    name: 'Abaca Fiber',
    description: 'Manila hemp fiber for rope making',
    basePayRate: 17,
    weight: 'light',
    trailerType: 'covered',
  },
  CACAO: {
    id: 'cacao',
    name: 'Cacao Beans',
    description: 'Premium cacao from Davao',
    basePayRate: 21,
    weight: 'light',
    trailerType: 'covered',
  },
};

export class JobSystem {
  constructor() {
    // Available jobs in the market
    this.availableJobs = [];

    // Currently active job
    this.activeJob = null;

    // Completed jobs history
    this.completedJobs = [];

    // POI data for generating jobs
    this.cities = [];
    this.towns = [];

    // Job generation settings
    this.maxAvailableJobs = 5;
    this.jobRefreshInterval = 60000; // 1 minute
    this.lastRefresh = 0;

    // Player stats
    this.totalEarnings = 0;
    this.totalDeliveries = 0;
    this.totalDistance = 0;

    // Event callbacks
    this.onJobCompleted = null;
    this.onJobFailed = null;
    this.onJobsRefreshed = null;

    // Pathfinder reference for GPS routing
    this.pathfinder = null;
  }

  /**
   * Initialize job system with POI data
   * @param {Array} pois - Array of POI objects from RoadGenerator
   * @param {Pathfinder} pathfinder - Optional pathfinder for road routing
   */
  init(pois, pathfinder = null) {
    // Separate cities and towns
    this.cities = pois.filter(p => p.type === 'city');
    this.towns = pois.filter(p => p.type === 'town');

    // Store pathfinder reference
    this.pathfinder = pathfinder;

    console.log(`JobSystem initialized with ${this.cities.length} cities and ${this.towns.length} towns`);
    if (this.pathfinder && this.pathfinder.isReady()) {
      console.log('GPS routing enabled via pathfinder');
    }

    // Generate initial jobs
    this.refreshJobs();
  }

  /**
   * Generate a new job between two locations
   * @returns {Object} Job object
   */
  generateJob() {
    // Get all possible locations (cities and larger towns)
    const locations = [...this.cities, ...this.towns.filter(t => t.name)];

    if (locations.length < 2) {
      console.warn('Not enough locations to generate jobs');
      return null;
    }

    // Pick random origin and destination
    const originIndex = Math.floor(Math.random() * locations.length);
    let destIndex;
    do {
      destIndex = Math.floor(Math.random() * locations.length);
    } while (destIndex === originIndex);

    const origin = locations[originIndex];
    const destination = locations[destIndex];

    // Calculate distance
    const dx = destination.x - origin.x;
    const dz = destination.z - origin.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const distanceKm = distance / 1000;

    // Pick random cargo type
    const cargoTypes = Object.values(CargoTypes);
    const cargo = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];

    // Calculate payment based on distance and cargo
    const basePay = cargo.basePayRate * distanceKm;
    const bonusMultiplier = 1 + Math.random() * 0.3; // 0-30% bonus
    const payment = Math.round(basePay * bonusMultiplier);

    // Calculate time limit (if time sensitive)
    let timeLimit = null;
    if (cargo.timeSensitive) {
      // Roughly 1 minute per km at average speed
      timeLimit = Math.round(distanceKm * 60 + 120); // seconds, with 2 min buffer
    }

    return {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      cargo: cargo,
      origin: {
        name: origin.name || 'Unknown Location',
        x: origin.x,
        z: origin.z,
        type: origin.type,
      },
      destination: {
        name: destination.name || 'Unknown Location',
        x: destination.x,
        z: destination.z,
        type: destination.type,
      },
      distance: distance,
      distanceKm: distanceKm,
      payment: payment,
      timeLimit: timeLimit,
      createdAt: Date.now(),
      status: 'available', // available, active, completed, failed
    };
  }

  /**
   * Refresh available jobs
   */
  refreshJobs() {
    // Remove old jobs and generate new ones
    this.availableJobs = [];

    for (let i = 0; i < this.maxAvailableJobs; i++) {
      const job = this.generateJob();
      if (job) {
        this.availableJobs.push(job);
      }
    }

    this.lastRefresh = Date.now();

    if (this.onJobsRefreshed) {
      this.onJobsRefreshed(this.availableJobs);
    }

    console.log(`Generated ${this.availableJobs.length} new jobs`);
  }

  /**
   * Accept a job
   * @param {string} jobId - Job ID to accept
   * @returns {Object|null} Accepted job or null if failed
   */
  acceptJob(jobId) {
    // Can't accept if already have an active job
    if (this.activeJob) {
      console.warn('Already have an active job');
      return null;
    }

    // Find the job
    const jobIndex = this.availableJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      console.warn('Job not found');
      return null;
    }

    // Remove from available and set as active
    const job = this.availableJobs.splice(jobIndex, 1)[0];
    job.status = 'active';
    job.startedAt = Date.now();
    job.startPosition = null; // Will be set when player position is known
    job.damage = 0; // Cargo damage percentage (0-100)

    this.activeJob = job;

    console.log(`Accepted job: ${job.cargo.name} from ${job.origin.name} to ${job.destination.name}`);

    return job;
  }

  /**
   * Cancel active job
   * @returns {boolean} Success
   */
  cancelJob() {
    if (!this.activeJob) {
      return false;
    }

    this.activeJob.status = 'cancelled';
    this.activeJob = null;

    console.log('Job cancelled');
    return true;
  }

  /**
   * Apply damage to cargo from collisions
   * @param {number} amount - Damage amount (0-100 scale based on impact)
   * @returns {number} New total damage, or -1 if no active job
   */
  applyDamage(amount) {
    if (!this.activeJob) return -1;

    // Fragile cargo takes more damage
    const multiplier = this.activeJob.cargo.fragile ? 2.0 : 1.0;
    const actualDamage = amount * multiplier;

    this.activeJob.damage = Math.min(100, this.activeJob.damage + actualDamage);

    // Check for critical damage (>= 80%)
    if (this.activeJob.damage >= 80) {
      this.failJob('Cargo critically damaged');
    }

    return this.activeJob.damage;
  }

  /**
   * Get current cargo damage
   * @returns {number} Damage percentage (0-100), or 0 if no active job
   */
  getCargoDamage() {
    return this.activeJob ? this.activeJob.damage : 0;
  }

  /**
   * Update job system
   * @param {number} playerX - Player X position
   * @param {number} playerZ - Player Z position
   * @param {number} deltaTime - Time since last update (seconds)
   */
  update(playerX, playerZ, deltaTime) {
    // Check if we need to refresh jobs
    if (Date.now() - this.lastRefresh > this.jobRefreshInterval) {
      // Only refresh if no active job
      if (!this.activeJob) {
        this.refreshJobs();
      }
    }

    // Check active job progress
    if (this.activeJob) {
      this.checkJobProgress(playerX, playerZ);
    }
  }

  /**
   * Check progress of active job
   * @param {number} playerX
   * @param {number} playerZ
   */
  checkJobProgress(playerX, playerZ) {
    const job = this.activeJob;
    if (!job) return;

    // Set start position if not set
    if (!job.startPosition) {
      job.startPosition = { x: playerX, z: playerZ };
    }

    // Check if player is at destination
    const dx = playerX - job.destination.x;
    const dz = playerZ - job.destination.z;
    const distToDestination = Math.sqrt(dx * dx + dz * dz);

    // Arrival threshold (50 meters)
    if (distToDestination < 50) {
      this.completeJob();
      return;
    }

    // Check time limit
    if (job.timeLimit) {
      const elapsed = (Date.now() - job.startedAt) / 1000;
      if (elapsed > job.timeLimit) {
        this.failJob('Time limit exceeded');
        return;
      }
    }
  }

  /**
   * Complete the active job
   */
  completeJob() {
    if (!this.activeJob) return;

    const job = this.activeJob;
    job.status = 'completed';
    job.completedAt = Date.now();

    // Calculate actual payment (could add bonuses/penalties)
    const timeTaken = (job.completedAt - job.startedAt) / 1000;
    let finalPayment = job.payment;

    // Early delivery bonus (within 80% of time limit)
    if (job.timeLimit && timeTaken < job.timeLimit * 0.8) {
      const bonus = Math.round(job.payment * 0.2);
      finalPayment += bonus;
      job.bonus = bonus;
      console.log(`Early delivery bonus: ₱${bonus}`);
    }

    // Cargo damage penalty (up to 50% reduction based on damage)
    if (job.damage > 0) {
      const damagePenaltyPercent = Math.min(50, job.damage * 0.5); // 0-50% penalty
      const damagePenalty = Math.round(job.payment * (damagePenaltyPercent / 100));
      finalPayment -= damagePenalty;
      job.damagePenalty = damagePenalty;
      console.log(`Cargo damage penalty (${job.damage.toFixed(1)}% damage): -₱${damagePenalty}`);
    }

    job.finalPayment = Math.max(0, finalPayment);

    // Update stats
    this.totalEarnings += job.finalPayment;
    this.totalDeliveries++;
    this.totalDistance += job.distanceKm;

    // Add to history
    this.completedJobs.push(job);

    // Clear active job
    this.activeJob = null;

    console.log(`Job completed! Earned ₱${finalPayment}`);

    if (this.onJobCompleted) {
      this.onJobCompleted(job);
    }
  }

  /**
   * Fail the active job
   * @param {string} reason
   */
  failJob(reason) {
    if (!this.activeJob) return;

    const job = this.activeJob;
    job.status = 'failed';
    job.failReason = reason;
    job.failedAt = Date.now();

    // Penalty
    const penalty = Math.round(job.payment * 0.3);
    job.penalty = penalty;

    this.activeJob = null;

    console.log(`Job failed: ${reason}. Penalty: ₱${penalty}`);

    if (this.onJobFailed) {
      this.onJobFailed(job);
    }

    return penalty;
  }

  /**
   * Get distance to destination
   * @param {number} playerX
   * @param {number} playerZ
   * @returns {number} Distance in meters, or -1 if no active job
   */
  getDistanceToDestination(playerX, playerZ) {
    if (!this.activeJob) return -1;

    const dx = playerX - this.activeJob.destination.x;
    const dz = playerZ - this.activeJob.destination.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Get time remaining for active job
   * @returns {number} Seconds remaining, -1 if no limit, 0 if no job
   */
  getTimeRemaining() {
    if (!this.activeJob) return 0;
    if (!this.activeJob.timeLimit) return -1;

    const elapsed = (Date.now() - this.activeJob.startedAt) / 1000;
    return Math.max(0, this.activeJob.timeLimit - elapsed);
  }

  /**
   * Get route points from origin to destination
   * Uses pathfinder for road-based routing if available
   * @returns {Array|null} Array of [x, z] points or null if no active job
   */
  getRoutePoints() {
    if (!this.activeJob) return null;

    const origin = this.activeJob.origin;
    const destination = this.activeJob.destination;

    // Use pathfinder for road-based routing if available
    if (this.pathfinder && this.pathfinder.isReady()) {
      const path = this.pathfinder.findPath(
        origin.x, origin.z,
        destination.x, destination.z
      );
      if (path && path.length > 0) {
        return path;
      }
    }

    // Fallback to direct line if no pathfinder or no path found
    return [
      [origin.x, origin.z],
      [destination.x, destination.z],
    ];
  }

  /**
   * Get player statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalEarnings: this.totalEarnings,
      totalDeliveries: this.totalDeliveries,
      totalDistance: this.totalDistance,
      completedJobs: this.completedJobs.length,
    };
  }
}

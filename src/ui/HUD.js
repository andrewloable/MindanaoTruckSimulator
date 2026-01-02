/**
 * HUD - Heads-Up Display for in-game information
 *
 * Displays speedometer, fuel gauge, time, currency, and navigation.
 */

export class HUD {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.element = null;

    // HUD state
    this.speed = 0;          // km/h
    this.fuel = 100;         // percentage
    this.time = 10;          // hour (0-24)
    this.money = 0;          // PHP currency
    this.damage = 0;         // percentage

    // Elements for updates
    this.speedValue = null;
    this.fuelBar = null;
    this.timeValue = null;
    this.moneyValue = null;
    this.damageBar = null;
  }

  /**
   * Create and register the HUD
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerOverlay('hud', this.element);
  }

  /**
   * Add CSS styles to document
   */
  addStyles() {
    if (document.getElementById('hud-styles')) return;

    const style = document.createElement('style');
    style.id = 'hud-styles';
    style.textContent = `
      .hud {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* Speedometer - Bottom Right */
      .hud__speedo {
        position: absolute;
        bottom: 30px;
        right: 30px;
        width: 140px;
        height: 140px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 3px solid rgba(255, 255, 255, 0.3);
      }
      .hud__speedo-value {
        color: white;
        font-size: 36px;
        font-weight: bold;
        line-height: 1;
      }
      .hud__speedo-unit {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        margin-top: 4px;
      }

      /* Info Panel - Bottom Left */
      .hud__info {
        position: absolute;
        bottom: 30px;
        left: 30px;
        background: rgba(0, 0, 0, 0.6);
        padding: 15px 20px;
        border-radius: 8px;
        min-width: 180px;
      }
      .hud__info-row {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }
      .hud__info-row:last-child {
        margin-bottom: 0;
      }
      .hud__info-label {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        width: 60px;
        text-transform: uppercase;
      }
      .hud__info-value {
        color: white;
        font-size: 14px;
        font-weight: 600;
      }

      /* Gauge bars */
      .hud__gauge {
        flex: 1;
        height: 10px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        overflow: hidden;
      }
      .hud__gauge-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.3s ease;
      }
      .hud__gauge-fill--fuel {
        background: linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71);
      }
      .hud__gauge-fill--damage {
        background: linear-gradient(90deg, #2ecc71, #f39c12, #e74c3c);
      }

      /* Top bar - Time & Money */
      .hud__top {
        position: absolute;
        top: 20px;
        right: 30px;
        display: flex;
        gap: 20px;
      }
      .hud__top-item {
        background: rgba(0, 0, 0, 0.6);
        padding: 10px 16px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .hud__top-icon {
        font-size: 16px;
      }
      .hud__top-value {
        color: white;
        font-size: 16px;
        font-weight: 600;
      }
      .hud__top-value--money {
        color: #4CAF50;
      }

      /* Controls hint - Top Left */
      .hud__controls {
        position: absolute;
        top: 20px;
        left: 30px;
        background: rgba(0, 0, 0, 0.4);
        padding: 8px 12px;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the HUD element using DOM methods
   * @returns {HTMLElement}
   */
  createElement() {
    this.addStyles();

    const hud = document.createElement('div');
    hud.className = 'hud';

    // Speedometer
    const speedo = document.createElement('div');
    speedo.className = 'hud__speedo';

    this.speedValue = document.createElement('div');
    this.speedValue.className = 'hud__speedo-value';
    this.speedValue.textContent = '0';
    speedo.appendChild(this.speedValue);

    const speedUnit = document.createElement('div');
    speedUnit.className = 'hud__speedo-unit';
    speedUnit.textContent = 'km/h';
    speedo.appendChild(speedUnit);

    hud.appendChild(speedo);

    // Info panel (fuel, damage)
    const info = document.createElement('div');
    info.className = 'hud__info';

    // Fuel row
    const fuelRow = this.createGaugeRow('Fuel', 'fuel');
    this.fuelBar = fuelRow.querySelector('.hud__gauge-fill');
    info.appendChild(fuelRow);

    // Damage row
    const damageRow = this.createGaugeRow('Damage', 'damage');
    this.damageBar = damageRow.querySelector('.hud__gauge-fill');
    info.appendChild(damageRow);

    hud.appendChild(info);

    // Top bar (time, money)
    const top = document.createElement('div');
    top.className = 'hud__top';

    // Time
    const timeItem = document.createElement('div');
    timeItem.className = 'hud__top-item';
    const timeIcon = document.createElement('span');
    timeIcon.className = 'hud__top-icon';
    timeIcon.textContent = '\u2600'; // sun symbol
    timeItem.appendChild(timeIcon);
    this.timeValue = document.createElement('span');
    this.timeValue.className = 'hud__top-value';
    this.timeValue.textContent = '10:00';
    timeItem.appendChild(this.timeValue);
    top.appendChild(timeItem);

    // Money
    const moneyItem = document.createElement('div');
    moneyItem.className = 'hud__top-item';
    const moneyIcon = document.createElement('span');
    moneyIcon.className = 'hud__top-icon';
    moneyIcon.textContent = '\u20B1'; // peso symbol
    moneyItem.appendChild(moneyIcon);
    this.moneyValue = document.createElement('span');
    this.moneyValue.className = 'hud__top-value hud__top-value--money';
    this.moneyValue.textContent = '0';
    moneyItem.appendChild(this.moneyValue);
    top.appendChild(moneyItem);

    hud.appendChild(top);

    // Controls hint
    const controls = document.createElement('div');
    controls.className = 'hud__controls';
    controls.textContent = 'WASD: Drive | Space: Brake | C: Camera | ESC: Pause';
    hud.appendChild(controls);

    return hud;
  }

  /**
   * Create a gauge row
   * @param {string} label
   * @param {string} type - 'fuel' or 'damage'
   * @returns {HTMLElement}
   */
  createGaugeRow(label, type) {
    const row = document.createElement('div');
    row.className = 'hud__info-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'hud__info-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const gauge = document.createElement('div');
    gauge.className = 'hud__gauge';

    const fill = document.createElement('div');
    fill.className = `hud__gauge-fill hud__gauge-fill--${type}`;
    fill.style.width = type === 'fuel' ? '100%' : '0%';
    gauge.appendChild(fill);

    row.appendChild(gauge);
    return row;
  }

  /**
   * Update speed display
   * @param {number} speedMps - Speed in meters per second
   */
  setSpeed(speedMps) {
    this.speed = Math.round(speedMps * 3.6); // Convert m/s to km/h
    if (this.speedValue) {
      this.speedValue.textContent = this.speed.toString();
    }
  }

  /**
   * Update fuel level
   * @param {number} percent - Fuel percentage (0-100)
   */
  setFuel(percent) {
    this.fuel = Math.max(0, Math.min(100, percent));
    if (this.fuelBar) {
      this.fuelBar.style.width = `${this.fuel}%`;
    }
  }

  /**
   * Update damage level
   * @param {number} percent - Damage percentage (0-100)
   */
  setDamage(percent) {
    this.damage = Math.max(0, Math.min(100, percent));
    if (this.damageBar) {
      this.damageBar.style.width = `${this.damage}%`;
    }
  }

  /**
   * Update time display
   * @param {number} hour - Hour (0-24)
   */
  setTime(hour) {
    this.time = hour;
    if (this.timeValue) {
      const hours = Math.floor(hour);
      const minutes = Math.floor((hour % 1) * 60);
      this.timeValue.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Update money display
   * @param {number} amount - Money amount
   */
  setMoney(amount) {
    this.money = amount;
    if (this.moneyValue) {
      this.moneyValue.textContent = amount.toLocaleString();
    }
  }

  /**
   * Show the HUD
   */
  show() {
    this.uiManager.showOverlay('hud');
  }

  /**
   * Hide the HUD
   */
  hide() {
    this.uiManager.hideOverlay('hud');
  }
}

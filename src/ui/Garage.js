/**
 * Garage - View owned trucks and purchase new ones
 *
 * Features:
 * - Truck statistics display
 * - Dealership with available trucks
 * - Purchase confirmation dialog
 */

// Truck configurations (moved from vehicles/Truck.js)
export const TruckTypes = {
  STANDARD: {
    id: 'standard',
    name: 'Mindanao Hauler',
    description: 'Reliable workhorse for any cargo',
    price: 0,
    color: '#4CAF50',
    specs: {
      mass: 8000,
      enginePower: 350,
      maxSpeed: 90,
      fuelCapacity: 300,
      fuelEfficiency: 3,
    },
  },
  HEAVY: {
    id: 'heavy',
    name: 'Davao Titan',
    description: 'Heavy-duty truck for maximum cargo',
    price: 150000,
    color: '#1565C0',
    specs: {
      mass: 12000,
      enginePower: 450,
      maxSpeed: 80,
      fuelCapacity: 400,
      fuelEfficiency: 2.5,
    },
  },
  FAST: {
    id: 'fast',
    name: 'Island Express',
    description: 'Fast delivery truck for time-sensitive cargo',
    price: 200000,
    color: '#D32F2F',
    specs: {
      mass: 6000,
      enginePower: 400,
      maxSpeed: 110,
      fuelCapacity: 250,
      fuelEfficiency: 2.8,
    },
  },
};

export class Garage {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.element = null;
    this.isVisible = false;

    // State
    this.ownedTrucks = ['standard'];
    this.activeTruckId = 'standard';
    this.selectedTruckId = 'standard';
    this.playerMoney = 0;

    // Callbacks
    this.onPurchase = null;
    this.onSelectTruck = null;
  }

  init() {
    this.element = this.createElement();
    this.uiManager.registerScreen('garage', this.element);
    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('garage-styles')) return;

    const style = document.createElement('style');
    style.id = 'garage-styles';
    style.textContent = `
      .garage {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', system-ui, sans-serif;
        z-index: 1000;
      }

      .garage__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 40px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .garage__title {
        font-size: 28px;
        font-weight: 600;
        letter-spacing: 2px;
      }

      .garage__balance {
        font-size: 24px;
        color: #4CAF50;
      }

      .garage__balance-label {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        margin-right: 8px;
      }

      .garage__content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .garage__preview {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        position: relative;
      }

      .garage__truck-preview {
        width: 300px;
        height: 200px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 100px;
        margin-bottom: 20px;
      }

      .garage__truck-info {
        text-align: center;
      }

      .garage__truck-name {
        font-size: 32px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .garage__truck-desc {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 16px;
      }

      .garage__truck-price {
        font-size: 20px;
        color: #FFD700;
      }

      .garage__truck-price--owned {
        color: #4CAF50;
      }

      .garage__truck-active {
        display: inline-block;
        padding: 4px 12px;
        background: #4CAF50;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 10px;
      }

      .garage__sidebar {
        width: 350px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
      }

      .garage__section-title {
        padding: 16px 20px;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.6);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .garage__stats {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .garage__stat {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }

      .garage__stat-label {
        color: rgba(255, 255, 255, 0.6);
      }

      .garage__stat-value {
        font-weight: 500;
      }

      .garage__stat-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        margin-top: 4px;
        overflow: hidden;
      }

      .garage__stat-fill {
        height: 100%;
        background: #4CAF50;
        border-radius: 2px;
        transition: width 0.3s;
      }

      .garage__trucks {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
      }

      .garage__truck-card {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 10px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s;
      }

      .garage__truck-card:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .garage__truck-card--selected {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.1);
      }

      .garage__truck-card--owned {
        border-color: rgba(76, 175, 80, 0.3);
      }

      .garage__card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .garage__card-name {
        font-weight: 600;
      }

      .garage__card-price {
        font-size: 14px;
        color: #FFD700;
      }

      .garage__card-price--owned {
        color: #4CAF50;
      }

      .garage__card-desc {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      .garage__actions {
        padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        gap: 10px;
      }

      .garage__btn {
        flex: 1;
        padding: 14px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .garage__btn--primary {
        background: #4CAF50;
        color: white;
      }

      .garage__btn--primary:hover {
        background: #45a049;
      }

      .garage__btn--primary:disabled {
        background: #333;
        color: #666;
        cursor: not-allowed;
      }

      .garage__btn--secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .garage__btn--secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .garage__close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .garage__close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .garage__dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
      }

      .garage__dialog-content {
        background: #1a1a2e;
        padding: 30px 40px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
      }

      .garage__dialog-title {
        font-size: 24px;
        margin-bottom: 16px;
      }

      .garage__dialog-message {
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 24px;
        line-height: 1.5;
      }

      .garage__dialog-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }

  createElement() {
    const container = document.createElement('div');
    container.className = 'garage';
    container.style.display = 'none';

    // Header
    const header = document.createElement('div');
    header.className = 'garage__header';

    const title = document.createElement('div');
    title.className = 'garage__title';
    title.textContent = 'GARAGE';
    header.appendChild(title);

    const balance = document.createElement('div');
    balance.className = 'garage__balance';
    const balanceLabel = document.createElement('span');
    balanceLabel.className = 'garage__balance-label';
    balanceLabel.textContent = 'Balance:';
    balance.appendChild(balanceLabel);
    this.balanceValue = document.createElement('span');
    this.balanceValue.textContent = '\u20B1 0';
    balance.appendChild(this.balanceValue);
    header.appendChild(balance);

    container.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'garage__content';

    // Preview section
    const preview = document.createElement('div');
    preview.className = 'garage__preview';

    this.truckPreview = document.createElement('div');
    this.truckPreview.className = 'garage__truck-preview';
    this.truckPreview.textContent = '🚛';
    preview.appendChild(this.truckPreview);

    this.truckInfo = document.createElement('div');
    this.truckInfo.className = 'garage__truck-info';
    preview.appendChild(this.truckInfo);

    content.appendChild(preview);

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'garage__sidebar';

    const statsTitle = document.createElement('div');
    statsTitle.className = 'garage__section-title';
    statsTitle.textContent = 'Specifications';
    sidebar.appendChild(statsTitle);

    this.statsContainer = document.createElement('div');
    this.statsContainer.className = 'garage__stats';
    sidebar.appendChild(this.statsContainer);

    const trucksTitle = document.createElement('div');
    trucksTitle.className = 'garage__section-title';
    trucksTitle.textContent = 'Available Trucks';
    sidebar.appendChild(trucksTitle);

    this.trucksContainer = document.createElement('div');
    this.trucksContainer.className = 'garage__trucks';
    sidebar.appendChild(this.trucksContainer);

    this.actionsContainer = document.createElement('div');
    this.actionsContainer.className = 'garage__actions';
    sidebar.appendChild(this.actionsContainer);

    content.appendChild(sidebar);
    container.appendChild(content);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'garage__close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.hide());
    container.appendChild(closeBtn);

    this.populateTrucksList();
    this.updateTruckInfo();
    this.updateStats();
    this.updateActions();

    return container;
  }

  clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  populateTrucksList() {
    this.clearElement(this.trucksContainer);

    for (const truckType of Object.values(TruckTypes)) {
      const card = document.createElement('div');
      card.className = 'garage__truck-card';

      const isOwned = this.ownedTrucks.includes(truckType.id);
      const isSelected = truckType.id === this.selectedTruckId;

      if (isOwned) card.classList.add('garage__truck-card--owned');
      if (isSelected) card.classList.add('garage__truck-card--selected');

      const header = document.createElement('div');
      header.className = 'garage__card-header';

      const name = document.createElement('div');
      name.className = 'garage__card-name';
      name.textContent = truckType.name;
      header.appendChild(name);

      const price = document.createElement('div');
      price.className = 'garage__card-price';
      if (isOwned) {
        price.className += ' garage__card-price--owned';
        price.textContent = 'Owned';
      } else {
        price.textContent = '\u20B1 ' + truckType.price.toLocaleString();
      }
      header.appendChild(price);

      card.appendChild(header);

      const desc = document.createElement('div');
      desc.className = 'garage__card-desc';
      desc.textContent = truckType.description;
      card.appendChild(desc);

      card.addEventListener('click', () => this.selectTruck(truckType.id));

      this.trucksContainer.appendChild(card);
    }
  }

  selectTruck(truckId) {
    this.selectedTruckId = truckId;
    this.updateTruckInfo();
    this.updateStats();
    this.updateActions();
    this.populateTrucksList();
  }

  updateTruckInfo() {
    const truckType = Object.values(TruckTypes).find(t => t.id === this.selectedTruckId);
    if (!truckType) return;

    const isOwned = this.ownedTrucks.includes(truckType.id);
    const isActive = truckType.id === this.activeTruckId;

    // Update preview color
    this.truckPreview.style.backgroundColor = truckType.color;

    this.clearElement(this.truckInfo);

    const name = document.createElement('div');
    name.className = 'garage__truck-name';
    name.textContent = truckType.name;
    if (isActive) {
      const activeTag = document.createElement('span');
      activeTag.className = 'garage__truck-active';
      activeTag.textContent = 'ACTIVE';
      name.appendChild(activeTag);
    }
    this.truckInfo.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'garage__truck-desc';
    desc.textContent = truckType.description;
    this.truckInfo.appendChild(desc);

    const price = document.createElement('div');
    price.className = 'garage__truck-price';
    if (isOwned) {
      price.className += ' garage__truck-price--owned';
      price.textContent = 'Owned';
    } else {
      price.textContent = '\u20B1 ' + truckType.price.toLocaleString();
    }
    this.truckInfo.appendChild(price);
  }

  updateStats() {
    const truckType = Object.values(TruckTypes).find(t => t.id === this.selectedTruckId);
    if (!truckType) return;

    const specs = truckType.specs;
    this.clearElement(this.statsContainer);

    const stats = [
      { label: 'Engine Power', value: specs.enginePower + ' HP', percent: specs.enginePower / 500 },
      { label: 'Max Speed', value: specs.maxSpeed + ' km/h', percent: specs.maxSpeed / 120 },
      { label: 'Fuel Capacity', value: specs.fuelCapacity + ' L', percent: specs.fuelCapacity / 400 },
      { label: 'Fuel Efficiency', value: specs.fuelEfficiency + ' km/L', percent: specs.fuelEfficiency / 4 },
      { label: 'Weight', value: (specs.mass / 1000).toFixed(1) + ' tons', percent: 1 - specs.mass / 15000 },
    ];

    for (const stat of stats) {
      const statDiv = document.createElement('div');
      statDiv.className = 'garage__stat';

      const label = document.createElement('span');
      label.className = 'garage__stat-label';
      label.textContent = stat.label;
      statDiv.appendChild(label);

      const value = document.createElement('span');
      value.className = 'garage__stat-value';
      value.textContent = stat.value;
      statDiv.appendChild(value);

      this.statsContainer.appendChild(statDiv);

      const bar = document.createElement('div');
      bar.className = 'garage__stat-bar';
      const fill = document.createElement('div');
      fill.className = 'garage__stat-fill';
      fill.style.width = Math.min(100, stat.percent * 100) + '%';
      bar.appendChild(fill);
      this.statsContainer.appendChild(bar);
    }
  }

  updateActions() {
    const truckType = Object.values(TruckTypes).find(t => t.id === this.selectedTruckId);
    if (!truckType) return;

    const isOwned = this.ownedTrucks.includes(truckType.id);
    const isActive = truckType.id === this.activeTruckId;
    const canAfford = this.playerMoney >= truckType.price;

    this.clearElement(this.actionsContainer);

    if (isOwned) {
      if (!isActive) {
        const selectBtn = document.createElement('button');
        selectBtn.className = 'garage__btn garage__btn--primary';
        selectBtn.textContent = 'Select This Truck';
        selectBtn.addEventListener('click', () => this.setActiveTruck(truckType.id));
        this.actionsContainer.appendChild(selectBtn);
      } else {
        const activeBtn = document.createElement('button');
        activeBtn.className = 'garage__btn garage__btn--secondary';
        activeBtn.textContent = 'Currently Active';
        activeBtn.disabled = true;
        this.actionsContainer.appendChild(activeBtn);
      }
    } else {
      const buyBtn = document.createElement('button');
      buyBtn.className = 'garage__btn garage__btn--primary';
      buyBtn.textContent = 'Buy for \u20B1 ' + truckType.price.toLocaleString();
      buyBtn.disabled = !canAfford;
      buyBtn.addEventListener('click', () => this.confirmPurchase(truckType));
      this.actionsContainer.appendChild(buyBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'garage__btn garage__btn--secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.hide());
    this.actionsContainer.appendChild(closeBtn);
  }

  confirmPurchase(truckType) {
    const dialog = document.createElement('div');
    dialog.className = 'garage__dialog';

    const content = document.createElement('div');
    content.className = 'garage__dialog-content';

    const title = document.createElement('div');
    title.className = 'garage__dialog-title';
    title.textContent = 'Buy ' + truckType.name + '?';
    content.appendChild(title);

    const message = document.createElement('div');
    message.className = 'garage__dialog-message';
    message.innerHTML = `
      You are about to purchase the <strong>${truckType.name}</strong>
      for <strong>\u20B1 ${truckType.price.toLocaleString()}</strong>.
      <br><br>
      Remaining balance: <strong>\u20B1 ${(this.playerMoney - truckType.price).toLocaleString()}</strong>
    `;
    content.appendChild(message);

    const actions = document.createElement('div');
    actions.className = 'garage__dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'garage__btn garage__btn--secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => dialog.remove());
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'garage__btn garage__btn--primary';
    confirmBtn.textContent = 'Confirm Purchase';
    confirmBtn.addEventListener('click', () => {
      this.purchaseTruck(truckType);
      dialog.remove();
    });
    actions.appendChild(confirmBtn);

    content.appendChild(actions);
    dialog.appendChild(content);
    this.element.appendChild(dialog);
  }

  purchaseTruck(truckType) {
    if (this.playerMoney < truckType.price) return;

    this.playerMoney -= truckType.price;
    this.ownedTrucks.push(truckType.id);

    if (this.onPurchase) {
      this.onPurchase(truckType.id, truckType.price);
    }

    this.updateBalance(this.playerMoney);
    this.populateTrucksList();
    this.updateTruckInfo();
    this.updateActions();
  }

  setActiveTruck(truckId) {
    this.activeTruckId = truckId;

    if (this.onSelectTruck) {
      this.onSelectTruck(truckId);
    }

    this.updateTruckInfo();
    this.updateActions();
  }

  updateBalance(amount) {
    this.playerMoney = amount;
    if (this.balanceValue) {
      this.balanceValue.textContent = '\u20B1 ' + amount.toLocaleString();
    }
    this.updateActions();
  }

  show() {
    this.element.style.display = 'flex';
    this.isVisible = true;
    this.uiManager.showScreen('garage');
  }

  hide() {
    this.element.style.display = 'none';
    this.isVisible = false;
    this.uiManager.hideScreen('garage');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

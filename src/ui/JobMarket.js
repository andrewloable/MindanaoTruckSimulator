/**
 * JobMarket - Job selection screen UI
 *
 * Displays available jobs and allows player to accept one.
 */

export class JobMarket {
  constructor(uiManager, jobSystem, callbacks = {}) {
    this.uiManager = uiManager;
    this.jobSystem = jobSystem;
    this.callbacks = callbacks;
    this.element = null;
    this.jobListElement = null;
    this.selectedJobId = null;
  }

  /**
   * Initialize the job market screen
   */
  init() {
    this.element = this.createElement();
    this.uiManager.registerScreen('job-market', this.element);
    this.addStyles();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('job-market-styles')) return;

    const style = document.createElement('style');
    style.id = 'job-market-styles';
    style.textContent = `
      .job-market {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .job-market__container {
        background: linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 100%);
        border-radius: 16px;
        padding: 30px;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 2px solid #2d4a2d;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      .job-market__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .job-market__title {
        color: #4CAF50;
        font-size: 28px;
        font-weight: bold;
        margin: 0;
      }

      .job-market__close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 24px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.2s;
      }
      .job-market__close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .job-market__list {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 20px;
      }

      .job-market__empty {
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        padding: 40px;
        font-size: 16px;
      }

      .job-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
      }
      .job-card:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(76, 175, 80, 0.3);
      }
      .job-card--selected {
        background: rgba(76, 175, 80, 0.15);
        border-color: #4CAF50;
      }

      .job-card__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }

      .job-card__cargo {
        color: white;
        font-size: 18px;
        font-weight: 600;
      }

      .job-card__payment {
        color: #4CAF50;
        font-size: 20px;
        font-weight: bold;
      }

      .job-card__route {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .job-card__location {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
      }
      .job-card__location--origin {
        color: #ffaa00;
      }
      .job-card__location--dest {
        color: #ff6600;
      }

      .job-card__arrow {
        color: rgba(255, 255, 255, 0.4);
        font-size: 18px;
      }

      .job-card__details {
        display: flex;
        gap: 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
      }

      .job-card__detail {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .job-card__tag {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 10px;
      }
      .job-card__tag--fragile {
        background: #e91e63;
        color: white;
      }
      .job-card__tag--urgent {
        background: #ff5722;
        color: white;
      }
      .job-card__tag--hazardous {
        background: #f44336;
        color: white;
      }

      .job-market__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .job-market__stats {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
      }

      .job-market__actions {
        display: flex;
        gap: 12px;
      }

      .job-market__btn {
        padding: 12px 30px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .job-market__btn--accept {
        background: #4CAF50;
        color: white;
      }
      .job-market__btn--accept:hover:not(:disabled) {
        background: #45a049;
        transform: translateY(-2px);
      }
      .job-market__btn--accept:disabled {
        background: #2d4a2d;
        color: rgba(255, 255, 255, 0.3);
        cursor: not-allowed;
      }

      .job-market__btn--refresh {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .job-market__btn--refresh:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create the job market element
   * @returns {HTMLElement}
   */
  createElement() {
    const container = document.createElement('div');
    container.className = 'job-market';

    const box = document.createElement('div');
    box.className = 'job-market__container';

    // Header
    const header = document.createElement('div');
    header.className = 'job-market__header';

    const title = document.createElement('h2');
    title.className = 'job-market__title';
    title.textContent = 'Job Market';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'job-market__close';
    closeBtn.textContent = '\u00D7'; // ×
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    box.appendChild(header);

    // Job list
    this.jobListElement = document.createElement('div');
    this.jobListElement.className = 'job-market__list';
    box.appendChild(this.jobListElement);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'job-market__footer';

    this.statsElement = document.createElement('div');
    this.statsElement.className = 'job-market__stats';
    footer.appendChild(this.statsElement);

    const actions = document.createElement('div');
    actions.className = 'job-market__actions';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'job-market__btn job-market__btn--refresh';
    refreshBtn.textContent = 'Refresh Jobs';
    refreshBtn.addEventListener('click', () => this.refresh());
    actions.appendChild(refreshBtn);

    this.acceptBtn = document.createElement('button');
    this.acceptBtn.className = 'job-market__btn job-market__btn--accept';
    this.acceptBtn.textContent = 'Accept Job';
    this.acceptBtn.disabled = true;
    this.acceptBtn.addEventListener('click', () => this.acceptSelectedJob());
    actions.appendChild(this.acceptBtn);

    footer.appendChild(actions);
    box.appendChild(footer);

    container.appendChild(box);

    // Close on background click
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        this.hide();
      }
    });

    return container;
  }

  /**
   * Update the job list display
   */
  updateJobList() {
    if (!this.jobListElement) return;

    // Clear existing jobs
    this.jobListElement.textContent = '';

    const jobs = this.jobSystem.availableJobs;

    if (jobs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'job-market__empty';
      empty.textContent = 'No jobs available. Check back later!';
      this.jobListElement.appendChild(empty);
      return;
    }

    for (const job of jobs) {
      const card = this.createJobCard(job);
      this.jobListElement.appendChild(card);
    }
  }

  /**
   * Create a job card element
   * @param {Object} job
   * @returns {HTMLElement}
   */
  createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    if (job.id === this.selectedJobId) {
      card.classList.add('job-card--selected');
    }

    card.addEventListener('click', () => this.selectJob(job.id));

    // Header (cargo name + payment)
    const header = document.createElement('div');
    header.className = 'job-card__header';

    const cargoName = document.createElement('div');
    cargoName.className = 'job-card__cargo';
    cargoName.textContent = job.cargo.name;

    // Add tags
    if (job.cargo.fragile) {
      const tag = document.createElement('span');
      tag.className = 'job-card__tag job-card__tag--fragile';
      tag.textContent = 'FRAGILE';
      cargoName.appendChild(tag);
    }
    if (job.cargo.timeSensitive) {
      const tag = document.createElement('span');
      tag.className = 'job-card__tag job-card__tag--urgent';
      tag.textContent = 'URGENT';
      cargoName.appendChild(tag);
    }
    if (job.cargo.hazardous) {
      const tag = document.createElement('span');
      tag.className = 'job-card__tag job-card__tag--hazardous';
      tag.textContent = 'HAZMAT';
      cargoName.appendChild(tag);
    }

    header.appendChild(cargoName);

    const payment = document.createElement('div');
    payment.className = 'job-card__payment';
    payment.textContent = `\u20B1${job.payment.toLocaleString()}`;
    header.appendChild(payment);

    card.appendChild(header);

    // Route
    const route = document.createElement('div');
    route.className = 'job-card__route';

    const origin = document.createElement('span');
    origin.className = 'job-card__location job-card__location--origin';
    origin.textContent = job.origin.name;
    route.appendChild(origin);

    const arrow = document.createElement('span');
    arrow.className = 'job-card__arrow';
    arrow.textContent = '\u2192'; // →
    route.appendChild(arrow);

    const dest = document.createElement('span');
    dest.className = 'job-card__location job-card__location--dest';
    dest.textContent = job.destination.name;
    route.appendChild(dest);

    card.appendChild(route);

    // Details
    const details = document.createElement('div');
    details.className = 'job-card__details';

    const distance = document.createElement('span');
    distance.className = 'job-card__detail';
    distance.textContent = `\u{1F4CF} ${job.distanceKm.toFixed(1)} km`;
    details.appendChild(distance);

    if (job.timeLimit) {
      const time = document.createElement('span');
      time.className = 'job-card__detail';
      const minutes = Math.floor(job.timeLimit / 60);
      time.textContent = `\u23F1 ${minutes} min`;
      details.appendChild(time);
    }

    const weight = document.createElement('span');
    weight.className = 'job-card__detail';
    weight.textContent = `\u2696 ${job.cargo.weight}`;
    details.appendChild(weight);

    card.appendChild(details);

    return card;
  }

  /**
   * Select a job
   * @param {string} jobId
   */
  selectJob(jobId) {
    this.selectedJobId = jobId;
    this.acceptBtn.disabled = false;
    this.updateJobList();
  }

  /**
   * Accept the selected job
   */
  acceptSelectedJob() {
    if (!this.selectedJobId) return;

    const job = this.jobSystem.acceptJob(this.selectedJobId);
    if (job) {
      this.hide();
      if (this.callbacks.onJobAccepted) {
        this.callbacks.onJobAccepted(job);
      }
    }
  }

  /**
   * Refresh job list
   */
  refresh() {
    this.jobSystem.refreshJobs();
    this.selectedJobId = null;
    this.acceptBtn.disabled = true;
    this.updateJobList();
    this.updateStats();
  }

  /**
   * Update stats display
   */
  updateStats() {
    if (!this.statsElement) return;

    const stats = this.jobSystem.getStats();
    this.statsElement.textContent = `Deliveries: ${stats.totalDeliveries} | Total Earned: \u20B1${stats.totalEarnings.toLocaleString()}`;
  }

  /**
   * Show the job market
   */
  show() {
    this.selectedJobId = null;
    this.acceptBtn.disabled = true;
    this.updateJobList();
    this.updateStats();
    this.uiManager.showScreen('job-market');
  }

  /**
   * Hide the job market
   */
  hide() {
    this.uiManager.hideScreen('job-market');
    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }
}

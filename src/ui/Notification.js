/**
 * Notification - Toast notification system for game events
 *
 * Shows animated notifications for job completion, failures, achievements, etc.
 */

export class Notification {
  constructor(uiManager) {
    this.ui = uiManager;
    this.container = null;
    this.activeNotifications = [];
    this.maxVisible = 3;
    this.styleInjected = false;
  }

  /**
   * Initialize the notification system
   */
  init() {
    // Inject styles once
    if (!this.styleInjected) {
      this.injectStyles();
      this.styleInjected = true;
    }

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    document.body.appendChild(this.container);
  }

  /**
   * Inject CSS styles for notifications
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }

      .notification {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: rgba(20, 25, 35, 0.95);
        border-radius: 12px;
        border-left: 4px solid var(--notification-color, #4CAF50);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(10px);
        transform: translateX(120%);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto;
        min-width: 280px;
        max-width: 400px;
      }

      .notification.show {
        transform: translateX(0);
      }

      .notification.hide {
        transform: translateX(120%);
      }

      .notification-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--notification-color, #4CAF50);
        color: white;
        font-size: 20px;
        flex-shrink: 0;
      }

      .notification-content {
        flex: 1;
      }

      .notification-title {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 4px;
      }

      .notification-message {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      .notification-amount {
        font-size: 16px;
        font-weight: 700;
        color: var(--notification-color, #4CAF50);
        white-space: nowrap;
      }

      .notification.success {
        --notification-color: #4CAF50;
      }

      .notification.error {
        --notification-color: #e74c3c;
      }

      .notification.warning {
        --notification-color: #f39c12;
      }

      .notification.info {
        --notification-color: #3498db;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .notification-icon.pulse {
        animation: pulse 0.5s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show a notification
   * @param {Object} options - Notification options
   * @returns {HTMLElement} - The notification element
   */
  show(options = {}) {
    const {
      type = 'info', // success, error, warning, info
      title = '',
      message = '',
      amount = null,
      icon = null,
      duration = 4000,
    } = options;

    // Create notification element using DOM methods
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Icon container
    const iconEl = document.createElement('div');
    iconEl.className = 'notification-icon pulse';
    iconEl.textContent = icon || this.getDefaultIcon(type);
    notification.appendChild(iconEl);

    // Content container
    const contentEl = document.createElement('div');
    contentEl.className = 'notification-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'notification-title';
    titleEl.textContent = title;
    contentEl.appendChild(titleEl);

    if (message) {
      const messageEl = document.createElement('div');
      messageEl.className = 'notification-message';
      messageEl.textContent = message;
      contentEl.appendChild(messageEl);
    }

    notification.appendChild(contentEl);

    // Amount (if provided)
    if (amount !== null) {
      const amountEl = document.createElement('div');
      amountEl.className = 'notification-amount';
      amountEl.textContent = amount;
      notification.appendChild(amountEl);
    }

    // Add to container
    this.container.appendChild(notification);
    this.activeNotifications.push(notification);

    // Remove excess notifications
    while (this.activeNotifications.length > this.maxVisible) {
      const oldest = this.activeNotifications.shift();
      this.removeNotification(oldest);
    }

    // Trigger show animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * Get default icon for notification type
   * @param {string} type
   * @returns {string}
   */
  getDefaultIcon(type) {
    switch (type) {
      case 'success':
        return '\u2713'; // checkmark
      case 'error':
        return '\u2715'; // x mark
      case 'warning':
        return '\u26A0'; // warning sign
      case 'info':
      default:
        return '\u2139'; // info
    }
  }

  /**
   * Remove a notification
   * @param {HTMLElement} notification
   */
  removeNotification(notification) {
    if (!notification || !notification.parentNode) return;

    notification.classList.remove('show');
    notification.classList.add('hide');

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      const index = this.activeNotifications.indexOf(notification);
      if (index > -1) {
        this.activeNotifications.splice(index, 1);
      }
    }, 400);
  }

  /**
   * Show job completed notification
   * @param {Object} job - The completed job
   */
  showJobCompleted(job) {
    this.show({
      type: 'success',
      title: 'Job Completed!',
      message: `Delivered ${job.cargo.name} to ${job.destination.name}`,
      amount: `+\u20B1${job.finalPayment.toLocaleString()}`,
      icon: '\uD83D\uDCE6', // package emoji
      duration: 5000,
    });
  }

  /**
   * Show job failed notification
   * @param {Object} job - The failed job
   */
  showJobFailed(job) {
    this.show({
      type: 'error',
      title: 'Job Failed',
      message: job.failReason || 'Delivery could not be completed',
      amount: job.penalty ? `-\u20B1${job.penalty.toLocaleString()}` : null,
      icon: '\u274C', // x emoji
      duration: 5000,
    });
  }

  /**
   * Show money earned notification
   * @param {number} amount
   * @param {string} reason
   */
  showMoneyEarned(amount, reason = '') {
    this.show({
      type: 'success',
      title: 'Money Earned',
      message: reason,
      amount: `+\u20B1${amount.toLocaleString()}`,
      icon: '\uD83D\uDCB0', // money bag
    });
  }

  /**
   * Show money spent notification
   * @param {number} amount
   * @param {string} reason
   */
  showMoneySpent(amount, reason = '') {
    this.show({
      type: 'warning',
      title: 'Money Spent',
      message: reason,
      amount: `-\u20B1${amount.toLocaleString()}`,
      icon: '\uD83D\uDCB8', // money with wings
    });
  }

  /**
   * Show generic info notification
   * @param {string} title
   * @param {string} message
   */
  showInfo(title, message = '') {
    this.show({
      type: 'info',
      title,
      message,
    });
  }

  /**
   * Clear all notifications
   */
  clear() {
    for (const notification of [...this.activeNotifications]) {
      this.removeNotification(notification);
    }
  }

  /**
   * Dispose of the notification system
   */
  dispose() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

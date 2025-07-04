/**
 * Date Spoofer Extension - Popup Script
 * Production-ready popup interface with optimized state management
 */

// Import utilities (loaded via manifest)
const { CONSTANTS, storage, getTomorrowISO, debounce } = TimeSpooferUtils;

/**
 * Popup controller class for managing UI state and interactions
 */
class TimeSpooferPopup {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
    this.transitionTimeout = null;
    
    // Configuration
    this.config = {
      TRANSITION_DELAY: 2000,
      DEFAULT_DOMAINS: ''
    };

    // Bind methods to preserve context
    this.handleSpoofToggle = this.handleSpoofToggle.bind(this);
    this.handleQuickSpoofToggle = this.handleQuickSpoofToggle.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);
    this.handleWhitelistToggle = this.handleWhitelistToggle.bind(this);
    this.handleWhitelistInput = debounce(this.handleWhitelistInput.bind(this), 500);
    this.handleWhitelistBlur = this.handleWhitelistBlur.bind(this);
  }

  /**
   * Initialize popup when DOM is ready
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      this.cacheElements();
      this.setupEventListeners();
      await this.loadSettings();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize extension popup');
    }
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    const elementIds = [
      'toggle', 'quickToggle', 'status', 'statusText', 'statusIcon',
      'calendar', 'whitelistToggle', 'whitelist'
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (!element) {
        throw new Error(`Required element not found: ${id}`);
      }
      this.elements[id] = element;
    });
  }

  /**
   * Set up event listeners with proper cleanup
   */
  setupEventListeners() {
    const listeners = [
      [this.elements.toggle, 'change', this.handleSpoofToggle],
      [this.elements.quickToggle, 'change', this.handleQuickSpoofToggle],
      [this.elements.calendar, 'change', this.handleDateChange],
      [this.elements.whitelistToggle, 'change', this.handleWhitelistToggle],
      [this.elements.whitelist, 'input', this.handleWhitelistInput],
      [this.elements.whitelist, 'blur', this.handleWhitelistBlur]
    ];

    listeners.forEach(([element, event, handler]) => {
      element.addEventListener(event, handler);
    });

    // Store listeners for cleanup
    this.listeners = listeners;
  }

  /**
   * Load settings from storage and update UI
   */
  async loadSettings() {
    try {
      const settings = await storage.get(Object.values(CONSTANTS.STORAGE_KEYS));
      
      const {
        [CONSTANTS.STORAGE_KEYS.SPOOF_ENABLED]: spoofEnabled,
        [CONSTANTS.STORAGE_KEYS.QUICK_SPOOF_ENABLED]: quickSpoofEnabled,
        [CONSTANTS.STORAGE_KEYS.SPOOF_DATE]: spoofDate,
        [CONSTANTS.STORAGE_KEYS.WHITELIST_ENABLED]: whitelistEnabled,
        [CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS]: whitelistDomains
      } = settings;

      // Set toggle states
      const isEnabled = Boolean(spoofEnabled);
      const isQuickEnabled = Boolean(quickSpoofEnabled);
      this.elements.toggle.checked = isEnabled;
      this.elements.quickToggle.checked = isQuickEnabled;
      this.updateStatus(isEnabled || isQuickEnabled);

      // Set calendar value
      const dateToUse = spoofDate || getTomorrowISO();
      this.elements.calendar.value = dateToUse;

      // Set whitelist values
      this.elements.whitelistToggle.checked = Boolean(whitelistEnabled);
      this.elements.whitelist.value = whitelistDomains || this.config.DEFAULT_DOMAINS;

      // Update calendar state based on quick toggle setting
      this.updateCalendarState(isQuickEnabled);

      // Save default values if needed
      await this.saveDefaultsIfNeeded(settings, dateToUse);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showError('Failed to load extension settings');
    }
  }

  /**
   * Save default values if they don't exist
   * @param {Object} settings - Current settings
   * @param {string} dateToUse - Default date to use
   */
  async saveDefaultsIfNeeded(settings, dateToUse) {
    const toSave = {};
    
    if (!settings[CONSTANTS.STORAGE_KEYS.SPOOF_DATE]) {
      toSave[CONSTANTS.STORAGE_KEYS.SPOOF_DATE] = dateToUse;
    }
    if (settings[CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS] === undefined) {
      toSave[CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS] = this.config.DEFAULT_DOMAINS;
    }

    if (Object.keys(toSave).length > 0) {
      await storage.set(toSave);
    }
  }

  /**
   * Update status display with proper state management
   * @param {boolean} enabled - Whether spoofing is enabled
   * @param {string} state - Current state ('transitioning', etc.)
   * @param {string} customText - Custom status text
   */
  updateStatus(enabled, state = null, customText = null) {
    const { status, statusIcon, statusText } = this.elements;
    
    // Clear existing timeout
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    
    // Remove all status classes
    status.classList.remove('enabled', 'disabled', 'transitioning');
    
    if (state === 'transitioning') {
      status.classList.add('transitioning');
      statusIcon.textContent = '🔄';
      statusText.textContent = customText || 'Processing...';
    } else if (enabled) {
      status.classList.add('enabled');
      statusIcon.textContent = '✅';
      statusText.textContent = customText || 'Time spoofing is ENABLED';
    } else {
      status.classList.add('disabled');
      statusIcon.textContent = '❌';
      statusText.textContent = customText || 'Time spoofing is DISABLED';
    }
  }

  /**
   * Show error message to user
   * @param {string} message - Error message
   */
  showError(message) {
    this.updateStatus(false, 'error', `Error: ${message}`);
  }

  /**
   * Send message to background script safely
   * @param {Object} message - Message to send
   */
  sendMessage(message) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message to background script:', error);
      this.showError('Failed to communicate with background script');
    }
  }

  /**
   * Handle mutual exclusivity between toggles
   * @param {string} enabledToggle - Which toggle is being enabled ('spoof' or 'quick')
   */
  async handleToggleMutualExclusivity(enabledToggle) {
    if (enabledToggle === 'spoof' && this.elements.quickToggle.checked) {
      this.elements.quickToggle.checked = false;
      await storage.set({ [CONSTANTS.STORAGE_KEYS.QUICK_SPOOF_ENABLED]: false });
    } else if (enabledToggle === 'quick' && this.elements.toggle.checked) {
      this.elements.toggle.checked = false;
      await storage.set({ [CONSTANTS.STORAGE_KEYS.SPOOF_ENABLED]: false });
    }
  }

  /**
   * Update calendar input state based on quick toggle status
   * @param {boolean} isQuickEnabled - Whether quick toggle is enabled
   */
  updateCalendarState(isQuickEnabled) {
    this.elements.calendar.disabled = isQuickEnabled;
  }

  /**
   * Handle main spoofing toggle changes
   */
  async handleSpoofToggle() {
    try {
      const isEnabled = this.elements.toggle.checked;
      
      if (isEnabled) {
        await this.handleToggleMutualExclusivity('spoof');
      }
      
      // Update calendar state - enable when main toggle is used (quick toggle is disabled)
      this.updateCalendarState(this.elements.quickToggle.checked);
      
      const anyEnabled = isEnabled || this.elements.quickToggle.checked;
      this.updateStatus(anyEnabled, 'transitioning');
      this.sendMessage({ toggleSpoof: isEnabled });

      await this.showTransitionStatus(anyEnabled);
    } catch (error) {
      console.error('Error handling spoof toggle:', error);
      this.showError('Failed to toggle spoofing');
    }
  }

  /**
   * Handle quick (24h) spoofing toggle changes
   */
  async handleQuickSpoofToggle() {
    try {
      const isQuickEnabled = this.elements.quickToggle.checked;
      
      if (isQuickEnabled) {
        await this.handleToggleMutualExclusivity('quick');
        
        // Set date to tomorrow
        const tomorrowDate = getTomorrowISO();
        this.elements.calendar.value = tomorrowDate;
        
        await storage.set({ 
          [CONSTANTS.STORAGE_KEYS.SPOOF_DATE]: tomorrowDate,
          [CONSTANTS.STORAGE_KEYS.QUICK_SPOOF_ENABLED]: true
        });
        
        this.sendMessage({ toggleQuickSpoof: true, spoofDate: tomorrowDate });
      } else {
        await storage.set({ [CONSTANTS.STORAGE_KEYS.QUICK_SPOOF_ENABLED]: false });
        this.sendMessage({ toggleQuickSpoof: false });
      }
      
      // Update calendar state based on quick toggle status
      this.updateCalendarState(isQuickEnabled);
      
      const anyEnabled = isQuickEnabled || this.elements.toggle.checked;
      this.updateStatus(anyEnabled, 'transitioning');
      await this.showTransitionStatus(anyEnabled);
    } catch (error) {
      console.error('Error handling quick spoof toggle:', error);
      this.showError('Failed to toggle quick spoofing');
    }
  }

  /**
   * Handle date changes
   */
  async handleDateChange() {
    try {
      const newDate = this.elements.calendar.value;
      await storage.set({ [CONSTANTS.STORAGE_KEYS.SPOOF_DATE]: newDate });

      const anyEnabled = this.elements.toggle.checked || this.elements.quickToggle.checked;
      if (anyEnabled) {
        this.updateStatus(true, 'transitioning', 'Applying new date...');
        this.sendMessage({ refreshWithDate: newDate });
        await this.showTransitionStatus(true);
      }
    } catch (error) {
      console.error('Error handling date change:', error);
      this.showError('Failed to update date');
    }
  }

  /**
   * Handle whitelist toggle changes
   */
  async handleWhitelistToggle() {
    try {
      const isEnabled = this.elements.whitelistToggle.checked;
      await storage.set({ [CONSTANTS.STORAGE_KEYS.WHITELIST_ENABLED]: isEnabled });

      const anyEnabled = this.elements.toggle.checked || this.elements.quickToggle.checked;
      if (anyEnabled) {
        this.updateStatus(true, 'transitioning', 'Applying whitelist changes...');
        this.sendMessage({ refreshWithDate: this.elements.calendar.value });
        await this.showTransitionStatus(true);
      }
    } catch (error) {
      console.error('Error handling whitelist toggle:', error);
      this.showError('Failed to update whitelist settings');
    }
  }

  /**
   * Handle whitelist domain input changes (debounced)
   */
  async handleWhitelistInput() {
    try {
      // Sanitize input before saving
      const sanitizedValue = this.sanitizeWhitelistInput(this.elements.whitelist.value);
      await storage.set({ 
        [CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS]: sanitizedValue 
      });
    } catch (error) {
      console.error('Error saving whitelist domains:', error);
    }
  }

  /**
   * Handle whitelist domain blur (when user finishes editing)
   */
  async handleWhitelistBlur() {
    try {
      const anyEnabled = this.elements.toggle.checked || this.elements.quickToggle.checked;
      const whitelistEnabled = this.elements.whitelistToggle.checked;
      
      if (anyEnabled && whitelistEnabled) {
        this.updateStatus(true, 'transitioning', 'Applying whitelist changes...');
        this.sendMessage({ refreshWithDate: this.elements.calendar.value });
        await this.showTransitionStatus(true);
      }
    } catch (error) {
      console.error('Error handling whitelist blur:', error);
      this.showError('Failed to apply whitelist changes');
    }
  }

  /**
   * Show transition status with proper timing
   * @param {boolean} finalState - Final enabled state
   */
  async showTransitionStatus(finalState) {
    return new Promise((resolve) => {
      this.transitionTimeout = setTimeout(() => {
        this.updateStatus(finalState);
        resolve();
      }, this.config.TRANSITION_DELAY);
    });
  }

  /**
   * Sanitize whitelist input for security
   * @param {string} input - Raw input string
   * @returns {string} Sanitized input
   */
  sanitizeWhitelistInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Remove potentially dangerous characters and limit length
    return input
      .replace(/[<>'"&]/g, '') // Remove HTML/script injection chars
      .replace(/\s+/g, '\n') // Normalize whitespace to newlines
      .substring(0, 10000) // Limit total length
      .split('\n')
      .slice(0, 100) // Limit to 100 domains
      .join('\n');
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup() {
    // Clear timeout
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }

    // Remove event listeners
    if (this.listeners) {
      this.listeners.forEach(([element, event, handler]) => {
        element.removeEventListener(event, handler);
      });
      this.listeners = null;
    }

    // Clear element references
    this.elements = {};
    this.isInitialized = false;
  }
}

// Initialize popup controller
let popupController = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    popupController = new TimeSpooferPopup();
    await popupController.init();
  } catch (error) {
    console.error('Failed to initialize popup controller:', error);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (popupController) {
    popupController.cleanup();
    popupController = null;
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimeSpooferPopup };
}

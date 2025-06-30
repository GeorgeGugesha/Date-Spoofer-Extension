/**
 * Date Spoofer Extension - Background Service Worker
 * Production-ready background script with optimized tab management
 */

// Import utilities for service worker
importScripts('utils.js');

// Extract utilities from global scope
const { CONSTANTS, storage, tabs, isDomainWhitelisted, clearCaches } = TimeSpooferUtils;

/**
 * Background service class for managing extension state
 */
class TimeSpooferBackground {
  constructor() {
    this.cleanupPromises = new Map();
    this.isProcessing = false;
    this.cacheCleanupInterval = null;
    
    // Bind methods to preserve context
    this.handleMessage = this.handleMessage.bind(this);
    this.handleSuspend = this.handleSuspend.bind(this);
    
    this.init();
  }

  /**
   * Initialize background service
   */
  init() {
    chrome.runtime.onMessage.addListener(this.handleMessage);
    chrome.runtime.onSuspend.addListener(this.handleSuspend);
    
    // Clear caches periodically to prevent memory leaks
    this.cacheCleanupInterval = setInterval(() => {
      try {
        clearCaches();
      } catch (error) {
        // Silently handle cache clearing errors
      }
    }, 600000); // Every 10 minutes
  }

  /**
   * Handle messages from popup and content scripts
   * @param {Object} request - Message request
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async handleMessage(request, sender, sendResponse) {
    // Prevent concurrent message processing
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      if (request.toggleSpoof !== undefined) {
        await this.handleSpoofToggle(request.toggleSpoof, request.spoofDate);
      } else if (request.toggleQuickSpoof !== undefined) {
        await this.handleQuickSpoofToggle(request.toggleQuickSpoof, request.spoofDate);
      } else if (request.refreshWithDate) {
        await this.handleDateRefresh();
      }
      // Silently ignore unknown message types for forward compatibility
    } catch (error) {
      console.error('Error handling message:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle spoofing toggle on/off with error recovery
   * @param {boolean} isEnabled - Whether spoofing is enabled
   * @param {string} spoofDate - Optional spoof date to save
   */
  async handleSpoofToggle(isEnabled, spoofDate = null) {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Store the spoofing state and date if provided
        const dataToSave = { [CONSTANTS.STORAGE_KEYS.SPOOF_ENABLED]: isEnabled };
        if (spoofDate) {
          dataToSave[CONSTANTS.STORAGE_KEYS.SPOOF_DATE] = spoofDate;
        }
        const success = await storage.set(dataToSave);
        if (!success) {
          throw new Error('Failed to save spoof state');
        }

        if (isEnabled === false) {
          // When disabling: cleanup all tabs, then conditionally reload current tab
          await Promise.allSettled([
            this.cleanupAllTabs(),
            this.conditionalReloadCurrentTab()
          ]);
        } else {
          // When enabling: conditionally reload current tab
          await this.conditionalReloadCurrentTab();
        }
        
        return; // Success
      } catch (error) {
        lastError = error;
        // Retry on failure
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    // All attempts failed, but don't throw - continue gracefully
  }

  /**
   * Handle quick spoofing toggle on/off with error recovery
   * @param {boolean} isEnabled - Whether quick spoofing is enabled
   * @param {string} spoofDate - Optional spoof date to save
   */
  async handleQuickSpoofToggle(isEnabled, spoofDate = null) {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Store the quick spoofing state and date if provided
        const dataToSave = { [CONSTANTS.STORAGE_KEYS.QUICK_SPOOF_ENABLED]: isEnabled };
        if (spoofDate) {
          dataToSave[CONSTANTS.STORAGE_KEYS.SPOOF_DATE] = spoofDate;
        }
        const success = await storage.set(dataToSave);
        if (!success) {
          throw new Error('Failed to save quick spoof state');
        }

        if (isEnabled === false) {
          // When disabling: cleanup all tabs, then conditionally reload current tab
          await Promise.allSettled([
            this.cleanupAllTabs(),
            this.conditionalReloadCurrentTab()
          ]);
        } else {
          // When enabling: conditionally reload current tab
          await this.conditionalReloadCurrentTab();
        }
        
        return; // Success
      } catch (error) {
        lastError = error;
        // Retry on failure
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    // All attempts failed, but don't throw - continue gracefully
  }

  /**
   * Handle date refresh requests
   */
  async handleDateRefresh() {
    await this.conditionalReloadCurrentTab();
  }

  /**
   * Conditionally reload current tab based on whitelist settings
   */
  async conditionalReloadCurrentTab() {
    try {
      const [currentTab, settings] = await Promise.all([
        tabs.getCurrent(),
        storage.get([CONSTANTS.STORAGE_KEYS.WHITELIST_ENABLED, CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS])
      ]);

      if (!currentTab) {
        return;
      }

      const whitelistEnabled = Boolean(settings[CONSTANTS.STORAGE_KEYS.WHITELIST_ENABLED]);
      const whitelistDomains = settings[CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS] || '';

      const shouldReload = tabs.shouldReload(
        currentTab,
        whitelistEnabled,
        whitelistDomains
      );

      if (shouldReload) {
        await tabs.reload(currentTab.id);
      }
    } catch (error) {
      // Silently handle reload errors
    }
  }

  /**
   * Inject cleanup script to all accessible tabs
   */
  async cleanupAllTabs() {
    try {
      const allTabs = await this.getAllTabs();
      if (!allTabs.length) return;

      // Process tabs in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < allTabs.length; i += batchSize) {
        const batch = allTabs.slice(i, i + batchSize);
        const cleanupPromises = batch.map(tab => this.cleanupTab(tab));
        await Promise.allSettled(cleanupPromises);
        
        // Small delay between batches
        if (i + batchSize < allTabs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      // Silently handle cleanup errors
    }
  }

  /**
   * Get all tabs safely
   * @returns {Promise<chrome.tabs.Tab[]>} Array of tabs
   */
  getAllTabs() {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) {
            resolve([]);
          } else {
            resolve(tabs || []);
          }
        });
      } catch (error) {
        resolve([]);
      }
    });
  }

  /**
   * Cleanup a single tab
   * @param {chrome.tabs.Tab} tab - Tab to cleanup
   * @returns {Promise<boolean>} Success status
   */
  async cleanupTab(tab) {
    if (!tab.url || !tab.url.startsWith('http')) {
      return false;
    }

    // Avoid duplicate cleanup operations
    const cleanupKey = `cleanup_${tab.id}`;
    if (this.cleanupPromises.has(cleanupKey)) {
      return this.cleanupPromises.get(cleanupKey);
    }

    const cleanupPromise = new Promise((resolve) => {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['cleanup.js']
        }, () => {
          // Always resolve, even on errors
          resolve(!chrome.runtime.lastError);
        });
      } catch (error) {
        resolve(false);
      }
    });

    this.cleanupPromises.set(cleanupKey, cleanupPromise);
    
    // Remove from cache after completion
    cleanupPromise.finally(() => {
      setTimeout(() => {
        this.cleanupPromises.delete(cleanupKey);
      }, 1000);
    });

    return cleanupPromise;
  }

  /**
   * Handle extension suspension
   */
  async handleSuspend() {
    try {
      // Clear interval
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval);
        this.cacheCleanupInterval = null;
      }

      // Clear all storage
      await new Promise((resolve) => {
        chrome.storage.sync.clear(() => {
          resolve();
        });
      });

      // Clean up all tabs
      await this.cleanupAllTabs();
      
      // Clear caches and promises
      clearCaches();
      this.cleanupPromises.clear();
    } catch (error) {
      console.error('Error during extension cleanup:', error);
    }
  }
}

// Initialize background service
const backgroundService = new TimeSpooferBackground();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimeSpooferBackground };
}
  
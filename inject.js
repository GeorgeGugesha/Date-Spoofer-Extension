/**
 * Date Spoofer Extension - Content Script
 * Production-ready content script with optimized domain checking
 */

(function() {
  'use strict';

  // Import utilities (loaded via manifest)
  const { CONSTANTS, isDomainWhitelisted } = TimeSpooferUtils;

  /**
   * Content script controller for managing spoofing injection
   */
  class TimeSpooferContentScript {
    constructor() {
      this.isInjected = false;
      this.currentSettings = null;
    }

    /**
     * Initialize content script
     */
    async init() {
      try {
        const settings = await this.getSettings();
        const spoofEnabled = settings && settings[CONSTANTS.STORAGE_KEYS.SPOOF_ENABLED];
        const quickSpoofEnabled = settings && settings[CONSTANTS.STORAGE_KEYS.QUICK_SPOOF_ENABLED];
        
        if (!spoofEnabled && !quickSpoofEnabled) {
          return; // Neither spoofing mode is enabled
        }

        this.currentSettings = settings;
        
        if (this.shouldInjectSpoofing()) {
          await this.injectSpoofingScript();
        }
      } catch (error) {
        // Silently handle content script errors in production
      }
    }

    /**
     * Get settings from storage safely
     * @returns {Promise<Object|null>} Settings object or null
     */
    getSettings() {
      return new Promise((resolve) => {
        try {
          chrome.storage.sync.get(Object.values(CONSTANTS.STORAGE_KEYS), (result) => {
            if (chrome.runtime.lastError) {
              resolve(null);
            } else {
              resolve(result || {});
            }
          });
        } catch (error) {
          resolve(null);
        }
      });
    }

    /**
     * Check if spoofing should be injected on current domain
     * @returns {boolean} Whether to inject spoofing
     */
    shouldInjectSpoofing() {
      if (!this.currentSettings) return false;

      const whitelistEnabled = this.currentSettings[CONSTANTS.STORAGE_KEYS.WHITELIST_ENABLED];
      
      // If whitelist is disabled, inject on all sites
      if (!whitelistEnabled) return true;

      // If whitelist is enabled, check domain
      const whitelistDomains = this.currentSettings[CONSTANTS.STORAGE_KEYS.WHITELIST_DOMAINS];
      const currentHostname = window.location.hostname;
      
      return isDomainWhitelisted(currentHostname, whitelistDomains);
    }

    /**
     * Inject spoofing script into page
     * @returns {Promise<boolean>} Success status
     */
    async injectSpoofingScript() {
      if (this.isInjected) {
        return false;
      }

      try {
        const spoofDate = this.currentSettings[CONSTANTS.STORAGE_KEYS.SPOOF_DATE];
        
        // Set spoof date as data attribute for the spoofing script
        if (spoofDate && typeof spoofDate === 'string') {
          document.documentElement.setAttribute('data-spoof-date', spoofDate);
        }

        // Create and inject script element
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('spoof.js');
        script.async = true;
        
        // Handle script loading
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            script.remove(); // Clean up script element
            this.isInjected = true;
            resolve(true);
          };
          
          script.onerror = () => {
            script.remove(); // Clean up on error
            reject(new Error('Failed to load spoofing script'));
          };
        });

        // Inject script
        const targetElement = document.head || document.documentElement;
        if (targetElement) {
          targetElement.appendChild(script);
          return await loadPromise;
        } else {
          throw new Error('No suitable element found for script injection');
        }
      } catch (error) {
        return false;
      }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
      this.currentSettings = null;
      this.isInjected = false;
      
      // Remove data attribute if it exists
      if (document.documentElement.hasAttribute('data-spoof-date')) {
        document.documentElement.removeAttribute('data-spoof-date');
      }
    }
  }

  // Initialize content script
  const contentScript = new TimeSpooferContentScript();
  contentScript.init();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    contentScript.cleanup();
  });

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TimeSpooferContentScript };
  }
})();
  
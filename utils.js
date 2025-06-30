/**
 * Date Spoofer Extension - Shared Utilities
 * Production-ready utilities with error handling and performance optimization
 */

const TimeSpooferUtils = (() => {
  'use strict';

  // Constants
  const CONSTANTS = {
    STORAGE_KEYS: {
      SPOOF_ENABLED: 'spoofEnabled',
      QUICK_SPOOF_ENABLED: 'quickSpoofEnabled',
      SPOOF_DATE: 'spoofDate',
      WHITELIST_ENABLED: 'whitelistEnabled',
      WHITELIST_DOMAINS: 'whitelistDomains'
    },
    LOCAL_DOMAINS: ['localhost', 'local', 'file', '127.0.0.1'],
    DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
    HTTP_PROTOCOLS: ['http:', 'https:']
  };

  // Cache for performance
  const cache = {
    parsedDomains: new Map(),
    lastDomainCheck: new Map()
  };

  /**
   * Extract base domain from hostname with caching
   * @param {string} hostname - The hostname to process
   * @returns {string} Base domain
   */
  function getBaseDomain(hostname) {
    if (!hostname || typeof hostname !== 'string') return '';
    
    if (cache.parsedDomains.has(hostname)) {
      return cache.parsedDomains.get(hostname);
    }

    const parts = hostname.split('.');
    const baseDomain = parts.length <= 2 ? hostname : parts.slice(-2).join('.');
    
    // Cache result (limit cache size to prevent memory leaks)
    if (cache.parsedDomains.size < 100) {
      cache.parsedDomains.set(hostname, baseDomain);
    }
    
    return baseDomain;
  }

  /**
   * Parse and validate whitelist domains
   * @param {string} whitelistDomains - Raw whitelist string
   * @returns {string[]} Array of clean domain strings
   */
  function parseWhitelistDomains(whitelistDomains) {
    if (!whitelistDomains || typeof whitelistDomains !== 'string') {
      return [];
    }

    return whitelistDomains
      .split('\n')
      .map(d => d.trim().toLowerCase())
      .filter(d => {
        // Enhanced validation for production security
        return d.length > 0 && 
               d.length < 255 && 
               !d.includes('..') && 
               !d.startsWith('.') && 
               !/[<>'"&]/.test(d) && // No HTML/script injection chars
               !/^\d+\.\d+\.\d+\.\d+$/.test(d); // No IP addresses
      })
      .slice(0, 100); // Reduced limit for better performance
  }

  /**
   * Check if current domain matches whitelist with caching
   * @param {string} currentHostname - Current page hostname
   * @param {string} whitelistDomains - Raw whitelist string
   * @returns {boolean} Whether domain is whitelisted
   */
  function isDomainWhitelisted(currentHostname, whitelistDomains) {
    // Create cache key
    const cacheKey = `${currentHostname}:${whitelistDomains}`;
    const now = Date.now();
    
    // Check cache (valid for 5 minutes)
    if (cache.lastDomainCheck.has(cacheKey)) {
      const cached = cache.lastDomainCheck.get(cacheKey);
      if (now - cached.timestamp < 300000) { // 5 minutes
        return cached.result;
      }
    }

    let result;

    // Handle special cases (file://, chrome://, etc.)
    if (!currentHostname || currentHostname === '') {
      if (!whitelistDomains || whitelistDomains.trim() === '') {
        result = false; // Empty whitelist means no sites allowed
      } else {
        const domains = parseWhitelistDomains(whitelistDomains);
        result = domains.some(d => CONSTANTS.LOCAL_DOMAINS.includes(d));
      }
    } else {
      if (!whitelistDomains || whitelistDomains.trim() === '') {
        result = false; // Empty whitelist means no sites allowed
      } else {
        const domains = parseWhitelistDomains(whitelistDomains);
        if (domains.length === 0) {
          result = false;
        } else {
          result = checkDomainMatch(currentHostname.toLowerCase(), domains);
        }
      }
    }

    // Cache result (limit cache size)
    if (cache.lastDomainCheck.size < 50) {
      cache.lastDomainCheck.set(cacheKey, { result, timestamp: now });
    }

    return result;
  }

  /**
   * Check if current domain matches any whitelist domain
   * @param {string} currentDomain - Current domain (lowercase)
   * @param {string[]} domains - Array of whitelist domains
   * @returns {boolean} Whether there's a match
   */
  function checkDomainMatch(currentDomain, domains) {
    const currentBaseDomain = getBaseDomain(currentDomain);

    return domains.some(whitelistDomain => {
      // Exact match
      if (currentDomain === whitelistDomain) return true;
      
      // Subdomain match
      if (currentDomain.endsWith('.' + whitelistDomain)) return true;
      
      // Base domain match
      if (currentBaseDomain === whitelistDomain) return true;
      if (currentBaseDomain === getBaseDomain(whitelistDomain)) return true;
      
      return false;
    });
  }

  /**
   * Get tomorrow's date in ISO format with timezone handling
   * @returns {string} Tomorrow's date in YYYY-MM-DD format
   */
  function getTomorrowISO() {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate date string format
   * @param {string} dateString - Date string to validate
   * @returns {boolean} Whether date is valid
   */
  function isValidDateString(dateString) {
    return typeof dateString === 'string' && CONSTANTS.DATE_REGEX.test(dateString);
  }

  /**
   * Safe storage operations with error handling
   */
  const storage = {
    /**
     * Get items from storage safely
     * @param {string|string[]|Object} keys - Keys to retrieve
     * @returns {Promise<Object>} Storage data
     */
    get(keys) {
      return new Promise((resolve) => {
        try {
          chrome.storage.sync.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              resolve({});
            } else {
              resolve(result || {});
            }
          });
        } catch (error) {
          resolve({});
        }
      });
    },

    /**
     * Set items in storage safely
     * @param {Object} items - Items to store
     * @returns {Promise<boolean>} Success status
     */
    set(items) {
      return new Promise((resolve) => {
        try {
          chrome.storage.sync.set(items, () => {
            if (chrome.runtime.lastError) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } catch (error) {
          resolve(false);
        }
      });
    }
  };

  /**
   * Safe tab operations
   */
  const tabs = {
    /**
     * Get current active tab
     * @returns {Promise<chrome.tabs.Tab|null>} Current tab or null
     */
    getCurrent() {
      return new Promise((resolve) => {
        try {
                  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(tabs[0] || null);
          }
        });
              } catch (error) {
        resolve(null);
      }
      });
    },

    /**
     * Reload tab safely
     * @param {number} tabId - Tab ID to reload
     * @returns {Promise<boolean>} Success status
     */
    reload(tabId) {
      return new Promise((resolve) => {
        try {
                  chrome.tabs.reload(tabId, () => {
          if (chrome.runtime.lastError) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
              } catch (error) {
        resolve(false);
      }
      });
    },

    /**
     * Check if tab should be reloaded based on whitelist
     * @param {chrome.tabs.Tab} tab - Tab to check
     * @param {boolean} whitelistEnabled - Whether whitelist is enabled
     * @param {string} whitelistDomains - Whitelist domains string
     * @returns {boolean} Whether tab should be reloaded
     */
    shouldReload(tab, whitelistEnabled, whitelistDomains) {
      if (!tab || !tab.url) return false;
      
      try {
        const url = new URL(tab.url);
        
        // Don't reload chrome:// or other internal pages
        if (url.protocol.startsWith('chrome')) {
          return false;
        }
        
        // If whitelist is disabled, reload all supported pages (http, https, file)
        if (!whitelistEnabled) {
          return CONSTANTS.HTTP_PROTOCOLS.includes(url.protocol) || url.protocol === 'file:';
        }
        
        // If whitelist is enabled, check domain whitelist
        // For file:// URLs, use empty hostname which will be checked against local domains
        const hostname = url.protocol === 'file:' ? '' : url.hostname;
        return isDomainWhitelisted(hostname, whitelistDomains);
      } catch (error) {
        return false;
      }
    }
  };

  /**
   * Clear caches to prevent memory leaks
   */
  function clearCaches() {
    cache.parsedDomains.clear();
    cache.lastDomainCheck.clear();
  }

  /**
   * Debounce function to prevent excessive calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public API
  return {
    CONSTANTS,
    getBaseDomain,
    isDomainWhitelisted,
    getTomorrowISO,
    isValidDateString,
    storage,
    tabs,
    clearCaches,
    debounce
  };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeSpooferUtils;
} else if (typeof window !== 'undefined') {
  window.TimeSpooferUtils = TimeSpooferUtils;
} 
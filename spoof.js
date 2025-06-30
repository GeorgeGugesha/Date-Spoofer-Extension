/**
 * Date Spoofer Extension - Date Spoofing Script
 * Production-ready date spoofing with memory leak prevention
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__TIME_SPOOFER_INJECTED__) {
    return;
  }

  // Mark as injected immediately to prevent race conditions
  window.__TIME_SPOOFER_INJECTED__ = true;

  /**
   * Date spoofing controller
   */
  class DateSpoofer {
    constructor() {
      this.originalDate = window.Date;
      this.targetTime = null;
      this.isActive = false;
      
      this.init();
    }

    /**
     * Initialize date spoofing
     */
    init() {
      try {
        this.calculateTargetTime();
        this.createSpoofedDate();
        this.installSpoofing();
        this.setupCleanup();
        
        this.isActive = true;
      } catch (error) {
        console.error('Failed to initialize date spoofing:', error);
        this.cleanup();
      }
    }

    /**
     * Calculate target time from spoof date
     */
    calculateTargetTime() {
      const spoofDate = document.documentElement.getAttribute('data-spoof-date');
      
      if (spoofDate && /^\d{4}-\d{2}-\d{2}$/.test(spoofDate)) {
        // Use provided spoof date
        const now = new this.originalDate();
        const [year, month, day] = spoofDate.split('-').map(Number);
        
        // Validate date components
        if (year >= 1970 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const targetDate = new this.originalDate(
            year, 
            month - 1, // Month is 0-indexed
            day, 
            now.getHours(), 
            now.getMinutes(), 
            now.getSeconds(), 
            now.getMilliseconds()
          );
          
          // Ensure the date is valid (handles invalid dates like Feb 30)
          if (targetDate.getFullYear() === year && 
              targetDate.getMonth() === month - 1 && 
              targetDate.getDate() === day) {
            this.targetTime = targetDate.getTime();
            return;
          }
        }
      }
      
      // Fallback to tomorrow
      const tomorrow = new this.originalDate();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.targetTime = tomorrow.getTime();
    }

    /**
     * Create spoofed Date constructor
     */
    createSpoofedDate() {
      const originalDate = this.originalDate;
      const targetTime = this.targetTime;

      this.spoofedDate = function SpoofedDate(...args) {
        // Handle different Date constructor patterns
        if (args.length === 0) {
          // new Date() - return spoofed time
          return new originalDate(targetTime);
        } else if (args.length === 1) {
          const arg = args[0];
          
          if (typeof arg === 'number') {
            // new Date(timestamp) - check if it's close to current time
            const currentTime = originalDate.now();
            const timeDiff = Math.abs(arg - currentTime);
            
            // If timestamp is within 1 hour of current time, spoof it
            if (timeDiff < 3600000) { // 1 hour in milliseconds
              return new originalDate(targetTime);
            }
          }
          
          // For other single arguments (strings, etc.), use original behavior
          return new originalDate(arg);
        } else {
          // new Date(year, month, ...) - use original behavior
          return new originalDate(...args);
        }
      };

      // Copy static methods and properties
      this.spoofedDate.now = () => targetTime;
      this.spoofedDate.UTC = originalDate.UTC;
      this.spoofedDate.parse = originalDate.parse;
      this.spoofedDate.prototype = originalDate.prototype;
      
      // Ensure proper inheritance
      Object.setPrototypeOf(this.spoofedDate, originalDate);
    }

    /**
     * Install spoofing by replacing window.Date
     */
    installSpoofing() {
      // Store original for restoration
      window.__ORIGINAL_DATE__ = this.originalDate;
      
      // Replace Date with spoofed version
      Object.defineProperty(window, 'Date', {
        value: this.spoofedDate,
        writable: true,
        configurable: true,
        enumerable: false
      });
    }

    /**
     * Setup cleanup mechanisms
     */
    setupCleanup() {
      // Create restoration function
      window.__RESTORE_DATE__ = () => {
        this.cleanup();
      };

      // Already marked as injected at the top

      // Clean up data attribute
      if (document.documentElement.hasAttribute('data-spoof-date')) {
        document.documentElement.removeAttribute('data-spoof-date');
      }
    }

    /**
     * Cleanup spoofing and restore original Date
     */
    cleanup() {
      if (!this.isActive) return;

      try {
        // Restore original Date
        if (window.__ORIGINAL_DATE__) {
          Object.defineProperty(window, 'Date', {
            value: window.__ORIGINAL_DATE__,
            writable: true,
            configurable: true,
            enumerable: false
          });
        }

        // Clean up global references
        delete window.__ORIGINAL_DATE__;
        delete window.__RESTORE_DATE__;
        delete window.__TIME_SPOOFER_INJECTED__;

        // Clean up data attributes
        if (document.documentElement.hasAttribute('data-spoof-date')) {
          document.documentElement.removeAttribute('data-spoof-date');
        }

        // Clear internal references
        this.originalDate = null;
        this.spoofedDate = null;
        this.targetTime = null;
        this.isActive = false;
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }

  // Initialize date spoofing
  new DateSpoofer();
})(); 
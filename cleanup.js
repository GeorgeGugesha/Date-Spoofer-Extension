/**
 * Date Spoofer Extension - Cleanup Script
 * Production-ready cleanup with comprehensive memory leak prevention
 */

(function() {
  'use strict';

  /**
   * Cleanup controller for removing all traces of time spoofing
   */
  class TimeSpooferCleanup {
    constructor() {
      this.cleanupAttempts = 0;
      this.maxAttempts = 3;
    }

    /**
     * Log debug information (disabled in production)
     */
    debug() {
      // Debug logging disabled in production
    }

    /**
     * Perform comprehensive cleanup
     */
    cleanup() {
      // Prevent multiple cleanup instances
      if (window.__CLEANUP_IN_PROGRESS__) {
        return;
      }
      
      window.__CLEANUP_IN_PROGRESS__ = true;
      this.cleanupAttempts++;
      
      try {
        // Restore original Date if restoration function exists
        const dateRestored = this.restoreOriginalDate();
        
        // Clean up data attributes
        this.cleanupDataAttributes();

        // Clean up global references
        this.cleanupGlobalReferences();

        // Clean up any event listeners or observers
        this.cleanupEventListeners();

        // Verify cleanup success
        const verificationResult = this.verifyCleanup();

        if (verificationResult.success) {
          // Cleanup successful
          return;
        } else if (this.cleanupAttempts < this.maxAttempts) {
          // Retry cleanup if it failed and we haven't exceeded max attempts
          delete window.__CLEANUP_IN_PROGRESS__;
          setTimeout(() => this.cleanup(), 100);
          return;
        } else {
          // Force basic cleanup as final attempt
          this.basicCleanup();
        }
      } catch (error) {
        // Attempt basic cleanup even if advanced cleanup failed
        this.basicCleanup();
      } finally {
        delete window.__CLEANUP_IN_PROGRESS__;
      }
    }

    /**
     * Restore original Date object
     * @returns {boolean} Success status
     */
    restoreOriginalDate() {
      try {
        if (window.__RESTORE_DATE__ && typeof window.__RESTORE_DATE__ === 'function') {
          this.debug('Using __RESTORE_DATE__ function');
          window.__RESTORE_DATE__();
          return true;
        } else if (window.__ORIGINAL_DATE__) {
          this.debug('Using manual restoration with __ORIGINAL_DATE__');
          // Manual restoration if function doesn't exist
          Object.defineProperty(window, 'Date', {
            value: window.__ORIGINAL_DATE__,
            writable: true,
            configurable: true,
            enumerable: false
          });
          return true;
        } else {
          this.debug('No restoration method available');
          return false;
        }
      } catch (error) {
        return false;
      }
    }

    /**
     * Clean up data attributes from document
     */
    cleanupDataAttributes() {
      try {
        const attributesToRemove = ['data-spoof-date'];
        
        attributesToRemove.forEach(attr => {
          if (document.documentElement.hasAttribute(attr)) {
            document.documentElement.removeAttribute(attr);
            this.debug(`Removed attribute: ${attr}`);
          }
        });
      } catch (error) {
        // Silently handle cleanup errors
      }
    }

    /**
     * Clean up global references and variables
     */
    cleanupGlobalReferences() {
      try {
        const globalRefsToClean = [
          '__ORIGINAL_DATE__',
          '__RESTORE_DATE__',
          '__TIME_SPOOFER_INJECTED__'
        ];

        globalRefsToClean.forEach(ref => {
          if (window.hasOwnProperty(ref)) {
            try {
              delete window[ref];
              this.debug(`Deleted global reference: ${ref}`);
            } catch (deleteError) {
              // Some properties might not be deletable, try setting to undefined
              window[ref] = undefined;
              this.debug(`Set to undefined: ${ref}`);
            }
          }
        });
      } catch (error) {
        // Silently handle cleanup errors
      }
    }

    /**
     * Clean up any event listeners that might have been added
     */
    cleanupEventListeners() {
      try {
        // Remove any beforeunload listeners that might have been added by spoofing
        // This is a precautionary measure
        if (window.__TIME_SPOOFER_LISTENERS__) {
          window.__TIME_SPOOFER_LISTENERS__.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
          });
          delete window.__TIME_SPOOFER_LISTENERS__;
          this.debug('Cleaned up event listeners');
        }
      } catch (error) {
        // Silently handle cleanup errors
      }
    }

    /**
     * Verify that cleanup was successful
     * @returns {Object} Verification result with success status and issues
     */
    verifyCleanup() {
      const issues = [];
      
      try {
        // Check if global references are cleaned up
        if (window.__ORIGINAL_DATE__) {
          issues.push('__ORIGINAL_DATE__ still exists');
        }
        if (window.__RESTORE_DATE__) {
          issues.push('__RESTORE_DATE__ still exists');
        }
        if (window.__TIME_SPOOFER_INJECTED__) {
          issues.push('__TIME_SPOOFER_INJECTED__ still exists');
        }
        
        // Check if data attributes are cleaned up
        if (document.documentElement.hasAttribute('data-spoof-date')) {
          issues.push('data-spoof-date attribute still exists');
        }

        // Simplified Date check - just verify it's a function and has basic properties
        if (typeof window.Date !== 'function') {
          issues.push('Date is not a function');
        } else {
          // Check if Date has expected static methods
          if (typeof window.Date.now !== 'function') {
            issues.push('Date.now is missing');
          }
          if (typeof window.Date.parse !== 'function') {
            issues.push('Date.parse is missing');
          }
          if (typeof window.Date.UTC !== 'function') {
            issues.push('Date.UTC is missing');
          }
        }

        const success = issues.length === 0;
        this.debug(`Verification complete. Success: ${success}, Issues: ${issues.length}`);
        
        return { success, issues };
      } catch (error) {
        return { success: false, issues: ['Verification failed'] };
      }
    }

    /**
     * Basic cleanup as fallback
     */
    basicCleanup() {
      try {
        this.debug('Performing basic cleanup');
        
        // Basic restoration attempts
        if (window.__ORIGINAL_DATE__) {
          window.Date = window.__ORIGINAL_DATE__;
          this.debug('Restored Date using direct assignment');
        }
        
        // Basic reference cleanup
        ['__ORIGINAL_DATE__', '__RESTORE_DATE__', '__TIME_SPOOFER_INJECTED__'].forEach(ref => {
          try {
            delete window[ref];
          } catch (e) {
            window[ref] = undefined;
          }
        });
        
        // Basic attribute cleanup
        if (document.documentElement.hasAttribute('data-spoof-date')) {
          document.documentElement.removeAttribute('data-spoof-date');
        }
        
        // Basic cleanup completed
      } catch (error) {
        console.error('Even basic cleanup failed:', error);
      }
    }
  }

  // Prevent multiple cleanup instances
  if (window.__CLEANUP_IN_PROGRESS__) {
            // Cleanup already in progress, skipping
    return;
  }

  window.__CLEANUP_IN_PROGRESS__ = true;

  // Execute cleanup
  const cleanup = new TimeSpooferCleanup();
  cleanup.cleanup();

  // Clear the flag after a delay
  setTimeout(() => {
    delete window.__CLEANUP_IN_PROGRESS__;
  }, 1000);
})(); 
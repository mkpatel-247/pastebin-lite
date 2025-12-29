/**
 * Time abstraction utility for deterministic testing
 * 
 * This module provides a getCurrentTime function that:
 * 1. Checks if TEST_MODE environment variable is set to '1'
 * 2. If in test mode, reads the 'x-test-now-ms' header from the request
 * 3. Returns the test time if available, otherwise returns system time
 * 
 * CRITICAL: All time-dependent logic MUST use this utility instead of Date.now()
 * This ensures the automated grading suite can control time for testing TTL expiry
 */

/**
 * Get the current time in milliseconds
 * @param {Request} req - Express request object (optional)
 * @returns {number} Current time in milliseconds since epoch
 */
export function getCurrentTime(req = null) {
    // Check if we're in test mode
    const isTestMode = process.env.TEST_MODE === '1';

    if (isTestMode && req) {
        // Try to read the test time header
        const testTimeHeader = req.headers['x-test-now-ms'];

        if (testTimeHeader) {
            const testTime = parseInt(testTimeHeader, 10);

            // Validate that it's a valid number
            if (!isNaN(testTime) && testTime > 0) {
                return testTime;
            }
        }
    }

    // Fall back to system time
    return Date.now();
}

/**
 * Get the current time as a Date object
 * @param {Request} req - Express request object (optional)
 * @returns {Date} Current Date object
 */
export function getCurrentDate(req = null) {
    return new Date(getCurrentTime(req));
}

/**
 * Calculate expiry date from TTL
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {Request} req - Express request object (optional)
 * @returns {Date} Expiry date
 */
export function calculateExpiryDate(ttlSeconds, req = null) {
    const currentTime = getCurrentTime(req);
    return new Date(currentTime + (ttlSeconds * 1000));
}

/**
 * Check if a date has expired
 * @param {Date} expiryDate - The expiry date to check
 * @param {Request} req - Express request object (optional)
 * @returns {boolean} True if expired, false otherwise
 */
export function isExpired(expiryDate, req = null) {
    if (!expiryDate) return false;
    const currentTime = getCurrentTime(req);
    return currentTime >= expiryDate.getTime();
}

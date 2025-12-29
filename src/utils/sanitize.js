/**
 * XSS Prevention Utility
 * 
 * Uses DOMPurify with jsdom to sanitize HTML content
 * Prevents script execution while preserving text content
 */

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// Create DOMPurify instance with jsdom window
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} content - Raw content that may contain malicious scripts
 * @returns {string} Sanitized content safe for HTML rendering
 */
export function sanitizeHTML(content) {
    if (!content) return '';

    // Configure DOMPurify to be very strict
    // This will strip all HTML tags and just return text content
    const config = {
        ALLOWED_TAGS: ['br', 'p', 'b', 'i', 'u', 'strong', 'em'],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    };

    return DOMPurify.sanitize(content, config);
}

/**
 * Escape HTML special characters for safe display
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
    if (!text) return '';

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

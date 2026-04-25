/**
 * XSS Sanitization Middleware & Utilities
 * 
 * Prevents Cross-Site Scripting (XSS) by sanitizing user-supplied strings
 * before they are stored in the database or rendered in the UI.
 * 
 * Uses a denylist approach for dangerous patterns. In production, consider
 * replacing with a well-tested library like DOMPurify (backend) or xss.
 */

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,           // e.g. onclick, onerror, onload
  /<object\b[^<]*/gi,
  /<embed\b[^<]*/gi,
  /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
  /<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi,
  /\btelerik\b/gi,          // known exploit vectors
  /<a\b[^>]*\bhref\s*=\s*["']?javascript:/gi,
];

const REPLACEMENT = '[removed]';

/**
 * Strip dangerous HTML tags and attributes from a string.
 * Returns a sanitized string safe for storage and display.
 * 
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
export function sanitize(input) {
  if (typeof input !== 'string') return input;

  let result = input;

  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, REPLACEMENT);
  }

  // Encode HTML entities to neutralise any remaining angle brackets
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return result;
}

/**
 * Sanitize all string fields in a plain object (recursive).
 * Non-string fields are passed through unchanged.
 * 
 * @param {object} obj
 * @returns {object}
 */
export function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((v) => typeof v === 'string' ? sanitize(v) : v);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Express middleware that sanitizes req.body before it reaches route handlers.
 * Apply globally or per-route as needed.
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}
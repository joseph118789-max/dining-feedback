/**
 * Global Error Handling Middleware
 * 
 * Catches all unhandled errors from Express route handlers and returns
 * a consistent JSON error response. Prevents stack traces from leaking
 * in production.
 */

export function errorHandler(err, req, res, next) {
  // Log error for debugging (never expose to client)
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Never expose internal error details in production
  const message = process.env.NODE_ENV === 'production'
    ? statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An error occurred'
    : err.message || 'An error occurred';

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      requestId: req.requestId || undefined,
    },
  });
}

/**
 * 404 Handler — for undefined routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Async handler wrapper — eliminates need for try/catch in every route.
 * Catches rejected promises and forwards to errorHandler.
 * 
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res, next) => { ... }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
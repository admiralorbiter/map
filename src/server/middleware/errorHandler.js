/**
 * Error handling middleware
 * Centralized error handling for Express routes
 */

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const status = err.status || err.statusCode || 500;
  const message = isDevelopment ? err.message : 'Internal server error';
  const stack = isDevelopment ? err.stack : undefined;

  res.status(status).json({
    error: message,
    ...(stack && { stack })
  });
}

module.exports = errorHandler;


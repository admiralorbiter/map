/**
 * Custom error classes
 * Application-specific error types
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

class DataSourceError extends AppError {
  constructor(message, source = null) {
    super(message, 500, 'DATA_SOURCE_ERROR');
    this.source = source;
  }
}

class SimulationError extends AppError {
  constructor(message) {
    super(message, 500, 'SIMULATION_ERROR');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DataSourceError,
  SimulationError
};


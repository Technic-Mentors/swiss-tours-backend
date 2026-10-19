'use strict';

const env = require('../config/env');

/** Throwable error that carries an HTTP status and a stable code. */
class ApiError extends Error {
  constructor(status, message, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message, code = 'bad_request') {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Not authenticated', code = 'unauthorized') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Not allowed', code = 'forbidden') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Not found', code = 'not_found') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'conflict') {
    return new ApiError(409, message, code);
  }
}

/** Wrap an async route handler so rejected promises reach the error handler. */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`, 'route_not_found'));
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let code = err.code || 'server_error';
  let message = err.message || 'Something went wrong';

  // Multer and MySQL errors surface as recognisable codes - translate them.
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    code = 'file_too_large';
    message = 'That file is too large. Maximum size is 8 MB.';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    code = 'duplicate';
    message = 'That value already exists.';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    status = 503;
    code = 'database_unavailable';
    message = 'Cannot reach the database. Check that MySQL is running.';
  }

  if (status >= 500) {
    console.error('[error]', req.method, req.originalUrl, '\n', err);
  }

  const body = { error: { message, code } };
  if (env.nodeEnv !== 'production' && status >= 500) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}
/* eslint-enable no-unused-vars */

module.exports = { ApiError, asyncHandler, errorHandler, notFoundHandler };

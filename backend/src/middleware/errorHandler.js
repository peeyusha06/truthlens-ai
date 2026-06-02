/**
 * errorHandler.js – Global Express error handler middleware
 *
 * Must be registered LAST in the middleware chain.
 * Handles Multer errors, validation errors, and generic errors.
 */

'use strict';

const multer = require('multer');

/**
 * errorHandler middleware
 * @param {Error}    err
 * @param {Request}  req
 * @param {Response} res
 * @param {Function} next
 */
function errorHandler(err, req, res, next) {
  // ── Log the error ─────────────────────────────────────
  console.error(`[errorHandler] ${err.name || 'Error'}: ${err.message}`);

  // ── Multer Errors ──────────────────────────────────────
  if (err instanceof multer.MulterError) {
    const multerMessages = {
      LIMIT_FILE_SIZE : 'File too large. Maximum allowed size is 10 MB.',
      LIMIT_FILE_COUNT: 'Too many files. Only one image per request is allowed.',
      LIMIT_UNEXPECTED_FILE: err.message || 'Unexpected file field.',
    };
    return res.status(400).json({
      error: multerMessages[err.code] || `File upload error: ${err.message}`,
      code : err.code,
    });
  }

  // ── Mongoose Validation Errors ─────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  // ── Mongoose Cast Errors (invalid ObjectId) ────────────
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }

  // ── Axios / Network Errors from AI service ─────────────
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'AI service is not reachable. Please ensure the Python FastAPI service is running on port 8000.',
    });
  }

  // ── Generic / Unknown Errors ───────────────────────────
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    error: err.message || 'An unexpected internal server error occurred.',
  });
}

module.exports = errorHandler;

/**
 * authMiddleware.js – JWT verification middleware
 *
 * Attaches decoded user object to req.user if token is valid.
 * Usage: router.get('/protected', protect, handler)
 */

'use strict';

const jwt  = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'truthlens_jwt_fallback_secret_change_me';

/**
 * protect – verifies Bearer token from Authorization header
 */
async function protect(req, res, next) {
  try {
    // ── Extract token from header ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // ── Verify token ──
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, iat, exp }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

module.exports = { protect };

/**
 * optionalAuth.js – Soft JWT middleware
 *
 * Attaches req.user if a valid Bearer token is present in the
 * Authorization header.  Does NOT reject the request when the
 * token is absent or invalid – it simply leaves req.user as null.
 *
 * Use this on routes that work for both authenticated and anonymous
 * users but need to know WHO is calling (e.g. /api/analyze so we
 * can stamp userId on the saved result).
 */

'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'truthlens_jwt_fallback_secret_change_me';

function optionalAuth(req, _res, next) {
  req.user = null; // default: no user

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // no token – continue anonymously
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, iat, exp }
  } catch {
    // expired / invalid – treat as anonymous, don't error out
    req.user = null;
  }

  return next();
}

module.exports = { optionalAuth };

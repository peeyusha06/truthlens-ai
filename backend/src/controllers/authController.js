/**
 * authController.js – Signup, Login, and Get-Me handlers
 *
 * POST /api/auth/signup  → create user, return JWT
 * POST /api/auth/login   → verify credentials, return JWT
 * GET  /api/auth/me      → return current user (protected)
 */

'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET  = process.env.JWT_SECRET  || 'truthlens_jwt_fallback_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

/**
 * signToken – Creates a signed JWT for a user
 * @param {string} userId – MongoDB ObjectId string
 * @returns {string} signed JWT
 */
function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * signup – POST /api/auth/signup
 */
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Validate input presence
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Create user (password hashed by pre-save hook)
    const user  = await User.create({ name, email, password });
    const token = signToken(user._id);

    console.log(`[auth] New user registered: ${user.email}`);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        _id  : user._id,
        name : user.name,
        email: user.email,
      },
    });
  } catch (err) {
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    next(err);
  }
}

/**
 * login – POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Explicitly select password (excluded by default via schema)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    console.log(`[auth] User logged in: ${user.email}`);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        _id  : user._id,
        name : user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * getMe – GET /api/auth/me (protected)
 * Returns current authenticated user info.
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, getMe };

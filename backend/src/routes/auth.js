/**
 * auth.js – Auth routes
 *
 * POST /api/auth/signup
 * POST /api/auth/login
 * GET  /api/auth/me    (protected)
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { protect }              = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login',  login);
router.get('/me',      protect, getMe);

module.exports = router;

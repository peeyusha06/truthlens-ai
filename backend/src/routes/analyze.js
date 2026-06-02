/**
 * analyze.js – Route for POST /api/analyze
 *
 * optionalAuth is applied BEFORE the controller so that req.user
 * is populated whenever a valid JWT is present.  The controller
 * then stamps the resulting MongoDB record with userId.
 * Unauthenticated uploads still work (userId will be null).
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const upload       = require('../middleware/multerConfig');
const { optionalAuth } = require('../middleware/optionalAuth');
const { analyzeImage } = require('../controllers/analyzeController');

// POST /api/analyze
// middleware order: optionalAuth → multer → analyzeImage
router.post('/', optionalAuth, upload.single('image'), analyzeImage);

module.exports = router;

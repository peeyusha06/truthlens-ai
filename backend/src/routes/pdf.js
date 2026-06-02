/**
 * pdf.js – Route for GET /api/pdf/:id
 * No auth required (result ID acts as access token for simplicity)
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { generatePDF } = require('../controllers/pdfController');

// GET /api/pdf/:id  – returns PDF stream for the given result ID
router.get('/:id', generatePDF);

module.exports = router;

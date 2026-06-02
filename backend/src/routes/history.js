/**
 * history.js – Routes for GET/DELETE /api/history
 *
 * All routes are protected with the JWT `protect` middleware so
 * req.user is always populated and historyController can safely
 * filter by userId.
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getHistory,
  getById,
  deleteById,
  clearHistory,
} = require('../controllers/historyController');

// Every history route requires authentication
router.use(protect);

// GET    /api/history              – paginated list (current user only)
router.get('/',     getHistory);

// GET    /api/history/:id          – single result (must belong to user)
router.get('/:id',  getById);

// DELETE /api/history/all          – clear all of user's history (dev helper)
//   Must be registered BEFORE /:id so Express doesn't mistake "all" for an ObjectId
router.delete('/all', clearHistory);

// DELETE /api/history/:id          – delete one (must belong to user)
router.delete('/:id', deleteById);

module.exports = router;

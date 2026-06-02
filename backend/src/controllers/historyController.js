/**
 * historyController.js – CRUD for analysis history (per-user isolation)
 *
 * All queries are scoped to req.user.id so each user only ever
 * sees and modifies their own records.
 */

'use strict';

const Result = require('../models/Result');

/**
 * getHistory – GET /api/history
 * Returns paginated results belonging to the logged-in user only.
 */
async function getHistory(req, res, next) {
  try {
    const userId = req.user.id;                          // guaranteed by protect middleware
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;
    const filter = { userId };

    const [results, total] = await Promise.all([
      Result.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Result.countDocuments(filter),
    ]);

    return res.json({
      results,
      total,
      page,
      totalPages : Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * getById – GET /api/history/:id
 * Returns a single result only if it belongs to the logged-in user.
 */
async function getById(req, res, next) {
  try {
    const result = await Result.findOne({
      _id    : req.params.id,
      userId : req.user.id,          // ownership check
    }).lean();

    if (!result) {
      return res.status(404).json({ error: 'Result not found.' });
    }
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * deleteById – DELETE /api/history/:id
 * Deletes a result only if it belongs to the logged-in user.
 */
async function deleteById(req, res, next) {
  try {
    const deleted = await Result.findOneAndDelete({
      _id    : req.params.id,
      userId : req.user.id,          // ownership check prevents cross-user deletion
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Result not found.' });
    }
    return res.json({ message: 'Result deleted successfully.', id: req.params.id });
  } catch (err) {
    next(err);
  }
}

/**
 * clearHistory – DELETE /api/history/all
 * Removes ALL results belonging to the logged-in user (dev/testing helper).
 */
async function clearHistory(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Bulk delete is disabled in production.' });
    }
    const result = await Result.deleteMany({ userId: req.user.id });
    return res.json({ message: `Cleared ${result.deletedCount} of your records.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHistory, getById, deleteById, clearHistory };

/**
 * Result.js – Mongoose Model for analysis results
 *
 * Each document stores one image analysis record.
 */

'use strict';

const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema(
  {
    // Owner – the logged-in user who submitted this analysis.
    // Not required so legacy records (no auth) stay valid.
    userId: {
      type     : mongoose.Schema.Types.ObjectId,
      ref      : 'User',
      required : false,
      index    : true,
    },

    // Original filename of the uploaded image
    imageName: {
      type: String,
      required: [true, 'imageName is required'],
      trim: true,
    },

    // REAL or FAKE (or more descriptive label from the model)
    prediction: {
      type: String,
      required: [true, 'prediction is required'],
      enum: ['REAL', 'FAKE', 'UNCERTAIN'],
      uppercase: true,
    },

    // Confidence percentage (0–100)
    confidence: {
      type: Number,
      required: [true, 'confidence is required'],
      min: 0,
      max: 100,
    },

    // Derived risk level based on confidence
    risk: {
      type: String,
      required: [true, 'risk is required'],
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      uppercase: true,
    },

    // Human-readable explanation from Gemini API or rule-based fallback
    reasoning: {
      type: String,
      default: '',
    },

    // Which model/API was used for this analysis
    modelUsed: {
      type: String,
      default: 'TruthLens AI Engine',
    },

    // Stored file path (relative to uploads/) for reference
    filePath: {
      type: String,
      default: '',
    },
  },
  {
    // Automatically adds createdAt and updatedAt
    timestamps: true,

    // Clean JSON output for API responses
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Index for efficient date-sorted queries ──
ResultSchema.index({ createdAt: -1 });          // global sort
ResultSchema.index({ userId: 1, createdAt: -1 }); // per-user sort (most common query)

const Result = mongoose.model('Result', ResultSchema);

module.exports = Result;

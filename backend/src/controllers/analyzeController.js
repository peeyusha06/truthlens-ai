/**
 * analyzeController.js – Core controller for image analysis
 *
 * Flow:
 *  1. Receive uploaded image (via multer)
 *  2. Send to Python AI service for deepfake detection
 *     (Hive AI API → fallback to local model)
 *  3. Optionally call Gemini API for human-readable reasoning
 *  4. Map confidence → risk level
 *  5. Persist result in MongoDB
 *  6. Return structured JSON response
 *  7. Clean up uploaded file
 */

'use strict';

const sharp = require('sharp');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const FormData = require('form-data');
const Result   = require('../models/Result');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY  || '';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Risk Level Calculator ──────────────────────────────────
/**
 * computeRisk – Derive risk from confidence and prediction
 * Rules:
 *  FAKE prediction:
 *    confidence > 80% → HIGH
 *    confidence 50–80% → MEDIUM
 *    confidence < 50%  → LOW
 *  REAL prediction → always LOW
 *
 * @param {string} prediction  – 'REAL' | 'FAKE'
 * @param {number} confidence  – 0–100
 * @returns {string}           – 'LOW' | 'MEDIUM' | 'HIGH'
 */
function computeRisk(prediction, confidence) {
  if (prediction === 'REAL') return 'LOW';
  if (confidence > 80) return 'HIGH';
  if (confidence >= 50) return 'MEDIUM';
  return 'LOW';
}

// ── Gemini Reasoning Generator ─────────────────────────────
/**
 * generateReasoning – Calls Google Gemini to produce human-readable analysis
 * Falls back to rule-based text if the API key is missing or call fails.
 *
 * @param {string} prediction
 * @param {number} confidence
 * @param {string} risk
 * @param {string} imageName
 * @returns {Promise<string>}
 */
async function generateReasoning(prediction, confidence, risk, imageName) {

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // fallback if no key
  const ruleBasedReasoning = () => {
    return `The image is classified as ${prediction} with ${confidence}% confidence. This conclusion is based on detected patterns and statistical analysis.`;
  };

  if (!GEMINI_API_KEY) {
    return ruleBasedReasoning();
  }

  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const isFake = prediction === "FAKE";

    const prompt = `
Image: ${imageName}
Prediction: ${prediction}
Confidence: ${confidence}%
Risk Level: ${risk}

Explain in 2–3 sentences why this image is ${isFake ? "AI-generated" : "real"}.
Keep it clear and technical.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const text = response.text();

    console.log("[reasoning] Gemini SDK success");

    return text;

  } catch (err) {
    console.warn("[reasoning] Gemini SDK error:", err.message);
    return ruleBasedReasoning();
  }
}

// ── Main Controller ────────────────────────────────────────
/**
 * analyzeImage – POST /api/analyze handler
 */
async function analyzeImage(req, res, next) {
  const uploadedFilePath = req.file?.path;

  try {
    // ── Validate that a file was uploaded ──────────────────
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided. Please upload an image.' });
    }

    const imageName = req.file.originalname;
    console.log(`[analyze] Processing: ${imageName} (${req.file.size} bytes)`);

    // ── Step 1: Call Python AI Service ────────────────────
    let aiResult;
    try {
    // 🧠 Resize image
    const resizedBuffer = await sharp(uploadedFilePath)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const formData = new FormData();
    formData.append('file', resizedBuffer, {
      filename: req.file.filename,
      contentType: 'image/jpeg',
    });

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 90000,
      }
    );

      aiResult = aiResponse.data;
      console.log(`[analyze] AI result: ${JSON.stringify(aiResult)}`);
    } catch (aiErr) {
      // ── AI Service Unavailable → Use Fallback ──────────
      console.warn('[analyze] AI service error:', aiErr.message);
      console.warn('[analyze] Using fallback mock result for demo purposes.');

      // Deterministic demo fallback (varies by file size for diversity)
      const seed = req.file.size % 100;
      aiResult = {
        label      : seed > 50 ? 'FAKE' : 'REAL',
        confidence : seed > 50 ? 50 + seed * 0.4 : 60 + (100 - seed) * 0.3,
        modelUsed  : 'Fallback Demo Engine (AI Service Offline)',
        note       : 'Real API results require the Python service on port 8000.',
      };
    }

    // ── Step 2: Normalise AI output ────────────────────────
    let prediction  = (aiResult.label || 'UNCERTAIN').toUpperCase();
    let confidence  = Math.min(100, Math.max(0, Math.round(aiResult.confidence || 50)));
    let modelUsed   = aiResult.modelUsed || 'Hive AI / TruthLens Engine';

    // 🚨 CRITICAL FIX — Handle fallback properly
    if (!modelUsed.toLowerCase().includes("hive")) {
      prediction = "UNCERTAIN";
      confidence = Math.min(confidence, 70);

    aiResult.note = "⚠️ Primary AI detection (Hive) unavailable. Result may be inaccurate.";
  }

    // ── Step 3: Compute Risk ───────────────────────────────
    const risk = computeRisk(prediction, confidence);

    // ── Step 4: Generate Reasoning ─────────────────────────
    const reasoning = await generateReasoning(prediction, confidence, risk, imageName);

    // ── Step 5: Persist to MongoDB ─────────────────────────
    // Stamp userId when the request came with a valid JWT (req.user set by optionalAuth).
    const userId = req.user?.id || null;

    const savedResult = await Result.create({
      imageName,
      prediction,
      confidence,
      risk,
      reasoning,
      modelUsed,
      filePath: req.file.filename,
      ...(userId && { userId }),  // only add field when we have a real user
    });

    console.log(`[analyze] Saved to DB with ID: ${savedResult._id}  userId: ${userId || '(anonymous)'}`);


    // ── Step 6: Respond ────────────────────────────────────
    return res.status(200).json({
      _id       : savedResult._id,
      imageName,
      prediction,
      confidence,
      risk,
      reasoning,
      modelUsed,
      createdAt : savedResult.createdAt,
    });

  } catch (err) {
    next(err);
  } finally {
    // ── Step 7: Clean up uploaded file ────────────────────
    // (Keep it if you want to serve previews; delete to save disk space)
    // Uncomment to delete:
    // if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
    //   fs.unlinkSync(uploadedFilePath);
    // }
  }
}

module.exports = { analyzeImage };

/**
 * database.js – MongoDB Connection via Mongoose
 *
 * Connects to local MongoDB using the URI from .env.
 * If MongoDB is not available, logs a clear error message
 * with installation instructions.
 */

'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

console.log("Mongo URI:", MONGO_URI);

/**
 * connectDB – Establishes Mongoose connection with retry
 * @returns {Promise<void>}
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    console.log(`[MongoDB] Database : ${conn.connection.name}`);

    // ── Connection Event Listeners ──
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database.');
    });

    // ── Graceful Shutdown ──
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed on SIGINT.');
      process.exit(0);
    });

  } catch (error) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  MongoDB Connection Failed!                              ║');
    console.error('╠══════════════════════════════════════════════════════════╣');
    console.error('║  MongoDB is not running or not installed.                ║');
    console.error('║                                                          ║');
    console.error('║  Fix option 1 – Install MongoDB Community:               ║');
    console.error('║    https://www.mongodb.com/try/download/community        ║');
    console.error('║    Then run: net start MongoDB (in Admin PowerShell)     ║');
    console.error('║                                                          ║');
    console.error('║  Fix option 2 – Use MongoDB Atlas (free cloud):          ║');
    console.error('║    https://www.mongodb.com/cloud/atlas                   ║');
    console.error('║    Set MONGO_URI=mongodb+srv://... in backend/.env        ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('');
    throw error;
  }
}

module.exports = connectDB;

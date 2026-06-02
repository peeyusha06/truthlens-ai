/**
 * server.js – TruthLens AI Express Server Entry Point
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const connectDB      = require('./src/config/database');
const analyzeRouter  = require('./src/routes/analyze');
const historyRouter  = require('./src/routes/history');
const authRouter     = require('./src/routes/auth');
const pdfRouter      = require('./src/routes/pdf');
const errorHandler   = require('./src/middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Ensure uploads directory exists ───────────────────────
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',    authRouter);     // NEW: authentication
app.use('/api/pdf',     pdfRouter);      // NEW: PDF report
app.use('/api/analyze', analyzeRouter);  // Existing
app.use('/api/history', historyRouter);  // Existing

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status   : 'ok',
    service  : 'TruthLens AI Backend',
    timestamp: new Date().toISOString(),
    version  : '1.0.0',
  });
});

// ── 404 Handler ────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ───────────────────────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║      TruthLens AI - Backend Server       ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  Server : http://localhost:${PORT}           ║`);
      console.log(`║  Auth   : /api/auth/signup, /login       ║`);
      console.log(`║  PDF    : /api/pdf/:id                   ║`);
      console.log('║  DB     : MongoDB Connected              ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('[server] Fatal startup error:', err.message);
    process.exit(1);
  }
}

startServer();
module.exports = app;

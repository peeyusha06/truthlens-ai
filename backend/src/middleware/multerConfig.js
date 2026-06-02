/**
 * multerConfig.js – Multer configuration for image uploads
 *
 * - Stores uploads in the /uploads directory
 * - Validates MIME type (images only)
 * - Enforces max file size from .env
 */

'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Ensure uploads directory exists ───────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Disk Storage Engine ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),

  filename: (req, file, cb) => {
    // Sanitize original filename and prepend timestamp
    const safeBasename = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const uniqueName = `${Date.now()}-${safeBasename}`;
    cb(null, uniqueName);
  },
});

// ── File Filter (images only) ──────────────────────────────
const fileFilter = (req, file, cb) => {
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`
      ),
      false
    );
  }
};

// ── Multer Instance ────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10 MB
    files: 1, // Only allow 1 file per request
  },
});

module.exports = upload;

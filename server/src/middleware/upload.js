const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure target upload directories exist at boot
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
const commentsDir = path.join(__dirname, '../../uploads/comments');
[avatarsDir, commentsDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ──────────────────────────────────────
// Avatar upload (existing)
// ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png, .gif files are allowed'), false);
  }
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

// ──────────────────────────────────────
// Comment attachment upload (embed widget)
// Broad document + image support so users can share docs/screenshots
// ──────────────────────────────────────
const commentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, commentsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'file';
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${Date.now()}-${rand}-${base}${ext.toLowerCase()}`);
  },
});

const ALLOWED_ATTACHMENT_MIMES = new Set([
  // images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/markdown',
  // archives
  'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed', 'application/vnd.rar',
  'application/x-7z-compressed',
]);

const commentFileFilter = (req, file, cb) => {
  if (ALLOWED_ATTACHMENT_MIMES.has(file.mimetype)) cb(null, true);
  else cb(new Error('This file type is not allowed.'), false);
};

const uploadCommentAttachment = multer({
  storage: commentStorage,
  fileFilter: commentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = { uploadAvatar, uploadCommentAttachment };

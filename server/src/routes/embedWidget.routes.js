// ============================================================
// EMBED WIDGET ROUTES
//
// Admin:
//   GET    /              → list all widgets
//   POST   /              → create
//   GET    /:id           → get one (for editor)
//   PUT    /:id           → update
//   DELETE /:id           → delete
//   POST   /:id/toggle    → flip isActive
//
// Public (no auth — called by embed script):
//   GET    /public/:token → widget config by token
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getWidgets,
  getWidget,
  createWidget,
  updateWidget,
  deleteWidget,
  toggleWidget,
  getPublicConfig,
  getPublicPosts,
  submitPublicPost,
} = require('../controllers/embedWidget.controller');

// Public — no auth. CORS is mounted globally in index.js on
// /api/embed-widgets/public to allow any origin (embed script runs on
// third-party sites and can't be restricted).
router.get('/public/:token', getPublicConfig);
router.get('/public/:token/posts', getPublicPosts);
router.post('/public/:token/submit', submitPublicPost);

// Admin
router.get('/', authenticate, getWidgets);
router.post('/', authenticate, createWidget);
router.get('/:id', authenticate, getWidget);
router.put('/:id', authenticate, updateWidget);
router.delete('/:id', authenticate, deleteWidget);
router.post('/:id/toggle', authenticate, toggleWidget);

module.exports = router;

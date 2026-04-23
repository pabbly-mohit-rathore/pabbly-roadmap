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
const cors = require('cors');
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

// Permissive CORS just for the widget's public endpoints — the embed
// script runs on third-party origins, so we can't lock this down.
const publicCors = cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] });

// Public — no auth, any origin
router.get('/public/:token', publicCors, getPublicConfig);
router.get('/public/:token/posts', publicCors, getPublicPosts);
router.options('/public/:token/submit', publicCors);
router.post('/public/:token/submit', publicCors, submitPublicPost);

// Admin
router.get('/', authenticate, getWidgets);
router.post('/', authenticate, createWidget);
router.get('/:id', authenticate, getWidget);
router.put('/:id', authenticate, updateWidget);
router.delete('/:id', authenticate, deleteWidget);
router.post('/:id/toggle', authenticate, toggleWidget);

module.exports = router;

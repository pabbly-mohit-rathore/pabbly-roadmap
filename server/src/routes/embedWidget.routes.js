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
} = require('../controllers/embedWidget.controller');

// Public
router.get('/public/:token', getPublicConfig);

// Admin
router.get('/', authenticate, getWidgets);
router.post('/', authenticate, createWidget);
router.get('/:id', authenticate, getWidget);
router.put('/:id', authenticate, updateWidget);
router.delete('/:id', authenticate, deleteWidget);
router.post('/:id/toggle', authenticate, toggleWidget);

module.exports = router;

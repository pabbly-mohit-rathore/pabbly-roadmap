// ============================================================
// WEBHOOK ROUTES
//
// GET    /events         → available event registry (no auth needed for dropdown)
// GET    /               → list webhooks (admin)
// POST   /               → create (admin)
// PUT    /:id            → update (admin)
// DELETE /:id            → delete (admin)
// POST   /:id/toggle     → flip isActive (admin)
// POST   /:id/test       → send test payload (admin)
// ============================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getEvents,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  testWebhook,
} = require('../controllers/webhook.controller');

router.get('/events', authenticate, getEvents);
router.get('/', authenticate, getWebhooks);
router.post('/', authenticate, createWebhook);
router.put('/:id', authenticate, updateWebhook);
router.delete('/:id', authenticate, deleteWebhook);
router.post('/:id/toggle', authenticate, toggleWebhook);
router.post('/:id/test', authenticate, testWebhook);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createEntry,
  listEntries,
  getEntry,
  updateEntry,
  deleteEntry,
  publishEntry,
  getPublicEntries,
  toggleLike,
} = require('../controllers/changelog.controller');

// Public entries (for users) — must be before /:id route
router.get('/changelog/public', authenticate, getPublicEntries);

// Admin CRUD
router.get('/changelog', authenticate, listEntries);
router.post('/changelog', authenticate, createEntry);
router.get('/changelog/:id', authenticate, getEntry);
router.put('/changelog/:id', authenticate, updateEntry);
router.delete('/changelog/:id', authenticate, deleteEntry);
router.post('/changelog/:id/publish', authenticate, publishEntry);
router.post('/changelog/:id/like', authenticate, toggleLike);

module.exports = router;

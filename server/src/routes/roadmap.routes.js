// ============================================================
// ROADMAP ROUTES
//
// Routes:
//   GET /roadmap  → Get posts grouped by status (Kanban view)
// ============================================================

const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const { getRoadmap } = require('../controllers/roadmap.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const getRoadmapRules = [
  query('boardId')
    .optional()
    .isUUID().withMessage('Board ID must be a valid UUID.'),
  query('sort')
    .optional()
    .isIn(['votes', 'latest', 'oldest', 'priority']).withMessage('Sort must be "votes", "latest", "oldest", or "priority".'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /roadmap — Get posts grouped by status (authenticated)
router.get('/roadmap', authenticate, getRoadmapRules, validate, getRoadmap);

module.exports = router;

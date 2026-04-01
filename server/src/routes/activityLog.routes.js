// ============================================================
// ACTIVITY LOG ROUTES
//
// Routes:
//   GET /activity-log  → Get activity logs (scoped by permissions)
// ============================================================

const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const { getActivityLog } = require('../controllers/activityLog.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const getActivityLogRules = [
  query('boardId')
    .optional()
    .isUUID().withMessage('Board ID must be a valid UUID.'),
  query('userId')
    .optional()
    .isUUID().withMessage('User ID must be a valid UUID.'),
  query('action')
    .optional()
    .isString().withMessage('Action must be a string.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a non-negative integer.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /activity-log — Get activity logs (authenticated)
router.get('/activity-log', authenticate, getActivityLogRules, validate, getActivityLog);

module.exports = router;

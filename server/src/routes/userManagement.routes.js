// ============================================================
// USER MANAGEMENT ROUTES
//
// Routes:
//   GET    /admin/users              → List all users
//   GET    /admin/users/:userId      → Get user details
//   PATCH  /admin/users/:userId/status → Ban/Unban user
// ============================================================

const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  listUsers,
  getUserDetails,
  toggleUserStatus,
  searchUsersForMention,
} = require('../controllers/userManagement.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const listUsersRules = [
  query('status')
    .optional()
    .isIn(['active', 'banned']).withMessage('Status must be "active" or "banned".'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 }).withMessage('Search must not be empty.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a non-negative integer.'),
];

const userIdParamRules = [
  param('userId')
    .isUUID().withMessage('User ID must be a valid UUID.'),
];

const toggleStatusRules = [
  body('action')
    .notEmpty().withMessage('Action is required.')
    .isIn(['ban', 'unban']).withMessage('Action must be "ban" or "unban".'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /users/search — Lightweight user search for @mention autocomplete (any authenticated user)
router.get('/users/search', authenticate, searchUsersForMention);

// GET /admin/users — List all users (admin only)
router.get('/admin/users', authenticate, listUsersRules, validate, listUsers);

// GET /admin/users/:userId — Get user details (admin only)
router.get('/admin/users/:userId', authenticate, userIdParamRules, validate, getUserDetails);

// PATCH /admin/users/:userId/status — Ban/Unban user (admin only)
router.patch('/admin/users/:userId/status', authenticate, userIdParamRules, toggleStatusRules, validate, toggleUserStatus);

module.exports = router;

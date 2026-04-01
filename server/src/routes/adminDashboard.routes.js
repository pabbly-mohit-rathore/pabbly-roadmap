// ============================================================
// ADMIN DASHBOARD ROUTES
//
// Routes:
//   GET /admin/dashboard/stats             → Get dashboard stats
//   GET /admin/dashboard/top-posts         → Get top voted posts
//   GET /admin/dashboard/activities        → Get recent activities
//   GET /admin/dashboard/board-members     → Get board members overview
//   GET /admin/dashboard/posts-by-status   → Get posts grouped by status
// ============================================================

const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getDashboardStats,
  getTopVotedPosts,
  getRecentActivities,
  getBoardMembersOverview,
  getPostsByStatus,
} = require('../controllers/adminDashboard.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const paginationRules = [
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

// GET /admin/dashboard/stats — Get dashboard stats (admin only)
router.get('/admin/dashboard/stats', authenticate, getDashboardStats);

// GET /admin/dashboard/top-posts — Get top voted posts (admin only)
router.get('/admin/dashboard/top-posts', authenticate, paginationRules, validate, getTopVotedPosts);

// GET /admin/dashboard/activities — Get recent activities (admin only)
router.get('/admin/dashboard/activities', authenticate, paginationRules, validate, getRecentActivities);

// GET /admin/dashboard/board-members — Get board members overview (admin only)
router.get('/admin/dashboard/board-members', authenticate, getBoardMembersOverview);

// GET /admin/dashboard/posts-by-status — Get posts by status (admin only)
router.get('/admin/dashboard/posts-by-status', authenticate, getPostsByStatus);

module.exports = router;

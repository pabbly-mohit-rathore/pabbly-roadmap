// ============================================================
// POST ROUTES
//
// Routes:
//   GET    /posts              → Get all posts (filter, search, sort, paginate)
//   POST   /posts              → Create new post
//   GET    /posts/:slug        → Get post detail
//   PUT    /posts/:id          → Update post
//   DELETE /posts/:id          → Delete post
//   PUT    /posts/:id/status   → Change post status (admin/manager)
//   PUT    /posts/:id/pin      → Pin/unpin post (admin/manager)
//   POST   /posts/merge        → Merge duplicate posts (admin/manager)
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');

const {
  getPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  changePostStatus,
  togglePinPost,
  mergePosts,
} = require('../controllers/post.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const createPostRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters.'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters.'),
  body('type')
    .optional()
    .isIn(['feature', 'bug', 'improvement', 'integration']).withMessage('Invalid post type.'),
  body('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const updatePostRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters.'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters.'),
  body('type')
    .optional()
    .isIn(['feature', 'bug', 'improvement', 'integration']).withMessage('Invalid post type.'),
];

const changeStatusRules = [
  body('status')
    .isIn(['open', 'under_review', 'planned', 'in_progress', 'live', 'closed', 'hold'])
    .withMessage('Invalid status.'),
];

const mergePostsRules = [
  body('sourcePostId')
    .isUUID().withMessage('Source post ID must be a valid UUID.'),
  body('targetPostId')
    .isUUID().withMessage('Target post ID must be a valid UUID.'),
];

const slugParamRules = [
  param('slug')
    .trim()
    .notEmpty().withMessage('Slug is required.'),
];

const idParamRules = [
  param('id')
    .isUUID().withMessage('Post ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /posts — Get all posts (optional auth for vote status)
router.get('/', optionalAuth, getPosts);

// POST /posts — Create new post (authenticated)
router.post('/', authenticate, createPostRules, validate, createPost);

// GET /posts/:slug — Get post detail (optional auth for vote status)
router.get('/:slug', optionalAuth, slugParamRules, validate, getPostBySlug);

// PUT /posts/:id — Update post (authenticated)
router.put('/:id', authenticate, idParamRules, updatePostRules, validate, updatePost);

// DELETE /posts/:id — Delete post (authenticated)
router.delete('/:id', authenticate, idParamRules, validate, deletePost);

// PUT /posts/:id/status — Change post status (admin/manager)
router.put('/:id/status', authenticate, idParamRules, changeStatusRules, validate, changePostStatus);

// PUT /posts/:id/pin — Pin/unpin post (admin/manager)
router.put('/:id/pin', authenticate, idParamRules, validate, togglePinPost);

// POST /posts/merge — Merge posts (admin/manager)
router.post('/merge', authenticate, mergePostsRules, validate, mergePosts);

module.exports = router;

// ============================================================
// COMMENT ROUTES
//
// Routes:
//   GET    /post/:postId              → Get all comments for a post
//   POST   /post/:postId              → Add comment
//   PUT    /:id                       → Update comment
//   DELETE /:id                       → Delete comment
//   PUT    /:id/official              → Mark as official response
//   PUT    /:id/internal              → Mark as internal note
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  markAsOfficial,
  markAsInternal,
} = require('../controllers/comment.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const addCommentRules = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required.')
    .isLength({ min: 1, max: 5000 }).withMessage('Comment must be between 1 and 5000 characters.'),
  body('parentId')
    .optional()
    .isUUID().withMessage('Parent comment ID must be a valid UUID.'),
];

const updateCommentRules = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required.')
    .isLength({ min: 1, max: 5000 }).withMessage('Comment must be between 1 and 5000 characters.'),
];

const postIdParamRules = [
  param('postId')
    .isUUID().withMessage('Post ID must be a valid UUID.'),
];

const commentIdParamRules = [
  param('id')
    .isUUID().withMessage('Comment ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /post/:postId — Get all comments for a post (public but with auth check)
router.get('/post/:postId', postIdParamRules, validate, getComments);

// POST /post/:postId — Add comment to post (authenticated)
router.post(
  '/post/:postId',
  authenticate,
  postIdParamRules,
  addCommentRules,
  validate,
  addComment
);

// PUT /:id — Update comment (authenticated)
router.put(
  '/:id',
  authenticate,
  commentIdParamRules,
  updateCommentRules,
  validate,
  updateComment
);

// DELETE /:id — Delete comment (authenticated)
router.delete('/:id', authenticate, commentIdParamRules, validate, deleteComment);

// PUT /:id/official — Mark as official response (admin/manager)
router.put(
  '/:id/official',
  authenticate,
  commentIdParamRules,
  validate,
  markAsOfficial
);

// PUT /:id/internal — Mark as internal note (admin/manager)
router.put(
  '/:id/internal',
  authenticate,
  commentIdParamRules,
  validate,
  markAsInternal
);

module.exports = router;

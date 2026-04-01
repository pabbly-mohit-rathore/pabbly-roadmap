// ============================================================
// VOTE ROUTES
//
// Routes:
//   POST   /:postId              → Upvote post (toggle)
//   DELETE /:postId              → Remove vote
//   GET    /:postId/voters       → Get voters list
//   POST   /:postId/on-behalf    → Vote on behalf (admin/manager)
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  upvotePost,
  removeVote,
  getVoters,
  voteOnBehalf,
} = require('../controllers/vote.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const voteOnBehalfRules = [
  body('userId')
    .isUUID().withMessage('User ID must be a valid UUID.'),
];

const postIdParamRules = [
  param('postId')
    .isUUID().withMessage('Post ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// POST /:postId — Upvote post (toggle - ek click se remove bhi hota hai)
router.post('/:postId', authenticate, postIdParamRules, validate, upvotePost);

// DELETE /:postId — Remove vote explicitly
router.delete('/:postId', authenticate, postIdParamRules, validate, removeVote);

// GET /:postId/voters — Get voters list (paginated)
router.get('/:postId/voters', postIdParamRules, validate, getVoters);

// POST /:postId/on-behalf — Vote on behalf (admin/manager only)
router.post(
  '/:postId/on-behalf',
  authenticate,
  postIdParamRules,
  voteOnBehalfRules,
  validate,
  voteOnBehalf
);

module.exports = router;

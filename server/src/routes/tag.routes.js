// ============================================================
// TAG ROUTES
//
// Routes:
//   GET    /                     → Get all tags for a board
//   POST   /                     → Create tag (admin/manager)
//   PUT    /:id                  → Update tag (admin/manager)
//   DELETE /:id                  → Delete tag (admin/manager)
//   POST   /assign               → Assign tag to post
//   POST   /remove               → Remove tag from post
// ============================================================

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  assignTagToPost,
  removeTagFromPost,
} = require('../controllers/tag.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const createTagRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Tag name is required.')
    .isLength({ min: 1, max: 50 }).withMessage('Tag name must be between 1 and 50 characters.'),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex code.'),
  body('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const updateTagRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Tag name must be between 1 and 50 characters.'),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex code.'),
];

const assignTagRules = [
  body('postId')
    .isUUID().withMessage('Post ID must be a valid UUID.'),
  body('tagId')
    .isUUID().withMessage('Tag ID must be a valid UUID.'),
];

const getTagsQueryRules = [
  query('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const tagIdParamRules = [
  param('id')
    .isUUID().withMessage('Tag ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET / — Get all tags for a board (public with query param)
router.get('/', getTagsQueryRules, validate, getTags);

// POST / — Create tag (authenticated, admin/manager)
router.post('/', authenticate, createTagRules, validate, createTag);

// PUT /:id — Update tag (authenticated, admin/manager)
router.put('/:id', authenticate, tagIdParamRules, updateTagRules, validate, updateTag);

// DELETE /:id — Delete tag (authenticated, admin/manager)
router.delete('/:id', authenticate, tagIdParamRules, validate, deleteTag);

// POST /assign — Assign tag to post
router.post('/assign', authenticate, assignTagRules, validate, assignTagToPost);

// POST /remove — Remove tag from post
router.post('/remove', authenticate, assignTagRules, validate, removeTagFromPost);

module.exports = router;

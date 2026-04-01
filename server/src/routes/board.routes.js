// ============================================================
// BOARD ROUTES
//
// Ye file Board endpoints define karti hai
//
// Routes:
//   GET    /boards              → Sab boards get karo
//   GET    /boards/:slug        → Specific board get karo
//   POST   /boards              → Naya board banao (admin only)
//   PUT    /boards/:id          → Board edit karo
//   DELETE /boards/:id          → Board delete karo (admin only)
//   POST   /boards/reorder      → Boards reorder karo (admin only)
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getBoards,
  getBoardBySlug,
  createBoard,
  updateBoard,
  deleteBoard,
  reorderBoards,
} = require('../controllers/board.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const createBoardRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Board name is required.')
    .isLength({ min: 2 }).withMessage('Board name must be at least 2 characters.'),
  body('description')
    .optional()
    .trim(),
  body('icon')
    .optional()
    .trim(),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex code.'),
];

const updateBoardRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Board name must be at least 2 characters.'),
  body('description')
    .optional()
    .trim(),
  body('icon')
    .optional()
    .trim(),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex code.'),
];

const reorderBoardsRules = [
  body('boardIds')
    .isArray().withMessage('boardIds must be an array.')
    .notEmpty().withMessage('boardIds cannot be empty.'),
  body('boardIds.*')
    .isUUID().withMessage('Each boardId must be a valid UUID.'),
];

const slugParamRules = [
  param('slug')
    .trim()
    .notEmpty().withMessage('Slug is required.'),
];

const idParamRules = [
  param('id')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// Public (no auth needed) — but we'll require auth to see accessible boards only
// GET /boards — Authenticated user dekhe apne accessible boards
router.get('/', authenticate, getBoards);

// GET /boards/:slug — Specific board dekho (access check hoga controller mein)
router.get('/:slug', authenticate, slugParamRules, validate, getBoardBySlug);

// POST /boards — Naya board banao (admin only)
router.post('/', authenticate, createBoardRules, validate, createBoard);

// PUT /boards/:id — Board edit karo (admin or board manager)
router.put('/:id', authenticate, idParamRules, updateBoardRules, validate, updateBoard);

// DELETE /boards/:id — Board delete karo (admin only)
router.delete('/:id', authenticate, idParamRules, validate, deleteBoard);

// POST /boards/reorder — Boards ka order badlo (admin only)
// Note: Ye route POST /boards/reorder ke baad likha hai taaki slug se match na ho jaye
router.post('/reorder', authenticate, reorderBoardsRules, validate, reorderBoards);

module.exports = router;

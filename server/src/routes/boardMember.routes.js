// ============================================================
// BOARD MEMBER ROUTES
//
// Routes:
//   GET    /boards/:boardId/members        → Get all members of a board
//   POST   /boards/:boardId/members        → Assign manager to board
//   DELETE /boards/:boardId/members        → Remove manager from board
//   GET    /members/boards                 → Get boards I manage
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getBoardMembers,
  assignManager,
  removeManager,
  getManagedBoards,
} = require('../controllers/boardMember.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const boardIdParamRules = [
  param('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const assignManagerRules = [
  body('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
  body('userId')
    .isUUID().withMessage('User ID must be a valid UUID.'),
];

const removeManagerRules = [
  body('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
  body('userId')
    .isUUID().withMessage('User ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /boards/:boardId/members — Get all members of a board (admin only)
router.get('/boards/:boardId/members', boardIdParamRules, validate, authenticate, getBoardMembers);

// POST /boards/:boardId/members — Assign manager to board (admin only)
router.post('/boards/:boardId/members', authenticate, assignManagerRules, validate, assignManager);

// DELETE /boards/:boardId/members — Remove manager from board (admin only)
router.delete('/boards/:boardId/members', authenticate, removeManagerRules, validate, removeManager);

// GET /members/boards — Get boards I manage (authenticated)
router.get('/members/boards', authenticate, getManagedBoards);

module.exports = router;
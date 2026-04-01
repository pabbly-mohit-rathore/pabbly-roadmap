// ============================================================
// QUICK RESPONSE ROUTES
//
// Routes:
//   GET    /quick-responses                 → Get templates for a board
//   POST   /quick-responses                 → Create template
//   PATCH  /quick-responses/:templateId     → Update template
//   DELETE /quick-responses/:templateId     → Delete template
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getQuickResponses,
  createQuickResponse,
  updateQuickResponse,
  deleteQuickResponse,
} = require('../controllers/quickResponse.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const getTemplatesRules = [
  query('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const createTemplateRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters.'),
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required.')
    .isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters.'),
  body('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const updateTemplateRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters.'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters.'),
];

const templateIdParamRules = [
  param('templateId')
    .isUUID().withMessage('Template ID must be a valid UUID.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /quick-responses — Get templates for a board (authenticated, admin/manager)
router.get('/quick-responses', authenticate, getTemplatesRules, validate, getQuickResponses);

// POST /quick-responses — Create template (authenticated, admin/manager)
router.post('/quick-responses', authenticate, createTemplateRules, validate, createQuickResponse);

// PATCH /quick-responses/:templateId — Update template (authenticated, admin/manager)
router.patch('/quick-responses/:templateId', authenticate, templateIdParamRules, updateTemplateRules, validate, updateQuickResponse);

// DELETE /quick-responses/:templateId — Delete template (authenticated, admin/manager)
router.delete('/quick-responses/:templateId', authenticate, templateIdParamRules, validate, deleteQuickResponse);

module.exports = router;

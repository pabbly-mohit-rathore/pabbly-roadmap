// ============================================================
// INVITE LINK ROUTES
//
// Routes:
//   POST   /invite-links                  → Generate invite link
//   GET    /boards/:boardId/invite-links  → List invite links for a board
//   PATCH  /invite-links/:linkId/revoke   → Revoke invite link
//   PATCH  /invite-links/:linkId/reactivate → Reactivate invite link
//   DELETE /invite-links/:linkId          → Delete invite link
//   POST   /invite-links/redeem           → Redeem invite link
// ============================================================

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  generateInviteLink,
  listInviteLinks,
  validateInviteLink,
  revokeInviteLink,
  reactivateInviteLink,
  deleteInviteLink,
  redeemInviteLink,
} = require('../controllers/inviteLink.controller');

// ──────────────────────────────────────
// Validation Rules
// ──────────────────────────────────────

const generateInviteLinkRules = [
  body('boardIds')
    .isArray({ min: 1 }).withMessage('At least one board ID is required.'),
  body('boardIds.*')
    .isUUID().withMessage('Each board ID must be a valid UUID.'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters.'),
  body('expiresAt')
    .optional()
    .isISO8601().withMessage('Expiration date must be a valid ISO 8601 date.'),
  body('maxUses')
    .optional()
    .isInt({ min: 1 }).withMessage('Max uses must be a positive integer.'),
];

const boardIdParamRules = [
  param('boardId')
    .isUUID().withMessage('Board ID must be a valid UUID.'),
];

const linkIdParamRules = [
  param('linkId')
    .isUUID().withMessage('Link ID must be a valid UUID.'),
];

const redeemInviteLinkRules = [
  body('token')
    .notEmpty().withMessage('Token is required.')
    .isLength({ min: 1 }).withMessage('Token is required.'),
];

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// GET /invite-links/:token — Validate invite link (PUBLIC - no auth required)
router.get('/invite-links/:token', validateInviteLink);

// GET /invite-links — List all invite links (authenticated, admin)
router.get('/invite-links', authenticate, listInviteLinks);

// POST /invite-links — Generate invite link (authenticated, admin/manager)
router.post('/invite-links', authenticate, generateInviteLinkRules, validate, generateInviteLink);

// GET /boards/:boardId/invite-links — List invite links for a board (authenticated, admin/manager)
router.get('/boards/:boardId/invite-links', authenticate, boardIdParamRules, validate, listInviteLinks);

// PATCH /invite-links/:linkId/revoke — Revoke invite link (authenticated, admin/manager)
router.patch('/invite-links/:linkId/revoke', authenticate, linkIdParamRules, validate, revokeInviteLink);

// PATCH /invite-links/:linkId/reactivate — Reactivate invite link (authenticated, admin/manager)
router.patch('/invite-links/:linkId/reactivate', authenticate, linkIdParamRules, validate, reactivateInviteLink);

// DELETE /invite-links/:linkId — Delete invite link (authenticated, admin/manager)
router.delete('/invite-links/:linkId', authenticate, linkIdParamRules, validate, deleteInviteLink);

// POST /invite-links/redeem — Redeem invite link (authenticated)
router.post('/invite-links/redeem', authenticate, redeemInviteLinkRules, validate, redeemInviteLink);

module.exports = router;
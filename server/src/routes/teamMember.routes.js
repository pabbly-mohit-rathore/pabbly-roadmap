const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const {
  getTeamMemberStats,
  getTeamMembers,
  getBoardsSharedWithMe,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
  acceptTeamInvitation,
  rejectTeamInvitation,
  cancelTeamInvitation,
} = require('../controllers/teamMember.controller');

router.get('/team-members/stats', authenticate, getTeamMemberStats);
router.get('/team-members', authenticate, getTeamMembers);
router.get('/team-members/shared-with-me', authenticate, getBoardsSharedWithMe);

router.post('/team-members', authenticate, [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('boardId').isUUID().withMessage('Board ID must be a valid UUID.'),
  body('accessLevel').isIn(['admin', 'manager']).withMessage('Access level must be admin or manager.'),
], validate, addTeamMember);

router.post('/team-members/invitations/:invitationId/accept', authenticate, [
  param('invitationId').isUUID().withMessage('Invitation ID must be a valid UUID.'),
], validate, acceptTeamInvitation);

router.post('/team-members/invitations/:invitationId/reject', authenticate, [
  param('invitationId').isUUID().withMessage('Invitation ID must be a valid UUID.'),
], validate, rejectTeamInvitation);

router.put('/team-members/:memberId', authenticate, [
  param('memberId').isUUID().withMessage('Member ID must be a valid UUID.'),
  body('accessLevel').isIn(['admin', 'manager']).withMessage('Access level must be admin or manager.'),
], validate, updateTeamMember);

router.delete('/team-members/invitations/:invitationId', authenticate, [
  param('invitationId').isUUID().withMessage('Invitation ID must be a valid UUID.'),
], validate, cancelTeamInvitation);

router.delete('/team-members/:memberId', authenticate, [
  param('memberId').isUUID().withMessage('Member ID must be a valid UUID.'),
], validate, removeTeamMember);

module.exports = router;

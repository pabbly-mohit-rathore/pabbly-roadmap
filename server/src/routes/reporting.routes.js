const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getActivityOverview,
  getNewPosts,
  getPostsByBoard,
  getAdminActivity,
  getStatusPipeline,
} = require('../controllers/reporting.controller');

router.get('/reporting/activity-overview', authenticate, getActivityOverview);
router.get('/reporting/new-posts', authenticate, getNewPosts);
router.get('/reporting/posts-by-board', authenticate, getPostsByBoard);
router.get('/reporting/admin-activity', authenticate, getAdminActivity);
router.get('/reporting/status-pipeline', authenticate, getStatusPipeline);

module.exports = router;

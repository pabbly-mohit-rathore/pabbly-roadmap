const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getActivityOverview,
  getNewPosts,
  getStalePosts,
  getPostsByBoard,
  getAdminActivity,
} = require('../controllers/reporting.controller');

router.get('/reporting/activity-overview', authenticate, getActivityOverview);
router.get('/reporting/new-posts', authenticate, getNewPosts);
router.get('/reporting/stale-posts', authenticate, getStalePosts);
router.get('/reporting/posts-by-board', authenticate, getPostsByBoard);
router.get('/reporting/admin-activity', authenticate, getAdminActivity);

module.exports = router;

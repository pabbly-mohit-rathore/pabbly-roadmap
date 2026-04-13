const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { toggleSubscription, getSubscriptionStatus } = require('../controllers/subscription.controller');

router.post('/:postId', authenticate, toggleSubscription);
router.get('/:postId/status', authenticate, getSubscriptionStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPublicKey, subscribe, unsubscribe, getStatus } = require('../controllers/pushSubscription.controller');

router.get('/public-key', getPublicKey);
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.get('/status', authenticate, getStatus);

module.exports = router;

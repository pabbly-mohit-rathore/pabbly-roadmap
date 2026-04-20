const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPublicKey, subscribe, unsubscribe, getStatus, sendTest, clearAll } = require('../controllers/pushSubscription.controller');

router.get('/public-key', getPublicKey);
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.get('/status', authenticate, getStatus);
router.post('/test', authenticate, sendTest);
router.delete('/clear-all', authenticate, clearAll);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, getUnreadCount, markAsRead, markAllRead, clearAll } = require('../controllers/notification.controller');

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markAsRead);
router.delete('/clear-all', authenticate, clearAll);

module.exports = router;

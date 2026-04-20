const prisma = require('../config/database');
const { sendPushToUser } = require('../utils/webPush');

const getPublicKey = (req, res) => {
  res.json({ success: true, data: { publicKey: process.env.VAPID_PUBLIC_KEY || null } });
};

const subscribe = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { endpoint, keys, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription payload' });
    }

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || null,
      },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || null,
      },
    });

    res.json({ success: true, data: { id: sub.id } });
  } catch (error) { next(error); }
};

const unsubscribe = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint required' });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
    res.json({ success: true, message: 'Unsubscribed' });
  } catch (error) { next(error); }
};

const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { endpoint } = req.query;
    if (!endpoint) return res.json({ success: true, data: { subscribed: false } });

    const sub = await prisma.pushSubscription.findFirst({ where: { endpoint, userId } });
    res.json({ success: true, data: { subscribed: !!sub } });
  } catch (error) { next(error); }
};

const sendTest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) {
      return res.status(400).json({ success: false, message: 'No active push subscription. Enable browser notifications first.' });
    }

    await sendPushToUser(userId, {
      title: 'Pabbly Roadmap — Test Notification',
      body: 'If you see this on your desktop, push notifications are working!',
      url: '/admin/profile-settings?tab=notifications',
      type: 'test',
    });

    res.json({ success: true, message: 'Test notification sent.', data: { subscriptionCount: subs.length } });
  } catch (error) {
    console.error('Test push error:', error);
    next(error);
  }
};

// Clear ALL subscriptions for the current user (useful to remove stale dev/localhost subs)
const clearAll = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await prisma.pushSubscription.deleteMany({ where: { userId } });
    res.json({ success: true, message: `Cleared ${result.count} push subscription(s)`, data: { count: result.count } });
  } catch (error) { next(error); }
};

module.exports = { getPublicKey, subscribe, unsubscribe, getStatus, sendTest, clearAll };

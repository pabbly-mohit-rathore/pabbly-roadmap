const prisma = require('../config/database');

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

module.exports = { getPublicKey, subscribe, unsubscribe, getStatus };

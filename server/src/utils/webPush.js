const webpush = require('web-push');
const prisma = require('../config/database');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@pabbly.com';

let vapidConfigured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    vapidConfigured = true;
    console.log('[webPush] VAPID configured, subject:', SUBJECT);
  } catch (err) {
    console.error('[webPush] VAPID setup failed:', err.message);
  }
} else {
  console.warn('[webPush] Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in .env — push disabled');
}

async function sendPushToUser(userId, payload) {
  if (!vapidConfigured) {
    console.warn('[webPush] Skipping push — VAPID not configured');
    return;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) {
    console.log(`[webPush] No subscriptions for user ${userId}`);
    return;
  }

  const body = JSON.stringify(payload);
  console.log(`[webPush] Sending to ${subs.length} subscription(s) for user ${userId}: ${payload.title}`);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        console.log(`[webPush] Delivered to ${sub.endpoint.substring(0, 60)}...`);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[webPush] Subscription expired (${err.statusCode}), removing`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[webPush] Send failed (${err.statusCode || 'unknown'}):`, err.body || err.message);
        }
      }
    })
  );
}

async function sendPushToUsers(userIds, payload) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}

module.exports = { sendPushToUser, sendPushToUsers };

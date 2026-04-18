const webpush = require('web-push');
const prisma = require('../config/database');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@pabbly.com';

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
}

async function sendPushToUser(userId, payload) {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Push send failed:', err.statusCode, err.body || err.message);
        }
      }
    })
  );
}

async function sendPushToUsers(userIds, payload) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}

module.exports = { sendPushToUser, sendPushToUsers };

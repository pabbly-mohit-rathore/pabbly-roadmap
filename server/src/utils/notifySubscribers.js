const prisma = require('../config/database');
const { sendPushToUsers } = require('./webPush');

async function notifySubscribers(postId, { type, title, message, excludeUserIds = [] }) {
  try {
    const subscribers = await prisma.subscription.findMany({
      where: { postId, userId: { notIn: excludeUserIds } },
      select: { userId: true },
    });

    if (subscribers.length === 0) return;

    const userIds = subscribers.map(s => s.userId);

    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, type, title, message, postId })),
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { slug: true },
    });

    sendPushToUsers(userIds, {
      title,
      body: message,
      url: post?.slug ? `/posts/${post.slug}` : '/',
      type,
    }).catch((err) => console.error('Push notify failed:', err));
  } catch (error) {
    console.error('Error notifying subscribers:', error);
  }
}

module.exports = notifySubscribers;

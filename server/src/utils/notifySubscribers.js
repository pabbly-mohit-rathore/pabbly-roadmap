const prisma = require('../config/database');

async function notifySubscribers(postId, { type, title, message, excludeUserIds = [] }) {
  try {
    const subscribers = await prisma.subscription.findMany({
      where: { postId, userId: { notIn: excludeUserIds } },
      select: { userId: true },
    });

    if (subscribers.length === 0) return;

    await prisma.notification.createMany({
      data: subscribers.map(s => ({
        userId: s.userId,
        type,
        title,
        message,
        postId,
      })),
    });
  } catch (error) {
    console.error('Error notifying subscribers:', error);
  }
}

module.exports = notifySubscribers;

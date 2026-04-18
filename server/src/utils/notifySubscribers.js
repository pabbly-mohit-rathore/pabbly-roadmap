const prisma = require('../config/database');
const { sendPushToUsers } = require('./webPush');

/**
 * Creates in-app notification + browser push for:
 *   - All subscribers of the post
 *   - All admins (auto-included)
 *   - All managers of the post's board (auto-included)
 *
 * Excludes the user who triggered the action.
 */
async function notifySubscribers(postId, { type, title, message, excludeUserIds = [] }) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true, slug: true },
    });
    if (!post) return;

    const [subscribers, admins, managers] = await Promise.all([
      prisma.subscription.findMany({
        where: { postId, userId: { notIn: excludeUserIds } },
        select: { userId: true },
      }),
      prisma.user.findMany({
        where: { role: 'admin', isActive: true, id: { notIn: excludeUserIds } },
        select: { id: true },
      }),
      prisma.boardMember.findMany({
        where: { boardId: post.boardId, userId: { notIn: excludeUserIds } },
        select: { userId: true },
      }),
    ]);

    const userIds = Array.from(
      new Set([
        ...subscribers.map(s => s.userId),
        ...admins.map(a => a.id),
        ...managers.map(m => m.userId),
      ])
    );

    if (userIds.length === 0) return;

    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, type, title, message, postId })),
    });

    console.log(`[notifySubscribers] Notifying ${userIds.length} user(s) — ${title}`);

    sendPushToUsers(userIds, {
      title,
      body: message,
      url: post.slug ? `/posts/${post.slug}` : '/',
      type,
    }).catch((err) => console.error('[notifySubscribers] Push failed:', err));
  } catch (error) {
    console.error('[notifySubscribers] Error:', error);
  }
}

module.exports = notifySubscribers;

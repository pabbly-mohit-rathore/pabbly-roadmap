const prisma = require('../config/database');
const { sendPushToUser } = require('./webPush');

/**
 * Extract unique user IDs from mention tags in HTML.
 * Tiptap mention renders: <span class="mention-tag" data-mention-id="..." data-mention-label="...">@Name</span>
 */
function extractMentionIds(html) {
  if (!html || typeof html !== 'string') return [];
  const ids = new Set();
  const regex = /data-mention-id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) ids.add(match[1]);
  }
  return Array.from(ids);
}

/**
 * Notify mentioned users about a post/comment mention.
 * Filters out: self-mentions, non-existent users, banned users.
 *
 * @param {Object} opts
 * @param {string} opts.html            — content HTML to scan
 * @param {string} opts.actorId         — user who wrote the content (excluded)
 * @param {string} opts.actorName       — name to show in notification
 * @param {string} opts.context         — 'post' | 'comment' | 'reply'
 * @param {string} opts.postId
 * @param {string} opts.postTitle
 * @param {string} opts.postSlug
 */
async function notifyMentions({ html, actorId, actorName, context, postId, postTitle, postSlug }) {
  try {
    const mentionedIds = extractMentionIds(html).filter((id) => id !== actorId);
    if (mentionedIds.length === 0) return;

    const validUsers = await prisma.user.findMany({
      where: { id: { in: mentionedIds }, isActive: true },
      select: { id: true },
    });
    if (validUsers.length === 0) return;

    const contextLabel =
      context === 'post' ? 'a post' : context === 'reply' ? 'a reply' : 'a comment';
    const title = 'You were mentioned';
    const message = `${actorName || 'Someone'} mentioned you in ${contextLabel}${postTitle ? ` on "${postTitle}"` : ''}`;

    await prisma.notification.createMany({
      data: validUsers.map((u) => ({
        userId: u.id,
        type: 'mention',
        title,
        message,
        postId: postId || null,
      })),
    });

    console.log(`[notifyMentions] Notified ${validUsers.length} mentioned user(s)`);

    const pushPayload = {
      title,
      body: message,
      url: postSlug ? `/user/posts/${postSlug}` : '/',
      adminUrl: postSlug ? `/admin/posts/${postSlug}` : '/',
      type: 'mention',
    };
    await Promise.all(validUsers.map((u) => sendPushToUser(u.id, pushPayload).catch(() => {})));
  } catch (error) {
    console.error('[notifyMentions] Error:', error);
  }
}

module.exports = { notifyMentions, extractMentionIds };

// ============================================================
// WEBHOOK EVENTS REGISTRY
//
// Single source of truth for all webhook event names. Both the
// frontend dropdown and the backend dispatcher read from here.
// Keep names as `resource.action` (past tense).
// ============================================================

const WEBHOOK_EVENTS = [
  { value: 'post.created',         label: 'Post Created',         description: 'Fires when a new post is created' },
  { value: 'post.updated',         label: 'Post Updated',         description: 'Fires when a post is edited' },
  { value: 'post.deleted',         label: 'Post Deleted',         description: 'Fires when a post is deleted' },
  { value: 'post.status_changed',  label: 'Post Status Changed',  description: 'Fires when a post status is changed (Open → In Progress etc.)' },
  { value: 'post.upvoted',         label: 'Post Upvoted',         description: 'Fires when someone upvotes a post' },
  { value: 'comment.created',      label: 'Comment Created',      description: 'Fires when a new comment is added to a post' },
  { value: 'comment.replied',      label: 'Comment Replied',      description: 'Fires when someone replies to a comment' },
  { value: 'user.mentioned',       label: 'User Mentioned',       description: 'Fires when a user is @mentioned in a comment' },
];

const WEBHOOK_EVENT_VALUES = WEBHOOK_EVENTS.map((e) => e.value);

module.exports = { WEBHOOK_EVENTS, WEBHOOK_EVENT_VALUES };

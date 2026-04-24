// ============================================================
// EMBED WIDGET CONTROLLER
//
// Admin-only CRUD for embeddable feedback widgets + one PUBLIC
// endpoint used by the widget script on customer sites to fetch
// its config by token.
// ============================================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

// Public base URL used to build absolute attachment URLs returned to widget
function resolvePublicBase(req) {
  const envBase = process.env.PUBLIC_API_URL || process.env.API_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function attachmentUrlFor(req, storedFilename) {
  return `${resolvePublicBase(req)}/uploads/comments/${storedFilename}`;
}

function unlinkSafe(absPath) {
  if (!absPath) return;
  fs.unlink(absPath, () => {});
}

function requireAdmin(req, res) {
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Only admins can manage embed widgets.' });
    return false;
  }
  return true;
}

function generateToken() {
  // 24-char url-safe token: enough entropy, easy to copy
  return crypto.randomBytes(18).toString('base64url');
}

const VALID_POST_STATUSES = ['open', 'under_review', 'in_progress', 'live', 'hold'];
const VALID_SORTS = ['newest', 'oldest', 'most_voted', 'most_commented'];

function sanitize(body) {
  // Whitelist the fields clients can set — never trust the raw body
  const fields = [
    'name', 'type', 'openFrom', 'theme', 'accentColor', 'widgetWidth',
    'hideDefaultTrigger', 'disableExpansion', 'customTrigger', 'customTriggerSelector',
    'modules', 'boardIds', 'submissionBoardId',
    'showSubmissionFormOnly', 'suggestSimilarPosts', 'hideBoardSelection',
    'postStatuses', 'defaultSort',
    'isActive',
  ];
  const data = {};
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];

  if (data.type && !['modal', 'popover'].includes(data.type)) {
    throw new Error('Invalid type — must be "modal" or "popover".');
  }
  if (data.openFrom && !['auto', 'left', 'right', 'top', 'bottom', 'center'].includes(data.openFrom)) {
    throw new Error('Invalid openFrom — must be auto, left, right, top, bottom, or center.');
  }
  if (data.theme && !['light', 'dark'].includes(data.theme)) {
    throw new Error('Invalid theme — must be "light" or "dark".');
  }
  if (data.accentColor && !/^#[0-9a-fA-F]{6}$/.test(data.accentColor)) {
    throw new Error('Invalid accent color — must be a 6-digit hex.');
  }
  if (data.widgetWidth !== undefined && data.widgetWidth !== null) {
    const n = parseInt(data.widgetWidth, 10);
    if (Number.isNaN(n) || n < 200 || n > 1200) throw new Error('Widget width must be between 200 and 1200 px.');
    data.widgetWidth = n;
  }
  if (data.postStatuses) {
    if (!Array.isArray(data.postStatuses)) throw new Error('postStatuses must be an array.');
    const bad = data.postStatuses.filter((s) => !VALID_POST_STATUSES.includes(s));
    if (bad.length > 0) throw new Error(`Invalid post status(es): ${bad.join(', ')}`);
  }
  if (data.defaultSort && !VALID_SORTS.includes(data.defaultSort)) {
    throw new Error(`Invalid defaultSort — must be one of: ${VALID_SORTS.join(', ')}`);
  }
  return data;
}

// List all widgets (admin)
const getWidgets = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const widgets = await prisma.embedWidget.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, data: { widgets } });
  } catch (err) { next(err); }
};

// Get one widget (admin) — for editor
const getWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const widget = await prisma.embedWidget.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    if (!widget) return res.status(404).json({ success: false, message: 'Widget not found.' });
    res.json({ success: true, data: { widget } });
  } catch (err) { next(err); }
};

// Create widget (admin)
const createWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const body = sanitize(req.body);
    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ success: false, message: 'Widget name is required.' });
    }

    const widget = await prisma.embedWidget.create({
      data: {
        ...body,
        name: body.name.trim(),
        token: generateToken(),
        createdById: req.user.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ success: true, message: 'Widget created.', data: { widget } });
  } catch (err) {
    if (err.message && err.message.startsWith('Invalid')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// Update widget (admin)
const updateWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await prisma.embedWidget.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Widget not found.' });

    const body = sanitize(req.body);
    const widget = await prisma.embedWidget.update({
      where: { id: req.params.id },
      data: body,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, message: 'Widget updated.', data: { widget } });
  } catch (err) {
    if (err.message && err.message.startsWith('Invalid')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// Delete widget (admin)
const deleteWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await prisma.embedWidget.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Widget not found.' });
    await prisma.embedWidget.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Widget deleted.' });
  } catch (err) { next(err); }
};

// Toggle active (admin)
const toggleWidget = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await prisma.embedWidget.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Widget not found.' });
    const widget = await prisma.embedWidget.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, message: `Widget ${widget.isActive ? 'activated' : 'deactivated'}.`, data: { widget } });
  } catch (err) { next(err); }
};

// Build the Prisma where clause for a widget's public data queries
function buildWidgetPostWhere(widget) {
  const where = {
    isDraft: false,
  };
  if (Array.isArray(widget.boardIds) && widget.boardIds.length > 0) {
    where.boardId = { in: widget.boardIds };
  }
  if (Array.isArray(widget.postStatuses) && widget.postStatuses.length > 0) {
    where.status = { in: widget.postStatuses };
  }
  return where;
}

function buildWidgetOrderBy(sort) {
  switch (sort) {
    case 'oldest':         return { createdAt: 'asc' };
    case 'most_voted':     return { voteCount: 'desc' };
    case 'most_commented': return { comments: { _count: 'desc' } };
    case 'newest':
    default:               return { createdAt: 'desc' };
  }
}

// PUBLIC — widget script on customer sites calls this with ?token=xxx
const getPublicConfig = async (req, res, next) => {
  try {
    const { token } = req.params;
    const widget = await prisma.embedWidget.findUnique({
      where: { token },
      select: {
        id: true, name: true, type: true, openFrom: true, theme: true,
        accentColor: true, widgetWidth: true, hideDefaultTrigger: true,
        disableExpansion: true, modules: true, boardIds: true,
        submissionBoardId: true, showSubmissionFormOnly: true,
        suggestSimilarPosts: true, hideBoardSelection: true,
        postStatuses: true, defaultSort: true, isActive: true,
      },
    });

    if (!widget || !widget.isActive) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive.' });
    }

    res.json({ success: true, data: { widget } });
  } catch (err) { next(err); }
};

// PUBLIC — widget script fetches its posts list, respecting the widget's
// configured filters (statuses, boardIds) and default sort order.
// Supports ?q= for search (title/description + tag name match).
const getPublicPosts = async (req, res, next) => {
  try {
    const { token } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const q = (req.query.q || '').trim();

    const widget = await prisma.embedWidget.findUnique({
      where: { token },
      select: {
        isActive: true, boardIds: true, postStatuses: true, defaultSort: true,
      },
    });
    if (!widget || !widget.isActive) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive.' });
    }

    const where = buildWidgetPostWhere(widget);
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: buildWidgetOrderBy(widget.defaultSort),
      take: limit,
      select: {
        id: true, title: true, slug: true, description: true, content: true,
        status: true, type: true, voteCount: true, createdAt: true,
        board: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        _count: { select: { comments: true } },
      },
    });

    res.json({ success: true, data: { posts } });
  } catch (err) { next(err); }
};

// PUBLIC — single post detail for the drawer detail view
const getPublicPost = async (req, res, next) => {
  try {
    const { token, postId } = req.params;
    const widget = await prisma.embedWidget.findUnique({
      where: { token },
      select: { isActive: true, boardIds: true, postStatuses: true },
    });
    if (!widget || !widget.isActive) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive.' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true, title: true, slug: true, description: true, content: true,
        status: true, voteCount: true, commentCount: true, createdAt: true, boardId: true,
        author: { select: { id: true, name: true, avatar: true } },
        board: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        _count: { select: { comments: true } },
      },
    });
    if (!post || post.isDraft) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    // Enforce widget's board + status scope
    if (Array.isArray(widget.boardIds) && widget.boardIds.length > 0 && !widget.boardIds.includes(post.boardId)) {
      return res.status(404).json({ success: false, message: 'Post not found in this widget.' });
    }
    if (Array.isArray(widget.postStatuses) && widget.postStatuses.length > 0 && !widget.postStatuses.includes(post.status)) {
      return res.status(404).json({ success: false, message: 'Post not found in this widget.' });
    }

    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
};

// PUBLIC — toggle upvote. If caller is authenticated (optionalAuth set
// req.user), use that user and skip email. Otherwise fall back to email
// (creates anonymous user on first vote) — kept for external embeds
// where user isn't logged in.
const togglePublicVote = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { postId, email } = req.body || {};

    const widget = await prisma.embedWidget.findUnique({
      where: { token },
      select: { isActive: true, boardIds: true, postStatuses: true },
    });
    if (!widget || !widget.isActive) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive.' });
    }
    if (!postId) return res.status(400).json({ success: false, message: 'postId is required.' });

    let user;
    if (req.user && req.user.isActive) {
      user = req.user;
    } else {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
        return res.status(401).json({ success: false, message: 'Please sign in to vote.', code: 'AUTH_REQUIRED' });
      }
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }, select: { id: true, boardId: true, status: true, isDraft: true },
    });
    if (!post || post.isDraft) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (Array.isArray(widget.boardIds) && widget.boardIds.length > 0 && !widget.boardIds.includes(post.boardId)) {
      return res.status(404).json({ success: false, message: 'Post not available through this widget.' });
    }
    if (Array.isArray(widget.postStatuses) && widget.postStatuses.length > 0 && !widget.postStatuses.includes(post.status)) {
      return res.status(404).json({ success: false, message: 'Post not available through this widget.' });
    }

    // If no authenticated user, resolve by email (create on-the-fly)
    if (!user) {
      const cleanEmail = String(email).trim().toLowerCase();
      user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: cleanEmail.split('@')[0],
            role: 'user',
            isActive: true,
            emailVerified: false,
          },
        });
      }
    }

    const existing = await prisma.vote.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    }).catch(() => null);

    let voted;
    if (existing) {
      await prisma.vote.delete({ where: { userId_postId: { userId: user.id, postId } } });
      voted = false;
    } else {
      await prisma.vote.create({ data: { userId: user.id, postId } });
      voted = true;
    }
    const count = await prisma.vote.count({ where: { postId } });
    await prisma.post.update({ where: { id: postId }, data: { voteCount: count } });

    res.json({ success: true, data: { voted, voteCount: count } });
  } catch (err) { next(err); }
};

// PUBLIC — widget script submits a post. If caller is authenticated we
// use that user directly (no email needed). Otherwise we require a
// registered roadmap-user email to attribute the submission to.
const submitPublicPost = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { email, title, description, boardId } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const widget = await prisma.embedWidget.findUnique({
      where: { token },
      select: {
        isActive: true, submissionBoardId: true, boardIds: true, hideBoardSelection: true,
      },
    });
    if (!widget || !widget.isActive) {
      return res.status(404).json({ success: false, message: 'Widget not found or inactive.' });
    }

    // Resolve target board
    let targetBoardId = widget.hideBoardSelection
      ? widget.submissionBoardId
      : (boardId || widget.submissionBoardId);
    if (!targetBoardId) {
      return res.status(400).json({ success: false, message: 'No submission board configured for this widget.' });
    }
    // If widget restricts boards, the chosen board must be inside boardIds
    if (widget.boardIds.length > 0 && !widget.boardIds.includes(targetBoardId)) {
      return res.status(400).json({ success: false, message: 'That board is not available through this widget.' });
    }

    // Resolve author — authenticated user first, otherwise lookup by email
    let user;
    if (req.user && req.user.isActive) {
      user = req.user;
    } else {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
        return res.status(401).json({ success: false, message: 'Please sign in to submit feedback.', code: 'AUTH_REQUIRED' });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This email is not registered on our roadmap. Please sign up first to submit feedback.',
          code: 'USER_NOT_REGISTERED',
        });
      }
    }

    // Build a URL-safe slug. Append short random suffix to avoid collisions.
    const baseSlug = String(title).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post';
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const descClean = description ? String(description).trim() : '';
    const post = await prisma.post.create({
      data: {
        title: String(title).trim(),
        slug,
        description: descClean, // schema requires non-null
        content: descClean || null,
        status: 'under_review',
        boardId: targetBoardId,
        authorId: user.id,
      },
      select: { id: true, title: true, slug: true },
    });

    res.status(201).json({ success: true, message: 'Thanks for your feedback!', data: { post } });
  } catch (err) { next(err); }
};

// Helper — verify that the post is accessible through this widget's scope
async function assertPostInWidget(token, postId) {
  const widget = await prisma.embedWidget.findUnique({
    where: { token },
    select: { isActive: true, boardIds: true, postStatuses: true },
  });
  if (!widget || !widget.isActive) return { error: { status: 404, message: 'Widget not found or inactive.' } };
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, boardId: true, status: true, isDraft: true },
  });
  if (!post || post.isDraft) return { error: { status: 404, message: 'Post not found.' } };
  if (Array.isArray(widget.boardIds) && widget.boardIds.length > 0 && !widget.boardIds.includes(post.boardId)) {
    return { error: { status: 404, message: 'Post not available through this widget.' } };
  }
  if (Array.isArray(widget.postStatuses) && widget.postStatuses.length > 0 && !widget.postStatuses.includes(post.status)) {
    return { error: { status: 404, message: 'Post not available through this widget.' } };
  }
  return { widget, post };
}

// PUBLIC — list top-level comments on a post (hides internal + spam)
const getPublicComments = async (req, res, next) => {
  try {
    const { token, postId } = req.params;
    const check = await assertPostInWidget(token, postId);
    if (check.error) return res.status(check.error.status).json({ success: false, message: check.error.message });

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, isInternal: false, isSpam: false },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true, content: true, isOfficial: true, isPinned: true, createdAt: true,
        attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true,
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.json({ success: true, data: { comments } });
  } catch (err) { next(err); }
};

// PUBLIC — add a new comment. Auth preferred (optionalAuth), otherwise
// email is required and must match an existing roadmap user. Optional
// single file attachment is uploaded via multer (field name: "attachment").
const addPublicComment = async (req, res, next) => {
  // Multer has already saved the file to disk by the time we run. Any
  // validation failure below must unlink the orphan so /uploads doesn't bloat.
  const uploadedFile = req.file || null;
  const uploadedPath = uploadedFile ? uploadedFile.path : null;

  try {
    const { token, postId } = req.params;
    const { content, email } = req.body || {};

    const trimmedContent = content ? String(content).trim() : '';
    if (!trimmedContent && !uploadedFile) {
      unlinkSafe(uploadedPath);
      return res.status(400).json({ success: false, message: 'Comment content or attachment is required.' });
    }

    const check = await assertPostInWidget(token, postId);
    if (check.error) {
      unlinkSafe(uploadedPath);
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    let user;
    if (req.user && req.user.isActive) {
      user = req.user;
    } else {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
        unlinkSafe(uploadedPath);
        return res.status(401).json({ success: false, message: 'Please sign in to comment.', code: 'AUTH_REQUIRED' });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user || !user.isActive) {
        unlinkSafe(uploadedPath);
        return res.status(403).json({
          success: false,
          message: 'This email is not registered on our roadmap. Please sign up first to comment.',
          code: 'USER_NOT_REGISTERED',
        });
      }
    }

    const attachmentData = uploadedFile
      ? {
          attachmentUrl: attachmentUrlFor(req, uploadedFile.filename),
          attachmentName: uploadedFile.originalname,
          attachmentMime: uploadedFile.mimetype,
          attachmentSize: uploadedFile.size,
        }
      : {};

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: user.id,
        content: trimmedContent,
        ...attachmentData,
      },
      select: {
        id: true, content: true, isOfficial: true, isPinned: true, createdAt: true,
        attachmentUrl: true, attachmentName: true, attachmentMime: true, attachmentSize: true,
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Bump cached commentCount on the post
    prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    }).catch(() => {});

    res.status(201).json({ success: true, data: { comment } });
  } catch (err) {
    unlinkSafe(uploadedPath);
    next(err);
  }
};

module.exports = {
  getWidgets,
  getWidget,
  createWidget,
  updateWidget,
  deleteWidget,
  toggleWidget,
  getPublicConfig,
  getPublicPosts,
  getPublicPost,
  togglePublicVote,
  submitPublicPost,
  getPublicComments,
  addPublicComment,
};

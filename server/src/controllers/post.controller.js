// ============================================================
// POST CONTROLLER
//
// Ye file Posts (Feedback) ka logic handle karta hai:
//   - Create post (feedback submit)
//   - Get all posts (filter, search, sort, paginate)
//   - Get post detail
//   - Update post
//   - Delete post
//   - Change post status (admin/manager)
//   - Pin/unpin posts (admin/manager)
//   - Merge duplicate posts (admin/manager)
// ============================================================

const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const notifySubscribers = require('../utils/notifySubscribers');

// ============================================================
// 1. GET ALL POSTS
//
// Filter, search, sort, pagination
// ============================================================
const getPosts = async (req, res, next) => {
  try {
    const {
      boardId,
      status,
      type,
      tags,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 10
    } = req.query;

    const skip = limit === 'all' ? 0 : (page - 1) * limit;
    const take = limit === 'all' ? undefined : parseInt(limit);

    const where = { isDraft: false };

    // Allow admin to see their drafts
    if (req.query.includeDrafts === 'true' && req.user) {
      delete where.isDraft;
    }

    // Team member: full access — saare boards ke posts dikhe
    if (req.user && req.user.teamAccess) {
      if (boardId) where.boardId = boardId;
      // no boardId filter = all boards
    } else if (req.user && req.user.role === 'admin') {
      // Admin ko sirf apne boards ke posts dikhe
      const adminBoards = await prisma.board.findMany({
        where: { createdById: req.user.userId },
        select: { id: true },
      });
      const adminBoardIds = adminBoards.map(b => b.id);
      where.boardId = boardId ? (adminBoardIds.includes(boardId) ? boardId : 'none') : { in: adminBoardIds };
    } else if (req.user) {
      // Regular user — public boards + invited private boards ke posts dikhe
      const userAccess = await prisma.userBoardAccess.findMany({
        where: { userId: req.user.userId },
        select: { boardId: true },
      });
      const userBoardIds = userAccess.map(a => a.boardId);
      const publicBoards = await prisma.board.findMany({
        where: { isPublic: true },
        select: { id: true },
      });
      const publicBoardIds = publicBoards.map(b => b.id);
      const allAccessibleIds = [...new Set([...userBoardIds, ...publicBoardIds])];
      if (boardId) {
        where.boardId = allAccessibleIds.includes(boardId) ? boardId : 'none';
      } else {
        where.boardId = { in: allAccessibleIds };
      }
    } else {
      // Unauthenticated — only public board posts
      const publicBoards = await prisma.board.findMany({
        where: { isPublic: true },
        select: { id: true },
      });
      if (boardId) {
        const isPublic = publicBoards.some(b => b.id === boardId);
        where.boardId = isPublic ? boardId : 'none';
      } else {
        where.boardId = { in: publicBoards.map(b => b.id) };
      }
    }

    if (status) {
      where.status = {
        in: status.split(',')
      };
    }
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tags) {
      const tagIds = tags.split(',');
      where.tags = {
        some: { tagId: { in: tagIds } },
      };
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'trending' || sortBy === 'most-voted') {
      orderBy = { voteCount: 'desc' };
    }

    const isAll = limit === 'all';

    const postQuery = prisma.post.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        content: true,
        status: true,
        type: true,
        voteCount: true,
        commentCount: true,
        isPinned: true,
        author: { select: { id: true, name: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        createdAt: true,
        ...(req.user ? {
          votes: { where: { userId: req.user.userId }, select: { userId: true }, take: 1 },
          comments: { where: { authorId: req.user.userId }, select: { id: true }, take: 1 },
        } : {}),
      },
    });

    let posts, total;
    if (isAll) {
      posts = await postQuery;
      total = posts.length;
    } else {
      [posts, total] = await Promise.all([postQuery, prisma.post.count({ where })]);
    }

    const stripToText = (str) => {
      if (!str) return '';
      return str
        .replace(/<img\b[\s\S]*?>/gi, '')
        .replace(/<img\b[\s\S]*$/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
    };

    const postsWithVoteStatus = posts.map(post => ({
      ...post,
      content: stripToText(post.content),
      description: stripToText(post.description),
      hasVoted: req.user ? (post.votes?.length > 0) : false,
      hasCommented: req.user ? (post.comments?.length > 0) : false,
      votes: undefined,
      comments: undefined,
    }));

    res.json({
      success: true,
      data: {
        posts: postsWithVoteStatus,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: take ? Math.ceil(total / take) : 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. GET POST BY SLUG
// ============================================================
const getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { userId, role } = req.user || {};
    const isAdmin = role === 'admin';

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        votes: { select: { userId: true, user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { comments: true, votes: true } },
        comments: {
          where: {
            parentId: null,
            ...(isAdmin ? {} : { isInternal: false }),
            ...(!isAdmin ? (userId ? { OR: [{ isSpam: false }, { authorId: userId }] } : { isSpam: false }) : {}),
          },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true, content: true, isSpam: true, isInternal: true, isOfficial: true,
            isPinned: true, likeCount: true, createdAt: true, authorId: true, parentId: true,
            author: { select: { id: true, name: true, avatar: true } },
            likes: { select: { userId: true } },
            replies: {
              ...(!isAdmin && userId ? { where: { OR: [{ isSpam: false }, { authorId: userId }] } } : {}),
              ...(!isAdmin && !userId ? { where: { isSpam: false } } : {}),
              orderBy: { createdAt: 'asc' },
              select: {
                id: true, content: true, isSpam: true, isOfficial: true, isPinned: true,
                likeCount: true, createdAt: true, authorId: true, parentId: true,
                author: { select: { id: true, name: true, avatar: true } },
                likes: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const hasVoted = req.user
      ? post.votes.some(v => v.userId === req.user.userId)
      : false;

    const actualVoteCount = post._count.votes;

    res.json({ success: true, data: { post: { ...post, voteCount: actualVoteCount, hasVoted } } });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. CREATE POST
// ============================================================
const createPost = async (req, res, next) => {
  try {
    const { title, description, content, type = 'feature', boardId, tagIds = [], isDraft = false, priority = 'none' } = req.body;
    const { userId } = req.user;

    const hasAccess = await prisma.userBoardAccess.findUnique({
      where: { userId_boardId: { userId, boardId } },
    });
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { isPublic: true } });

    if (req.user.role !== 'admin' && !hasAccess && !board?.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this board.',
      });
    }

    const slug = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        description: description || '',
        content: content || null,
        type,
        priority,
        boardId,
        authorId: userId,
        isDraft,
        tags: {
          create: tagIds.map(tagId => ({ tagId }))
        }
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    await prisma.activity.create({
      data: {
        action: 'created',
        description: `Post "${title}" created`,
        userId,
        postId: post.id,
        boardId,
      },
    });

    // Auto-subscribe author to their own post
    await prisma.subscription.create({ data: { userId, postId: post.id } });

    res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. UPDATE POST
// ============================================================
const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, type, content, tagIds } = req.body;
    const { userId } = req.user;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Author, main admin, ya team member (admin/manager dono) edit kar sakte hai
    const isTeamMember = !!req.user.teamAccess;
    if (post.authorId !== userId && req.user.role !== 'admin' && !isTeamMember) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this post.' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (content !== undefined) updateData.content = content;

    // Only update tags if tagIds is provided
    if (tagIds) {
      await prisma.postTag.deleteMany({ where: { postId: id } });
      updateData.tags = { create: tagIds.map(tagId => ({ tagId })) };
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    await prisma.activity.create({
      data: {
        action: 'updated',
        description: `Post "${post.title}" updated`,
        userId,
        postId: id,
        boardId: post.boardId,
      },
    });

    res.json({ success: true, message: 'Post updated successfully.', data: { post: updatedPost } });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. DELETE POST
// ============================================================
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const isAuthor = post.authorId === userId;
    const teamAccess = req.user.teamAccess;
    // Team admin can delete, team manager cannot — full access across all boards
    const isTeamAdmin = teamAccess && teamAccess.accessLevel === 'admin';
    const isTeamManager = teamAccess && teamAccess.accessLevel === 'manager';

    if (isTeamManager) {
      return res.status(403).json({ success: false, message: 'Manager access does not allow deleting posts.' });
    }

    const hasDeletePermission = role === 'admin' || isAuthor || isTeamAdmin;

    if (!hasDeletePermission) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this post.' });
    }

    await prisma.post.delete({ where: { id } });

    await prisma.activity.create({
      data: {
        action: 'deleted',
        description: `Post "${post.title}" deleted`,
        userId,
        boardId: post.boardId,
      },
    });

    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. CHANGE POST STATUS
// ============================================================
const changePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const teamAccess = req.user.teamAccess;
    if (teamAccess) {
      // Team member: full access — any board
    } else if (role === 'admin') {
      const board = await prisma.board.findUnique({ where: { id: post.boardId } });
      if (board?.createdById !== userId) {
        return res.status(403).json({ success: false, message: 'You can only manage posts in your own boards.' });
      }
    } else {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId: post.boardId } },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and board managers can change post status.',
        });
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { status },
      include: { author: { select: { id: true, name: true } } },
    });

    await prisma.activity.create({
      data: {
        action: 'status_changed',
        description: `Post "${post.title}" status changed to ${status}`,
        userId,
        postId: id,
        boardId: post.boardId,
      },
    });

    await notifySubscribers(id, {
      type: 'status_changed',
      title: 'Status updated',
      message: `Post "${post.title}" status changed to ${status.replace(/_/g, ' ')}`,
      excludeUserIds: [userId],
    });

    res.json({
      success: true,
      message: 'Post status changed successfully.',
      data: { post: updatedPost },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 7. PIN/UNPIN POST
// ============================================================
const togglePinPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (role === 'admin') {
      const board = await prisma.board.findUnique({ where: { id: post.boardId } });
      if (board?.createdById !== userId) {
        return res.status(403).json({ success: false, message: 'You can only manage posts in your own boards.' });
      }
    } else {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId: post.boardId } },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and board managers can pin posts.',
        });
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });

    await prisma.activity.create({
      data: {
        action: 'updated',
        description: `Post "${post.title}" ${updatedPost.isPinned ? 'pinned' : 'unpinned'}`,
        userId,
        postId: id,
        boardId: post.boardId,
      },
    });

    res.json({
      success: true,
      message: `Post ${updatedPost.isPinned ? 'pinned' : 'unpinned'} successfully.`,
      data: { post: updatedPost },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 8. MERGE POSTS
// ============================================================
const mergePosts = async (req, res, next) => {
  try {
    const { sourcePostId, targetPostId } = req.body;
    const { userId, role } = req.user;

    const sourcePost = await prisma.post.findUnique({ where: { id: sourcePostId } });
    const targetPost = await prisma.post.findUnique({ where: { id: targetPostId } });

    if (!sourcePost || !targetPost) {
      return res.status(404).json({ success: false, message: 'One or both posts not found.' });
    }

    if (role === 'admin') {
      const board = await prisma.board.findUnique({ where: { id: targetPost.boardId } });
      if (board?.createdById !== userId) {
        return res.status(403).json({ success: false, message: 'You can only manage posts in your own boards.' });
      }
    } else {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId: targetPost.boardId } },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and board managers can merge posts.',
        });
      }
    }

    const sourceVoteCount = await prisma.vote.count({ where: { postId: sourcePostId } });

    await prisma.vote.deleteMany({ where: { postId: sourcePostId } });

    await prisma.post.update({
      where: { id: targetPostId },
      data: { voteCount: { increment: sourceVoteCount } },
    });

    await prisma.post.delete({ where: { id: sourcePostId } });

    await prisma.activity.create({
      data: {
        action: 'merged',
        description: `Post "${sourcePost.title}" merged into "${targetPost.title}"`,
        userId,
        postId: targetPostId,
        boardId: targetPost.boardId,
      },
    });

    res.json({
      success: true,
      message: 'Posts merged successfully.',
      data: { post: targetPost },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET POST BY ID (for editor)
// ============================================================
const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    res.json({ success: true, data: { post } });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PUBLISH POST (draft → live)
// ============================================================
const publishPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (post.authorId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { isDraft: false },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true, color: true } },
      },
    });

    await prisma.activity.create({
      data: {
        action: 'status_changed',
        description: `Post "${post.title}" published`,
        userId,
        postId: id,
        boardId: post.boardId,
      },
    });

    res.json({ success: true, message: 'Post published.', data: { post: updatedPost } });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORT POSTS AS CSV (streaming, cursor-paginated)
// Scales to large datasets because posts are streamed to the
// response in batches — no single giant in-memory array, no
// multi-MB Prisma payloads.
// ============================================================
const exportPostsCSV = async (req, res, next) => {
  try {
    const { boardId, status, type, postIds } = req.query;

    // Same board-access gates as getPosts so users only export what they can see.
    const where = { isDraft: false };
    if (req.user && req.user.role === 'admin') {
      const adminBoards = await prisma.board.findMany({
        where: { createdById: req.user.userId },
        select: { id: true },
      });
      const adminBoardIds = adminBoards.map(b => b.id);
      where.boardId = boardId ? (adminBoardIds.includes(boardId) ? boardId : 'none') : { in: adminBoardIds };
    } else if (req.user) {
      const userAccess = await prisma.userBoardAccess.findMany({
        where: { userId: req.user.userId },
        select: { boardId: true },
      });
      const userBoardIds = userAccess.map(a => a.boardId);
      const publicBoards = await prisma.board.findMany({ where: { isPublic: true }, select: { id: true } });
      const publicBoardIds = publicBoards.map(b => b.id);
      const accessible = [...new Set([...userBoardIds, ...publicBoardIds])];
      where.boardId = boardId ? (accessible.includes(boardId) ? boardId : 'none') : { in: accessible };
    } else {
      const publicBoards = await prisma.board.findMany({ where: { isPublic: true }, select: { id: true } });
      const ids = publicBoards.map(b => b.id);
      where.boardId = boardId ? (ids.includes(boardId) ? boardId : 'none') : { in: ids };
    }

    if (status) where.status = { in: status.split(',') };
    if (type) where.type = type;
    if (postIds) {
      const idList = postIds.split(',').filter(Boolean);
      if (idList.length > 0) where.id = { in: idList };
    }

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="posts_export_${date}.csv"`);
    res.setHeader('Cache-Control', 'no-store');

    // UTF-8 BOM so Excel opens the file with correct encoding.
    res.write('\uFEFF');
    const headers = ['Title', 'Status', 'Type', 'Board', 'Author', 'Votes', 'Comments', 'Created', 'Content'];
    res.write(headers.join(',') + '\r\n');

    const esc = (val) => {
      const str = String(val == null ? '' : val);
      return '"' + str.replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    };

    const stripContent = (html) => {
      if (!html) return '';
      return html
        .replace(/<img[^>]*>/gi, '[image]')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Cursor-paginate through the result set so we never hold everything
    // in memory at once. 500 posts per batch is a good balance.
    const BATCH_SIZE = 500;
    let cursor = undefined;
    let batchCount = 0;

    while (true) {
      // Step 1: grab metadata for the next batch (no content — cheap).
      const batch = await prisma.post.findMany({
        where,
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          voteCount: true,
          commentCount: true,
          createdAt: true,
          author: { select: { name: true } },
          board: { select: { name: true } },
        },
      });
      if (batch.length === 0) break;

      // Step 2: pull truncated content for just this batch via raw SQL.
      // LEFT(...) caps the size so posts with embedded base64 images
      // don't explode the batch payload.
      const batchIds = batch.map(p => p.id);
      const contentRows = await prisma.$queryRaw`
        SELECT id, LEFT(content, 2000) AS content
        FROM "posts"
        WHERE id IN (${Prisma.join(batchIds)})
      `;
      const contentMap = Object.fromEntries(contentRows.map(r => [r.id, r.content || '']));

      for (const p of batch) {
        const row = [
          esc(p.title || ''),
          esc(p.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
          esc(p.type.charAt(0).toUpperCase() + p.type.slice(1)),
          esc(p.board?.name || ''),
          esc(p.author?.name || ''),
          p.voteCount ?? 0,
          p.commentCount ?? 0,
          esc(new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })),
          esc(stripContent(contentMap[p.id])),
        ].join(',');
        res.write(row + '\r\n');
      }

      batchCount++;
      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
      // Safety cap — 200 batches * 500 = 100,000 posts max per request.
      if (batchCount >= 200) break;
    }

    res.end();
  } catch (error) {
    // If we've already started writing the CSV body, we can't send JSON —
    // just abort the stream so the client sees a truncated download.
    if (res.headersSent) { try { res.end(); } catch {} return; }
    next(error);
  }
};

module.exports = {
  getPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  changePostStatus,
  togglePinPost,
  mergePosts,
  publishPost,
  exportPostsCSV,
};

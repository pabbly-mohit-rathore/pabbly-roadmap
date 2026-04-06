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

const prisma = require('../config/database');

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

    const skip = (page - 1) * limit;
    const take = Math.min(parseInt(limit), 50);

    const where = {};
    if (boardId) where.boardId = boardId;
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

    const total = await prisma.post.count({ where });
    const posts = await prisma.post.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        type: true,
        voteCount: true,
        commentCount: true,
        isPinned: true,
        author: { select: { id: true, name: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        createdAt: true,
        ...(req.user ? { votes: { where: { userId: req.user.userId }, select: { userId: true } } } : {}),
      },
    });

    const postsWithVoteStatus = posts.map(post => ({
      ...post,
      hasVoted: req.user ? (post.votes?.length > 0) : false,
      votes: undefined,
    }));

    res.json({
      success: true,
      data: {
        posts: postsWithVoteStatus,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
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

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        votes: { select: { userId: true, user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { comments: true, votes: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const hasVoted = req.user
      ? post.votes.some(v => v.userId === req.user.userId)
      : false;

    // Use actual vote count from DB (_count.votes) to override any corrupted voteCount field
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
    const { title, description, type = 'feature', boardId, tagIds = [] } = req.body;
    const { userId } = req.user;

    const hasAccess = await prisma.userBoardAccess.findUnique({
      where: { userId_boardId: { userId, boardId } },
    });

    if (req.user.role !== 'admin' && !hasAccess) {
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
        description,
        type,
        boardId,
        authorId: userId,
        tags: {
          create: tagIds.map(tagId => ({ tagId }))
        }
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        board: { select: { id: true, name: true, slug: true } },
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
    const { title, description, type, tagIds = [] } = req.body;
    const { userId } = req.user;

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (post.authorId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this post.' });
    }

    // Delete existing tags
    await prisma.postTag.deleteMany({ where: { postId: id } });

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        tags: {
          create: tagIds.map(tagId => ({ tagId }))
        }
      },
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
    const isBoardManager = role === 'admin' || !!(await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId: post.boardId } },
    }));

    if (!isAuthor && !isBoardManager) {
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

    if (role !== 'admin') {
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

    if (role !== 'admin') {
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

    if (role !== 'admin') {
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

module.exports = {
  getPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  changePostStatus,
  togglePinPost,
  mergePosts,
};

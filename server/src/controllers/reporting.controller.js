const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: get date range from period
const getDateRange = (period) => {
  const now = new Date();
  if (period === 'week') {
    return {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      prevStart: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    };
  } else if (period === 'month') {
    return {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      prevStart: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    };
  }
  return { start: new Date(0), prevStart: new Date(0) };
};

const calcChange = (curr, prev) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

// GET /reporting/activity-overview
const getActivityOverview = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const { period = 'week', boardId } = req.query;
    const { start, prevStart } = getDateRange(period);

    // Filter by admin's own boards
    const adminBoards = await prisma.board.findMany({
      where: { createdById: req.user.userId },
      select: { id: true },
    });
    const adminBoardIds = adminBoards.map(b => b.id);

    const boardWhere = boardId && boardId !== 'all' ? { boardId } : { boardId: { in: adminBoardIds } };
    const postBoardFilter = boardId && boardId !== 'all' ? { boardId } : { boardId: { in: adminBoardIds } };

    const [posts, votes, comments] = await Promise.all([
      prisma.post.count({ where: { createdAt: { gte: start }, isDraft: false, ...boardWhere } }),
      prisma.vote.count({ where: { createdAt: { gte: start }, post: postBoardFilter } }),
      prisma.comment.count({ where: { createdAt: { gte: start }, post: postBoardFilter } }),
    ]);

    const [prevPosts, prevVotes, prevComments] = await Promise.all([
      prisma.post.count({ where: { createdAt: { gte: prevStart, lt: start }, isDraft: false, ...boardWhere } }),
      prisma.vote.count({ where: { createdAt: { gte: prevStart, lt: start }, post: postBoardFilter } }),
      prisma.comment.count({ where: { createdAt: { gte: prevStart, lt: start }, post: postBoardFilter } }),
    ]);

    res.json({
      success: true,
      data: {
        posts: { count: posts, change: calcChange(posts, prevPosts) },
        votes: { count: votes, change: calcChange(votes, prevVotes) },
        comments: { count: comments, change: calcChange(comments, prevComments) },
      },
    });
  } catch (error) { next(error); }
};

// GET /reporting/new-posts
const getNewPosts = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const { period = 'week', boardId } = req.query;
    const { start } = getDateRange(period);
    const where = { createdAt: { gte: start }, isDraft: false };

    // Filter by admin's own boards
    const adminBoards = await prisma.board.findMany({
      where: { createdById: req.user.userId },
      select: { id: true },
    });
    const adminBoardIds = adminBoards.map(b => b.id);

    if (boardId && boardId !== 'all') {
      where.boardId = adminBoardIds.includes(boardId) ? boardId : 'none';
    } else {
      where.boardId = { in: adminBoardIds };
    }

    const userId = req.user.userId;
    const posts = await prisma.post.findMany({
      where,
      select: {
        id: true, title: true, slug: true, description: true, status: true, voteCount: true, commentCount: true, createdAt: true,
        board: { select: { name: true } },
        votes: { where: { userId }, select: { userId: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const postsWithVoteStatus = posts.map(p => ({
      ...p,
      hasVoted: p.votes?.length > 0,
      votes: undefined,
    }));

    res.json({ success: true, data: { posts: postsWithVoteStatus } });
  } catch (error) { next(error); }
};

// GET /reporting/stale-posts
const getStalePosts = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const { boardId } = req.query;
    const staleDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where = { updatedAt: { lt: staleDate }, status: { notIn: ['closed', 'live'] }, isDraft: false };

    // Filter by admin's own boards
    const adminBoards = await prisma.board.findMany({
      where: { createdById: req.user.userId },
      select: { id: true },
    });
    const adminBoardIds = adminBoards.map(b => b.id);

    if (boardId && boardId !== 'all') {
      where.boardId = adminBoardIds.includes(boardId) ? boardId : 'none';
    } else {
      where.boardId = { in: adminBoardIds };
    }

    const posts = await prisma.post.findMany({
      where,
      select: { id: true, title: true, slug: true, status: true, voteCount: true, updatedAt: true, board: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    });

    res.json({ success: true, data: { posts } });
  } catch (error) { next(error); }
};

// GET /reporting/posts-by-board
const getPostsByBoard = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const { period = 'week', boardId } = req.query;
    const { start } = getDateRange(period);

    // Filter by admin's own boards
    const boardsFilter = boardId && boardId !== 'all' ? { id: boardId, createdById: req.user.userId } : { createdById: req.user.userId };

    const boards = await prisma.board.findMany({
      where: boardsFilter,
      select: {
        id: true, name: true, color: true,
        _count: { select: { posts: { where: { createdAt: { gte: start } } } } },
      },
    });

    const data = boards.map((b) => ({ name: b.name, color: b.color, count: b._count.posts })).filter((b) => b.count > 0);
    const total = data.reduce((sum, b) => sum + b.count, 0);

    res.json({ success: true, data: { boards: data, total } });
  } catch (error) { next(error); }
};

// GET /reporting/admin-activity
const getAdminActivity = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const { period = 'week' } = req.query;
    const { start } = getDateRange(period);

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true, name: true, email: true,
        _count: {
          select: {
            votes: { where: { createdAt: { gte: start } } },
            posts: { where: { createdAt: { gte: start } } },
            comments: { where: { createdAt: { gte: start } } },
          },
        },
      },
    });

    res.json({ success: true, data: { admins } });
  } catch (error) { next(error); }
};

module.exports = { getActivityOverview, getNewPosts, getStalePosts, getPostsByBoard, getAdminActivity };

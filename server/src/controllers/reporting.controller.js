const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /reporting/activity-overview — Activity stats with time filter
const getActivityOverview = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    let startDate, prevStartDate;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
      prevStartDate = new Date(0);
    }

    // Current period counts
    const [posts, votes, comments] = await Promise.all([
      prisma.post.count({ where: { createdAt: { gte: startDate } } }),
      prisma.vote.count({ where: { createdAt: { gte: startDate } } }),
      prisma.comment.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    // Previous period counts (for % change)
    const [prevPosts, prevVotes, prevComments] = await Promise.all([
      prisma.post.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      prisma.vote.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      prisma.comment.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
    ]);

    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    res.json({
      success: true,
      data: {
        posts: { count: posts, change: calcChange(posts, prevPosts) },
        votes: { count: votes, change: calcChange(votes, prevVotes) },
        comments: { count: comments, change: calcChange(comments, prevComments) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /reporting/new-posts — Recent posts with vote count
const getNewPosts = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    const startDate = period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === 'month'
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : new Date(0);

    const posts = await prisma.post.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        id: true,
        title: true,
        slug: true,
        voteCount: true,
        createdAt: true,
        board: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ success: true, data: { posts } });
  } catch (error) {
    next(error);
  }
};

// GET /reporting/stale-posts — Posts with no activity for 7+ days
const getStalePosts = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const staleDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await prisma.post.findMany({
      where: {
        updatedAt: { lt: staleDate },
        status: { notIn: ['closed', 'live'] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        voteCount: true,
        updatedAt: true,
        board: { select: { name: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    });

    res.json({ success: true, data: { posts } });
  } catch (error) {
    next(error);
  }
};

// GET /reporting/posts-by-board — Posts distribution by board (for donut chart)
const getPostsByBoard = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    const startDate = period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === 'month'
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : new Date(0);

    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            posts: { where: { createdAt: { gte: startDate } } },
          },
        },
      },
    });

    const data = boards
      .map((b) => ({ name: b.name, color: b.color, count: b._count.posts }))
      .filter((b) => b.count > 0);

    const total = data.reduce((sum, b) => sum + b.count, 0);

    res.json({ success: true, data: { boards: data, total } });
  } catch (error) {
    next(error);
  }
};

// GET /reporting/admin-activity — Admin/manager activity table
const getAdminActivity = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { period = 'week' } = req.query;
    const now = new Date();
    const startDate = period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === 'month'
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : new Date(0);

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            votes: { where: { createdAt: { gte: startDate } } },
            posts: { where: { createdAt: { gte: startDate } } },
            comments: { where: { createdAt: { gte: startDate } } },
          },
        },
      },
    });

    res.json({ success: true, data: { admins } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityOverview,
  getNewPosts,
  getStalePosts,
  getPostsByBoard,
  getAdminActivity,
};

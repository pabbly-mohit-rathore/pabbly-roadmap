// ============================================================
// ADMIN DASHBOARD CONTROLLER
//
// Ye file Admin Dashboard ka logic handle karta hai:
//   - Get dashboard stats (posts, votes, users, engagement)
//   - Get top voted posts
//   - Get recent activities
//   - Get board members overview
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. GET DASHBOARD STATS (Admin only)
//
// Overall stats: total posts, total votes, total users, etc.
// ============================================================
const getDashboardStats = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access dashboard stats.',
      });
    }

    // Admin ke apne boards dhundho
    const adminBoards = await prisma.board.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    const boardIds = adminBoards.map(b => b.id);
    const totalBoards = boardIds.length;

    // Sab queries parallel mein chalao for speed
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalPosts, totalVotes, totalUsers, activeUsersData] = await Promise.all([
      prisma.post.count({ where: { boardId: { in: boardIds } } }),
      prisma.vote.count({ where: { post: { boardId: { in: boardIds } } } }),
      prisma.user.count({
        where: {
          OR: [
            { posts: { some: { boardId: { in: boardIds } } } },
            { votes: { some: { post: { boardId: { in: boardIds } } } } },
            { boardAccess: { some: { boardId: { in: boardIds } } } },
          ],
        },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { posts: { some: { createdAt: { gte: thirtyDaysAgo }, boardId: { in: boardIds } } } },
            { votes: { some: { createdAt: { gte: thirtyDaysAgo }, post: { boardId: { in: boardIds } } } } },
          ],
        },
        select: { id: true },
      }),
    ]);
    const activeUsers = activeUsersData.length;

    // Engagement rate (posts + votes) / users
    const engagementRate = totalUsers > 0 ? (totalPosts + totalVotes) / totalUsers : 0;

    // Average posts per board
    const avgPostsPerBoard = totalBoards > 0 ? totalPosts / totalBoards : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalPosts,
          totalVotes,
          totalUsers,
          totalBoards,
          activeUsers,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          avgPostsPerBoard: parseFloat(avgPostsPerBoard.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. GET TOP VOTED POSTS (Admin only)
//
// Top 10 most voted posts
// ============================================================
const getTopVotedPosts = async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const { limit = 10 } = req.query;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access top posts.',
      });
    }

    const topPosts = await prisma.post.findMany({
      where: { board: { createdById: userId } },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        voteCount: true,
        createdAt: true,
        _count: {
          select: { comments: true },
        },
        author: {
          select: { id: true, name: true, email: true },
        },
        board: {
          select: { id: true, name: true },
        },
        votes: {
          where: { userId: req.user.userId },
          select: { userId: true },
        },
      },
      orderBy: { voteCount: 'desc' },
      take: parseInt(limit) || 10,
    });

    const postsWithVoteStatus = topPosts.map(post => ({
      ...post,
      hasVoted: post.votes.length > 0,
      votes: undefined,
    }));

    res.json({
      success: true,
      data: { posts: postsWithVoteStatus },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. GET RECENT ACTIVITIES (Admin only)
//
// Last 50 activities across all boards
// ============================================================
const getRecentActivities = async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access activities.',
      });
    }

    const activities = await prisma.activity.findMany({
      where: { board: { createdById: userId } },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        board: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 50,
      skip: parseInt(offset) || 0,
    });

    const total = await prisma.activity.count({
      where: { board: { createdById: userId } },
    });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          limit: parseInt(limit) || 50,
          offset: parseInt(offset) || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. GET BOARD MEMBERS OVERVIEW (Admin only)
//
// Get all board members across all boards with their stats
// ============================================================
const getBoardMembersOverview = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access board members overview.',
      });
    }

    const boardMembers = await prisma.boardMember.findMany({
      where: { board: { createdById: userId } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: { posts: true, votes: true, comments: true },
            },
          },
        },
        board: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { boardMembers },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. GET POSTS BY STATUS (Admin only)
//
// Get posts grouped by status (planned, in-progress, completed, etc.)
// ============================================================
const getPostsByStatus = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access posts by status.',
      });
    }

    const posts = await prisma.post.findMany({
      where: { board: { createdById: userId } },
      select: {
        id: true,
        title: true,
        status: true,
        slug: true,
        createdAt: true,
        author: {
          select: { name: true },
        },
        board: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by status
    const postsByStatus = {
      pending: [],
      planned: [],
      'in-progress': [],
      completed: [],
      archived: [],
    };

    posts.forEach((post) => {
      if (postsByStatus[post.status]) {
        postsByStatus[post.status].push(post);
      }
    });

    res.json({
      success: true,
      data: {
        postsByStatus,
        summary: {
          pending: postsByStatus.pending.length,
          planned: postsByStatus.planned.length,
          'in-progress': postsByStatus['in-progress'].length,
          completed: postsByStatus.completed.length,
          archived: postsByStatus.archived.length,
          total: posts.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getTopVotedPosts,
  getRecentActivities,
  getBoardMembersOverview,
  getPostsByStatus,
};

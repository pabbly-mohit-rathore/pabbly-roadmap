// ============================================================
// ROADMAP CONTROLLER
//
// Ye file Roadmap ka logic handle karta hai:
//   - Get posts grouped by status (Kanban view)
// ============================================================

const prisma = require('../config/database');

// ============================================================
// GET ROADMAP (Kanban view - Posts grouped by status)
//
// Board ke sab posts status ke hisaab se group kare
// Query params:
//   - boardId: Required — Board ID
//   - sort: Optional — vote count, latest, etc.
// ============================================================
const getRoadmap = async (req, res, next) => {
  try {
    const { boardId, sort = 'votes' } = req.query;
    const { userId, role } = req.user;

    const teamAccess = req.user.teamAccess;

    // If boardId provided, verify access
    let boardFilter = {};
    let board = null;
    if (boardId) {
      board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { id: true, name: true, createdById: true },
      });
      if (!board) {
        return res.status(404).json({ success: false, message: 'Board not found.' });
      }
      if (teamAccess) {
        // Team member: sirf assigned board
        if (board.id !== teamAccess.boardId) {
          return res.status(403).json({ success: false, message: 'You do not have access to this board.' });
        }
      } else if (role === 'admin') {
        if (board.createdById && board.createdById !== userId) {
          return res.status(403).json({ success: false, message: 'You do not have access to this board.' });
        }
      } else {
        const hasAccess = await prisma.userBoardAccess.findUnique({
          where: { userId_boardId: { userId, boardId } },
        });
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'You do not have access to this board.' });
        }
      }
      boardFilter = { boardId };
    } else {
      // All boards
      if (teamAccess) {
        boardFilter = { boardId: teamAccess.boardId };
      } else if (role === 'admin') {
        const adminBoards = await prisma.board.findMany({ where: { createdById: userId }, select: { id: true } });
        boardFilter = { boardId: { in: adminBoards.map(b => b.id) } };
      } else {
        const userAccess = await prisma.userBoardAccess.findMany({ where: { userId }, select: { boardId: true } });
        boardFilter = { boardId: { in: userAccess.map(a => a.boardId) } };
      }
    }

    // Determine sort order
    let orderBy = { voteCount: 'desc' };
    if (sort === 'latest') orderBy = { createdAt: 'desc' };
    else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'priority') orderBy = { priorityScore: 'desc' };

    // Admin/team members sab posts dekhe, regular users sirf public posts
    const isAdminOrTeam = role === 'admin' || teamAccess;
    const visibilityFilter = isAdminOrTeam ? { isDraft: false } : { isPublic: true, isDraft: false };

    // Get all posts for this board — use cached counts, skip _count
    const posts = await prisma.post.findMany({
      where: { ...boardFilter, ...visibilityFilter },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        content: true,
        status: true,
        boardId: true,
        type: true,
        voteCount: true,
        commentCount: true,
        createdAt: true,
        author: {
          select: { name: true },
        },
        board: {
          select: { name: true },
        },
        _count: {
          select: { votes: true, comments: true },
        },
        ...(userId ? { votes: { where: { userId }, select: { userId: true }, take: 1 } } : {}),
      },
      orderBy,
    });

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
      hasVoted: userId ? (post.votes?.length > 0) : false,
      votes: undefined,
    }));

    // Group posts by status
    const roadmapData = {
      open: [],
      under_review: [],
      planned: [],
      in_progress: [],
      live: [],
      closed: [],
      hold: [],
    };

    postsWithVoteStatus.forEach((post) => {
      if (roadmapData[post.status]) {
        roadmapData[post.status].push(post);
      }
    });

    // Calculate statistics
    const stats = {
      open: roadmapData.open.length,
      under_review: roadmapData.under_review.length,
      planned: roadmapData.planned.length,
      in_progress: roadmapData.in_progress.length,
      live: roadmapData.live.length,
      closed: roadmapData.closed.length,
      hold: roadmapData.hold.length,
      total: postsWithVoteStatus.length,
    };

    res.json({
      success: true,
      data: {
        board,
        roadmap: roadmapData,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoadmap,
};

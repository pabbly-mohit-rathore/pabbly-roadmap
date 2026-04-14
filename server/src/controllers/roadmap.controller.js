// ============================================================
// ROADMAP CONTROLLER
//
// Ye file Roadmap ka logic handle karta hai:
//   - Get posts grouped by status (Kanban view)
// ============================================================

const { Prisma } = require('@prisma/client');
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
      if (role === 'admin') {
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
      // All boards: admin sees own boards, user sees accessible boards
      if (role === 'admin') {
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

    // Get all posts for this board — use cached counts, skip _count
    const posts = await prisma.post.findMany({
      where: { ...boardFilter, isPublic: true, isDraft: false },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
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

    // Fetch truncated content previews via raw SQL — avoids pulling multi-MB
    // base64 image payloads out of the DB for the kanban view.
    let contentMap = {};
    if (posts.length > 0) {
      const ids = posts.map(p => p.id);
      const rows = await prisma.$queryRaw`
        SELECT id, LEFT(content, 500) AS content_preview
        FROM "posts"
        WHERE id IN (${Prisma.join(ids)})
      `;
      contentMap = Object.fromEntries(rows.map(r => [r.id, r.content_preview || '']));
    }

    const postsWithVoteStatus = posts.map(post => ({
      ...post,
      content: contentMap[post.id] || '',
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

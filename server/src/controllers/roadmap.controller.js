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

    if (!boardId) {
      return res.status(400).json({
        success: false,
        message: 'Board ID is required.',
      });
    }

    // Board dhundho
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, name: true },
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found.',
      });
    }

    // Check access: User should have access to this board
    if (role !== 'admin') {
      const hasAccess = await prisma.userBoardAccess.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId,
          },
        },
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this board.',
        });
      }
    }

    // Determine sort order
    let orderBy = { voteCount: 'desc' }; // Default: most voted
    if (sort === 'latest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'priority') {
      orderBy = { priorityScore: 'desc' };
    }

    // Get all posts for this board
    const posts = await prisma.post.findMany({
      where: {
        boardId,
        isPublic: true, // Only show public posts
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        type: true,
        priority: true,
        priorityScore: true,
        voteCount: true,
        commentCount: true,
        eta: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: { votes: true, comments: true },
        },
      },
      orderBy,
    });

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

    posts.forEach((post) => {
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
      total: posts.length,
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

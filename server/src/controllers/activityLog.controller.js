// ============================================================
// ACTIVITY LOG CONTROLLER
//
// Ye file Activity Log ka logic handle karta hai:
//   - Get scoped activity logs (filtered by user permissions)
// ============================================================

const prisma = require('../config/database');

// ============================================================
// GET ACTIVITY LOG (Scoped by permissions)
//
// Activity logs get karo based on user permissions
// Admin: Sab activities dekh sakta hai
// Manager: Sirf apna board ka activities dekh sakta hai
// User: Sirf apne activities dekh sakta hai
//
// Query params:
//   - boardId: Optional — Filter by board
//   - userId: Optional — Filter by user
//   - action: Optional — Filter by action type
//   - limit: Pagination limit
//   - offset: Pagination offset
// ============================================================
const getActivityLog = async (req, res, next) => {
  try {
    const { boardId, userId, action, limit = 30, offset = 0 } = req.query;
    const { userId: currentUserId, role } = req.user;

    // Build where clause based on permissions
    const where = {};

    // If boardId is provided, check access
    if (boardId) {
      if (role !== 'admin') {
        // Check if user is manager of this board
        const isBoardManager = await prisma.boardMember.findUnique({
          where: {
            userId_boardId: {
              userId: currentUserId,
              boardId,
            },
          },
        });

        if (!isBoardManager) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view activities for this board.',
          });
        }
      }
      where.boardId = boardId;
    } else if (role !== 'admin') {
      // Non-admins without boardId filter: only show their own board activities
      // Get all boards they manage
      const managedBoards = await prisma.boardMember.findMany({
        where: { userId: currentUserId },
        select: { boardId: true },
      });

      const boardIds = managedBoards.map((bm) => bm.boardId);

      if (boardIds.length > 0) {
        where.boardId = { in: boardIds };
      } else {
        // Manager with no boards: return empty
        return res.json({
          success: true,
          data: {
            activities: [],
            pagination: {
              total: 0,
              limit: parseInt(limit) || 30,
              offset: parseInt(offset) || 0,
            },
          },
        });
      }
    }

    // Filter by userId if provided
    if (userId) {
      where.userId = userId;
    }

    // Filter by action if provided
    if (action) {
      where.action = action;
    }

    // Get activities with related data
    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 30,
      skip: parseInt(offset) || 0,
    });

    // Get total count for pagination
    const total = await prisma.activity.count({ where });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          limit: parseInt(limit) || 30,
          offset: parseInt(offset) || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLog,
};

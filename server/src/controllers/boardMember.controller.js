// ============================================================
// BOARD MEMBER CONTROLLER
//
// Board Managers ko handle karta hai:
//   - Get all managers for a board
//   - Assign user as manager
//   - Remove manager
//   - Get boards I manage
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. GET BOARD MEMBERS (Admin only)
// ============================================================
const getBoardMembers = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view board members.',
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

    // Board ke sab members get karo
    const members = await prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        board,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. ASSIGN MANAGER TO BOARD (Admin only)
// ============================================================
const assignManager = async (req, res, next) => {
  try {
    const { boardId, userId } = req.body;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can assign managers.',
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

    // User dhundho
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check: Kya already manager hai?
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a manager of this board.',
      });
    }

    // Manager assign karo with permissions
    const boardMember = await prisma.boardMember.create({
      data: {
        userId,
        boardId,
        role: 'manager',
        canEditPost: req.body.canEditPost || false,
        canDeletePost: req.body.canDeletePost || false,
        canEditComment: req.body.canEditComment || false,
        canDeleteComment: req.body.canDeleteComment || false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'member_added',
        description: `${user.name} added as manager`,
        userId: req.user.id,
        boardId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Manager assigned successfully.',
      data: { boardMember },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. REMOVE MANAGER (Admin only)
// ============================================================
const removeManager = async (req, res, next) => {
  try {
    const { boardId, userId } = req.body;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove managers.',
      });
    }

    // Board member dhundho
    const boardMember = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!boardMember) {
      return res.status(404).json({
        success: false,
        message: 'User is not a manager of this board.',
      });
    }

    // Manager remove karo
    await prisma.boardMember.delete({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'member_removed',
        description: `${boardMember.user.name} removed as manager`,
        userId: req.user.id,
        boardId,
      },
    });

    res.json({
      success: true,
      message: 'Manager removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. GET BOARDS I MANAGE (Authenticated)
// ============================================================
const getManagedBoards = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    let boards;

    if (role === 'admin') {
      // Admin dekhe sab boards
      boards = await prisma.board.findMany({
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          _count: {
            select: { posts: true, members: true },
          },
        },
      });
    } else {
      // Manager dekhe sirf apne managed boards
      boards = await prisma.board.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          _count: {
            select: { posts: true, members: true },
          },
        },
      });
    }

    res.json({
      success: true,
      data: { boards },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBoardMembers,
  assignManager,
  removeManager,
  getManagedBoards,
};

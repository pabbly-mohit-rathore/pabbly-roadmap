// ============================================================
// BOARD CONTROLLER
//
// Ye file Boards ka logic handle karta hai:
//   - Create board (admin only)
//   - Get all boards (user dekhe apne accessible boards, admin dekhe sab)
//   - Get board by slug
//   - Update board (admin ya board manager)
//   - Delete board (admin only)
//   - Reorder boards (admin only)
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. GET ALL BOARDS
//
// Admin → sab boards
// User → sirf apne boards (jo invite link se access mile)
// ============================================================
const getBoards = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    let boards;

    if (role === 'admin') {
      // Admin ko sirf apne boards dikhe
      boards = await prisma.board.findMany({
        where: { createdById: userId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          color: true,
          order: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              members: true,
              userAccess: true,
            },
          },
        },
      });
    } else {
      // Regular user ko sirf apne accessible boards dikhe
      boards = await prisma.board.findMany({
        where: {
          userAccess: {
            some: {
              userId: userId,
            },
          },
        },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          color: true,
          order: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
            },
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

// ============================================================
// 2. GET BOARD BY SLUG
//
// Kisi specific board ka details
// ============================================================
const getBoardBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { userId, role } = req.user;

    // Board dhundho
    const board = await prisma.board.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            posts: true,
            comments: true,
            members: true,
          },
        },
      },
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found.',
      });
    }

    // Check: Kya user ko is board ka access hai?
    if (role === 'admin') {
      if (board.createdById !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this board.',
        });
      }
    } else {
      const hasAccess = await prisma.userBoardAccess.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: board.id,
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

    res.json({
      success: true,
      data: { board },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. CREATE BOARD (Admin only)
//
// Frontend se: { name, description, icon, color }
// ============================================================
const createBoard = async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;
    const { userId, role } = req.user;

    // Check: Kya user admin hai?
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create boards.',
      });
    }

    // Slug banao (name se)
    // "Pabbly Connect" → "pabbly-connect"
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check: Kya slug pehle se exist karta hai?
    const existingBoard = await prisma.board.findUnique({
      where: { slug },
    });

    if (existingBoard) {
      return res.status(400).json({
        success: false,
        message: 'A board with this name already exists.',
      });
    }

    // Board create karo
    const board = await prisma.board.create({
      data: {
        name,
        slug,
        description: description || '',
        icon: icon || '',
        color: color || '#6366f1',
        createdById: userId,
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'created',
        description: `Board "${name}" created`,
        userId,
        boardId: board.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Board created successfully.',
      data: { board },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. UPDATE BOARD
//
// Admin: koi bhi board edit kar sakta hai
// Board Manager: sirf apne assigned board ko
// ============================================================
const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color } = req.body;
    const { userId, role } = req.user;

    // Board dhundho
    const board = await prisma.board.findUnique({
      where: { id },
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found.',
      });
    }

    // Check: Kya user ko edit permission hai?
    if (role === 'admin') {
      if (board.createdById !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this board.',
        });
      }
    } else {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: id,
          },
        },
      });

      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this board.',
        });
      }
    }

    // Board update karo
    const updatedBoard = await prisma.board.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color && { color }),
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: `Board "${board.name}" updated`,
        userId,
        boardId: id,
      },
    });

    res.json({
      success: true,
      message: 'Board updated successfully.',
      data: { board: updatedBoard },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. DELETE BOARD (Admin only)
//
// ============================================================
const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Check: Kya user admin hai?
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete boards.',
      });
    }

    // Board dhundho
    const board = await prisma.board.findUnique({
      where: { id },
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found.',
      });
    }

    // Check: Kya admin is board ka owner hai?
    if (board.createdById !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own boards.',
      });
    }

    // Board delete karo (cascade delete hoga related posts, comments, etc.)
    await prisma.board.delete({
      where: { id },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'deleted',
        description: `Board "${board.name}" deleted`,
        userId,
        boardId: id,
      },
    });

    res.json({
      success: true,
      message: 'Board deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. REORDER BOARDS (Admin only)
//
// Frontend se: { boardIds: ["id1", "id2", "id3"] }
// ============================================================
const reorderBoards = async (req, res, next) => {
  try {
    const { boardIds } = req.body;
    const { userId, role } = req.user;

    // Check: Kya user admin hai?
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reorder boards.',
      });
    }

    // Verify admin owns all these boards
    const ownedBoards = await prisma.board.findMany({
      where: { id: { in: boardIds }, createdById: userId },
      select: { id: true },
    });
    const ownedIds = new Set(ownedBoards.map(b => b.id));
    const filteredBoardIds = boardIds.filter(id => ownedIds.has(id));

    // Har board ka order update karo
    for (let i = 0; i < filteredBoardIds.length; i++) {
      await prisma.board.update({
        where: { id: filteredBoardIds[i] },
        data: { order: i },
      });
    }

    // Updated boards return karo
    const boards = await prisma.board.findMany({
      where: {
        id: {
          in: filteredBoardIds,
        },
      },
      orderBy: { order: 'asc' },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: 'Boards reordered',
        userId,
      },
    });

    res.json({
      success: true,
      message: 'Boards reordered successfully.',
      data: { boards },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBoards,
  getBoardBySlug,
  createBoard,
  updateBoard,
  deleteBoard,
  reorderBoards,
};

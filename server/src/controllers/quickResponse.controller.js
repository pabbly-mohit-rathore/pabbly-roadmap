// ============================================================
// QUICK RESPONSE CONTROLLER
//
// Ye file Quick Response Templates ka logic handle karta hai:
//   - Get all templates for a board
//   - Create a new template
//   - Update a template
//   - Delete a template
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. GET QUICK RESPONSE TEMPLATES (Authenticated)
//
// Board ke sab quick response templates get karo
// Params:
//   - boardId: Board ID (query param)
// ============================================================
const getQuickResponses = async (req, res, next) => {
  try {
    const { boardId } = req.query;
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
      select: { id: true },
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found.',
      });
    }

    // Check permission: Admin or manager of this board
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view quick responses for this board.',
        });
      }
    }

    // Board ke sab quick response templates get karo
    const templates = await prisma.quickResponse.findMany({
      where: { boardId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. CREATE QUICK RESPONSE TEMPLATE (Admin/Manager only)
//
// Naya quick response template banao
// Body:
//   - title: Template title
//   - content: Template content
//   - boardId: Board ID
// ============================================================
const createQuickResponse = async (req, res, next) => {
  try {
    const { title, content, boardId } = req.body;
    const { userId, role } = req.user;

    // Board dhundho
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found.',
      });
    }

    // Check permission: Admin or manager of this board
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create quick responses for this board.',
        });
      }
    }

    // Template create karo
    const template = await prisma.quickResponse.create({
      data: {
        title,
        content,
        boardId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'quick_response_created',
        description: `Quick response template "${title}" created`,
        userId,
        boardId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Quick response template created successfully.',
      data: { template },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. UPDATE QUICK RESPONSE TEMPLATE (Admin/Manager only)
//
// Template ko update karo
// Params:
//   - templateId: Template ID
// Body:
//   - title: Template title (optional)
//   - content: Template content (optional)
// ============================================================
const updateQuickResponse = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { title, content } = req.body;
    const { userId, role } = req.user;

    // Template dhundho
    const template = await prisma.quickResponse.findUnique({
      where: { id: templateId },
      select: { id: true, boardId: true, createdById: true },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Quick response template not found.',
      });
    }

    // Check permission: Admin or manager of the board
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: template.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this quick response.',
        });
      }
    }

    // Update template
    const updatedTemplate = await prisma.quickResponse.update({
      where: { id: templateId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'quick_response_updated',
        description: `Quick response template "${updatedTemplate.title}" updated`,
        userId,
        boardId: template.boardId,
      },
    });

    res.json({
      success: true,
      message: 'Quick response template updated successfully.',
      data: { template: updatedTemplate },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. DELETE QUICK RESPONSE TEMPLATE (Admin/Manager only)
//
// Template ko delete karo
// Params:
//   - templateId: Template ID
// ============================================================
const deleteQuickResponse = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { userId, role } = req.user;

    // Template dhundho
    const template = await prisma.quickResponse.findUnique({
      where: { id: templateId },
      select: { id: true, title: true, boardId: true, createdById: true },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Quick response template not found.',
      });
    }

    // Check permission: Admin or manager of the board
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: template.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this quick response.',
        });
      }
    }

    // Delete template
    await prisma.quickResponse.delete({
      where: { id: templateId },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'quick_response_deleted',
        description: `Quick response template "${template.title}" deleted`,
        userId,
        boardId: template.boardId,
      },
    });

    res.json({
      success: true,
      message: 'Quick response template deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuickResponses,
  createQuickResponse,
  updateQuickResponse,
  deleteQuickResponse,
};

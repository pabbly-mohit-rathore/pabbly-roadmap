// ============================================================
// TAG CONTROLLER
//
// Ye file Tags ka logic handle karta hai:
//   - Get all tags for a board (board-scoped)
//   - Create tag (admin/manager only)
//   - Update tag (admin/manager only)
//   - Delete tag (admin/manager only)
//
// Important: Tags are board-scoped — har board ke apne tags hote hain
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. GET ALL TAGS FOR A BOARD
//
// Board ke liye sab tags get karo
// Params:
//   - boardId: Required — Board ID
// ============================================================
const getTags = async (req, res, next) => {
  try {
    const { boardId } = req.query;

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

    // Board ke sab tags get karo
    const tags = await prisma.tag.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    res.json({
      success: true,
      data: { tags },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. CREATE TAG (Admin/Manager only)
//
// Frontend se: { name, color, boardId }
// ============================================================
const createTag = async (req, res, next) => {
  try {
    const { name, color, boardId } = req.body;
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

    // Check permission
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
          message: 'Only admins and board managers can create tags.',
        });
      }
    }

    // Slug banao
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check: Kya tag name pehle se exist karta hai is board mein?
    const existingTag = await prisma.tag.findFirst({
      where: {
        boardId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'A tag with this name already exists in this board.',
      });
    }

    // Tag create karo
    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        color: color || '#6366f1',
        boardId,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'created',
        description: `Tag "${name}" created`,
        userId,
        boardId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Tag created successfully.',
      data: { tag },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. UPDATE TAG (Admin/Manager only)
//
// Frontend se: { name, color }
// ============================================================
const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const { userId, role } = req.user;

    // Tag dhundho
    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { id: true, name: true, boardId: true },
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found.',
      });
    }

    // Check permission
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: tag.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this tag.',
        });
      }
    }

    // Agar name change ho raha hai toh check karo ke duplicate nahi hoga
    if (name && name.toLowerCase() !== tag.name.toLowerCase()) {
      const existingTag = await prisma.tag.findFirst({
        where: {
          boardId: tag.boardId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'A tag with this name already exists in this board.',
        });
      }
    }

    // Update tag
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: `Tag "${tag.name}" updated`,
        userId,
        boardId: tag.boardId,
      },
    });

    res.json({
      success: true,
      message: 'Tag updated successfully.',
      data: { tag: updatedTag },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. DELETE TAG (Admin/Manager only)
//
// Tag ko delete karte hain
// PostTag entries automatically delete ho jayengi (cascade)
// ============================================================
const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Tag dhundho
    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { id: true, name: true, boardId: true },
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found.',
      });
    }

    // Check permission
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: tag.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this tag.',
        });
      }
    }

    // Tag delete karo
    await prisma.tag.delete({
      where: { id },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'deleted',
        description: `Tag "${tag.name}" deleted`,
        userId,
        boardId: tag.boardId,
      },
    });

    res.json({
      success: true,
      message: 'Tag deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. ASSIGN TAG TO POST
//
// Post mein tag add karna
// Frontend se: { tagId, postId }
// ============================================================
const assignTagToPost = async (req, res, next) => {
  try {
    const { postId, tagId } = req.body;
    const { userId, role } = req.user;

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Tag dhundho
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { id: true, boardId: true },
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found.',
      });
    }

    // Check: Tag aur Post same board ke hone chahiye
    if (tag.boardId !== post.boardId) {
      return res.status(400).json({
        success: false,
        message: 'Tag and post must belong to the same board.',
      });
    }

    // Check permission
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: post.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to assign tags.',
        });
      }
    }

    // Tag assign karo (or skip if already assigned)
    const postTag = await prisma.postTag.upsert({
      where: {
        postId_tagId: {
          postId,
          tagId,
        },
      },
      update: {},
      create: {
        postId,
        tagId,
      },
    });

    res.json({
      success: true,
      message: 'Tag assigned successfully.',
      data: { postTag },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. REMOVE TAG FROM POST
//
// Post se tag remove karna
// Frontend se: { tagId, postId }
// ============================================================
const removeTagFromPost = async (req, res, next) => {
  try {
    const { postId, tagId } = req.body;
    const { userId, role } = req.user;

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Check permission
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: post.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove tags.',
        });
      }
    }

    // Tag remove karo
    await prisma.postTag.delete({
      where: {
        postId_tagId: {
          postId,
          tagId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Tag removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  assignTagToPost,
  removeTagFromPost,
};

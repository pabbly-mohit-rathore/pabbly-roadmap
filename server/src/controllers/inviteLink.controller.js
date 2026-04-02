// ============================================================
// INVITE LINK CONTROLLER
//
// Ye file Invite Links ka logic handle karta hai:
//   - Generate invite link (admin/manager only)
//   - List invite links for a board (admin/manager only)
//   - Revoke/Reactivate invite link (admin/manager only)
//   - Delete invite link (admin/manager only)
//   - Redeem invite link (authenticated users)
// ============================================================

const prisma = require('../config/database');
const crypto = require('crypto');

// ============================================================
// 1. GENERATE INVITE LINK (Admin/Manager only)
//
// Admin/Manager ek invite link banata hai
// Params:
//   - boardIds: Array of board IDs
//   - name: Optional label for the link
//   - expiresAt: Optional expiration date
//   - maxUses: Optional max use count (null = unlimited)
// ============================================================
const generateInviteLink = async (req, res, next) => {
  try {
    const { boardIds, name, expiresAt, maxUses } = req.body;
    const { userId, role } = req.user;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one board ID is required.',
      });
    }

    // Har board ke liye check karo ke board exist karta hai
    const boards = await prisma.board.findMany({
      where: { id: { in: boardIds } },
      select: { id: true },
    });

    if (boards.length !== boardIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more boards not found.',
      });
    }

    // Check permission: Admin or manager of all boards
    if (role !== 'admin') {
      for (const boardId of boardIds) {
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
            message: 'You do not have permission to create invite links for these boards.',
          });
        }
      }
    }

    // Unique token generate karo
    const token = crypto.randomBytes(16).toString('hex');

    // Invite link create karo
    const inviteLink = await prisma.boardInviteLink.create({
      data: {
        token,
        name: name || null,
        boardIds: JSON.stringify(boardIds),
        createdById: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'invite_link_created',
        description: `Invite link created for ${boardIds.length} board(s)`,
        userId,
        boardId: boardIds[0],
      },
    });

    // Parse boardIds for response
    const parsedInviteLink = {
      ...inviteLink,
      boardIds: JSON.parse(inviteLink.boardIds || '[]'),
    };

    res.status(201).json({
      success: true,
      message: 'Invite link created successfully.',
      data: { inviteLink: parsedInviteLink },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. LIST INVITE LINKS (Admin/Manager only)
//
// Board ke sab invite links get karo
// Params:
//   - boardId: Board ID
// ============================================================
const listInviteLinks = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { userId, role } = req.user;

    // Admin only ke liye - sab links
    if (!boardId) {
      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view all invite links.',
        });
      }

      const inviteLinks = await prisma.boardInviteLink.findMany({
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          usedBy: {
            select: { id: true, userId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Parse boardIds JSON string to array
      const parsedLinks = inviteLinks.map(link => ({
        ...link,
        boardIds: JSON.parse(link.boardIds || '[]'),
      }));

      return res.json({
        success: true,
        data: { links: parsedLinks },
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
          message: 'You do not have permission to view invite links for this board.',
        });
      }
    }

    // Sab invite links jo is board ko include karte hain
    const inviteLinks = await prisma.boardInviteLink.findMany({
      where: {
        boardIds: {
          contains: boardId,
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        usedBy: {
          select: { id: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse boardIds JSON string to array
    const parsedLinks = inviteLinks.map(link => ({
      ...link,
      boardIds: JSON.parse(link.boardIds || '[]'),
    }));

    res.json({
      success: true,
      data: { links: parsedLinks },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. REVOKE INVITE LINK (Admin/Manager only)
//
// Invite link ko inactive karo (revoke)
// Params:
//   - linkId: Invite link ID
// ============================================================
const revokeInviteLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { userId, role } = req.user;

    // Link dhundho
    const inviteLink = await prisma.boardInviteLink.findUnique({
      where: { id: linkId },
      select: { id: true, boardIds: true, createdById: true },
    });

    if (!inviteLink) {
      return res.status(404).json({
        success: false,
        message: 'Invite link not found.',
      });
    }

    // Check permission: Admin or creator
    if (role !== 'admin' && inviteLink.createdById !== userId) {
      // Also check if user is manager of any of the boards
      const boardIds = JSON.parse(inviteLink.boardIds);
      let hasPermission = false;
      for (const boardId of boardIds) {
        const isBoardManager = await prisma.boardMember.findUnique({
          where: {
            userId_boardId: {
              userId,
              boardId,
            },
          },
        });
        if (isBoardManager) {
          hasPermission = true;
          break;
        }
      }
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to revoke this invite link.',
        });
      }
    }

    // Revoke link
    const revokedLink = await prisma.boardInviteLink.update({
      where: { id: linkId },
      data: { isActive: false },
    });

    // Activity log
    const boardIds = JSON.parse(inviteLink.boardIds);
    await prisma.activity.create({
      data: {
        action: 'invite_link_revoked',
        description: `Invite link revoked`,
        userId,
        boardId: boardIds[0],
      },
    });

    res.json({
      success: true,
      message: 'Invite link revoked successfully.',
      data: { inviteLink: revokedLink },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. REACTIVATE INVITE LINK (Admin/Manager only)
//
// Revoked link ko dobara active karo
// Params:
//   - linkId: Invite link ID
// ============================================================
const reactivateInviteLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { userId, role } = req.user;

    // Link dhundho
    const inviteLink = await prisma.boardInviteLink.findUnique({
      where: { id: linkId },
      select: { id: true, boardIds: true, createdById: true },
    });

    if (!inviteLink) {
      return res.status(404).json({
        success: false,
        message: 'Invite link not found.',
      });
    }

    // Check permission: Admin or creator
    if (role !== 'admin' && inviteLink.createdById !== userId) {
      // Also check if user is manager of any of the boards
      const boardIds = JSON.parse(inviteLink.boardIds);
      let hasPermission = false;
      for (const boardId of boardIds) {
        const isBoardManager = await prisma.boardMember.findUnique({
          where: {
            userId_boardId: {
              userId,
              boardId,
            },
          },
        });
        if (isBoardManager) {
          hasPermission = true;
          break;
        }
      }
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reactivate this invite link.',
        });
      }
    }

    // Reactivate link
    const reactivatedLink = await prisma.boardInviteLink.update({
      where: { id: linkId },
      data: { isActive: true },
    });

    // Activity log
    const boardIds = JSON.parse(inviteLink.boardIds);
    await prisma.activity.create({
      data: {
        action: 'invite_link_reactivated',
        description: `Invite link reactivated`,
        userId,
        boardId: boardIds[0],
      },
    });

    res.json({
      success: true,
      message: 'Invite link reactivated successfully.',
      data: { inviteLink: reactivatedLink },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. DELETE INVITE LINK (Admin/Manager only)
//
// Invite link ko permanently delete karo
// Params:
//   - linkId: Invite link ID
// ============================================================
const deleteInviteLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { userId, role } = req.user;

    // Link dhundho
    const inviteLink = await prisma.boardInviteLink.findUnique({
      where: { id: linkId },
      select: { id: true, boardIds: true, createdById: true },
    });

    if (!inviteLink) {
      return res.status(404).json({
        success: false,
        message: 'Invite link not found.',
      });
    }

    // Check permission: Admin or creator
    if (role !== 'admin' && inviteLink.createdById !== userId) {
      // Also check if user is manager of any of the boards
      const boardIds = JSON.parse(inviteLink.boardIds);
      let hasPermission = false;
      for (const boardId of boardIds) {
        const isBoardManager = await prisma.boardMember.findUnique({
          where: {
            userId_boardId: {
              userId,
              boardId,
            },
          },
        });
        if (isBoardManager) {
          hasPermission = true;
          break;
        }
      }
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this invite link.',
        });
      }
    }

    // Activity log - before delete
    const boardIds = JSON.parse(inviteLink.boardIds);
    await prisma.activity.create({
      data: {
        action: 'invite_link_deleted',
        description: `Invite link deleted`,
        userId,
        boardId: boardIds[0],
      },
    });

    // Delete link (will cascade delete from UserBoardAccess)
    await prisma.boardInviteLink.delete({
      where: { id: linkId },
    });

    res.json({
      success: true,
      message: 'Invite link deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. REDEEM INVITE LINK (Authenticated users)
//
// User invite link use karke boards ka access pata hai
// Params:
//   - token: Invite link token
// ============================================================
const redeemInviteLink = async (req, res, next) => {
  try {
    const { token } = req.body;
    const { userId } = req.user;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invite link token is required.',
      });
    }

    // Link dhundho
    const inviteLink = await prisma.boardInviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        boardIds: true,
        isActive: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
      },
    });

    if (!inviteLink) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite link.',
      });
    }

    // Check if link is active
    if (!inviteLink.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has been revoked.',
      });
    }

    // Check if link has expired
    if (inviteLink.expiresAt && new Date() > new Date(inviteLink.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has expired.',
      });
    }

    // Check if link has max uses limit
    if (inviteLink.maxUses && inviteLink.usedCount >= inviteLink.maxUses) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has reached its maximum uses.',
      });
    }

    // Parse board IDs
    const boardIds = JSON.parse(inviteLink.boardIds);

    // Add user to all boards in the invite link
    const accessEntries = [];
    for (const boardId of boardIds) {
      const access = await prisma.userBoardAccess.upsert({
        where: {
          userId_boardId: {
            userId,
            boardId,
          },
        },
        update: {},
        create: {
          userId,
          boardId,
          inviteLinkId: inviteLink.id,
        },
      });
      accessEntries.push(access);
    }

    // Increment usedCount
    const updatedLink = await prisma.boardInviteLink.update({
      where: { id: inviteLink.id },
      data: { usedCount: { increment: 1 } },
    });

    // Activity log for each board
    for (const boardId of boardIds) {
      await prisma.activity.create({
        data: {
          action: 'user_joined_via_invite',
          description: `User joined via invite link`,
          userId,
          boardId,
        },
      });
    }

    res.json({
      success: true,
      message: 'Invite link redeemed successfully.',
      data: {
        boards: boardIds,
        accessEntries,
        link: updatedLink,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 7. VALIDATE INVITE LINK (PUBLIC - no auth required)
//
// Public endpoint to validate invite link token
// Shows board info without requiring login
// Params:
//   - token: Invite link token
// ============================================================
const validateInviteLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invite link token is required.',
      });
    }

    // Find the invite link
    const inviteLink = await prisma.boardInviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        name: true,
        boardIds: true,
        isActive: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
      },
    });

    if (!inviteLink) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite link.',
      });
    }

    // Check if link is active
    if (!inviteLink.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has been revoked.',
      });
    }

    // Check if link has expired
    if (inviteLink.expiresAt && new Date() > new Date(inviteLink.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has expired.',
      });
    }

    // Check if link has max uses limit
    if (inviteLink.maxUses && inviteLink.usedCount >= inviteLink.maxUses) {
      return res.status(400).json({
        success: false,
        message: 'This invite link has reached its maximum uses.',
      });
    }

    // Parse board IDs and fetch board details
    const boardIds = JSON.parse(inviteLink.boardIds || '[]');
    const boards = await prisma.board.findMany({
      where: { id: { in: boardIds } },
      select: { id: true, name: true, slug: true },
    });

    res.json({
      success: true,
      data: {
        token: inviteLink.token,
        boards,
        expiresAt: inviteLink.expiresAt,
        maxUses: inviteLink.maxUses,
        usedCount: inviteLink.usedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateInviteLink,
  listInviteLinks,
  validateInviteLink,
  revokeInviteLink,
  reactivateInviteLink,
  deleteInviteLink,
  redeemInviteLink,
};
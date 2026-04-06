// ============================================================
// TEAM MEMBER CONTROLLER
//
// Team member management endpoints:
//   - Get team member stats
//   - Get all team members (boards shared by admin)
//   - Get boards shared with me
//   - Add team member (assign user to board with access level)
//   - Remove team member
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. GET TEAM MEMBER STATS
// ============================================================
const getTeamMemberStats = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can view team stats.' });
    }

    // Unique team members added by this admin (distinct users across all boards)
    const uniqueMembers = await prisma.boardMember.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    // Boards shared by you (boards that have at least one team member)
    const boardsShared = await prisma.board.findMany({
      where: {
        members: { some: {} },
      },
      select: { id: true },
    });

    // Boards shared with you (boards where current admin is a member — usually 0 for main admin)
    const boardsSharedWithMe = await prisma.boardMember.findMany({
      where: { userId },
      select: { boardId: true },
    });

    res.json({
      success: true,
      data: {
        uniqueTeamMembers: uniqueMembers.length,
        boardsSharedByYou: boardsShared.length,
        boardsSharedWithYou: boardsSharedWithMe.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. GET ALL TEAM MEMBERS (Admin view — boards shared by admin)
// ============================================================
const getTeamMembers = async (req, res, next) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can view team members.' });
    }

    const members = await prisma.boardMember.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        board: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. GET BOARDS SHARED WITH ME
// ============================================================
const getBoardsSharedWithMe = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const memberships = await prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          select: { id: true, name: true, slug: true, color: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { memberships },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. ADD TEAM MEMBER (Admin only)
// ============================================================
const addTeamMember = async (req, res, next) => {
  try {
    const { email, boardId, accessLevel } = req.body;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can add team members.' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with this email. User must be registered first.' });
    }

    // Check if board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, name: true },
    });

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found.' });
    }

    // Check if already a member
    const existing = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId: user.id, boardId } },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `User already has ${existing.accessLevel} access to this board. Use "Update Access" to change the access level.` });
    }

    // Set permissions based on access level
    const isAdminAccess = accessLevel === 'admin';

    const member = await prisma.boardMember.create({
      data: {
        userId: user.id,
        boardId,
        role: 'manager',
        accessLevel: accessLevel || 'manager',
        canEditPost: true,
        canDeletePost: isAdminAccess,
        canEditComment: true,
        canDeleteComment: isAdminAccess,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        board: { select: { id: true, name: true } },
      },
    });

    // Also give user board access (so they can see the board)
    await prisma.userBoardAccess.upsert({
      where: { userId_boardId: { userId: user.id, boardId } },
      create: { userId: user.id, boardId },
      update: {},
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'member_added',
        description: `${user.name} added as ${accessLevel} access team member to ${board.name}`,
        userId: req.user.id,
        boardId,
      },
    });

    // Send notification to the team member
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'team_access_granted',
        title: 'Board Access Granted',
        message: `You have been granted ${accessLevel === 'admin' ? 'Admin' : 'Manager'} access to board "${board.name}"`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Team member added successfully.',
      data: { member },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. REMOVE TEAM MEMBER (Admin only)
// ============================================================
const removeTeamMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can remove team members.' });
    }

    const member = await prisma.boardMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { name: true, id: true } },
        board: { select: { name: true, id: true } },
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    await prisma.boardMember.delete({ where: { id: memberId } });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'member_removed',
        description: `${member.user.name} removed from ${member.board.name}`,
        userId: req.user.id,
        boardId: member.board.id,
      },
    });

    res.json({ success: true, message: 'Team member removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. UPDATE TEAM MEMBER ACCESS LEVEL (Admin only)
// ============================================================
const updateTeamMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { accessLevel } = req.body;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update team members.' });
    }

    const member = await prisma.boardMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { name: true, id: true } },
        board: { select: { name: true, id: true } },
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    const isAdminAccess = accessLevel === 'admin';

    const updated = await prisma.boardMember.update({
      where: { id: memberId },
      data: {
        accessLevel,
        canEditPost: true,
        canDeletePost: isAdminAccess,
        canEditComment: true,
        canDeleteComment: isAdminAccess,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        board: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, message: 'Access updated successfully.', data: { member: updated } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamMemberStats,
  getTeamMembers,
  getBoardsSharedWithMe,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
};

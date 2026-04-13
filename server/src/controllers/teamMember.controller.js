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
//
// Creates a pending TeamInvitation and sends a request notification
// to the invited user. Access is only granted after they accept.
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

    // Already an accepted member?
    const existingMember = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId: user.id, boardId } },
    });

    if (existingMember) {
      return res.status(400).json({ success: false, message: `User already has ${existingMember.accessLevel} access to this board. Use "Update Access" to change the access level.` });
    }

    // Already has a pending invitation?
    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: { userId_boardId: { userId: user.id, boardId } },
    });

    if (existingInvitation) {
      return res.status(400).json({ success: false, message: 'This user already has a pending invitation for this board.' });
    }

    const invitation = await prisma.teamInvitation.create({
      data: {
        userId: user.id,
        boardId,
        accessLevel: accessLevel || 'manager',
        invitedById: req.user.id,
      },
      include: {
        board: { select: { id: true, name: true } },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'member_added',
        description: `${user.name} invited as ${accessLevel} access team member to ${board.name}`,
        userId: req.user.id,
        boardId,
      },
    });

    // Notification with accept/reject payload
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'team_access_request',
        title: 'Team Access Request',
        message: `You have been invited as ${accessLevel === 'admin' ? 'Admin' : 'Manager'} on "${board.name}". Accept to access the dashboard.`,
        data: JSON.stringify({
          invitationId: invitation.id,
          accessLevel: invitation.accessLevel,
          boardId: board.id,
          boardName: board.name,
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully.',
      data: { invitation },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4B. ACCEPT TEAM INVITATION (Invited user only)
// ============================================================
const acceptTeamInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { userId } = req.user;

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: { board: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found or already handled.' });
    }

    if (invitation.userId !== userId) {
      return res.status(403).json({ success: false, message: 'This invitation is not for you.' });
    }

    const isAdminAccess = invitation.accessLevel === 'admin';

    const [member] = await prisma.$transaction([
      prisma.boardMember.create({
        data: {
          userId: invitation.userId,
          boardId: invitation.boardId,
          role: 'manager',
          accessLevel: invitation.accessLevel,
          canEditPost: true,
          canDeletePost: isAdminAccess,
          canEditComment: true,
          canDeleteComment: isAdminAccess,
        },
        include: {
          board: { select: { id: true, name: true } },
        },
      }),
      prisma.userBoardAccess.upsert({
        where: { userId_boardId: { userId: invitation.userId, boardId: invitation.boardId } },
        create: { userId: invitation.userId, boardId: invitation.boardId },
        update: {},
      }),
      prisma.teamInvitation.delete({ where: { id: invitationId } }),
      prisma.notification.updateMany({
        where: {
          userId: invitation.userId,
          type: 'team_access_request',
          data: { contains: invitationId },
        },
        data: { isRead: true },
      }),
      prisma.notification.create({
        data: {
          userId: invitation.invitedById,
          type: 'team_access_accepted',
          title: 'Team Invitation Accepted',
          message: `Your team access invitation for "${invitation.board.name}" was accepted.`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Team invitation accepted.',
      data: {
        accessLevel: member.accessLevel,
        boardId: member.boardId,
        boardName: member.board.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4C. REJECT TEAM INVITATION (Invited user only)
// ============================================================
const rejectTeamInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { userId, name } = req.user;

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: { board: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found or already handled.' });
    }

    if (invitation.userId !== userId) {
      return res.status(403).json({ success: false, message: 'This invitation is not for you.' });
    }

    await prisma.$transaction([
      prisma.teamInvitation.delete({ where: { id: invitationId } }),
      prisma.notification.updateMany({
        where: {
          userId: invitation.userId,
          type: 'team_access_request',
          data: { contains: invitationId },
        },
        data: { isRead: true },
      }),
      prisma.notification.create({
        data: {
          userId: invitation.invitedById,
          type: 'team_access_rejected',
          title: 'Team Invitation Declined',
          message: `${name} declined your team access invitation for "${invitation.board.name}".`,
        },
      }),
    ]);

    res.json({ success: true, message: 'Team invitation rejected.' });
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
  acceptTeamInvitation,
  rejectTeamInvitation,
};

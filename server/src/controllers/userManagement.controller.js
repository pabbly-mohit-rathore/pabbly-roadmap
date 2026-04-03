// ============================================================
// USER MANAGEMENT CONTROLLER
//
// Ye file User Management ka logic handle karta hai:
//   - List all users with filters
//   - Get user details
//   - Ban/Unban user
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. LIST ALL USERS (Admin only)
//
// Sab users get karo with filters
// Query params:
//   - status: active, banned (all by default)
//   - search: search by name or email
//   - limit: pagination limit
//   - offset: pagination offset
// ============================================================
const listUsers = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { status, search, limit = 20, offset = 0 } = req.query;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view users.',
      });
    }

    // Build where clause for filtering
    const where = {};

    // Filter by status (active or banned)
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'banned') {
      where.isActive = false;
    }

    // Search by name or email
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get users with their stats
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        boardAccess: {
          select: {
            board: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
            votes: true,
            comments: true,
            boardMemberships: true,
            boardAccess: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 20,
      skip: parseInt(offset) || 0,
    });

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. GET USER DETAILS (Admin only)
//
// Ek specific user ki details get karo
// Params:
//   - userId: User ID
// ============================================================
const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view user details.',
      });
    }

    // Get user with detailed stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            votes: true,
            comments: true,
            boardMemberships: true,
            subscriptions: true,
            activities: true,
          },
        },
        posts: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        boardMemberships: {
          select: {
            id: true,
            role: true,
            board: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. BAN/UNBAN USER (Admin only)
//
// User ko ban ya unban karo (toggle isActive)
// Params:
//   - userId: User ID
// Body:
//   - action: 'ban' or 'unban'
// ============================================================
const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can ban/unban users.',
      });
    }

    if (!action || !['ban', 'unban'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "ban" or "unban".',
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, isActive: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Cannot ban/unban admin users
    const userRole = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (userRole.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban/unban admin users.',
      });
    }

    // Determine new status
    let newStatus;
    if (action === 'ban') {
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'User is already banned.',
        });
      }
      newStatus = false;
    } else {
      if (user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'User is already active.',
        });
      }
      newStatus = true;
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: action === 'ban' ? 'user_banned' : 'user_unbanned',
        description: `User ${action === 'ban' ? 'banned' : 'unbanned'}`,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: `User ${action === 'ban' ? 'banned' : 'unbanned'} successfully.`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUserDetails,
  toggleUserStatus,
};

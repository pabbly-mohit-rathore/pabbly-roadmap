const prisma = require('../config/database');

// POST /changelog — Create a new changelog entry (admin only)
const createEntry = async (req, res, next) => {
  try {
    const { role, userId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can create changelog entries.' });
    }

    const { title, description, content, type, boardIds, allBoards } = req.body;

    const validTypes = ['new', 'improved', 'fixed'];
    const changelogType = validTypes.includes(type) ? type : 'new';

    const entry = await prisma.changelogEntry.create({
      data: {
        title,
        description: description || null,
        content,
        type: changelogType,
        status: 'draft',
        allBoards: allBoards !== false,
        authorId: userId,
        boards: allBoards === false && boardIds?.length > 0
          ? { create: boardIds.map((boardId) => ({ boardId })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true } },
        boards: { include: { board: { select: { id: true, name: true, color: true } } } },
        _count: { select: { likes: true } },
      },
    });

    res.status(201).json({ success: true, data: { entry } });
  } catch (error) {
    next(error);
  }
};

// GET /changelog — List all entries (admin only)
const listEntries = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can view all changelog entries.' });
    }

    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const entries = await prisma.changelogEntry.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        boards: { include: { board: { select: { id: true, name: true, color: true } } } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { entries } });
  } catch (error) {
    next(error);
  }
};

// GET /changelog/:id — Get single entry
const getEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const entry = await prisma.changelogEntry.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        boards: { include: { board: { select: { id: true, name: true, color: true } } } },
        likes: userId ? { where: { userId }, select: { id: true } } : false,
        _count: { select: { likes: true } },
      },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found.' });
    }

    // Non-admin users: check board access
    if (role !== 'admin') {
      if (!entry.allBoards) {
        const userAccess = await prisma.userBoardAccess.findMany({
          where: { userId },
          select: { boardId: true },
        });
        const userBoardIds = userAccess.map(a => a.boardId);
        const entryBoardIds = entry.boards.map(b => b.boardId);
        const hasAccess = entryBoardIds.some(bid => userBoardIds.includes(bid));
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'You do not have access to this changelog entry.' });
        }
      }
      // Non-admin can only see published entries
      if (entry.status !== 'published') {
        return res.status(404).json({ success: false, message: 'Entry not found.' });
      }
    }

    res.json({
      success: true,
      data: {
        entry: {
          ...entry,
          isLiked: entry.likes?.length > 0,
          likes: undefined,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /changelog/:id — Update entry (admin only)
const updateEntry = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update changelog entries.' });
    }

    const { id } = req.params;
    const { title, description, content, type, boardIds, allBoards } = req.body;

    // Delete existing board associations and recreate
    if (boardIds !== undefined || allBoards !== undefined) {
      await prisma.changelogBoard.deleteMany({ where: { changelogEntryId: id } });
    }

    const entry = await prisma.changelogEntry.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(content && { content }),
        ...(type && { type }),
        ...(allBoards !== undefined && { allBoards }),
        boards: allBoards === false && boardIds?.length > 0
          ? { create: boardIds.map((boardId) => ({ boardId })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true } },
        boards: { include: { board: { select: { id: true, name: true, color: true } } } },
        _count: { select: { likes: true } },
      },
    });

    res.json({ success: true, data: { entry } });
  } catch (error) {
    next(error);
  }
};

// DELETE /changelog/:id — Delete entry (admin only)
const deleteEntry = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete changelog entries.' });
    }

    const { id } = req.params;
    await prisma.changelogEntry.delete({ where: { id } });

    res.json({ success: true, message: 'Entry deleted.' });
  } catch (error) {
    next(error);
  }
};

// POST /changelog/:id/publish — Publish entry (admin only)
const publishEntry = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can publish changelog entries.' });
    }

    const { id } = req.params;
    const scheduledAt = req.body?.scheduledAt;

    const data = scheduledAt
      ? { status: 'scheduled', scheduledAt: new Date(scheduledAt) }
      : { status: 'published', publishedAt: new Date() };

    console.log('Publishing entry:', id, 'data:', data);

    const entry = await prisma.changelogEntry.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true } },
        boards: { include: { board: { select: { id: true, name: true, color: true } } } },
        _count: { select: { likes: true } },
      },
    });

    res.json({ success: true, data: { entry } });
  } catch (error) {
    next(error);
  }
};

// GET /changelog/public — Published entries for users (filtered by board access)
const getPublicEntries = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    // Get user's board access
    let userBoardIds = [];
    if (userId) {
      const access = await prisma.userBoardAccess.findMany({
        where: { userId },
        select: { boardId: true },
      });
      userBoardIds = access.map((a) => a.boardId);
    }

    // Build filter: only show entries for boards user has access to
    const whereConditions = [{ allBoards: true }];
    if (userBoardIds.length > 0) {
      whereConditions.push({ allBoards: false, boards: { some: { boardId: { in: userBoardIds } } } });
    }

    console.log('User:', userId, 'Board access:', userBoardIds);

    const entries = await prisma.changelogEntry.findMany({
      where: {
        status: 'published',
        OR: whereConditions,
      },
      include: {
        author: { select: { id: true, name: true } },
        boards: { include: { board: { select: { id: true, name: true, color: true } } } },
        likes: userId ? { where: { userId }, select: { id: true } } : false,
        _count: { select: { likes: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const result = entries.map((entry) => ({
      ...entry,
      isLiked: entry.likes?.length > 0,
      likes: undefined,
    }));

    res.json({ success: true, data: { entries: result } });
  } catch (error) {
    next(error);
  }
};

// POST /changelog/:id/like — Toggle like (authenticated users)
const toggleLike = async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;

    // Verify entry exists and is published
    const entry = await prisma.changelogEntry.findUnique({
      where: { id },
      include: { boards: { select: { boardId: true } } },
    });
    if (!entry || entry.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Entry not found.' });
    }

    // Non-admin: check board access
    if (role !== 'admin' && !entry.allBoards) {
      const userAccess = await prisma.userBoardAccess.findMany({
        where: { userId },
        select: { boardId: true },
      });
      const userBoardIds = userAccess.map(a => a.boardId);
      const hasAccess = entry.boards.some(b => userBoardIds.includes(b.boardId));
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const existing = await prisma.changelogLike.findUnique({
      where: { changelogEntryId_userId: { changelogEntryId: id, userId } },
    });

    if (existing) {
      await prisma.changelogLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.changelogLike.create({
        data: { changelogEntryId: id, userId },
      });
    }

    const likeCount = await prisma.changelogLike.count({ where: { changelogEntryId: id } });

    res.json({
      success: true,
      data: { liked: !existing, likeCount },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEntry,
  listEntries,
  getEntry,
  updateEntry,
  deleteEntry,
  publishEntry,
  getPublicEntries,
  toggleLike,
};

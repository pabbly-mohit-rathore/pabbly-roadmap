const prisma = require('../config/database');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const take = Math.min(parseInt(limit) || 20, 50);
    const skip = ((parseInt(page) || 1) - 1) * take;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { post: { select: { id: true, title: true, slug: true } } },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    res.json({ success: true, data: { notifications, total } });
  } catch (error) { next(error); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) { next(error); }
};

const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllRead };

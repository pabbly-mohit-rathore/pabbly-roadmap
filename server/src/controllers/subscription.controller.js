const prisma = require('../config/database');

const toggleSubscription = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = await prisma.subscription.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.subscription.delete({ where: { id: existing.id } });
      return res.json({ success: true, data: { isSubscribed: false }, message: 'Unsubscribed' });
    }

    await prisma.subscription.create({ data: { userId, postId } });
    res.json({ success: true, data: { isSubscribed: true }, message: 'Subscribed' });
  } catch (error) { next(error); }
};

const getSubscriptionStatus = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const sub = await prisma.subscription.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    res.json({ success: true, data: { isSubscribed: !!sub } });
  } catch (error) { next(error); }
};

module.exports = { toggleSubscription, getSubscriptionStatus };

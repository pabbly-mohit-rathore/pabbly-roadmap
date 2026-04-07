// ============================================================
// VOTE CONTROLLER
//
// Ye file Votes (Upvote) ka logic handle karta hai:
//   - Upvote post (toggle - ek click se vote remove ho jayega)
//   - Remove vote explicitly
//   - Get voters list (paginated)
//   - Vote on behalf (admin/manager only)
//
// Important: Upvote only system — no downvotes
// ============================================================

const prisma = require('../config/database');

// ============================================================
// 1. UPVOTE POST (Toggle)
//
// Ek user ek post ko sirf ek baar upvote kar sakta hai
// Dubara click karne se vote remove hota hai (toggle)
// ============================================================
const upvotePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { userId } = req.user;

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true, voteCount: true },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Check: Kya user ko is board ka access hai?
    const hasAccess = await prisma.userBoardAccess.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId: post.boardId,
        },
      },
    });

    if (req.user.role !== 'admin' && !hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this board.',
      });
    }

    // Check: Kya vote pehle se exist karta hai?
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingVote) {
      // Vote already exists — remove it (toggle)
      await prisma.vote.deleteMany({
        where: { userId, postId },
      });
    } else {
      // Vote doesn't exist — create it
      await prisma.vote.create({
        data: { userId, postId },
      });
    }

    // Always recalculate from actual DB count to avoid drift
    const actualCount = await prisma.vote.count({ where: { postId } });

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { voteCount: actualCount },
      select: { id: true, voteCount: true },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'voted',
        description: existingVote ? 'Vote removed' : 'Post upvoted',
        userId,
        postId,
        boardId: post.boardId,
      },
    });

    // Real-time broadcast — sabko turant dikhega
    const io = req.app.get('io');
    io.to(`post:${postId}`).emit('vote-updated', {
      postId,
      voteCount: updatedPost.voteCount,
    });

    res.json({
      success: true,
      message: existingVote ? 'Vote removed.' : 'Post upvoted successfully.',
      data: {
        post: updatedPost,
        hasVoted: !existingVote,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. REMOVE VOTE (Explicit)
//
// User apna vote remove kar sakta hai
// ============================================================
const removeVote = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { userId } = req.user;

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true, voteCount: true },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Vote dhundho aur delete karo
    const vote = await prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!vote) {
      return res.status(400).json({
        success: false,
        message: 'You have not upvoted this post.',
      });
    }

    // Vote delete karo
    await prisma.vote.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    // Update vote count
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { voteCount: { decrement: 1 } },
      select: { id: true, voteCount: true },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'voted',
        description: 'Vote removed',
        userId,
        postId,
        boardId: post.boardId,
      },
    });

    // Real-time broadcast
    const io = req.app.get('io');
    io.to(`post:${postId}`).emit('vote-updated', {
      postId,
      voteCount: updatedPost.voteCount,
    });

    res.json({
      success: true,
      message: 'Vote removed successfully.',
      data: { post: updatedPost },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. GET VOTERS LIST (Paginated)
//
// Kaunse users ne is post ko upvote kiya
// ============================================================
const getVoters = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const take = Math.min(parseInt(limit), 50);

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Total voters count
    const total = await prisma.vote.count({
      where: { postId },
    });

    // Get voters
    const votes = await prisma.vote.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    const voters = votes.map((vote) => ({
      userId: vote.user.id,
      name: vote.user.name,
      avatar: vote.user.avatar,
      email: vote.user.email,
      votedAt: vote.createdAt,
    }));

    res.json({
      success: true,
      data: {
        voters,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. VOTE ON BEHALF (Admin/Manager only)
//
// Admin/Manager किसी user की ओर से vote कर सकता है
// Use case: Support team को vote करना है user की ओर से
// ============================================================
const voteOnBehalf = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { userId: targetUserId } = req.body;
    const { userId, role } = req.user;

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true, voteCount: true },
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
          message: 'Only admins and board managers can vote on behalf.',
        });
      }
    }

    // Check: Target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found.',
      });
    }

    // Check: Kya vote pehle se exist karta hai?
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId: targetUserId,
          postId,
        },
      },
    });

    let voteCount = post.voteCount;

    if (existingVote) {
      // Vote already exists — remove it
      await prisma.vote.delete({
        where: {
          userId_postId: {
            userId: targetUserId,
            postId,
          },
        },
      });
      voteCount = post.voteCount - 1;
    } else {
      // Vote doesn't exist — create it
      await prisma.vote.create({
        data: {
          userId: targetUserId,
          postId,
        },
      });
      voteCount = post.voteCount + 1;
    }

    // Update post vote count
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { voteCount },
      select: { id: true, voteCount: true },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'voted',
        description: existingVote
          ? `Vote removed on behalf of user`
          : `Vote added on behalf of user`,
        userId,
        postId,
        boardId: post.boardId,
      },
    });

    res.json({
      success: true,
      message: existingVote
        ? 'Vote removed on behalf successfully.'
        : 'Vote added on behalf successfully.',
      data: {
        post: updatedPost,
        onBehalfOf: targetUserId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upvotePost,
  removeVote,
  getVoters,
  voteOnBehalf,
};

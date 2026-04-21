// ============================================================
// COMMENT CONTROLLER
//
// Ye file Comments ka logic handle karta hai:
//   - Get all comments for a post (nested replies, pagination)
//   - Add comment/reply
//   - Edit comment (author or admin/manager)
//   - Delete comment (author or admin/manager)
//   - Mark as official response (admin/manager)
//   - Add internal note (admin/manager)
// ============================================================

const prisma = require('../config/database');
const notifySubscribers = require('../utils/notifySubscribers');

// ============================================================
// 1. GET ALL COMMENTS FOR A POST
//
// Nested replies, pagination
// Params:
//   - postId: Post ID
//   - page: Page number (default 1)
//   - limit: Items per page (default 20)
// ============================================================
const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { userId, role } = req.user || {};

    // Single query: check post exists + board membership in parallel
    const isAdmin = role === 'admin';
    let isAdminOrManager = isAdmin;

    if (!isAdmin && userId) {
      // Check post + board membership in one go
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          boardId: true,
          board: {
            select: {
              members: {
                where: { userId },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found.' });
      }
      isAdminOrManager = (post.board?.members?.length || 0) > 0;
    }

    // Build where clause (isInternal hidden from non-admins; comments are public by default)
    const where = { postId, parentId: null };
    if (!isAdminOrManager) {
      where.isInternal = false;
    }

    const replyWhere = !isAdminOrManager ? { isInternal: false } : undefined;

    const comments = await prisma.comment.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        content: true,
        isInternal: true,
        isOfficial: true,
        isPinned: true,
        likeCount: true,
        createdAt: true,
        authorId: true,
        parentId: true,
        author: { select: { id: true, name: true, avatar: true } },
        likes: { select: { userId: true } },
        replies: {
          where: replyWhere,
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            isOfficial: true,
            isPinned: true,
            likeCount: true,
            createdAt: true,
            authorId: true,
            parentId: true,
            author: { select: { id: true, name: true, avatar: true } },
            likes: { select: { userId: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. ADD COMMENT / REPLY
//
// Frontend se: { content, parentId (optional for replies) }
// ============================================================
const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parentId, isInternal: requestedInternal } = req.body;
    const { userId } = req.user;

    // Post dhundho
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, boardId: true, authorId: true, title: true, slug: true },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Check: Kya user ko is board ka access hai?
    // Admin, team members, userBoardAccess, ya public board — sabko allow karo
    if (req.user.role !== 'admin' && !req.user.teamAccess) {
      const hasAccess = await prisma.userBoardAccess.findUnique({
        where: { userId_boardId: { userId, boardId: post.boardId } },
      });
      if (!hasAccess) {
        const board = await prisma.board.findUnique({ where: { id: post.boardId }, select: { isPublic: true } });
        if (!board?.isPublic) {
          return res.status(403).json({ success: false, message: 'You do not have access to this board.' });
        }
      }
    }

    // Agar parentId hai toh parent comment check karo
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment.',
        });
      }
    }

    // Only admins, team access sessions, or board managers can post internal comments
    let canPostInternal = req.user.role === 'admin' || !!req.user.teamAccess;
    if (!canPostInternal && requestedInternal === true) {
      const membership = await prisma.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId: post.boardId } },
        select: { id: true },
      });
      canPostInternal = !!membership;
    }
    const isInternal = canPostInternal && requestedInternal === true;

    // Comment banao (all comments public by default — no spam gating)
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        postId,
        parentId: parentId || null,
        isInternal,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Fire-and-forget: commentCount, activity, notifySubscribers, auto-subscribe
    // Internal comments are not counted in the public commentCount.
    if (!isInternal) {
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }).catch(err => console.error('commentCount update failed:', err));
    }

    prisma.activity.create({
      data: {
        action: 'commented',
        description: `Comment added on post`,
        userId,
        postId,
        boardId: post.boardId,
      },
    }).catch(err => console.error('activity log failed:', err));

    // Notifications & subscriber broadcasts are skipped for internal comments
    // (regular users can't see them, so notifying is pointless).
    if (!isInternal) {
      notifySubscribers(postId, {
        type: 'new_comment',
        title: 'New comment on your post',
        message: `${comment.author.name} commented on "${post.title}"`,
        excludeUserIds: [userId],
      }).catch(err => console.error('notifySubscribers failed:', err));

      // Reply notification — parent comment author ko batao
      if (parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
          select: { authorId: true },
        });
        if (parentComment && parentComment.authorId !== userId) {
          const title = 'New reply to your comment';
          const message = `${comment.author.name} replied to your comment on "${post.title}"`;
          await prisma.notification.create({
            data: {
              userId: parentComment.authorId,
              type: 'comment_reply',
              title,
              message,
              postId,
              data: JSON.stringify({ commentId: comment.id, parentId }),
            },
          }).catch(() => {});

          const { sendPushToUser } = require('../utils/webPush');
          sendPushToUser(parentComment.authorId, {
            title,
            body: message,
            url: post.slug ? `/user/posts/${post.slug}` : '/',
            adminUrl: post.slug ? `/admin/posts/${post.slug}` : '/',
            type: 'comment_reply',
          }).catch(() => {});
        }
      }
    }

    // Auto-subscribe commenter to the post (fire-and-forget)
    prisma.subscription.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    }).catch(err => console.error('auto-subscribe failed:', err));

    // Real-time broadcast — sabko turant dikhega (client filters internal by role)
    const io = req.app.get('io');
    io.to(`post:${postId}`).emit('comment-added', { postId, comment });
    // Don't inflate commentCount on list pages for internal comments (regular users can't see them)
    if (!isInternal) {
      io.to('feed').emit('comment-count-changed', { postId, delta: 1 });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. UPDATE COMMENT
//
// Author apna comment edit kar sakta hai
// ============================================================
const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { userId, role } = req.user;

    // Comment dhundho
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { id: true, boardId: true } } },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Check: Kya user author hai ya admin/manager?
    if (comment.authorId !== userId && role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: comment.post.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this comment.',
        });
      }
    }

    // Comment update karo
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: 'Comment edited',
        userId,
        postId: comment.post.id,
        boardId: comment.post.boardId,
      },
    });

    // Real-time broadcast
    const io = req.app.get('io');
    io.to(`post:${comment.post.id}`).emit('comment-updated', {
      postId: comment.post.id,
      comment: updatedComment,
    });

    res.json({
      success: true,
      message: 'Comment updated successfully.',
      data: { comment: updatedComment },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. DELETE COMMENT
//
// Author apna delete kar sakta hai
// Admin/Manager kisi bhi ko delete kar sakta hai
// ============================================================
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Comment dhundho
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { id: true, boardId: true } } },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Check permission
    const isAuthor = comment.authorId === userId;
    const teamAccess = req.user.teamAccess;
    // Team admin can delete, team manager cannot — full access across all boards
    const isTeamAdmin = teamAccess && teamAccess.accessLevel === 'admin';
    const isTeamManager = teamAccess && teamAccess.accessLevel === 'manager';

    if (isTeamManager && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Manager access does not allow deleting comments.',
      });
    }

    if (!isAuthor && !isTeamAdmin && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment.',
      });
    }

    // Count all replies (for commentCount decrement) then delete cascade
    const replyCount = await prisma.comment.count({ where: { parentId: id } });
    const totalDeleted = replyCount + 1;

    // Delete all nested replies first, then the comment itself
    // (Prisma self-relations don't support onDelete: Cascade, so we do it manually)
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { parentId: id } }),
      prisma.comment.delete({ where: { id } }),
    ]);

    // Decrement comment count on post by total deleted
    prisma.post.update({
      where: { id: comment.post.id },
      data: { commentCount: { decrement: totalDeleted } },
    }).catch(err => console.error('commentCount decrement failed:', err));

    // Activity log (fire-and-forget)
    prisma.activity.create({
      data: {
        action: 'deleted',
        description: replyCount > 0 ? `Comment + ${replyCount} replies deleted` : 'Comment deleted',
        userId,
        postId: comment.post.id,
        boardId: comment.post.boardId,
      },
    }).catch(err => console.error('activity log failed:', err));

    // Real-time broadcast
    const io = req.app.get('io');
    io.to(`post:${comment.post.id}`).emit('comment-deleted', {
      postId: comment.post.id,
      commentId: id,
    });
    io.to('feed').emit('comment-count-changed', { postId: comment.post.id, delta: -(totalDeleted || 1) });

    res.json({
      success: true,
      message: 'Comment deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. MARK AS OFFICIAL RESPONSE (Admin/Manager only)
// ============================================================
const markAsOfficial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { id: true, boardId: true } } },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Check permission
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: comment.post.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and board managers can mark official responses.',
        });
      }
    }

    // Toggle official status
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { isOfficial: !comment.isOfficial },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: `Comment marked as ${updatedComment.isOfficial ? 'official response' : 'regular comment'}`,
        userId,
        postId: comment.post.id,
        boardId: comment.post.boardId,
      },
    });

    res.json({
      success: true,
      message: `Comment marked as ${updatedComment.isOfficial ? 'official' : 'regular'} successfully.`,
      data: { comment: updatedComment },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. MARK AS INTERNAL NOTE (Admin/Manager only)
// ============================================================
const markAsInternal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { id: true, boardId: true } } },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Check permission
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: comment.post.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and board managers can add internal notes.',
        });
      }
    }

    // Toggle internal status
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { isInternal: !comment.isInternal },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'updated',
        description: `Comment marked as ${updatedComment.isInternal ? 'internal note' : 'public comment'}`,
        userId,
        postId: comment.post.id,
        boardId: comment.post.boardId,
      },
    });

    res.json({
      success: true,
      message: `Comment marked as ${updatedComment.isInternal ? 'internal' : 'public'} successfully.`,
      data: { comment: updatedComment },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 7. TOGGLE COMMENT PIN (Admin/Manager only)
// ============================================================
const toggleCommentPin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { id: true, boardId: true } } },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Check: Admin or board manager only
    if (role !== 'admin') {
      const isBoardManager = await prisma.boardMember.findUnique({
        where: {
          userId_boardId: {
            userId,
            boardId: comment.post.boardId,
          },
        },
      });
      if (!isBoardManager) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and board managers can pin comments.',
        });
      }
    }

    // Toggle pin status
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { isPinned: !comment.isPinned },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        likes: { select: { userId: true } },
      },
    });

    const io = req.app.get('io');
    io.to(`post:${comment.postId}`).emit('comment-updated', { postId: comment.postId });

    res.json({
      success: true,
      message: `Comment ${updatedComment.isPinned ? 'pinned' : 'unpinned'} successfully.`,
      data: { comment: updatedComment },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 9. TOGGLE COMMENT LIKE
//
// Any authenticated user can like/unlike comments
// ============================================================
const toggleCommentLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Comment dhundho
    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Check if user already liked this comment
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId: id,
        },
      },
    });

    let hasLiked = false;
    let likeCount = comment.likeCount;

    if (existingLike) {
      // Unlike - delete the like
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId,
            commentId: id,
          },
        },
      });
      likeCount = Math.max(0, likeCount - 1);
    } else {
      // Like - create new like
      await prisma.commentLike.create({
        data: {
          userId,
          commentId: id,
        },
      });
      likeCount = likeCount + 1;
      hasLiked = true;
    }

    // Update comment like count
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { likeCount },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        likes: { select: { userId: true } },
      },
    });

    // Notification — comment author ko batao (sirf new like pe)
    if (hasLiked && comment.authorId && comment.authorId !== userId) {
      const liker = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const post = await prisma.post.findUnique({ where: { id: comment.postId }, select: { title: true, slug: true } });
      const title = 'Your comment was liked';
      const message = `${liker?.name || 'Someone'} liked your comment on "${post?.title || 'a post'}"`;
      await prisma.notification.create({
        data: {
          userId: comment.authorId,
          type: 'comment_liked',
          title,
          message,
          postId: comment.postId,
          data: JSON.stringify({ commentId: id }),
        },
      }).catch(() => {});

      const { sendPushToUser } = require('../utils/webPush');
      sendPushToUser(comment.authorId, {
        title,
        body: message,
        url: post?.slug ? `/user/posts/${post.slug}` : '/',
        adminUrl: post?.slug ? `/admin/posts/${post.slug}` : '/',
        type: 'comment_liked',
      }).catch(() => {});
    }

    const io = req.app.get('io');
    io.to(`post:${comment.postId}`).emit('comment-updated', { postId: comment.postId });

    res.json({
      success: true,
      data: {
        comment: updatedComment,
        hasLiked: !existingLike,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  markAsOfficial,
  markAsInternal,
  toggleCommentPin,
  toggleCommentLike,
};

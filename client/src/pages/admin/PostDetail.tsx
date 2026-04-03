import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ThumbsUp, Pin, ChevronLeft, Trash2, Heart, MessageCircle } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: string;
  author: { name: string };
  board: { name: string; id: string };
  tags?: { tag: Tag }[];
}

interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
  isOfficial: boolean;
  isSpam: boolean;
  isPinned: boolean;
  likeCount: number;
  likes: { userId: string }[];
  parentId: string | null;
  replies?: Comment[];
}

// Helper function for relative time
const getTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return 'just now';
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;

  return date.toLocaleDateString();
};

export default function AdminPostDetail() {
  const theme = useThemeStore((state) => state.theme);
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { state } = useLocation();

  const [post, setPost] = useState<Post | null>(state?.post || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(!post);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isVoted, setIsVoted] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [refreshTimestamp, setRefreshTimestamp] = useState(0);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Refresh timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimestamp(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch post if not passed via navigation state
  useEffect(() => {
    if (!post && postId) {
      fetchPost();
    }
  }, [postId]);

  useEffect(() => {
    if (post) {
      fetchComments();
    }
  }, [post?.id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/${postId}`);
      if (response.data.success) {
        setPost(response.data.data.post);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/comments/post/${post?.id}`);
      if (response.data.success) {
        const commentsList = response.data.data.comments || [];
        setComments(commentsList);

        // Initialize liked comment IDs based on current user
        const liked = new Set<string>();
        if (currentUser) {
          commentsList.forEach((comment: Comment) => {
            if (comment.likes.some((like: any) => like.userId === currentUser.id)) {
              liked.add(comment.id);
            }
          });
        }
        setLikedCommentIds(liked);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleVote = async () => {
    try {
      const response = await api.post(`/votes/${post?.id}`);
      if (response.data.success) {
        setIsVoted(!isVoted);
        setPost((prev) =>
          prev
            ? {
                ...prev,
                voteCount: response.data.data.post.voteCount,
              }
            : null
        );
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handlePin = async () => {
    try {
      const response = await api.put(`/posts/${post?.id}/pin`);
      if (response.data.success) {
        setPost((prev) =>
          prev ? { ...prev, isPinned: !prev.isPinned } : null
        );
        toast.success(post?.isPinned ? 'Post unpinned' : 'Post pinned');
      }
    } catch (error) {
      console.error('Error pinning post:', error);
      toast.error('Failed to pin post');
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    try {
      const response = await api.put(`/posts/${post?.id}/status`, {
        status: newStatus,
      });
      if (response.data.success) {
        setPost((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to change status');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await api.post(`/comments/post/${post?.id}`, {
        content: commentText,
      });

      if (response.data.success) {
        setCommentText('');
        setPost((prev) =>
          prev ? { ...prev, commentCount: prev.commentCount + 1 } : null
        );
        fetchComments();
        toast.success('Comment added');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const response = await api.put(`/comments/${commentId}`, {
        content: editText,
      });

      if (response.data.success) {
        setEditingCommentId(null);
        setEditText('');
        fetchComments();
        toast.success('Comment updated');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const response = await api.delete(`/comments/${commentId}`);
      if (response.data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPost((prev) =>
          prev ? { ...prev, commentCount: prev.commentCount - 1 } : null
        );
        toast.success('Comment deleted');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const response = await api.post(`/comments/${commentId}/like`);
      if (response.data.success) {
        const newLiked = new Set(likedCommentIds);
        if (newLiked.has(commentId)) {
          newLiked.delete(commentId);
        } else {
          newLiked.add(commentId);
        }
        setLikedCommentIds(newLiked);
        fetchComments();
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  const handleMarkNotSpam = async (commentId: string) => {
    try {
      const response = await api.put(`/comments/${commentId}/spam`);
      if (response.data.success) {
        fetchComments();
        toast.success('Comment approved');
      }
    } catch (error) {
      console.error('Error marking not spam:', error);
      toast.error('Failed to approve comment');
    }
  };

  const handlePinComment = async (commentId: string) => {
    try {
      const response = await api.put(`/comments/${commentId}/pin`);
      if (response.data.success) {
        fetchComments();
        toast.success('Comment pinned');
      }
    } catch (error) {
      console.error('Error pinning comment:', error);
      toast.error('Failed to pin comment');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      const response = await api.post(`/comments/post/${post?.id}`, {
        content: replyText,
        parentId,
      });

      if (response.data.success) {
        setReplyText('');
        setReplyingToId(null);
        fetchComments();
        toast.success('Reply added');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-orange-100 text-orange-800',
      live: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      hold: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      feature: 'bg-indigo-100 text-indigo-800',
      bug: 'bg-red-100 text-red-800',
      improvement: 'bg-blue-100 text-blue-800',
      integration: 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!post && !loading) {
    return (
      <div
        className={`min-h-screen ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'
        } flex items-center justify-center`}
      >
        <div
          className={`text-center p-8 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          Post not found
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      {/* Header */}
      <div
        className={`border-b ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        } sticky top-0 z-10`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePin}
              className={`p-2 rounded-lg transition-colors ${
                post?.isPinned
                  ? 'bg-yellow-100 text-yellow-800'
                  : theme === 'dark'
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={post?.isPinned ? 'Unpin post' : 'Pin post'}
            >
              <Pin className="w-5 h-5" />
            </button>

            <button
              onClick={handleVote}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                isVoted
                  ? 'bg-black text-white'
                  : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              {post?.voteCount || 0}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content - Left */}
          <div className="col-span-2">
            {loading ? (
              <div className="text-center py-12">Loading post...</div>
            ) : (
              <>
                {/* Post Header */}
                <div className="mb-6">
                  <h1
                    className={`text-3xl font-bold mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {post?.title}
                  </h1>

                  <div className="flex gap-2 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                        post?.type || ''
                      )}`}
                    >
                      {post?.type?.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        post?.status || ''
                      )}`}
                    >
                      {post?.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div
                  className={`p-6 rounded-lg border mb-8 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <p
                    className={`whitespace-pre-wrap ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {post?.description}
                  </p>
                </div>

                {/* Comments Section */}
                <div className="mb-8">
                  <h2
                    className={`text-xl font-bold mb-4 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Comments ({post?.commentCount || 0})
                  </h2>

                  {/* Add Comment */}
                  <div
                    className={`p-4 rounded-lg border mb-6 ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg border mb-3 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-200'
                      }`}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={submittingComment || !commentText.trim()}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-lg border ${
                            comment.isSpam
                              ? theme === 'dark'
                                ? 'bg-red-900/20 border-red-800'
                                : 'bg-red-50 border-red-200'
                              : theme === 'dark'
                              ? 'bg-gray-800 border-gray-700'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p
                                className={`font-semibold ${
                                  theme === 'dark'
                                    ? 'text-white'
                                    : 'text-gray-900'
                                }`}
                              >
                                {comment.author.name}
                                {comment.isSpam && (
                                  <span className="ml-2 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                                    Spam
                                  </span>
                                )}
                                {comment.isPinned && (
                                  <span className="ml-2">📌</span>
                                )}
                              </p>
                              <p
                                className={`text-xs ${
                                  theme === 'dark'
                                    ? 'text-gray-500'
                                    : 'text-gray-500'
                                }`}
                              >
                                {getTimeAgo(comment.createdAt)}
                              </p>
                            </div>
                            {!comment.isSpam && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className={`p-1 rounded-lg transition-colors ${
                                  theme === 'dark'
                                    ? 'hover:bg-gray-700'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>

                          {/* Comment Content */}
                          {editingCommentId === comment.id ? (
                            <div className="mb-3">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border mb-2 ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-200'
                                }`}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingCommentId(null)}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    theme === 'dark'
                                      ? 'border-gray-600 hover:bg-gray-700'
                                      : 'border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className={`mb-3 ${
                                theme === 'dark'
                                  ? 'text-gray-300'
                                  : 'text-gray-700'
                              }`}
                            >
                              {comment.content}
                            </p>
                          )}

                          {/* Comment Actions */}
                          <div className="flex flex-wrap gap-3 text-sm">
                            {comment.isSpam ? (
                              <button
                                onClick={() => handleMarkNotSpam(comment.id)}
                                className="text-blue-600 hover:underline"
                              >
                                Mark not spam
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleLikeComment(comment.id)}
                                  className={`flex items-center gap-1 ${
                                    likedCommentIds.has(comment.id)
                                      ? 'text-red-500'
                                      : theme === 'dark'
                                      ? 'text-gray-400 hover:text-red-500'
                                      : 'text-gray-600 hover:text-red-500'
                                  }`}
                                >
                                  <Heart
                                    className="w-4 h-4"
                                    fill={
                                      likedCommentIds.has(comment.id)
                                        ? 'currentColor'
                                        : 'none'
                                    }
                                  />
                                  {comment.likeCount}
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditText(comment.content);
                                  }}
                                  className={`${
                                    theme === 'dark'
                                      ? 'text-gray-400 hover:text-white'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => handlePinComment(comment.id)}
                                  className={`${
                                    comment.isPinned
                                      ? 'text-yellow-500'
                                      : theme === 'dark'
                                      ? 'text-gray-400 hover:text-yellow-500'
                                      : 'text-gray-600 hover:text-yellow-500'
                                  }`}
                                >
                                  {comment.isPinned ? '📌 Unpin' : '📌 Pin'}
                                </button>

                                <button
                                  onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                                  className={`${
                                    replyingToId === comment.id
                                      ? 'text-blue-600'
                                      : theme === 'dark'
                                      ? 'text-gray-400 hover:text-white'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Reply
                                </button>
                              </>
                            )}
                          </div>

                          {comment.isOfficial && (
                            <p className="text-xs text-green-600 mt-2 font-semibold">
                              ✓ Official Response
                            </p>
                          )}

                          {/* Reply Form */}
                          {replyingToId === comment.id && (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                rows={2}
                                className={`w-full px-3 py-2 rounded-lg border mb-2 ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-200'
                                }`}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReply(comment.id)}
                                  className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800"
                                >
                                  Reply
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingToId(null);
                                    setReplyText('');
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    theme === 'dark'
                                      ? 'border-gray-600 hover:bg-gray-700'
                                      : 'border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300">
                              {comment.replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className={`p-3 rounded-lg border ${
                                    reply.isSpam
                                      ? theme === 'dark'
                                        ? 'bg-red-900/20 border-red-800'
                                        : 'bg-red-50 border-red-200'
                                      : theme === 'dark'
                                      ? 'bg-gray-700 border-gray-600'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {reply.author.name}
                                        {reply.isSpam && (
                                          <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                            Spam
                                          </span>
                                        )}
                                        {reply.isPinned && (
                                          <span className="ml-2">📌</span>
                                        )}
                                      </p>
                                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                        {getTimeAgo(reply.createdAt)}
                                      </p>
                                    </div>
                                    {!reply.isSpam && (
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className={`p-1 rounded-lg transition-colors ${
                                          theme === 'dark'
                                            ? 'hover:bg-gray-600'
                                            : 'hover:bg-gray-200'
                                        }`}
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Reply Content */}
                                  {editingCommentId === reply.id ? (
                                    <div className="mb-3">
                                      <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className={`w-full px-2 py-1 rounded text-sm border mb-2 ${
                                          theme === 'dark'
                                            ? 'bg-gray-600 border-gray-500 text-white'
                                            : 'bg-white border-gray-200'
                                        }`}
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleEditComment(reply.id)}
                                          className="px-2 py-1 bg-black text-white text-xs rounded hover:bg-gray-800"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingCommentId(null)}
                                          className={`px-2 py-1 text-xs rounded border ${
                                            theme === 'dark'
                                              ? 'border-gray-600 hover:bg-gray-600'
                                              : 'border-gray-200 hover:bg-gray-100'
                                          }`}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {reply.content}
                                    </p>
                                  )}

                                  {/* Reply Actions */}
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    {reply.isSpam ? (
                                      <button
                                        onClick={() => handleMarkNotSpam(reply.id)}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Mark not spam
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleLikeComment(reply.id)}
                                          className={`flex items-center gap-1 ${
                                            likedCommentIds.has(reply.id)
                                              ? 'text-red-500'
                                              : theme === 'dark'
                                              ? 'text-gray-400 hover:text-red-500'
                                              : 'text-gray-600 hover:text-red-500'
                                          }`}
                                        >
                                          <Heart
                                            className="w-3 h-3"
                                            fill={
                                              likedCommentIds.has(reply.id)
                                                ? 'currentColor'
                                                : 'none'
                                            }
                                          />
                                          {reply.likeCount}
                                        </button>

                                        <button
                                          onClick={() => {
                                            setEditingCommentId(reply.id);
                                            setEditText(reply.content);
                                          }}
                                          className={`${
                                            theme === 'dark'
                                              ? 'text-gray-400 hover:text-white'
                                              : 'text-gray-600 hover:text-gray-900'
                                          }`}
                                        >
                                          Edit
                                        </button>

                                        <button
                                          onClick={() => handlePinComment(reply.id)}
                                          className={`${
                                            reply.isPinned
                                              ? 'text-yellow-500'
                                              : theme === 'dark'
                                              ? 'text-gray-400 hover:text-yellow-500'
                                              : 'text-gray-600 hover:text-yellow-500'
                                          }`}
                                        >
                                          {reply.isPinned ? '📌' : '📌'}
                                        </button>

                                        <button
                                          onClick={() => setReplyingToId(replyingToId === reply.id ? null : reply.id)}
                                          className={`${
                                            replyingToId === reply.id
                                              ? 'text-blue-600'
                                              : theme === 'dark'
                                              ? 'text-gray-400 hover:text-white'
                                              : 'text-gray-600 hover:text-gray-900'
                                          }`}
                                        >
                                          Reply
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {reply.isOfficial && (
                                    <p className="text-xs text-green-600 mt-2 font-semibold">
                                      ✓ Official Response
                                    </p>
                                  )}

                                  {/* Nested Reply Form */}
                                  {replyingToId === reply.id && (
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a reply..."
                                        rows={2}
                                        className={`w-full px-2 py-1 rounded text-sm border mb-2 ${
                                          theme === 'dark'
                                            ? 'bg-gray-600 border-gray-500 text-white'
                                            : 'bg-white border-gray-200'
                                        }`}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleReply(reply.id)}
                                          className="px-2 py-1 bg-black text-white text-xs rounded hover:bg-gray-800"
                                        >
                                          Reply
                                        </button>
                                        <button
                                          onClick={() => {
                                            setReplyingToId(null);
                                            setReplyText('');
                                          }}
                                          className={`px-2 py-1 text-xs rounded border ${
                                            theme === 'dark'
                                              ? 'border-gray-600 hover:bg-gray-600'
                                              : 'border-gray-200 hover:bg-gray-100'
                                          }`}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p
                        className={`text-center py-8 ${
                          theme === 'dark'
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}
                      >
                        No comments yet
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar - Right */}
          <div>
            <div
              className={`p-6 rounded-lg border sticky top-24 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <h3
                className={`text-sm font-semibold mb-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                POST DETAILS
              </h3>

              {/* Board */}
              <div className="mb-6">
                <p
                  className={`text-xs font-semibold mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  BOARD
                </p>
                <p
                  className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {post?.board.name}
                </p>
              </div>

              {/* Author */}
              <div className="mb-6">
                <p
                  className={`text-xs font-semibold mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  AUTHOR
                </p>
                <p
                  className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {post?.author.name}
                </p>
              </div>

              {/* Created */}
              <div className="mb-6">
                <p
                  className={`text-xs font-semibold mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  CREATED
                </p>
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {post?.createdAt
                    ? new Date(post.createdAt).toLocaleDateString()
                    : '-'}
                </p>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <p
                  className={`text-xs font-semibold mb-2 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  TAGS
                </p>
                <div className="flex flex-wrap gap-2">
                  {post?.tags && post.tags.length > 0 ? (
                    post.tags.map((postTag) => (
                      <span
                        key={postTag.tag.id}
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: postTag.tag.color + '20',
                          color: postTag.tag.color,
                          border: `1px solid ${postTag.tag.color}`,
                        }}
                      >
                        {postTag.tag.name}
                      </span>
                    ))
                  ) : (
                    <p
                      className={`text-sm ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}
                    >
                      No tags
                    </p>
                  )}
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <p
                  className={`text-xs font-semibold mb-2 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  CHANGE STATUS
                </p>
                <select
                  value={post?.status || 'open'}
                  onChange={(e) => handleChangeStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="live">Live</option>
                  <option value="closed">Closed</option>
                  <option value="hold">Hold</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

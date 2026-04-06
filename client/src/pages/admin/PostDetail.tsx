import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Pin, Trash2, Heart, Plus, X } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CommentEditor from '../../components/CommentEditor';

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
  author: { id: string; name: string; avatar?: string };
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
  const { votes, init, toggle } = useVoteStore();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { state } = useLocation();

  const [post, setPost] = useState<Post | null>(state?.post || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(!post);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);



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
        const postData = response.data.data.post;
        setPost(postData);
        init(postData.id, postData.voteCount ?? 0, postData.hasVoted ?? false);
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

  const handleVote = () => {
    if (!post) return;
    toggle(post.id);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
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

  const fetchAvailableTags = async () => {
    if (!post?.board?.id) return;
    try {
      const response = await api.get(`/tags?boardId=${post.board.id}`);
      if (response.data.success) {
        setAvailableTags(response.data.data.tags || response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      const response = await api.post('/tags/assign', { postId: post?.id, tagId });
      if (response.data.success) {
        // Refresh post to get updated tags
        const postResponse = await api.get(`/posts/${postId}`);
        if (postResponse.data.success) {
          setPost(postResponse.data.data.post);
        }
        toast.success('Tag added');
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
    }
    setShowTagDropdown(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await api.post('/tags/remove', { postId: post?.id, tagId });
      if (response.data.success) {
        setPost((prev) =>
          prev ? { ...prev, tags: prev.tags?.filter((t) => t.tag.id !== tagId) } : null
        );
        toast.success('Tag removed');
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
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

  const handleAddComment = async (htmlContent?: string) => {
    const content = htmlContent || commentText;
    if (!content.trim() || content === '<p></p>') {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await api.post(`/comments/post/${post?.id}`, {
        content,
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
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8 items-start">
          {/* Main Content - Left */}
          <div className="col-span-2">
            {loading ? (
              <div className="text-center py-12">Loading post...</div>
            ) : (
              <>
                {/* Post Header */}
                <div className="mb-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        onClick={handleVote}
                        className="inline-flex flex-col items-center justify-center h-11 rounded-lg border font-bold transition-all cursor-pointer overflow-hidden flex-shrink-0"
                        style={{
                          width: '56px',
                          fontSize: '13px',
                          gap: '1px',
                          backgroundColor: votes[post!.id]?.voted ? '#1c252e' : 'transparent',
                          borderColor: votes[post!.id]?.voted ? '#1c252e' : (theme === 'dark' ? '#4b5563' : '#e5e7eb'),
                          color: votes[post!.id]?.voted ? '#ffffff' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                        }}
                        onMouseEnter={e => { if (!votes[post!.id]?.voted) e.currentTarget.style.borderColor = '#1c252e'; }}
                        onMouseLeave={e => { if (!votes[post!.id]?.voted) e.currentTarget.style.borderColor = theme === 'dark' ? '#4b5563' : '#e5e7eb'; }}
                      >
                        <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />
                        <span style={{ animation: animating ? 'slideUpCount 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', display: 'block' }}>
                          {votes[post!.id]?.count ?? 0}
                        </span>
                      </div>
                      <div>
                        <h1 className={`text-2xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {post?.title}
                        </h1>
                        {post?.description && (
                          <p className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {post.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handlePin}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
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
                  </div>

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
                  <div className="mb-6">
                    <CommentEditor
                      onSubmit={(html) => handleAddComment(html)}
                      submitting={submittingComment}
                    />
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className={`p-5 rounded-xl border ${comment.isSpam ? (theme === 'dark' ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200') : (theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}`}>
                          <div className="flex gap-3">
                            {/* Avatar */}
                            {comment.author.avatar ? (
                              <img src={comment.author.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-neutral-200'}`}>
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-neutral-700'}`}>{comment.author.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {/* Name · Time */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{comment.author.name}</span>
                                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>· {getTimeAgo(comment.createdAt)}</span>
                                  {comment.isSpam && <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Spam</span>}
                                  {comment.isPinned && <span className="text-xs">📌</span>}
                                </div>
                                {!comment.isSpam && (
                                  <button onClick={() => handleDeleteComment(comment.id)} className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                )}
                              </div>

                              {/* Comment Content */}
                              {editingCommentId === comment.id ? (
                                <div className="mt-2">
                                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border mb-2 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} rows={3} />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleEditComment(comment.id)} className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800">Save</button>
                                    <button onClick={() => setEditingCommentId(null)} className={`px-3 py-1 text-sm rounded border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-100'}`}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <span dangerouslySetInnerHTML={{ __html: comment.content }} />
                                </div>
                              )}

                              {/* Comment Actions */}
                              <div className="flex flex-wrap gap-3 text-xs mt-2">
                                {comment.isSpam ? (
                                  <button onClick={() => handleMarkNotSpam(comment.id)} className="text-blue-600 hover:underline">Mark not spam</button>
                                ) : (
                                  <>
                                    <button onClick={() => handleLikeComment(comment.id)} className={`flex items-center gap-1 ${likedCommentIds.has(comment.id) ? 'text-red-500' : theme === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                      <Heart className="w-3.5 h-3.5" fill={likedCommentIds.has(comment.id) ? 'currentColor' : 'none'} /> {comment.likeCount}
                                    </button>
                                    <button onClick={() => { setEditingCommentId(comment.id); setEditText(comment.content); }} className={theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Edit</button>
                                    <button onClick={() => handlePinComment(comment.id)} className={comment.isPinned ? 'text-yellow-500' : theme === 'dark' ? 'text-gray-400 hover:text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}>{comment.isPinned ? '📌 Unpin' : '📌 Pin'}</button>
                                    <button onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)} className={replyingToId === comment.id ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Reply</button>
                                  </>
                                )}
                              </div>

                              {comment.isOfficial && <p className="text-xs text-green-600 mt-2 font-semibold">✓ Official Response</p>}

                              {/* Reply Form */}
                              {replyingToId === comment.id && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." rows={2}
                                    className={`w-full px-3 py-2 rounded-lg border mb-2 text-sm ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleReply(comment.id)} className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800">Reply</button>
                                    <button onClick={() => { setReplyingToId(null); setReplyText(''); }} className={`px-3 py-1 text-sm rounded border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-100'}`}>Cancel</button>
                                  </div>
                                </div>
                              )}

                              {/* Replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-4 space-y-4 pl-2 border-l-2 border-gray-200">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className={`pl-4 py-2 ${reply.isSpam ? (theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50') : ''}`}>
                                      <div className="flex gap-3">
                                        {reply.author.avatar ? (
                                          <img src={reply.author.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                                        ) : (
                                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-neutral-200'}`}>
                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-neutral-700'}`}>{reply.author.name.charAt(0).toUpperCase()}</span>
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{reply.author.name}</span>
                                              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>· {getTimeAgo(reply.createdAt)}</span>
                                              {reply.isSpam && <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Spam</span>}
                                              {reply.isPinned && <span className="text-xs">📌</span>}
                                            </div>
                                            {!reply.isSpam && (
                                              <button onClick={() => handleDeleteComment(reply.id)} className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}>
                                                <Trash2 className="w-3 h-3 text-red-500" />
                                              </button>
                                            )}
                                          </div>
                                          {editingCommentId === reply.id ? (
                                            <div className="mt-2">
                                              <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                                                className={`w-full px-2 py-1 rounded text-sm border mb-2 ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`} rows={2} />
                                              <div className="flex gap-2">
                                                <button onClick={() => handleEditComment(reply.id)} className="px-2 py-1 bg-black text-white text-xs rounded hover:bg-gray-800">Save</button>
                                                <button onClick={() => setEditingCommentId(null)} className={`px-2 py-1 text-xs rounded border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-600' : 'border-gray-200 hover:bg-gray-100'}`}>Cancel</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                              <span dangerouslySetInnerHTML={{ __html: reply.content }} />
                                            </div>
                                          )}
                                          <div className="flex flex-wrap gap-2 text-xs mt-2">
                                            {reply.isSpam ? (
                                              <button onClick={() => handleMarkNotSpam(reply.id)} className="text-blue-600 hover:underline">Mark not spam</button>
                                            ) : (
                                              <>
                                                <button onClick={() => handleLikeComment(reply.id)} className={`flex items-center gap-1 ${likedCommentIds.has(reply.id) ? 'text-red-500' : theme === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                                  <Heart className="w-3 h-3" fill={likedCommentIds.has(reply.id) ? 'currentColor' : 'none'} /> {reply.likeCount}
                                                </button>
                                                <button onClick={() => { setEditingCommentId(reply.id); setEditText(reply.content); }} className={theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Edit</button>
                                                <button onClick={() => setReplyingToId(replyingToId === reply.id ? null : reply.id)} className={replyingToId === reply.id ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Reply</button>
                                              </>
                                            )}
                                          </div>
                                          {reply.isOfficial && <p className="text-xs text-green-600 mt-2 font-semibold">✓ Official Response</p>}
                                          {replyingToId === reply.id && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." rows={2}
                                                className={`w-full px-2 py-1 rounded text-sm border mb-2 ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`} />
                                              <div className="flex gap-2">
                                                <button onClick={() => handleReply(reply.id)} className="px-2 py-1 bg-black text-white text-xs rounded hover:bg-gray-800">Reply</button>
                                                <button onClick={() => { setReplyingToId(null); setReplyText(''); }} className={`px-2 py-1 text-xs rounded border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-600' : 'border-gray-200 hover:bg-gray-100'}`}>Cancel</button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
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

              {/* Type & Status */}
              <div className="flex gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(post?.type || '')}`}>
                  {post?.type?.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post?.status || '')}`}>
                  {post?.status?.replace(/_/g, ' ')}
                </span>
              </div>

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
                  {post?.tags && post.tags.length > 0 && post.tags.map((postTag) => (
                    <span
                      key={postTag.tag.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold group"
                      style={{
                        backgroundColor: postTag.tag.color + '20',
                        color: postTag.tag.color,
                        border: `1px solid ${postTag.tag.color}`,
                      }}
                    >
                      {postTag.tag.name}
                      <button
                        onClick={() => handleRemoveTag(postTag.tag.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Add tag button */}
                <div className="relative mt-2">
                  <button
                    onClick={() => {
                      if (showTagDropdown) {
                        setShowTagDropdown(false);
                      } else {
                        fetchAvailableTags();
                        setShowTagDropdown(true);
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add tag
                  </button>
                  {showTagDropdown && (
                    <div
                      className={`absolute left-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-20 py-1 ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {availableTags.length > 0 ? (
                        (() => {
                          const assignedIds = new Set(post?.tags?.map((t) => t.tag.id) || []);
                          const unassigned = availableTags.filter((t) => !assignedIds.has(t.id));
                          if (unassigned.length === 0) {
                            return (
                              <p className={`px-3 py-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                All tags assigned
                              </p>
                            );
                          }
                          return unassigned.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleAddTag(tag.id)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>
                                {tag.name}
                              </span>
                            </button>
                          ));
                        })()
                      ) : (
                        <button
                          onClick={() => { setShowTagDropdown(false); navigate('/admin/board-management'); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          No tags created — Go to Tags
                        </button>
                      )}
                    </div>
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

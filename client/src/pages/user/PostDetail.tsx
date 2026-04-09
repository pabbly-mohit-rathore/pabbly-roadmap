import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Trash2, Heart, X, Pin } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import toast from 'react-hot-toast';
import CommentEditor from '../../components/CommentEditor';
import useSocket from '../../hooks/useSocket';

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
  content?: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  author: { name: string };
  board: { name: string; id: string };
  tags?: { tag: Tag }[];
  isPinned: boolean;
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

export default function UserPostDetail() {
  const theme = useThemeStore((state) => state.theme);
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const { votes, init, toggle } = useVoteStore();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Real-time updates via Socket.io
  useSocket({
    postId: post?.id,
    onVoteUpdated: (data) => {
      if (post && data.postId === post.id) {
        setPost(prev => prev ? { ...prev, voteCount: data.voteCount } : prev);
        init(data.postId, data.voteCount, votes[data.postId]?.voted ?? false);
      }
    },
    onCommentAdded: () => {},
    onCommentUpdated: () => {},
    onCommentDeleted: () => {},
  });

  useEffect(() => {
    fetchPostAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated]);

  const fetchPostAndComments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/${slug}`);
      if (response.data.success) {
        const postData = response.data.data.post;
        setPost(postData);
        init(postData.id, postData.voteCount ?? 0, postData.hasVoted ?? false);
        // Comments come with the post response — no separate API call
        if (postData.comments) {
          setComments(postData.comments);
          if (currentUser) {
            const liked = new Set<string>();
            postData.comments.forEach((c: any) => {
              if (c.likes?.some((l: any) => l.userId === currentUser.id)) liked.add(c.id);
              c.replies?.forEach((r: any) => {
                if (r.likes?.some((l: any) => l.userId === currentUser.id)) liked.add(r.id);
              });
            });
            setLikedCommentIds(liked);
          }
        }
      }
    } catch {
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = () => fetchCommentsById(post?.id);

  const fetchCommentsById = async (id?: string) => {
    if (!id) return;
    try {
      const response = await api.get(`/comments/post/${id}`);
      if (response.data.success) {
        const commentsList = response.data.data.comments || [];
        setComments(commentsList);

        // Initialize liked comment IDs for comments + replies
        if (currentUser) {
          const liked = new Set<string>();
          commentsList.forEach((comment: Comment) => {
            if (comment.likes?.some((like: any) => like.userId === currentUser.id)) liked.add(comment.id);
            comment.replies?.forEach((reply: any) => {
              if (reply.likes?.some((like: any) => like.userId === currentUser.id)) liked.add(reply.id);
            });
          });
          setLikedCommentIds(liked);
        }
      }
    } catch {
      console.error('Error fetching comments');
    }
  };

  const handleVote = () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    if (!post) return;
    toggle(post.id);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
  };

  const handlePin = async () => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    try {
      const response = await api.put(`/posts/${post?.id}/pin`);
      if (response.data.success) {
        setPost(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null);
        toast.success(post?.isPinned ? 'Post unpinned' : 'Post pinned');
      }
    } catch {
      toast.error('Failed to pin post');
    }
  };

  const handleAddComment = async (htmlContent?: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

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
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

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

  const handleReply = async (parentId: string, htmlContent?: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const content = htmlContent || replyText;
    if (!content.trim() || content === '<p></p>') {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      const response = await api.post(`/comments/post/${post?.id}`, {
        content,
        parentId,
      });

      if (response.data.success) {
        setReplyText('');
        setReplyingToId(null);
        const newReply = response.data.data?.comment;
        if (newReply) {
          setComments(prev => prev.map(c =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), { ...newReply, replies: [], likeCount: newReply.likeCount || 0 }] }
              : c
          ));
        } else {
          fetchComments();
        }
        setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
        toast.success('Reply added');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add reply';
      console.error('Error adding reply:', msg);
      toast.error(msg);
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
      <UserLayout>
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
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className={`${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-8 items-start">
            {/* Main Content - Left */}
            <div className="col-span-2">
              {loading ? (
                <LoadingBar />
              ) : (
                <>
                  {/* Post Card */}
                  <div className={`rounded-xl border p-6 mb-8 ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
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
                            : theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title={post?.isPinned ? 'Unpin post' : 'Pin post'}
                      >
                        <Pin className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Rich Content */}
                    {post?.content && (
                      <div className={`border-t pt-5 mt-2 overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className={`tiptap-preview max-w-none ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
                          dangerouslySetInnerHTML={{ __html: post.content }} />
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className={`border-t pt-6 mt-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
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
                          <div key={comment.id} className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex gap-3">
                              {/* Avatar */}
                              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-bold">
                                {comment.author.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Name · Time */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{comment.author.name}</span>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>· {getTimeAgo(comment.createdAt)}</span>
                                    {comment.isOfficial && (
                                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                        Official
                                      </span>
                                    )}
                                  </div>
                                  {currentUser?.id === comment.author.id && (
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
                                    <div className="tiptap-preview" dangerouslySetInnerHTML={{ __html: comment.content }} />
                                  </div>
                                )}

                                {/* Comment Actions */}
                                <div className="flex flex-wrap gap-3 text-xs mt-2">
                                  <button onClick={() => handleLikeComment(comment.id)} className={`flex items-center gap-1 ${likedCommentIds.has(comment.id) ? 'text-red-500' : theme === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                    <Heart className="w-3.5 h-3.5" fill={likedCommentIds.has(comment.id) ? 'currentColor' : 'none'} /> {comment.likeCount}
                                  </button>

                                  {currentUser?.id === comment.author.id && (
                                    <button onClick={() => { setEditingCommentId(comment.id); setEditText(comment.content); }} className={theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Edit</button>
                                  )}

                                  <button onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)} className={replyingToId === comment.id ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Reply</button>
                                </div>

                                {/* Reply Form */}
                                {replyingToId === comment.id && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <CommentEditor
                                      onSubmit={(html) => handleReply(comment.id, html)}
                                      placeholder="Write a reply..."
                                      buttonLabel="Reply"
                                    />
                                  </div>
                                )}

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="mt-4 space-y-4 pl-2 border-l-2 border-gray-200">
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} className="pl-4 py-2">
                                        <div className="flex gap-3">
                                          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-bold">
                                            {reply.author.name.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{reply.author.name}</span>
                                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>· {getTimeAgo(reply.createdAt)}</span>
                                              </div>
                                              {currentUser?.id === reply.author.id && (
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
                                                <div className="tiptap-preview" dangerouslySetInnerHTML={{ __html: reply.content }} />
                                              </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 text-xs mt-2">
                                              <button onClick={() => handleLikeComment(reply.id)} className={`flex items-center gap-1 ${likedCommentIds.has(reply.id) ? 'text-red-500' : theme === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                                <Heart className="w-3 h-3" fill={likedCommentIds.has(reply.id) ? 'currentColor' : 'none'} /> {reply.likeCount}
                                              </button>

                                              {currentUser?.id === reply.author.id && (
                                                <button onClick={() => { setEditingCommentId(reply.id); setEditText(reply.content); }} className={theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Edit</button>
                                              )}

                                              <button onClick={() => setReplyingToId(replyingToId === reply.id ? null : reply.id)} className={replyingToId === reply.id ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>Reply</button>
                                            </div>
                                            {replyingToId === reply.id && (
                                              <div className="mt-3 pt-3 border-t border-gray-200">
                                                <CommentEditor
                                                  onSubmit={(html) => handleReply(comment.id, html)}
                                                  placeholder="Write a reply..."
                                                  buttonLabel="Reply"
                                                />
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
                  </div>
                </>
              )}
            </div>

            {/* Sidebar - Right */}
            <div>
              <div className={`rounded-xl border sticky top-24 overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
              }`}>
                {/* Header */}
                <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50/80'}`}>
                  <h3 className={`text-xs font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Post Details
                  </h3>
                </div>

                <div className="p-5 space-y-5">
                  {/* Type & Status Chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(post?.type || '')}`}>
                      {post?.type?.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post?.status || '')}`}>
                      {post?.status?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Board */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      {post?.board.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Board</p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post?.board.name}</p>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {post?.author.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Author</p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post?.author.name}</p>
                    </div>
                  </div>

                  {/* Created */}
                  <div className={`flex items-center justify-between py-3 border-t border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Created</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {post?.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </p>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {post?.tags && post.tags.length > 0 ? (
                        post.tags.map((postTag) => (
                          <span key={postTag.tag.id}
                            className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: postTag.tag.color + '20', color: postTag.tag.color, border: `1px solid ${postTag.tag.color}` }}>
                            {postTag.tag.name}
                          </span>
                        ))
                      ) : (
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No tags</p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post?.status || '')}`}>
                      {post?.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Required Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`max-w-md w-full rounded-2xl ${
              theme === 'dark'
                ? 'bg-gray-900'
                : 'bg-white'
            }`}>
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-6">
                  <X className="w-6 h-6 text-white" />
                </div>

                <h2 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Login Required
                </h2>

                <p className={`text-sm mb-8 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Sign in to vote or comment on this post
                </p>

                <button
                  onClick={() => {
                    localStorage.setItem('loginRedirect', window.location.pathname);
                    navigate('/login');
                  }}
                  className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-semibold mb-3"
                >
                  Sign In
                </button>

                <button
                  onClick={() => setShowLoginModal(false)}
                  className={`w-full px-4 py-3 rounded-lg border transition font-medium ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

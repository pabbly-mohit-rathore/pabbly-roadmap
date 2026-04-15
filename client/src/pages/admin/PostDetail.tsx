import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ArrowUpRight, Heart, MessageCircle, Activity, MoreHorizontal, Reply, X, Copy, Check } from 'lucide-react';
import StatusReasonDialog from '../../components/ui/StatusReasonDialog';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CommentEditor from '../../components/CommentEditor';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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
  isPinned: boolean;
  createdAt: string;
  author: { name: string; avatar?: string };
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
  const { isTeamAccess, accessLevel } = useTeamAccessStore();
  const isTeamManager = isTeamAccess && accessLevel === 'manager';
  const { votes, init, toggle } = useVoteStore();
  const { postId } = useParams<{ postId: string }>();
  const { state } = useLocation();

  const [post, setPost] = useState<Post | null>(state?.post || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(!post);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'activities'>('comments');
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  // Pending hold/live status change waiting on a reason from admin
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedCommentUser, setSelectedCommentUser] = useState<any>(null);
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activities, setActivities] = useState<Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    user: { id: string; name: string; avatar?: string };
    post?: { id: string; title: string; slug: string };
  }>>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);



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

  // Fetch post (comments come with it)
  useEffect(() => {
    if (postId && !post) fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);


  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/${postId}`);
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
      console.error('Error fetching post');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!post?.id) return;
    setActivitiesLoading(true);
    try {
      const response = await api.get('/activity-log', { params: { postId: post.id, limit: 100 } });
      if (response.data.success) {
        setActivities(response.data.data.activities || []);
      }
    } catch { console.error('Error fetching activities'); }
    finally { setActivitiesLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'activities' && post?.id && activities.length === 0) fetchActivities();
  }, [activeTab, post?.id]);

  const fetchComments = () => fetchCommentsById(post?.id || postId);

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
    if (!post) return;
    toggle(post.id);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
  };

  // Performs the actual status change + optional reason comment.
  // Optimistic update + instant toast so the UI feels snappy; reverts on failure.
  const applyStatusChange = async (newStatus: string, reason?: string) => {
    if (!post?.id) return;
    const postId = post.id;
    try {
      await api.put(`/posts/${postId}/status`, { status: newStatus });
      setPost((prev) => (prev ? { ...prev, status: newStatus } : null));
      if (reason) {
        const label = newStatus === 'hold' ? 'Status changed to On Hold' : 'Status changed to Live';
        const content = `<p><strong>${label}</strong></p>${reason}`;
        try {
          await api.post(`/comments/post/${postId}`, { content });
          fetchPost();
        } catch (err) {
          console.error('[status-reason-comment] failed', err);
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          toast.error(msg || 'Failed to post reason as comment');
        }
      }
      toast.success(reason
        ? `Status updated to ${newStatus === 'hold' ? 'On Hold' : 'Live'}`
        : 'Status updated');
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to change status');
    }
  };

  const handleChangeStatus = (newStatus: string) => {
    if (!post?.id || newStatus === post.status) return;
    // hold / live require a reason from admin — open dialog first
    if (newStatus === 'hold' || newStatus === 'live') {
      setPendingStatusChange(newStatus);
      return;
    }
    applyStatusChange(newStatus);
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
        // Add comment to state immediately, then sync with server
        const newComment = response.data.data?.comment;
        if (newComment) {
          setComments(prev => [...prev, { ...newComment, replies: [], likeCount: newComment.likeCount || 0 }]);
        } else {
          fetchComments();
        }
        toast.success('Comment added');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const [editingComment, setEditingComment] = useState(false);
  const handleEditComment = async (commentId: string, htmlContent?: string) => {
    const content = htmlContent || editText;
    if (!content.trim() || content === '<p></p>') {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setEditingComment(true);
      const response = await api.put(`/comments/${commentId}`, { content });

      if (response.data.success) {
        setEditingCommentId(null);
        setEditText('');
        fetchComments();
        toast.success('Comment updated');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Failed to edit comment');
    } finally {
      setEditingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentConfirm) return;
    const commentId = deleteCommentConfirm;
    try {
      setDeleteCommentConfirm(null);
      const response = await api.delete(`/comments/${commentId}`);
      if (response.data.success) {
        setComments((prev) => prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({ ...c, replies: c.replies ? c.replies.filter((r: { id: string }) => r.id !== commentId) : c.replies }))
        );
        setPost((prev) =>
          prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null
        );
        toast.success('Comment deleted');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    // Optimistic update
    const wasLiked = likedCommentIds.has(commentId);
    const newLiked = new Set(likedCommentIds);
    if (wasLiked) newLiked.delete(commentId); else newLiked.add(commentId);
    setLikedCommentIds(newLiked);

    // Optimistic count update in comments
    const updateLikeCount = (cmts: typeof comments): typeof comments =>
      cmts.map(c => ({
        ...c,
        likeCount: c.id === commentId ? c.likeCount + (wasLiked ? -1 : 1) : c.likeCount,
        replies: c.replies ? updateLikeCount(c.replies) : c.replies,
      }));
    setComments(prev => updateLikeCount(prev));

    try {
      await api.post(`/comments/${commentId}/like`);
    } catch {
      // Revert on error
      const revertLiked = new Set(likedCommentIds);
      if (wasLiked) revertLiked.add(commentId); else revertLiked.delete(commentId);
      setLikedCommentIds(revertLiked);
      fetchComments();
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

  const handleReply = async (parentId: string, htmlContent?: string) => {
    let content = htmlContent || replyText;
    if (!content.trim() || content === '<p></p>') {
      toast.error('Reply cannot be empty');
      return;
    }
    // Prepend @mention if replying to someone
    if (replyingToName) {
      content = content.replace(/^<p>/, `<p><span class="mention-tag">@${replyingToName}</span> `);
    }

    try {
      setSubmittingReply(true);
      const response = await api.post(`/comments/post/${post?.id}`, {
        content,
        parentId,
      });

      if (response.data.success) {
        setReplyText('');
        setReplyingToId(null);
        setReplyingToName(null);
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
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUserClick = async (userId: string) => {
    setUserDrawerOpen(true);
    setSelectedCommentUser(null);
    setUserDetailLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      if (res.data.success) setSelectedCommentUser(res.data.data.user);
    } catch { /* silent */ }
    finally { setUserDetailLoading(false); }
  };

  const closeUserDrawer = () => {
    setUserDrawerOpen(false);
    setTimeout(() => { setSelectedCommentUser(null); }, 300);
  };

  const handleCopyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
      <div className="mx-auto px-4 py-6" style={{ maxWidth: 'calc(100% - 207px)' }}>
        <div className="grid grid-cols-[1fr_340px] gap-4 items-start">
          {/* Main Content */}
          <div>
            {loading ? (
              <LoadingBar />
            ) : (
              <>
                {/* Post Card */}
                <div className={`rounded-t-xl border border-b-0 p-6 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {post?.title}
                    </h1>
                    <div
                      onClick={handleVote}
                      className="inline-flex flex-row items-center justify-center rounded-lg border font-bold transition-all cursor-pointer overflow-hidden flex-shrink-0"
                      style={{
                        padding: '8px 14px',
                        fontSize: '13px',
                        gap: '6px',
                        backgroundColor: 'transparent',
                        borderColor: votes[post!.id]?.voted ? '#059669' : (theme === 'dark' ? '#4b5563' : '#e5e7eb'),
                        color: votes[post!.id]?.voted ? '#059669' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                      }}
                      onMouseEnter={e => { if (!votes[post!.id]?.voted) e.currentTarget.style.borderColor = '#059669'; }}
                      onMouseLeave={e => { if (!votes[post!.id]?.voted) e.currentTarget.style.borderColor = theme === 'dark' ? '#4b5563' : '#e5e7eb'; }}
                    >
                      <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />
                      <span style={{ animation: animating ? 'slideUpCount 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', display: 'block' }}>
                        {votes[post!.id]?.count ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Rich Content */}
                  {post?.content && (
                    <div className={`mt-4 overflow-hidden`}>
                      <div className={`tiptap-preview max-w-none ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
                        dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>
                  )}

                </div>
                {/* Post Card ends above */}

                {/* Comments & Activities Container */}
                <div className={`rounded-b-xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-[#fafafa] border-gray-200'}`}>
                  <div className={`flex items-center gap-6 px-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <button onClick={() => setActiveTab('comments')}
                      className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === 'comments'
                          ? `${theme === 'dark' ? 'text-white border-white' : 'text-gray-900 border-gray-900'}`
                          : `border-transparent ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                      }`}>
                      <MessageCircle className="w-4 h-4" /> Comments{post?.commentCount ? ` (${post.commentCount})` : ''}
                    </button>
                    <button onClick={() => setActiveTab('activities')}
                      className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === 'activities'
                          ? `${theme === 'dark' ? 'text-white border-white' : 'text-gray-900 border-gray-900'}`
                          : `border-transparent ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                      }`}>
                      <Activity className="w-4 h-4" /> Activities
                    </button>
                  </div>

                  {activeTab === 'comments' ? (
                  <div className="px-6 pt-6 pb-6">
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
                      comments.map((comment) => {
                        const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                        const avatarUrl = comment.author.avatar ? (comment.author.avatar.startsWith('http') ? comment.author.avatar : `${API_BASE}${comment.author.avatar}`) : null;
                        return (
                        <div key={comment.id} className={`rounded-xl p-4 ${comment.isSpam ? (theme === 'dark' ? 'bg-red-900/10 border border-red-800' : 'bg-red-50 border border-red-200') : (theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm')}`}>
                          <div className="flex gap-3">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-emerald-600 text-white'}`}>
                                {comment.author.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span onClick={() => handleUserClick(comment.author.id)} className={`font-semibold text-sm cursor-pointer hover:underline ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{comment.author.name}</span>
                                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{getTimeAgo(comment.createdAt)}</span>
                                  {comment.isSpam && <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Spam</span>}
                                </div>
                                {!comment.isSpam && (
                                  <div className="relative">
                                    <button onClick={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                                      className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {commentMenuId === comment.id && (
                                      <div className={`absolute right-0 top-full mt-1 rounded-lg border shadow-lg z-50 p-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} style={{ minWidth: '130px' }}>
                                        <button onClick={() => { setEditingCommentId(comment.id); setCommentMenuId(null); }}
                                          className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}>Edit</button>
                                        {!isTeamManager && (
                                        <button onClick={() => { setDeleteCommentConfirm(comment.id); setCommentMenuId(null); }}
                                          className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>Delete</button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="mt-2">
                                  <CommentEditor onSubmit={(html) => handleEditComment(comment.id, html)} placeholder="Edit comment..." buttonLabel="Save" submitting={editingComment} initialContent={comment.content} />
                                  <button onClick={() => setEditingCommentId(null)} className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>Cancel</button>
                                </div>
                              ) : (
                                <div className={`mt-1 text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <div className="tiptap-preview" dangerouslySetInnerHTML={{ __html: comment.content }} />
                                </div>
                              )}
                              {!comment.isSpam && (
                                <div className="flex items-center gap-4 mt-2">
                                  <button onClick={() => handleLikeComment(comment.id)}
                                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${likedCommentIds.has(comment.id) ? 'text-red-500' : theme === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                    <Heart className="w-3.5 h-3.5" fill={likedCommentIds.has(comment.id) ? 'currentColor' : 'none'} /> {comment.likeCount || ''}
                                  </button>
                                  <button onClick={() => { setReplyingToId(replyingToId === comment.id ? null : comment.id); setReplyingToName(replyingToId === comment.id ? null : comment.author.name); }}
                                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${replyingToId === comment.id ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                    <Reply className="w-3.5 h-3.5" /> Reply
                                  </button>
                                </div>
                              )}
                              {comment.isSpam && <button onClick={() => handleMarkNotSpam(comment.id)} className="text-xs text-blue-600 hover:underline mt-2">Mark not spam</button>}
                              {comment.isOfficial && <p className="text-xs text-green-600 mt-2 font-semibold">Official Response</p>}

                              {replyingToId === comment.id && (
                                <div className="mt-3">
                                  <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Replying to <span className="text-[#0c68e9] font-semibold">@{comment.author.name}</span></p>
                                  <CommentEditor onSubmit={(html) => handleReply(comment.id, html)} placeholder={`Reply to @${comment.author.name}...`} buttonLabel="Reply" submitting={submittingReply} compact />
                                </div>
                              )}

                              {/* Replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 space-y-3">
                                  {comment.replies.map((reply) => {
                                    const rAvatarUrl = reply.author.avatar ? (reply.author.avatar.startsWith('http') ? reply.author.avatar : `${API_BASE}${reply.author.avatar}`) : null;
                                    return (
                                    <div key={reply.id} className={`pl-4 py-3 border-l-[3px] ${reply.isSpam ? (theme === 'dark' ? 'bg-red-900/10 border-l-red-500' : 'bg-red-50 border-l-red-400') : (theme === 'dark' ? 'border-l-emerald-600' : 'border-l-emerald-500')}`}>
                                      <div className="flex gap-3">
                                        {rAvatarUrl ? (
                                          <img src={rAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-emerald-600 text-white'}`}>
                                            {reply.author.name.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span onClick={() => handleUserClick(reply.author.id)} className={`font-semibold text-sm cursor-pointer hover:underline ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{reply.author.name}</span>
                                              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{getTimeAgo(reply.createdAt)}</span>
                                            </div>
                                            {!reply.isSpam && (
                                              <div className="relative">
                                                <button onClick={() => setCommentMenuId(commentMenuId === reply.id ? null : reply.id)}
                                                  className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
                                                {commentMenuId === reply.id && (
                                                  <div className={`absolute right-0 top-full mt-1 rounded-lg border shadow-lg z-50 p-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} style={{ minWidth: '130px' }}>
                                                    <button onClick={() => { setEditingCommentId(reply.id); setCommentMenuId(null); }}
                                                      className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}>Edit</button>
                                                    {!isTeamManager && (
                                                    <button onClick={() => { setDeleteCommentConfirm(reply.id); setCommentMenuId(null); }}
                                                      className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>Delete</button>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {editingCommentId === reply.id ? (
                                            <div className="mt-2">
                                              <CommentEditor onSubmit={(html) => handleEditComment(reply.id, html)} placeholder="Edit reply..." buttonLabel="Save" submitting={editingComment} initialContent={reply.content} compact />
                                              <button onClick={() => setEditingCommentId(null)} className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Cancel</button>
                                            </div>
                                          ) : (
                                            <div className={`mt-1 text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                              <div className="tiptap-preview" dangerouslySetInnerHTML={{ __html: reply.content }} />
                                            </div>
                                          )}
                                          {!reply.isSpam && (
                                            <div className="flex items-center gap-4 mt-2">
                                              <button onClick={() => handleLikeComment(reply.id)}
                                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${likedCommentIds.has(reply.id) ? 'text-red-500' : theme === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                                <Heart className="w-3 h-3" fill={likedCommentIds.has(reply.id) ? 'currentColor' : 'none'} /> {reply.likeCount || ''}
                                              </button>
                                              <button onClick={() => { setReplyingToId(replyingToId === reply.id ? null : reply.id); setReplyingToName(replyingToId === reply.id ? null : reply.author.name); }}
                                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${replyingToId === reply.id ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                                <Reply className="w-3 h-3" /> Reply
                                              </button>
                                            </div>
                                          )}
                                          {reply.isSpam && <button onClick={() => handleMarkNotSpam(reply.id)} className="text-xs text-blue-600 hover:underline mt-2">Mark not spam</button>}
                                          {reply.isOfficial && <p className="text-xs text-green-600 mt-2 font-semibold">Official Response</p>}
                                          {replyingToId === reply.id && (
                                            <div className="mt-3">
                                              <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Replying to <span className="text-[#0c68e9] font-semibold">@{reply.author.name}</span></p>
                                              <CommentEditor onSubmit={(html) => handleReply(comment.id, html)} placeholder={`Reply to @${reply.author.name}...`} buttonLabel="Reply" submitting={submittingReply} compact />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        <p className="text-sm">No comments yet. Be the first to comment</p>
                      </div>
                    )}
                  </div>
                  {commentMenuId && <div className="fixed inset-0 z-40" onClick={() => setCommentMenuId(null)} />}
                  </div>
                  ) : (
                  /* Activities Tab */
                  <div className="px-6 pt-6 pb-6">
                    {activitiesLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#0c68e9] rounded-full animate-spin" />
                      </div>
                    ) : activities.length > 0 ? (
                      <div className="space-y-0">
                        {(() => {
                          let lastDate = '';
                          return activities.map((act) => {
                            const dateStr = new Date(act.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const showDate = dateStr !== lastDate;
                            lastDate = dateStr;

                            const iconMap: Record<string, { icon: string; color: string }> = {
                              created: { icon: '◉', color: 'text-green-500' },
                              commented: { icon: '○', color: theme === 'dark' ? 'text-gray-500' : 'text-gray-400' },
                              voted: { icon: '▲', color: 'text-blue-500' },
                              updated: { icon: '◎', color: 'text-amber-500' },
                              status_changed: { icon: '◉', color: 'text-purple-500' },
                              merged: { icon: '⇄', color: 'text-indigo-500' },
                              deleted: { icon: '✕', color: 'text-red-500' },
                            };
                            const ic = iconMap[act.action] || { icon: '○', color: theme === 'dark' ? 'text-gray-500' : 'text-gray-400' };
                            const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

                            return (
                              <div key={act.id}>
                                {showDate && (
                                  <p className={`text-xs font-semibold pt-4 pb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{dateStr}</p>
                                )}
                                <div className="flex items-start gap-3 py-2.5">
                                  <span className={`text-sm mt-0.5 ${ic.color}`}>{ic.icon}</span>
                                  {act.user.avatar ? (
                                    <img src={act.user.avatar.startsWith('http') ? act.user.avatar : `${API_BASE}${act.user.avatar}`}
                                      alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                      {act.user.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                      <span className="font-semibold">{act.user.name}</span>
                                      {' '}<span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{act.description}</span>
                                    </p>
                                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>{getTimeAgo(act.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className={`text-center py-12 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No activities yet</p>
                    )}
                  </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar - Right */}
          <div className="sticky top-10 space-y-4">
            {/* Post Details Card */}
            <div
              className={`rounded-xl border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700/60'
                  : 'bg-white border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              }`}
            >
              <div className="p-5 space-y-5">
                {/* Created */}
                <div className={`flex items-center justify-between pb-3 -mx-5 px-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Post Created</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {post?.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </p>
                </div>

                {/* Status Selector */}
                <div>
                  <CustomDropdown
                    label="Status"
                    value={post?.status || 'open'}
                    options={[
                      { value: 'open', label: 'Open' },
                      { value: 'under_review', label: 'Under Review' },
                      { value: 'planned', label: 'Planned' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'live', label: 'Live' },
                      { value: 'hold', label: 'Hold' },
                    ]}
                    onChange={(v) => handleChangeStatus(v)}
                    minWidth="100%"
                  />
                </div>

                {/* Board */}
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    {post?.board.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Board</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post?.board.name}</p>
                  </div>
                </div>

                {/* Type */}
                {(() => {
                  const typeChipStyles: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
                    feature:     { bg: 'bg-blue-100',   text: 'text-blue-700',   darkBg: 'bg-blue-900/40',   darkText: 'text-blue-300' },
                    bug:         { bg: 'bg-red-100',    text: 'text-red-700',    darkBg: 'bg-red-900/40',    darkText: 'text-red-300' },
                    improvement: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/40', darkText: 'text-orange-300' },
                    integration: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/40', darkText: 'text-purple-300' },
                  };
                  const ts = typeChipStyles[post?.type || ''] || typeChipStyles.feature;
                  return (
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${theme === 'dark' ? `${ts.darkBg} ${ts.darkText}` : `${ts.bg} ${ts.text}`}`}>
                        {post?.type?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Type</p>
                        <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${theme === 'dark' ? `${ts.darkBg} ${ts.darkText}` : `${ts.bg} ${ts.text}`}`}>
                          {post?.type}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Status */}
                {(() => {
                  const statusChipStyles: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
                    open:         { bg: 'bg-blue-100',    text: 'text-blue-700',    darkBg: 'bg-blue-900/40',    darkText: 'text-blue-300' },
                    under_review: { bg: 'bg-yellow-100',  text: 'text-yellow-700',  darkBg: 'bg-yellow-900/40',  darkText: 'text-yellow-300' },
                    planned:      { bg: 'bg-purple-100',  text: 'text-purple-700',  darkBg: 'bg-purple-900/40',  darkText: 'text-purple-300' },
                    in_progress:  { bg: 'bg-orange-100',  text: 'text-orange-700',  darkBg: 'bg-orange-900/40',  darkText: 'text-orange-300' },
                    live:         { bg: 'bg-green-100',   text: 'text-green-700',   darkBg: 'bg-green-900/40',   darkText: 'text-green-300' },
                    closed:       { bg: 'bg-gray-100',    text: 'text-gray-700',    darkBg: 'bg-gray-700/60',    darkText: 'text-gray-300' },
                    hold:         { bg: 'bg-red-100',     text: 'text-red-700',     darkBg: 'bg-red-900/40',     darkText: 'text-red-300' },
                  };
                  const ss = statusChipStyles[post?.status || ''] || statusChipStyles.open;
                  return (
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${theme === 'dark' ? `${ss.darkBg} ${ss.darkText}` : `${ss.bg} ${ss.text}`}`}>
                        {post?.status?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                        <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${theme === 'dark' ? `${ss.darkBg} ${ss.darkText}` : `${ss.bg} ${ss.text}`}`}>
                          {post?.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Author */}
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                  {(() => {
                    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                    const av = post?.author.avatar;
                    const url = av ? (av.startsWith('http') ? av : `${API_BASE}${av}`) : null;
                    return url ? (
                      <img src={url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {post?.author.name?.[0]?.toUpperCase()}
                      </div>
                    );
                  })()}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Author</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post?.author.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Drawer */}
      {userDrawerOpen && (() => {
        const d = theme === 'dark';
        const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const av = selectedCommentUser?.avatar;
        const avatarSrc = av ? (av.startsWith('http') ? av : `${API_BASE}${av}`) : null;
        return (
        <>
          <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${userDrawerOpen ? 'bg-black/20 opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeUserDrawer} />
          <div
            className={`fixed top-16 right-0 z-50 h-[calc(100vh-64px)] w-[380px] border-l shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${userDrawerOpen ? 'translate-x-0' : 'translate-x-full'} ${d ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
          >
            {/* Close */}
            <button onClick={closeUserDrawer}
              className={`absolute top-5 right-5 p-1.5 rounded-full transition z-10 ${d ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X className="w-5 h-5" />
            </button>

            {userDetailLoading || !selectedCommentUser ? (
              /* Loading skeleton */
              <div className="flex flex-col items-center pt-8 pb-6 px-6 animate-pulse">
                <div className={`w-20 h-20 rounded-full ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-5 w-32 rounded mt-4 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-4 w-48 rounded mt-2 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-3 w-20 rounded mt-3 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`w-full h-16 rounded-xl mt-6 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`w-full h-14 rounded-lg mt-4 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`w-full h-14 rounded-lg mt-3 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`w-full h-14 rounded-lg mt-3 ${d ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </div>
            ) : (
            <>
            {/* Header with avatar */}
            <div className="flex flex-col items-center pt-8 pb-6 px-6">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-lg" style={d ? { '--tw-ring-color': '#1f2937' } as React.CSSProperties : {}} />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold ring-4 shadow-lg" style={{ '--tw-ring-color': d ? '#1f2937' : '#fff' } as React.CSSProperties}>
                  {selectedCommentUser.name?.[0]?.toUpperCase()}
                </div>
              )}
              <h2 className={`text-lg font-bold mt-4 ${d ? 'text-white' : 'text-gray-900'}`}>{selectedCommentUser.name}</h2>
              <p className={`text-sm mt-0.5 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{selectedCommentUser.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`w-2 h-2 rounded-full ${selectedCommentUser.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-xs font-medium ${selectedCommentUser.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedCommentUser.isActive ? 'Active' : 'Banned'}
                </span>
                <span className={`mx-1 text-xs ${d ? 'text-gray-600' : 'text-gray-300'}`}>|</span>
                <span className={`text-xs font-medium capitalize ${d ? 'text-gray-400' : 'text-gray-500'}`}>{selectedCommentUser.role}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className={`mx-6 rounded-xl border grid grid-cols-3 divide-x ${d ? 'bg-gray-800/50 border-gray-700 divide-gray-700' : 'bg-gray-50 border-gray-100 divide-gray-100'}`}>
              {[
                { label: 'Posts', value: selectedCommentUser._count?.posts ?? 0 },
                { label: 'Votes', value: selectedCommentUser._count?.votes ?? 0 },
                { label: 'Comments', value: selectedCommentUser._count?.comments ?? 0 },
              ].map(s => (
                <div key={s.label} className="py-3 text-center">
                  <p className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
                  <p className={`text-[11px] font-medium mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="px-6 pt-6 pb-4 space-y-3">
              {/* Email Card */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${d ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${d ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                  @
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-gray-900'}`}>{selectedCommentUser.email}</span>
                    <button onClick={() => handleCopyField(selectedCommentUser.email, 'email')}
                      className={`p-0.5 rounded transition shrink-0 ${copiedField === 'email' ? 'text-green-600' : d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* User ID Card */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${d ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${d ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
                  #
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-600'}`}>User ID</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium font-mono truncate ${d ? 'text-white' : 'text-gray-900'}`}>{selectedCommentUser.id}</span>
                    <button onClick={() => handleCopyField(selectedCommentUser.id, 'id')}
                      className={`p-0.5 rounded transition shrink-0 ${copiedField === 'id' ? 'text-green-600' : d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                      {copiedField === 'id' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Joined Card */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${d ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/60 border-gray-100'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${d ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-600'}`}>
                  J
                </div>
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-600'}`}>Joined</p>
                  <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedCommentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        </>
        );
      })()}

      <ConfirmDialog
        open={!!deleteCommentConfirm}
        title="Do you really want to delete this comment?"
        message="This comment will be permanently deleted. This action cannot be undone."
        onConfirm={handleDeleteComment}
        onCancel={() => setDeleteCommentConfirm(null)}
      />

      <StatusReasonDialog
        open={!!pendingStatusChange}
        status={pendingStatusChange === 'hold' ? 'hold' : pendingStatusChange === 'live' ? 'live' : null}
        loading={statusSaving}
        onConfirm={async (reason) => {
          if (!pendingStatusChange) return;
          setStatusSaving(true);
          await applyStatusChange(pendingStatusChange, reason);
          setStatusSaving(false);
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}

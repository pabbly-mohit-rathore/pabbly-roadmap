import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import useThemeStore from '../store/themeStore';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  author: { name: string };
  boardId: string;
  board?: { name: string; slug: string };
}

interface Comment {
  id: string;
  content: string;
  author: { name: string };
  createdAt: string;
}

export default function PostDetailPage() {
  const theme = useThemeStore((state) => state.theme);
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVoted, setIsVoted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      if (!slug) return;
      const response = await api.get(`/posts/${slug}`);
      if (response.data.success) {
        setPost(response.data.data.post);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Post not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchComments = useCallback(async () => {
    try {
      if (!slug) return;
      const response = await api.get(`/posts/${slug}/comments`);
      if (response.data.success) {
        setComments(response.data.data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [slug]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleVote = async () => {
    try {
      if (isVoted) {
        await api.delete(`/votes/${post?.id}`);
        setIsVoted(false);
      } else {
        await api.post(`/votes/${post?.id}`);
        setIsVoted(true);
      }
      fetchPost();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await api.post(`/posts/${post?.id}/comments`, {
        content: commentText,
      });

      if (response.data.success) {
        setCommentText('');
        fetchComments();
        toast.success('Comment added!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
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

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">Loading post...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className={`text-center p-8 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}>
            Post not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Post Header */}
        <div className={`p-6 rounded-lg border mb-6 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="mb-4">
            <h1 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {post.title}
            </h1>
            <p className={`text-base leading-relaxed ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {post.description}
            </p>
          </div>

          {/* Tags & Status */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(post.type)}`}>
              {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post.status)}`}>
              {post.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Meta Info */}
          <div className={`flex items-center justify-between text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          } pb-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex gap-6">
              <span>by {post.author.name}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              {post.board && (
                <a
                  href={`/board/${post.board.slug}`}
                  className={`hover:underline ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  {post.board.name}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6 mt-6 pt-6">
            <button
              onClick={handleVote}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                isVoted
                  ? 'bg-black text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Upvote ({post.voteCount})
            </button>
            <span className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              💬 {comments.length} comments
            </span>
          </div>
        </div>

        {/* Comments Section */}
        <div className={`p-6 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Comments
          </h2>

          {/* Add Comment */}
          <div className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              className={`w-full px-4 py-3 rounded-lg border mb-3 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 placeholder-gray-400'
              }`}
              rows={4}
            />
            <button
              onClick={handleAddComment}
              disabled={submittingComment}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
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
                  className={`p-4 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {comment.author.name}
                    </span>
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {comment.content}
                  </p>
                </div>
              ))
            ) : (
              <p className={`text-center py-6 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

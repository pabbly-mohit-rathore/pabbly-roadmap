import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, ThumbsUp, MoreVertical } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
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
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  author: { id: string; name: string };
  tags: { tag: Tag }[];
}

interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
}

export default function UserBoardDetail() {
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [votedPostIds, setVotedPostIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    tagIds: [] as string[],
  });

  const fetchBoard = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        const found = response.data.data.boards.find((b: Board) => b.id === boardId);
        setBoard(found || null);
      }
    } catch (error) {
      console.error('Error fetching board:', error);
      toast.error('Failed to load board');
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts', { params: { boardId } });
      if (response.data.success) {
        setPosts(response.data.data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get(`/tags`, { params: { boardId } });
      if (response.data.success) {
        setTags(response.data.data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchPosts();
    fetchTags();
  }, [boardId]);

  const handleCreatePost = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (formData.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    try {
      const response = await api.post('/posts', {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        boardId,
        tagIds: formData.tagIds,
      });

      if (response.data.success) {
        toast.success('Post created successfully');
        setShowCreateModal(false);
        setFormData({ title: '', description: '', type: 'feature', tagIds: [] });
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await api.delete(`/posts/${postId}`);
      if (response.data.success) {
        toast.success('Post deleted');
        fetchPosts();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleVote = async (postId: string) => {
    try {
      const isVoted = votedPostIds.has(postId);

      if (isVoted) {
        await api.delete(`/votes/${postId}`);
        setVotedPostIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await api.post(`/votes/${postId}`);
        setVotedPostIds((prev) => new Set(prev).add(postId));
      }

      fetchPosts();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
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

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              {/* Board color indicator dot + name */}
              <div className="flex items-center gap-3 mb-1">
                {board && (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: board.color }}
                  />
                )}
                <h1
                  className={`text-4xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {board?.name || 'Loading...'}
                </h1>
              </div>
              {board?.description && (
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {board.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </div>
        </div>

        {/* Posts Table */}
        {loading ? (
          <div className="text-center py-8">Loading posts...</div>
        ) : (
          <div
            className={`rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
            style={{ overflow: 'visible' }}
          >
            <div style={{ overflow: 'visible' }}>
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Upvote
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Comments
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <tr
                        key={post.id}
                        onClick={() => navigate(`/user/posts/${post.slug}`, { state: { post } })}
                        className={`border-t cursor-pointer ${
                          theme === 'dark'
                            ? 'border-gray-700 hover:bg-gray-700'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleVote(post.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium ${
                              votedPostIds.has(post.id)
                                ? 'bg-black text-white'
                                : theme === 'dark'
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{post.voteCount}</span>
                          </button>
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {post.title}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                              post.type
                            )}`}
                          >
                            {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {post.tags && post.tags.length > 0 ? (
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
                              <span className={`text-xs ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                No tags
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              post.status
                            )}`}
                          >
                            {post.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === 'dark'
                              ? 'text-gray-400'
                              : 'text-gray-600'
                          }`}
                        >
                          {post.commentCount} 💬
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === 'dark'
                              ? 'text-gray-400'
                              : 'text-gray-600'
                          }`}
                        >
                          {new Date(post.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-gray-600'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuId === post.id && (
                              <div
                                className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-2xl z-[9999] ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 border border-gray-600'
                                    : 'bg-white border border-gray-200'
                                }`}
                              >
                                {user?.id === post.author.id && (
                                  <button
                                    onClick={() => {
                                      handleDeletePost(post.id);
                                      setOpenMenuId(null);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors text-red-500 ${
                                      theme === 'dark'
                                        ? 'hover:bg-gray-600'
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    Delete Post
                                  </button>
                                )}
                                {user?.id !== post.author.id && (
                                  <div className={`px-4 py-2 text-sm ${
                                    theme === 'dark'
                                      ? 'text-gray-400'
                                      : 'text-gray-500'
                                  }`}>
                                    No actions available
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className={`px-6 py-8 text-center text-sm ${
                          theme === 'dark'
                            ? 'text-gray-400'
                            : 'text-gray-500'
                        }`}
                      >
                        No posts for this board yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
              className={`rounded-lg p-6 w-full max-w-md ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2
                  className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Create Post in {board?.name}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`p-1 rounded-lg ${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200'
                    }`}
                    placeholder="Post title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Description *{' '}
                    <span className="text-xs font-normal text-gray-400">
                      (min 10 chars)
                    </span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200'
                    }`}
                    rows={4}
                    placeholder="Describe the post in detail..."
                  />
                </div>

                {/* Type */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="improvement">Improvement</option>
                    <option value="integration">Integration</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                    }`}
                  >
                    Tags
                  </label>
                  <div className={`space-y-2 max-h-40 overflow-y-auto p-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.tagIds.includes(tag.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  tagIds: [...formData.tagIds, tag.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  tagIds: formData.tagIds.filter(id => id !== tag.id),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className={`text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {tag.name}
                            </span>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        No tags available
                      </p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Create Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

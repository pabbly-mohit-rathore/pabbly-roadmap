import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, ThumbsUp, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
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
  createdAt: string;
  author: { name: string };
  tags: { tag: Tag }[];
}

interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
}

interface Manager {
  userId: string;
  user: { name: string; email: string };
  canEditPost: boolean;
  canDeletePost: boolean;
  canEditComment: boolean;
  canDeleteComment: boolean;
}

export default function AdminBoardDetail() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [votedPostIds, setVotedPostIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    tagIds: [] as string[],
  });

  const [editFormData, setEditFormData] = useState({
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

  const fetchManagers = async () => {
    try {
      const response = await api.get(`/boards/${boardId}/members`);
      if (response.data.success) {
        setManagers(response.data.data.members);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get(`/tags`, { params: { boardId } });
      console.log('Tags response:', response.data);
      if (response.data.success) {
        setTags(response.data.data.tags || []);
        console.log('Tags loaded:', response.data.data.tags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to load tags');
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchPosts();
    fetchManagers();
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

  const handleOpenEditModal = async (post: Post) => {
    setEditingPostId(post.id);
    setEditFormData({
      title: post.title,
      description: post.description,
      type: post.type,
      tagIds: post.tags?.map(t => t.tag.id) || [],
    });
    // Refresh tags to ensure latest tags are available
    await fetchTags();
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleEditPost = async () => {
    if (!editFormData.title.trim() || !editFormData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (editFormData.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    try {
      const response = await api.put(`/posts/${editingPostId}`, {
        title: editFormData.title,
        description: editFormData.description,
        type: editFormData.type,
        tagIds: editFormData.tagIds,
      });

      if (response.data.success) {
        toast.success('Post updated successfully');
        setShowEditModal(false);
        setEditingPostId(null);
        setEditFormData({ title: '', description: '', type: 'feature', tagIds: [] });
        fetchPosts();
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleVote = async (postId: string) => {
    try {
      const isVoted = votedPostIds.has(postId);

      if (isVoted) {
        // Remove vote
        await api.delete(`/votes/${postId}`);
        setVotedPostIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        // Add vote
        await api.post(`/votes/${postId}`);
        setVotedPostIds((prev) => new Set(prev).add(postId));
      }

      // Refresh posts to update vote count
      fetchPosts();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleChangeStatus = async (postId: string, newStatus: string) => {
    try {
      const response = await api.put(`/posts/${postId}/status`, { status: newStatus });
      if (response.data.success) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to update status');
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

  const totalPages = Math.ceil(posts.length / rowsPerPage);
  const paginatedPosts = posts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Upvote
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Comments
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedPosts.length > 0 ? (
                paginatedPosts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => navigate(`/admin/posts/${post.slug}`)}
                    className={`border-t cursor-pointer ${
                      theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
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
                      className={`px-4 py-3.5 text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {post.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                          post.type
                        )}`}
                      >
                        {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={post.status}
                        onChange={(e) =>
                          handleChangeStatus(post.id, e.target.value)
                        }
                        className={`px-3 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${getStatusColor(
                          post.status
                        )}`}
                      >
                        <option value="open">Open</option>
                        <option value="under_review">Under Review</option>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="live">Live</option>
                        <option value="closed">Closed</option>
                        <option value="hold">Hold</option>
                      </select>
                    </td>
                    <td
                      className={`px-4 py-3.5 text-sm ${
                        theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }`}
                    >
                      {post.commentCount} 💬
                    </td>
                    <td
                      className={`px-4 py-3.5 text-sm ${
                        theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }`}
                    >
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
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
                            <button
                              onClick={() => handleOpenEditModal(post)}
                              className={`w-full px-4 py-2 text-left text-sm rounded-t-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-gray-600 text-gray-300'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              Edit Post
                            </button>
                            <button
                              onClick={() => {
                                handleDeletePost(post.id);
                                setOpenMenuId(null);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm rounded-b-lg transition-colors text-red-500 ${
                                theme === 'dark'
                                  ? 'hover:bg-gray-600'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              Delete Post
                            </button>
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

          {/* Pagination */}
          {posts.length > 0 && (
            <div
              className={`flex items-center justify-between px-4 py-3 border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Rows per page:
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                  className={`text-sm border rounded px-2 py-1 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, posts.length)} of {posts.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className={`p-1.5 rounded transition-colors ${
                      page === 0
                        ? 'opacity-40 cursor-not-allowed'
                        : theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className={`p-1.5 rounded transition-colors ${
                      page >= totalPages - 1
                        ? 'opacity-40 cursor-not-allowed'
                        : theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
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

      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`rounded-lg p-6 w-full max-w-md ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Edit Post
                </h2>
                <p
                  className={`text-xs ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  Board: {board?.name}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
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
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
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
                  value={editFormData.type}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, type: e.target.value })
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
                          checked={editFormData.tagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({
                                ...editFormData,
                                tagIds: [...editFormData.tagIds, tag.id],
                              });
                            } else {
                              setEditFormData({
                                ...editFormData,
                                tagIds: editFormData.tagIds.filter(id => id !== tag.id),
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
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditPost}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Update Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

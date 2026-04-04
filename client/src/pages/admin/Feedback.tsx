import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Edit2, Pin, Trash2, Search, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  priority: string;
  priorityScore: number;
  createdAt: string;
  author: { name: string };
  board?: { name: string };
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface Board {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string }> = {
  open: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  under_review: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  planned: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  in_progress: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  live: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  hold: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
};

const PRIORITY_CONFIG: Record<string, string> = {
  none: 'bg-gray-400',
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export default function AdminFeedback() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [boardFilter, setBoardFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    boardId: '',
    priority: 'none',
  });

  useEffect(() => {
    fetchBoards();
    fetchPosts();
  }, [statusFilter, typeFilter, boardFilter]);

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
        if (!formData.boardId && response.data.data.boards.length > 0) {
          setFormData((prev) => ({ ...prev, boardId: response.data.data.boards[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (boardFilter !== 'all') params.boardId = boardFilter;

      const response = await api.get('/posts', { params });
      if (response.data.success) {
        setPosts(response.data.data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedPosts = filteredPosts.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(filteredPosts.length / rowsPerPage);

  const handleCreatePost = async () => {
    if (!formData.title.trim() || !formData.boardId) {
      toast.error('Title and Board are required');
      return;
    }
    try {
      const response = await api.post('/posts', formData);
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', description: '', type: 'feature', boardId: boards[0]?.id || '', priority: 'none' });
        fetchPosts();
        toast.success('Post created');
      }
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  const handleUpdatePost = async () => {
    if (!selectedPost) return;
    try {
      const response = await api.put(`/posts/${selectedPost.id}`, {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
      });
      if (response.data.success) {
        setShowEditModal(false);
        setSelectedPost(null);
        fetchPosts();
        toast.success('Post updated');
      }
    } catch (error) {
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      fetchPosts();
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleChangeStatus = async (postId: string, newStatus: string) => {
    try {
      await api.put(`/posts/${postId}/status`, { status: newStatus });
      fetchPosts();
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    try {
      await api.put(`/posts/${postId}/pin`, { isPinned: !isPinned });
      fetchPosts();
    } catch (error) {
      toast.error('Failed to toggle pin');
    }
  };

  const openEditModal = (post: Post) => {
    setSelectedPost(post);
    setFormData({ title: post.title, description: '', type: post.type, boardId: '', priority: post.priority });
    setShowEditModal(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setBoardFilter('all');
    setPage(0);
  };

  const hasFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || boardFilter !== 'all';

  const d = theme === 'dark';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-4xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Feedback Management</h1>
          <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{filteredPosts.length} posts</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition">
          <Plus className="w-4 h-4" /> Create Post
        </button>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[180px] max-w-[280px] ${
            d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by title..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>

          {[
            { value: statusFilter, set: setStatusFilter, label: 'All Status', options: ['open', 'under_review', 'planned', 'in_progress', 'live', 'closed', 'hold'] },
            { value: typeFilter, set: setTypeFilter, label: 'All Types', options: ['feature', 'bug', 'improvement', 'integration'] },
          ].map(({ value, set, label, options }, i) => (
            <select key={i} value={value} onChange={(e) => { set(e.target.value); setPage(0); }}
              className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
              <option value="all">{label}</option>
              {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          ))}

          <select value={boardFilter} onChange={(e) => { setBoardFilter(e.target.value); setPage(0); }}
            className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
            <option value="all">All Boards</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600">
              <X className="w-4 h-4" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-xs ${
        d ? 'bg-blue-900/20 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-600 border border-blue-200'
      }`}>
        Sorted by created date within each status. Pinned posts appear first.
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className={`rounded-lg border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <table className="w-full">
            <thead className={d ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Title</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Priority</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Type</th>
                <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Votes</th>
                <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Comments</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Author</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Created</th>
                <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPosts.length > 0 ? (
                paginatedPosts.map((post) => {
                  const sc = STATUS_CONFIG[post.status] || STATUS_CONFIG.open;
                  return (
                    <tr key={post.id}
                      onClick={() => navigate(`/admin/posts/${post.slug}`)}
                      className={`border-t cursor-pointer transition ${d ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>
                      {/* Title */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {post.isPinned && <Pin className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                          <span className={`text-sm font-medium truncate max-w-[280px] ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select value={post.status}
                          onChange={(e) => handleChangeStatus(post.id, e.target.value)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${sc.bg} ${sc.text}`}>
                          {Object.entries(STATUS_CONFIG).map(([key]) => (
                            <option key={key} value={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                          ))}
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_CONFIG[post.priority] || 'bg-gray-400'}`} />
                          <span className={`text-xs capitalize ${d ? 'text-gray-400' : 'text-gray-600'}`}>{post.priority}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs capitalize ${d ? 'text-gray-400' : 'text-gray-600'}`}>{post.type}</span>
                      </td>

                      {/* Votes */}
                      <td className={`px-4 py-3.5 text-center text-sm font-semibold ${d ? 'text-teal-400' : 'text-teal-600'}`}>
                        {post.voteCount}
                      </td>

                      {/* Comments */}
                      <td className={`px-4 py-3.5 text-center text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        {post.commentCount}
                      </td>

                      {/* Author */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {post.author.name[0].toUpperCase()}
                          </div>
                          <span className={`text-xs ${d ? 'text-gray-400' : 'text-gray-600'}`}>{post.author.name}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td className={`px-4 py-3.5 text-xs whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                            className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>

                          {openMenuId === post.id && (
                            <div className={`absolute right-0 top-full mt-1 w-36 rounded-lg shadow-xl border z-50 py-1 ${
                              d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                            }`}>
                              <button onClick={() => { openEditModal(post); setOpenMenuId(null); }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${d ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => { handleTogglePin(post.id, post.isPinned); setOpenMenuId(null); }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${d ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <Pin className="w-3.5 h-3.5" /> {post.isPinned ? 'Unpin' : 'Pin'}
                              </button>
                              <button onClick={() => { handleDeletePost(post.id); setOpenMenuId(null); }}
                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-500 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className={`px-4 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    No feedback found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredPosts.length > 0 && (
            <div className={`flex items-center justify-between px-4 py-3 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${d ? 'text-gray-400' : 'text-gray-500'}`}>Rows per page:</span>
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                  className={`px-2 py-1 rounded border text-xs ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                  {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredPosts.length)} of {filteredPosts.length}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                    className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                    className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Close menu on click outside */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-md ${d ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create New Post</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Post title" className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Board *</label>
                <select value={formData.boardId} onChange={(e) => setFormData({ ...formData, boardId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                  <option value="">Select Board</option>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="improvement">Improvement</option>
                    <option value="integration">Integration</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Post description" rows={4}
                  className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-lg border ${d ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
                <button onClick={handleCreatePost}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold">Create Post</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && selectedPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-md ${d ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Edit Post</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedPost(null); }} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="improvement">Improvement</option>
                    <option value="integration">Integration</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4}
                  className={`w-full px-3 py-2 rounded-lg border ${d ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowEditModal(false); setSelectedPost(null); }}
                  className={`px-4 py-2 rounded-lg border ${d ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>Cancel</button>
                <button onClick={handleUpdatePost}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold">Update Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

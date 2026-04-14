import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, ArrowUpRight, Edit2, Trash2, FileText, MessageSquare, Bug, Zap, Puzzle } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';

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
  isPinned: boolean;
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
  const { init, toggle, votes } = useVoteStore();
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [_managers, setManagers] = useState<Manager[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

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
        const fetchedPosts = response.data.data.posts;
        setPosts(fetchedPosts);
        fetchedPosts.forEach((p: any) => init(p.id, p.voteCount ?? 0, p.hasVoted ?? false));
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const handleCreatePost = async () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    setCreating(true);
    try {
      const response = await api.post('/posts', {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        boardId,
        isDraft: true,
      });
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', description: '', type: 'feature', tagIds: [] });
        navigate(`/admin/posts/${response.data.data.post.id}/edit`);
      }
    } catch {
      toast.error('Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deleteConfirm) return;
    try {
      const response = await api.delete(`/posts/${deleteConfirm.id}`);
      if (response.data.success) {
        setDeleteConfirm(null);
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

  const handleVote = (postId: string) => {
    toggle(postId);
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

  const filteredPosts = typeFilter === 'all' ? posts : posts.filter(p => p.type === typeFilter);
  const totalPages = Math.ceil(filteredPosts.length / rowsPerPage);
  const paginatedPosts = filteredPosts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    const el = tabsRef.current[typeFilter];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setIndicatorStyle({ left: elRect.left - parentRect.left, width: elRect.width });
      }
    }
  }, [typeFilter, loading]);

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
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {board?.name || 'Loading...'}
              </h1>
            </div>
            {board?.description && (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {board.description}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#0C68E9] text-white rounded-lg hover:bg-[#0b5dd0] transition"
            style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}
          >
            <Plus className="w-5 h-5" />
            Create Post
          </button>
        </div>
      </div>


      {/* Posts Table */}
      {loading ? (
        <LoadingBar />
      ) : (
        <div
          className={`rounded-xl border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
          style={{ overflow: 'visible' }}
        >
          {/* Title */}
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>
              All Posts
            </h2>
          </div>
          <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />
          {/* Type Tabs */}
          <div className={`relative flex items-end border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} style={{ height: '48px', paddingLeft: '24px', gap: '40px' }}>
            {[
              { key: 'all', label: 'All', badgeBg: 'bg-gray-800', badgeText: 'text-white', darkBadgeBg: 'bg-white', darkBadgeText: 'text-gray-900' },
              { key: 'feature', label: 'Feature', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', darkBadgeBg: 'bg-blue-900/40', darkBadgeText: 'text-blue-300' },
              { key: 'bug', label: 'Bug', badgeBg: 'bg-red-100', badgeText: 'text-red-700', darkBadgeBg: 'bg-red-900/40', darkBadgeText: 'text-red-300' },
              { key: 'improvement', label: 'Improvement', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', darkBadgeBg: 'bg-orange-900/40', darkBadgeText: 'text-orange-300' },
              { key: 'integration', label: 'Integration', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', darkBadgeBg: 'bg-purple-900/40', darkBadgeText: 'text-purple-300' },
            ].map((tab) => {
              const d = theme === 'dark';
              const isActive = typeFilter === tab.key;
              const count = tab.key === 'all' ? posts.length : posts.filter(p => p.type === tab.key).length;
              return (
                <button key={tab.key}
                  ref={(el) => { tabsRef.current[tab.key] = el; }}
                  onClick={() => { setTypeFilter(tab.key); setPage(0); }}
                  className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors ${
                    isActive ? (d ? 'text-white' : 'text-gray-900') : (d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                  }`}>
                  {tab.label}
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-[24px] px-1 rounded-md text-[11px] font-bold ${
                    d ? `${tab.darkBadgeBg} ${tab.darkBadgeText}` : `${tab.badgeBg} ${tab.badgeText}`
                  }`}>{count}</span>
                </button>
              );
            })}
            <div className={`absolute bottom-0 h-0.5 ${theme === 'dark' ? 'bg-white' : 'bg-gray-900'}`}
              style={{ left: indicatorStyle.left, width: indicatorStyle.width, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
          <div style={{ overflow: 'visible' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {['Upvote', 'Title', 'Status', 'Comments', 'Author', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={`font-semibold ${theme === 'dark' ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: theme === 'dark' ? undefined : '#1C252E',
                      textAlign: i === 3 ? 'center' as const : i === 6 ? 'right' as const : 'left' as const,
                      width: i === 0 ? '120px' : i === 2 ? '150px' : i === 3 ? '330px' : i === 4 ? '250px' : i === 5 ? '180px' : i === 6 ? '60px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 6 ? '24px' : '16px' }}>{h}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedPosts.length > 0 ? (
                paginatedPosts.map((post) => (
                  <tr key={post.id} onClick={() => navigate(`/admin/posts/${post.slug}`, { state: { from: `/admin/boards/${boardId}`, source: 'board' } })}
                    className={`border-b border-dashed cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                    {/* Upvote */}
                    <td className={denseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '24px', paddingRight: '12px', width: '120px' }}
                      onClick={(e) => { e.stopPropagation(); handleVote(post.id); }}>
                      <div className="inline-flex flex-row items-center justify-center rounded-lg border font-bold transition-all cursor-pointer overflow-hidden"
                        style={{
                          padding: '8px 14px', fontSize: '13px', gap: '6px',
                          backgroundColor: votes[post.id]?.voted ? '#059669' : 'transparent',
                          borderColor: votes[post.id]?.voted ? '#059669' : (theme === 'dark' ? '#4b5563' : '#e5e7eb'),
                          color: votes[post.id]?.voted ? '#ffffff' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                        }}>
                        <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />
                        <span>{votes[post.id]?.count ?? post.voteCount}</span>
                      </div>
                    </td>
                    {/* Title + Description */}
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} px-5 max-w-0 overflow-hidden`}>
                      <div className="flex items-center gap-1.5">
                        {post.isPinned && <span className="text-yellow-500 text-sm">📌</span>}
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                      </div>
                      {post.description && (
                        <p className={`text-xs truncate mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>
                      )}
                    </td>
                    {/* Status */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[13px] font-semibold ${getStatusColor(post.status)}`}>
                        {post.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    {/* Comments */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {post.commentCount}
                    </td>
                    {/* Author */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                          {post.author?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ maxWidth: '100px' }}>{post.author?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    {/* Created */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    {/* Actions */}
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                          className={`p-1.5 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {openMenuId === post.id && (
                          <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${
                            theme === 'dark' ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'
                          }`} style={{ minWidth: '160px' }}>
                            <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${theme === 'dark' ? 'border-b-gray-700' : 'border-b-white'}`} />
                            <button onClick={() => handleOpenEditModal(post)}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${theme === 'dark' ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                              <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Edit
                            </button>
                            <div className={`mx-1 my-1 border-t border-dashed ${theme === 'dark' ? 'border-gray-500' : 'border-gray-200'}`} />
                            <button onClick={() => { setDeleteConfirm({ id: post.id, title: post.title }); setOpenMenuId(null); }}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                              <Trash2 className="w-[18px] h-[18px]" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (() => {
                const emptyConfigs: Record<string, { icon: React.ElementType; title: string; description: string }> = {
                  all: { icon: FileText, title: 'No Posts Yet', description: 'No posts for this board yet. Create your first post to get started.' },
                  feature: { icon: MessageSquare, title: 'No Feature Requests', description: 'No feature requests found. Feature requests will appear here.' },
                  bug: { icon: Bug, title: 'No Bug Reports', description: 'No bug reports found. Reported bugs will appear here.' },
                  improvement: { icon: Zap, title: 'No Improvements', description: 'No improvement suggestions found. Ideas will appear here.' },
                  integration: { icon: Puzzle, title: 'No Integration Requests', description: 'No integration requests found. Integration ideas will appear here.' },
                };
                const cfg = emptyConfigs[typeFilter] || emptyConfigs.all;
                const EmptyIcon = cfg.icon;
                return (
                  <tr>
                    <td colSpan={7}>
                      <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <EmptyIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{cfg.title}</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{cfg.description}</p>
                      </div>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setDenseMode(!denseMode)}
                className={`relative w-9 h-5 rounded-full transition-colors ${denseMode ? 'bg-[#0c68e9]' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300')}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${denseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                <div className="relative">
                  <button onClick={() => setRowsDropOpen(!rowsDropOpen)}
                    className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {rowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rowsDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {rowsDropOpen && (
                    <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      {[10, 25, 50, 100].map(n => (
                        <button key={n} onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
                          className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                            rowsPerPage === n
                              ? (theme === 'dark' ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                              : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                          }`}>{n}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredPosts.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredPosts.length)}` : '0–0'} of {filteredPosts.length}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className={`p-1.5 rounded transition disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className={`p-1.5 rounded transition disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {rowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setRowsDropOpen(false)} />}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Do you really want to delete this post?"
        message={`"${deleteConfirm?.title || ''}" will be permanently deleted. This action cannot be undone.`}
        onConfirm={handleDeletePost}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create Post in {board?.name}</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Title */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.title} placeholder=" "
                    onChange={(e) => { setFormData({ ...formData, title: e.target.value }); if (formErrors.title) setFormErrors(prev => { const n = { ...prev }; delete n.title; return n; }); }}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      formErrors.title ? (theme === 'dark' ? 'border-red-500 bg-gray-800 text-white' : 'border-red-500 bg-white text-gray-900')
                      : (theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400')
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${formErrors.title ? 'text-red-500' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')} ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>Title *</span>
                </div>
                {formErrors.title
                  ? <p className="text-red-500 text-xs" style={{ margin: '8px 14px 0' }}>{formErrors.title}</p>
                  : <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the title for your post.</p>}
              </div>

              {/* Description */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.description} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${theme === 'dark' ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Short description for your post.</p>
              </div>

              {/* Type */}
              <div>
                <CustomDropdown label="Type" value={formData.type}
                  options={[{ value: 'feature', label: 'Feature' }, { value: 'bug', label: 'Bug' }, { value: 'improvement', label: 'Improvement' }, { value: 'integration', label: 'Integration' }]}
                  onChange={(v) => setFormData({ ...formData, type: v })} minWidth="100%" bgClass={theme === 'dark' ? 'bg-gray-900' : 'bg-white'} />
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Select the type of post.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowCreateModal(false); setFormErrors({}); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreatePost} loading={creating}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Next</LoadingButton>
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
                <CustomDropdown
                  label="Type"
                  value={editFormData.type}
                  options={[
                    { value: 'feature', label: 'Feature' },
                    { value: 'bug', label: 'Bug' },
                    { value: 'improvement', label: 'Improvement' },
                    { value: 'integration', label: 'Integration' },
                  ]}
                  onChange={(v) => setEditFormData({ ...editFormData, type: v })}
                  minWidth="100%"
                  bgClass={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
                />
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
                  className="px-4 py-2 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0] transition-colors"
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

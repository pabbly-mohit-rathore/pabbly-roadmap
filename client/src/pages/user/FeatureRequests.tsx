import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight, MessageSquare, Plus, Edit2, Trash2, MoreVertical, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';

interface Post {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: string;
  author: { id?: string; name: string };
  board: { id: string; name: string };
  hasVoted?: boolean;
}

interface Board { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  planned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  live: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
  hold: 'bg-red-100 text-red-700',
};

export default function UserFeatureRequests() {
  const theme = useThemeStore((s) => s.theme);
  const { init, toggle, votes } = useVoteStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const d = theme === 'dark';

  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [boardFilter, setBoardFilter] = useState('all');
  const [animatingPosts, setAnimatingPosts] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', type: 'feature', boardId: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [postsRes, boardsRes] = await Promise.all([
        api.get('/posts', { params: { limit: 50 } }),
        api.get('/boards'),
      ]);
      if (postsRes.data.success) {
        const fetchedPosts = postsRes.data.data.posts;
        setPosts(fetchedPosts);
        fetchedPosts.forEach((p: Post & { hasVoted?: boolean }) => init(p.id, p.voteCount ?? 0, p.hasVoted ?? false));
      }
      if (boardsRes.data.success) setBoards(boardsRes.data.data.boards);
    } catch { console.error('Error fetching data'); }
    finally { setLoading(false); }
  };

  const handleVote = (postId: string) => {
    toggle(postId);
    setAnimatingPosts(prev => { const next = new Set(prev); next.add(postId); return next; });
    setTimeout(() => setAnimatingPosts(prev => { const next = new Set(prev); next.delete(postId); return next; }), 400);
  };

  const handleCreatePost = async () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.boardId) errors.boardId = 'Please select a board';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    try {
      setCreating(true);
      const response = await api.post('/posts', { ...formData, isDraft: true });
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', description: '', type: 'feature', boardId: '' });
        navigate(`/user/posts/${response.data.data.post.id}/edit`);
      }
    } catch { toast.error('Failed to create post'); }
    finally { setCreating(false); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setOpenMenuId(null);
      toast.success('Post deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filteredPosts = posts.filter(p => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (boardFilter !== 'all' && p.board?.id !== boardFilter) return false;
    return true;
  });

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || boardFilter !== 'all';
  const totalPages = Math.ceil(filteredPosts.length / rowsPerPage);
  const paginatedPosts = filteredPosts.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setBoardFilter('all'); setPage(0); };

  return (
    <UserLayout>
      <style>{`@keyframes slideUpCount { 0% { opacity: 0; transform: translateY(8px) scale(0.85); } 60% { opacity: 1; transform: translateY(-2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Feature Requests</h1>
            <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{posts.length} posts</p>
          </div>
          <button onClick={() => { setShowCreateModal(true); setFormErrors({}); }}
            className="flex items-center gap-2 bg-[#0C68E9] text-white rounded-lg hover:bg-[#0b5dd0] transition"
            style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
            <Plus className="w-5 h-5" /> Create Post
          </button>
        </div>

        {/* Filters */}
        <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${
              d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`} style={{ padding: '0 14px', height: '48px' }}>
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by title..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
            </div>

            <CustomDropdown label="Status" value={statusFilter}
              options={[{ value: 'all', label: 'All Status' }, ...['open', 'under_review', 'planned', 'in_progress', 'live', 'closed', 'hold'].map(o => ({ value: o, label: o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))]}
              onChange={(v) => { setStatusFilter(v); setPage(0); }} />

            <CustomDropdown label="Board" value={boardFilter}
              options={[{ value: 'all', label: 'All Boards' }, ...boards.map(b => ({ value: b.id, label: b.name }))]}
              onChange={(v) => { setBoardFilter(v); setPage(0); }} />

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-2 font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
                <X className="w-5 h-5" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? <LoadingBar /> : (
          <div className={`rounded-xl border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                  {['Upvote', 'Title', 'Board', 'Status', 'Comments', 'Actions'].map((h, i) => (
                    <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px', color: d ? undefined : '#1C252E',
                        textAlign: i === 4 ? 'center' as const : i === 5 ? 'right' as const : 'left' as const,
                        width: i === 0 ? '100px' : i === 2 ? '160px' : i === 3 ? '140px' : i === 4 ? '100px' : i === 5 ? '60px' : undefined,
                      }}>
                      <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 5 ? '24px' : '16px' }}>{h}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.length > 0 ? paginatedPosts.map(post => {
                  const isOwner = user?.id === post.author?.id;
                  return (
                    <tr key={post.id} onClick={() => navigate(`/user/posts/${post.slug}`)}
                      className={`border-t transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                      {/* Upvote */}
                      <td className={denseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '24px', paddingRight: '12px', width: '100px' }}
                        onClick={(e) => { e.stopPropagation(); handleVote(post.id); }}>
                        <div className="inline-flex flex-col items-center justify-center h-11 rounded-lg border font-bold transition-all cursor-pointer overflow-hidden"
                          style={{
                            width: '56px', fontSize: '13px', gap: '1px',
                            backgroundColor: votes[post.id]?.voted ? '#1c252e' : 'transparent',
                            borderColor: votes[post.id]?.voted ? '#1c252e' : (d ? '#4b5563' : '#e5e7eb'),
                            color: votes[post.id]?.voted ? '#ffffff' : (d ? '#d1d5db' : '#374151'),
                          }}
                          onMouseEnter={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = '#1c252e'; }}
                          onMouseLeave={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = d ? '#4b5563' : '#e5e7eb'; }}>
                          <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />
                          <span key={votes[post.id]?.count}
                            style={{ animation: animatingPosts.has(post.id) ? 'slideUpCount 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', display: 'block' }}>
                            {votes[post.id]?.count ?? post.voteCount ?? 0}
                          </span>
                        </div>
                      </td>
                      {/* Title */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} px-4 max-w-0 overflow-hidden`}>
                        <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                        {post.description && <p className={`text-xs truncate mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>}
                      </td>
                      {/* Board */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="truncate block" style={{ maxWidth: '130px' }}>{post.board?.name || '-'}</span>
                      </td>
                      {/* Status */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[13px] font-semibold ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-700'}`}>
                          {post.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      {/* Comments */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-center text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        {post.commentCount ?? 0}
                      </td>
                      {/* Actions */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                        {isOwner && (
                          <div className="relative inline-block">
                            <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                              className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {openMenuId === post.id && (
                              <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${
                                d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'
                              }`} style={{ minWidth: '160px' }}>
                                <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                                <button onClick={() => { navigate(`/user/posts/${post.slug}`); setOpenMenuId(null); }}
                                  className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                                  <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Edit
                                </button>
                                <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                                <button onClick={() => handleDeletePost(post.id)}
                                  className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                                  <Trash2 className="w-[18px] h-[18px]" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6}>
                      <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '300px' }}>
                        <MessageSquare className={`w-10 h-10 mb-3 ${d ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No posts found</p>
                        <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Submit your first feature request!</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setDenseMode(!denseMode)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${denseMode ? 'bg-[#0c68e9]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${denseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                  <div className="relative">
                    <button onClick={() => setRowsDropOpen(!rowsDropOpen)}
                      className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                      {rowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rowsDropOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {rowsDropOpen && (
                      <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${
                        d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        {[10, 25, 50, 100].map(n => (
                          <button key={n} onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
                            className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                              rowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                              : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                            }`}>{n}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  {filteredPosts.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredPosts.length)}` : '0–0'} of {filteredPosts.length}
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
          </div>
        )}
      </div>

      {/* Close overlays */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}
      {rowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setRowsDropOpen(false)} />}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create New Post</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
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
                      formErrors.title ? (d ? 'border-red-500 bg-gray-800 text-white' : 'border-red-500 bg-white text-gray-900')
                      : (d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400')
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${formErrors.title ? 'text-red-500' : (d ? 'text-gray-400' : 'text-gray-500')} ${d ? 'bg-gray-900' : 'bg-white'}`}>Title *</span>
                </div>
                {formErrors.title
                  ? <p className="text-red-500 text-xs" style={{ margin: '8px 14px 0' }}>{formErrors.title}</p>
                  : <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the title for your post.</p>}
              </div>

              {/* Description */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.description} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Short description for your post.</p>
              </div>

              {/* Board */}
              <div>
                <CustomDropdown label="Board *" value={formData.boardId}
                  options={[{ value: '', label: 'Select Board' }, ...boards.map(b => ({ value: b.id, label: b.name }))]}
                  onChange={(v) => { setFormData({ ...formData, boardId: v }); if (formErrors.boardId) setFormErrors(prev => { const n = { ...prev }; delete n.boardId; return n; }); }}
                  minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} />
                {formErrors.boardId
                  ? <p className="text-red-500 text-xs" style={{ margin: '8px 14px 0' }}>{formErrors.boardId}</p>
                  : <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Select the board for this post.</p>}
              </div>

              {/* Type */}
              <div>
                <CustomDropdown label="Type" value={formData.type}
                  options={[{ value: 'feature', label: 'Feature' }, { value: 'bug', label: 'Bug' }, { value: 'improvement', label: 'Improvement' }, { value: 'integration', label: 'Integration' }]}
                  onChange={(v) => setFormData({ ...formData, type: v })} minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} />
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Select the type of post.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowCreateModal(false); setFormErrors({}); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreatePost} loading={creating}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Next</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

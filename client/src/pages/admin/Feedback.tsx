import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Edit2, Trash2, Search, ChevronLeft, ChevronRight, ChevronDown, MoreVertical, FileText, Clock, Eye, Zap, Rocket, XCircle, PauseCircle, MessageSquare, Bug, Puzzle, Inbox, ArrowUpRight, TrendingUp, CheckCircle2, Download } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';
import CommentEditor from '../../components/CommentEditor';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface Post {
  id: string;
  title: string;
  description?: string;
  content?: string;
  slug: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  priority: string;
  priorityScore: number;
  createdAt: string;
  author: { name: string; avatar?: string };
  board?: { name: string; color?: string };
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

const EMPTY_STATE_CONFIG: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  all: { icon: FileText, title: 'No Posts Created!', description: 'No posts created yet. Create your first post to get started.' },
  open: { icon: Inbox, title: 'No Open Posts', description: 'There are no open posts at the moment. New posts will appear here.' },
  under_review: { icon: Eye, title: 'No Posts Under Review', description: 'No posts are currently under review. Posts moved to review will show up here.' },
  planned: { icon: Clock, title: 'No Planned Posts', description: 'No posts have been planned yet. Plan a post to see it here.' },
  in_progress: { icon: Zap, title: 'No Posts In Progress', description: 'No posts are currently in progress. Active work will appear here.' },
  live: { icon: Rocket, title: 'No Live Posts', description: 'No posts are live yet. Completed posts will show up here.' },
  closed: { icon: XCircle, title: 'No Closed Posts', description: 'No posts have been closed. Resolved posts will appear here.' },
  hold: { icon: PauseCircle, title: 'No Posts On Hold', description: 'No posts are on hold right now. Paused posts will show up here.' },
};

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  feature: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  bug: { bg: 'bg-red-50', text: 'text-red-700' },
  improvement: { bg: 'bg-amber-50', text: 'text-amber-700' },
  integration: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
};

const EMPTY_TYPE_CONFIG: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  feature: { icon: MessageSquare, title: 'No Feature Requests', description: 'No feature requests found. Feature requests from users will appear here.' },
  bug: { icon: Bug, title: 'No Bug Reports', description: 'No bug reports found. Reported bugs will appear here.' },
  improvement: { icon: Zap, title: 'No Improvements', description: 'No improvement suggestions found. Improvement ideas will appear here.' },
  integration: { icon: Puzzle, title: 'No Integration Requests', description: 'No integration requests found. Integration ideas will appear here.' },
};

export default function AdminFeedback() {
  const theme = useThemeStore((state) => state.theme);
  const { init, toggle, votes } = useVoteStore();
  const navigate = useNavigate();
  const [animatingPosts, setAnimatingPosts] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [boardFilter, setBoardFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const rowsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowsDropOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rowsDropdownRef.current && !rowsDropdownRef.current.contains(e.target as Node)) {
        setRowsDropOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [rowsDropOpen]);
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'most-voted'>('newest');
  const [hoverPost, setHoverPost] = useState<{ post: Post; x: number; y: number; rowTop: number } | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    type: 'feature',
    boardId: '',
    priority: 'none',
  });

  const isInitialLoad = useRef(true);

  useEffect(() => {
    Promise.all([fetchBoards(), fetchPosts(isInitialLoad.current)]);
    isInitialLoad.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, boardFilter]);

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


  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
        if (!formData.boardId && response.data.data.boards.length > 0) {
          setFormData((prev) => ({ ...prev, boardId: response.data.data.boards[0].id }));
        }
      }
    } catch {
      console.error('Error fetching boards');
    }
  };

  const fetchPosts = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setTableLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (boardFilter !== 'all') params.boardId = boardFilter;

      const response = await api.get('/posts', { params: { ...params, limit: 'all' } });
      if (response.data.success) {
        const fetchedPosts = response.data.data.posts;
        setPosts(fetchedPosts);
        fetchedPosts.forEach((p: Post & { hasVoted?: boolean }) => init(p.id, p.voteCount ?? 0, p.hasVoted ?? false));
      }
    } catch {
      console.error('Error fetching posts');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (typeFilter === 'all' || post.type === typeFilter)
  );

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'most-voted') return (b.voteCount ?? 0) - (a.voteCount ?? 0);
    if (sortBy === 'trending') return ((b.voteCount ?? 0) + (b.commentCount ?? 0)) - ((a.voteCount ?? 0) + (a.commentCount ?? 0));
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const paginatedPosts = sortedPosts.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(sortedPosts.length / rowsPerPage);

  const [postContent, setPostContent] = useState('');

  const handleCreatePost = async (htmlContent?: string) => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.boardId) errors.boardId = 'Please select a board';
    if (!formData.type) errors.type = 'Please select a type';
    const contentText = (htmlContent || postContent || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (contentText.length < 10) errors.content = 'Content must be at least 10 characters';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setCreating(true);
    try {
      const content = htmlContent || postContent;
      const response = await api.post('/posts', { ...formData, content, isDraft: false });
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', type: 'feature', boardId: boards[0]?.id || '', priority: 'none' });
        setPostContent('');
        setPage(0);
        toast.success('Post published!');
        fetchPosts();
      }
    } catch {
      toast.error('Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!selectedPost) return;
    setUpdating(true);
    try {
      const response = await api.put(`/posts/${selectedPost.id}`, {
        title: formData.title,
        type: formData.type,
        priority: formData.priority,
      });
      if (response.data.success) {
        setShowEditModal(false);
        setSelectedPost(null);
        fetchPosts();
        toast.success('Post updated');
      }
    } catch {
      toast.error('Failed to update post');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchPosts();
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleVote = (postId: string) => {
    toggle(postId);
    setAnimatingPosts(prev => { const next = new Set(prev); next.add(postId); return next; });
    setTimeout(() => setAnimatingPosts(prev => { const next = new Set(prev); next.delete(postId); return next; }), 400);
  };

  const openEditModal = (post: Post) => {
    setSelectedPost(post);
    setFormData({ title: post.title, type: post.type, boardId: '', priority: post.priority });
    setShowEditModal(true);
  };

  const toggleSelectPost = (postId: string) => {
    setSelectedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPosts.size === sortedPosts.length) setSelectedPosts(new Set());
    else setSelectedPosts(new Set(sortedPosts.map(p => p.id)));
  };

  const exportPostsCSV = (postsToExport: Post[]) => {
    if (postsToExport.length === 0) { toast.error('No posts to export'); return; }
    const esc = (val: string) => `"${val.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const headers = ['Title', 'Status', 'Type', 'Board', 'Author', 'Votes', 'Comments', 'Created', 'Content'];
    const rows = postsToExport.map(p => [
      esc(p.title || ''),
      esc(p.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
      esc(p.type.charAt(0).toUpperCase() + p.type.slice(1)),
      esc(p.board?.name || ''),
      esc(p.author.name || ''),
      p.voteCount ?? 0,
      p.commentCount ?? 0,
      esc(new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })),
      esc((p.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()),
    ].join(','));
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${postsToExport.length} posts`);
    setShowExportMenu(false);
    setSelectedPosts(new Set());
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setBoardFilter('all');
    setPage(0);
  };

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || boardFilter !== 'all';

  const d = theme === 'dark';

  return (
    <div>
      <style>{`@keyframes slideUpCount { 0% { opacity: 0; transform: translateY(8px) scale(0.85); } 60% { opacity: 1; transform: translateY(-2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } } @keyframes previewFadeIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } } .mui-checkbox { width: 18px; height: 18px; border-radius: 3px; border: 2px solid #919eab; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; flex-shrink: 0; } .mui-checkbox:hover { border-color: #637381; } .mui-checkbox.checked { background: #0c68e9; border-color: #0c68e9; } .mui-checkbox.indeterminate { background: #0c68e9; border-color: #0c68e9; }`}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>Feedback Management</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>{sortedPosts.length} posts</p>
        </div>
        <button onClick={() => { setShowCreateModal(true); setFormErrors({}); }}
          className="flex items-center gap-2 bg-[#0C68E9] text-white rounded-lg hover:bg-[#0b5dd0] transition" style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
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
            <button onClick={clearFilters} className="flex items-center gap-2 font-medium text-red-500 border border-red-300 hover:bg-red-50 rounded-lg transition-colors" style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
              <X className="w-5 h-5" /> Clear Filters
            </button>
          )}

          {/* Sort Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {([
              { key: 'trending', label: 'Trending', icon: TrendingUp },
              { key: 'newest', label: 'Newest', icon: Clock },
              { key: 'most-voted', label: 'Most Voted', icon: CheckCircle2 },
            ] as const).map(({ key, label, icon: SortIcon }) => (
              <button key={key} onClick={() => { setSortBy(key); setPage(0); }}
                className={`flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-[#059669] text-white'
                    : d ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`} style={{ height: '36px' }}>
                <SortIcon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
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
        <LoadingBar />
      ) : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Title + Export */}
          <div className="flex items-center justify-between" style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>
              {statusFilter === 'all' ? 'All Posts' : `${statusFilter.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Posts`}
            </h2>
            <div className="relative">
              <button onClick={() => {
                if (selectedPosts.size > 0) {
                  exportPostsCSV(sortedPosts.filter(p => selectedPosts.has(p.id)));
                } else {
                  setShowExportMenu(!showExportMenu);
                }
              }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                <Download className="w-4 h-4" /> Export{selectedPosts.size > 0 ? ` (${selectedPosts.size})` : ''}
              </button>
              {showExportMenu && selectedPosts.size === 0 && (
                <div className={`absolute right-0 top-full mt-2 rounded-xl border shadow-lg z-50 p-1.5 ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} style={{ minWidth: '240px' }}>
                  {boardFilter !== 'all' ? (() => {
                    const activeBoard = boards.find(b => b.id === boardFilter);
                    return (
                      <button onClick={() => exportPostsCSV(sortedPosts)}
                        className={`w-full px-3 py-2 text-left text-[14px] font-medium rounded-lg transition-colors ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                        Export "{activeBoard?.name}" ({sortedPosts.length} posts)
                      </button>
                    );
                  })() : (
                    <button onClick={() => exportPostsCSV(sortedPosts)}
                      className={`w-full px-3 py-2 text-left text-[14px] font-medium rounded-lg transition-colors ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                      Export All Posts ({sortedPosts.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Title Divider */}
          <div className={`border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} />
          {/* Type Tabs */}
          <div className={`relative flex items-end border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ height: '48px', paddingLeft: '24px', gap: '40px' }}>
            {[
              { key: 'all', label: 'All', badgeBg: 'bg-gray-800', badgeText: 'text-white', darkBadgeBg: 'bg-white', darkBadgeText: 'text-gray-900' },
              { key: 'feature', label: 'Feature', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', darkBadgeBg: 'bg-blue-900/40', darkBadgeText: 'text-blue-300' },
              { key: 'bug', label: 'Bug', badgeBg: 'bg-red-100', badgeText: 'text-red-700', darkBadgeBg: 'bg-red-900/40', darkBadgeText: 'text-red-300' },
              { key: 'improvement', label: 'Improvement', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', darkBadgeBg: 'bg-orange-900/40', darkBadgeText: 'text-orange-300' },
              { key: 'integration', label: 'Integration', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', darkBadgeBg: 'bg-purple-900/40', darkBadgeText: 'text-purple-300' },
            ].map((tab) => {
              const isActive = typeFilter === tab.key;
              const count = tab.key === 'all' ? posts.length : posts.filter(p => p.type === tab.key).length;
              return (
                <button key={tab.key}
                  ref={(el) => { tabsRef.current[tab.key] = el; }}
                  onClick={() => { setTypeFilter(tab.key); setPage(0); }}
                  className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? (d ? 'text-white' : 'text-gray-900')
                      : (d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                  }`}>
                  {tab.label}
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-[24px] px-1 rounded-md text-[11px] font-bold ${
                    d ? `${tab.darkBadgeBg} ${tab.darkBadgeText}` : `${tab.badgeBg} ${tab.badgeText}`
                  }`}>{count}</span>
                </button>
              );
            })}
            {/* Sliding indicator */}
            <div
              className={`absolute bottom-0 h-0.5 ${d ? 'bg-white' : 'bg-gray-900'}`}
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                <th style={{ width: '44px', paddingLeft: '16px' }}>
                  <div className="relative group/selall">
                    <div onClick={toggleSelectAll}
                      className={`mui-checkbox ${selectedPosts.size === sortedPosts.length && sortedPosts.length > 0 ? 'checked' : selectedPosts.size > 0 ? 'indeterminate' : ''}`}>
                      {selectedPosts.size === sortedPosts.length && sortedPosts.length > 0 ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : selectedPosts.size > 0 ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6H9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                      ) : null}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/selall:flex flex-col items-center z-50 pointer-events-none">
                      <div className="bg-gray-900 text-white text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">Select</div>
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900 -mt-[1px]" />
                    </div>
                  </div>
                </th>
                {selectedPosts.size > 0 ? (
                  <th colSpan={7} style={{ paddingLeft: '12px', textAlign: 'left' }}>
                    <span className={`text-sm font-semibold ${d ? 'text-blue-300' : 'text-blue-600'}`}>{selectedPosts.size} selected</span>
                  </th>
                ) : (
                  ['Upvote', 'Title', 'Status', 'Comments', 'Author', 'Created', 'Actions'].map((h, i) => (
                    <th key={h}
                      className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px',
                        color: d ? undefined : '#1C252E',
                        textAlign: i === 3 ? 'center' as const : i === 6 ? 'right' as const : 'left' as const,
                        width: i === 0 ? '90px' : i === 2 ? '140px' : i === 3 ? '280px' : i === 4 ? '250px' : i === 5 ? '150px' : i === 6 ? '100px' : undefined,
                      }}>
                      <div style={{
                        paddingLeft: i === 0 ? '12px' : '16px',
                        paddingRight: i === 6 ? '24px' : '16px',
                      }}>{h}</div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={8}>
                    <div className={`flex items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#0c68e9] rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : paginatedPosts.length > 0 ? (
                paginatedPosts.map((post) => {
                  const sc = STATUS_CONFIG[post.status] || STATUS_CONFIG.open;
                  return (
                    <tr key={post.id}
                      onClick={() => navigate(`/admin/posts/${post.slug}`)}
                      className={`border-b border-dashed cursor-pointer transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                      {/* Checkbox */}
                      <td className={denseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '16px', width: '44px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="relative group/sel">
                          <div onClick={() => toggleSelectPost(post.id)}
                            className={`mui-checkbox ${selectedPosts.has(post.id) ? 'checked' : ''}`}>
                            {selectedPosts.has(post.id) && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/sel:flex flex-col items-center z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">Select</div>
                            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900 -mt-[1px]" />
                          </div>
                        </div>
                      </td>
                      {/* Upvote */}
                      <td className={denseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '12px', paddingRight: '12px', width: '90px' }}
                        onClick={(e) => { e.stopPropagation(); handleVote(post.id); }}>
                        <div
                          className="inline-flex flex-row items-center justify-center rounded-lg border font-bold cursor-pointer overflow-hidden"
                          style={{
                            padding: '8px 14px',
                            fontSize: '13px',
                            gap: '6px',
                            backgroundColor: votes[post.id]?.voted ? '#059669' : 'transparent',
                            borderColor: votes[post.id]?.voted ? '#059669' : (d ? '#4b5563' : '#e5e7eb'),
                            color: votes[post.id]?.voted ? '#ffffff' : (d ? '#d1d5db' : '#374151'),
                          }}
                          onMouseEnter={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = '#059669'; }}
                          onMouseLeave={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = d ? '#4b5563' : '#e5e7eb'; }}
                        >
                          <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />
                          <span
                            key={votes[post.id]?.count}
                            style={{ animation: animatingPosts.has(post.id) ? 'slideUpCount 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', display: 'block' }}
                          >
                            {votes[post.id]?.count ?? post.voteCount ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Title + Content Preview */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} px-5 max-w-0 overflow-hidden`}
                        onMouseEnter={(e) => {
                          const td = e.currentTarget.getBoundingClientRect();
                          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                          hoverTimeout.current = setTimeout(() => setHoverPost({ post, x: td.left, y: td.bottom + 4, rowTop: td.top }), 300);
                        }}
                        onMouseLeave={() => {
                          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                          hoverTimeout.current = setTimeout(() => setHoverPost(null), 150);
                        }}>
                        <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                        {post.content && (
                          <p className={`text-xs truncate mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ maxWidth: '85%' }}>{post.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[13px] font-semibold ${sc.bg} ${sc.text}`}>
                          {post.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>

                      {/* Comments */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-center text-sm font-semibold text-emerald-600`}>
                        {post.commentCount}
                      </td>

                      {/* Author */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        <div className="flex items-center gap-2 group/author">
                          {post.author.avatar ? (
                            <img src={post.author.avatar.startsWith('http') ? post.author.avatar : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${post.author.avatar}`} alt={post.author.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${d ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                              {post.author.name[0].toUpperCase()}
                            </div>
                          )}
                          <div className="relative">
                            <span className={`text-sm truncate block ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ maxWidth: '100px' }}>{post.author.name}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/author:flex flex-col items-center z-50 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                {post.author.name}
                              </div>
                              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 -mt-[1px]" />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Created */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                            className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>

                          {openMenuId === post.id && (
                            <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${
                              d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'
                            }`} style={{ minWidth: '180px' }}>
                              {/* Arrow pointer */}
                              <div className={`absolute -top-2 right-[8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} style={{ filter: d ? 'none' : 'drop-shadow(0 -2px 2px rgba(0,0,0,0.06))' }} />
                              <div className="relative group/edit">
                                <button onClick={() => { openEditModal(post); setOpenMenuId(null); }}
                                  className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-800'}`}>
                                  <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Edit
                                </button>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/edit:flex items-center z-[60] pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">Click to edit post</div>
                                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-900 -ml-[1px]" />
                                </div>
                              </div>
                              <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                              <div className="relative group/del">
                                <button onClick={() => { setDeleteConfirm({ id: post.id, title: post.title }); setOpenMenuId(null); }}
                                  className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                                  <Trash2 className="w-[18px] h-[18px]" /> Delete
                                </button>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/del:flex items-center z-[60] pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">Delete this post</div>
                                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-900 -ml-[1px]" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (() => {
                const emptyConfig = typeFilter !== 'all'
                  ? EMPTY_TYPE_CONFIG[typeFilter] || EMPTY_STATE_CONFIG.all
                  : EMPTY_STATE_CONFIG[statusFilter] || EMPTY_STATE_CONFIG.all;
                const EmptyIcon = emptyConfig.icon;
                return (
                <tr>
                  <td colSpan={8}>
                    <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <EmptyIcon className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{emptyConfig.title}</p>
                      <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>{emptyConfig.description}</p>
                    </div>
                  </td>
                </tr>
                );
              })()}
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
                  <div className="relative" ref={rowsDropdownRef}>
                    <button onClick={() => setRowsDropOpen(!rowsDropOpen)}
                      className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                      {rowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rowsDropOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {rowsDropOpen && (
                      <div className={`absolute bottom-full mb-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${
                        d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        {[10, 25, 50, 100].map(n => (
                          <button key={n} onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
                            className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                              rowsPerPage === n
                                ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                                : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                            }`}>{n}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  {sortedPosts.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, sortedPosts.length)}` : '0–0'} of {sortedPosts.length}
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

      {/* Close menu/dropdown on click outside */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}
      {showExportMenu && <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Do you really want to delete this post?"
        message={`"${deleteConfirm?.title || ''}" will be permanently deleted. This action cannot be undone.`}
        onConfirm={handleDeletePost}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full flex flex-col ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '800px' }}>
            {/* Sticky Header */}
            <div className={`flex items-center justify-between border-b shrink-0 ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '20px 24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create New Post</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Content */}
            <div style={{ padding: '24px' }}>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <div className="relative">
                    <input type="text" value={formData.title} placeholder=" "
                      onChange={(e) => { setFormData({ ...formData, title: e.target.value }); if (formErrors.title) setFormErrors(prev => { const n = { ...prev }; delete n.title; return n; }); }}
                      style={{ padding: '16.5px 14px' }}
                      className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                        d ? 'border-gray-700 bg-gray-800 text-white hover:border-gray-500 focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-gray-400'
                      }`} />
                    <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                      top-1/2 -translate-y-1/2
                      peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                      ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Title *</span>
                    {/* Placeholder text visible only when focused and empty */}
                    {!formData.title && (
                      <span className={`absolute left-[14px] top-1/2 -translate-y-1/2 text-sm pointer-events-none opacity-0 peer-focus:opacity-100 transition-opacity ${
                        d ? 'text-gray-600' : 'text-gray-400'
                      }`}>Enter your post title</span>
                    )}
                  </div>
                  <p className={`text-xs ${formErrors.title ? 'text-red-500' : (d ? 'text-gray-500' : 'text-gray-400')}`} style={{ margin: '8px 14px 0' }}>
                    {formErrors.title || 'Enter the title for your post.'}
                  </p>
                </div>

                {/* Rich Text Editor */}
                <div>
                  <CommentEditor
                    onSubmit={(html) => { setPostContent(html); handleCreatePost(html); }}
                    placeholder="Write your post content here... Add images, links, and more."
                    buttonLabel="Publish Post"
                    submitting={creating}
                    hideButton
                    maxEditorHeight="450px"
                    onContentChange={(html) => { setPostContent(html); if (formErrors.content) setFormErrors(prev => { const n = { ...prev }; delete n.content; return n; }); }}
                  />
                  <p className={`text-xs ${formErrors.content ? 'text-red-500' : (d ? 'text-gray-500' : 'text-gray-400')}`} style={{ margin: '8px 14px 0' }}>
                    {formErrors.content || 'Minimum 10 characters required.'}
                  </p>
                </div>

                {/* Board & Type - bottom, overflow visible */}
                <div className="flex gap-4 relative z-[60]" style={{ marginTop: '20px' }}>
                  <div className="flex-1">
                    <CustomDropdown label="Board *" value={formData.boardId}
                      options={[{ value: '', label: 'Select Board' }, ...boards.map(b => ({ value: b.id, label: b.name }))]}
                      onChange={(v) => { setFormData({ ...formData, boardId: v }); if (formErrors.boardId) setFormErrors(prev => { const n = { ...prev }; delete n.boardId; return n; }); }}
                      minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} portalMode />
                    <p className={`text-xs ${formErrors.boardId ? 'text-red-500' : (d ? 'text-gray-500' : 'text-gray-400')}`} style={{ margin: '8px 14px 0' }}>
                      {formErrors.boardId || 'Select the board for your post.'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <CustomDropdown label="Type *" value={formData.type}
                      options={[{ value: 'feature', label: 'Feature' }, { value: 'bug', label: 'Bug' }, { value: 'improvement', label: 'Improvement' }, { value: 'integration', label: 'Integration' }]}
                      onChange={(v) => { setFormData({ ...formData, type: v }); if (formErrors.type) setFormErrors(prev => { const n = { ...prev }; delete n.type; return n; }); }}
                      minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} portalMode />
                    <p className={`text-xs ${formErrors.type ? 'text-red-500' : (d ? 'text-gray-500' : 'text-gray-400')}`} style={{ margin: '8px 14px 0' }}>
                      {formErrors.type || 'Select the type of post.'}
                    </p>
                  </div>
                </div>

                {/* Cancel + Publish */}
                <div className="flex gap-3 justify-end pt-2">
                  <button onClick={() => { setShowCreateModal(false); setFormErrors({}); }}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                  <LoadingButton onClick={() => handleCreatePost()} loading={creating}
                    className="px-5 py-2.5 bg-[#0C68E9] text-white text-sm font-semibold rounded-lg hover:bg-[#0b5dd0] transition-colors disabled:opacity-70">Publish Post</LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && selectedPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Edit Post</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedPost(null); }} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              <div>
                <div className="relative">
                  <input type="text" value={formData.title} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      d ? 'border-gray-700 bg-gray-800 text-white hover:border-gray-500 focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Title</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <CustomDropdown label="Type" value={formData.type}
                    options={[{ value: 'feature', label: 'Feature' }, { value: 'bug', label: 'Bug' }, { value: 'improvement', label: 'Improvement' }, { value: 'integration', label: 'Integration' }]}
                    onChange={(v) => setFormData({ ...formData, type: v })} minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Select the type of post.</p>
                </div>
                <div>
                  <CustomDropdown label="Priority" value={formData.priority}
                    options={[{ value: 'none', label: 'None' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]}
                    onChange={(v) => setFormData({ ...formData, priority: v })} minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Set the priority level.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowEditModal(false); setSelectedPost(null); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton loading={updating} onClick={handleUpdatePost}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Save</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Preview Popup - fixed position portal */}
      {hoverPost && (() => {
        const hp = hoverPost.post;
        const hsc = STATUS_CONFIG[hp.status] || STATUS_CONFIG.open;
        const popupHeight = 320;
        const spaceBelow = window.innerHeight - hoverPost.y;
        const showAbove = spaceBelow < popupHeight + 20;
        return (
          <div key={hp.id} className={`fixed rounded-xl border shadow-2xl ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            style={{
              left: hoverPost.x, top: showAbove ? undefined : hoverPost.y, bottom: showAbove ? window.innerHeight - hoverPost.rowTop + 4 : undefined,
              width: '380px', maxHeight: `${popupHeight}px`, overflow: 'hidden', zIndex: 9999,
              animation: 'previewFadeIn 0.2s ease-out',
            }}
            onMouseEnter={() => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }}
            onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setHoverPost(null), 150); }}>
            <div style={{ padding: '16px 20px' }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {hp.board && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (hp.board.color || '#6366f1') + '15', color: hp.board.color || '#6366f1' }}>
                    {hp.board.name}
                  </span>
                )}
                {(() => { const tc = TYPE_COLOR[hp.type] || TYPE_COLOR.feature; return (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                    {hp.type.charAt(0).toUpperCase() + hp.type.slice(1)}
                  </span>
                ); })()}
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${hsc.bg} ${hsc.text}`}>
                  {hp.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
              <p className={`text-sm font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>{hp.title}</p>
              {hp.content && (
                <div className={`text-xs leading-relaxed overflow-hidden ${d ? 'text-gray-400' : 'text-gray-500'}`}
                  style={{ display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical' as const }}>
                  {hp.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight, MessageSquare, Plus, Edit2, Trash2, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';
import CommentEditor from '../../components/CommentEditor';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Tooltip from '../../components/ui/Tooltip';

interface Post {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: string;
  author: { id?: string; name: string; avatar?: string };
  board: { id: string; name: string; color?: string };
  hasVoted?: boolean;
  hasCommented?: boolean;
}

interface Board { id: string; name: string; description?: string; }

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string }> = {
  open: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  under_review: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  planned: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  in_progress: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  live: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  hold: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
};

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  feature: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  bug: { bg: 'bg-red-50', text: 'text-red-700' },
  improvement: { bg: 'bg-amber-50', text: 'text-amber-700' },
  integration: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
};

const stripImages = (html: string): string => {
  return html
    .replace(/<img\b[\s\S]*?(?:>|$)/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/data:image\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function UserFeatureRequests() {
  const theme = useThemeStore((s) => s.theme);
  const { init, toggle, votes } = useVoteStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const d = theme === 'dark';

  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [boardFilter, setBoardFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'my-posts' | 'my-voted' | 'my-commented'>('all');
  const [animatingPosts, setAnimatingPosts] = useState<Set<string>>(new Set());
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'most-voted'>('newest');
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Hover preview
  const [hoverPost, setHoverPost] = useState<{ post: Post; x: number; y: number; rowTop: number } | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', type: 'feature' });
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);
  // Prefetched full content for the user's own posts, so Edit opens instantly.
  const contentCacheRef = useRef<Record<string, string>>({});
  const [, forceCacheBump] = useState(0);

  useEffect(() => {
    const el = tabsRef.current[typeFilter];
    if (el?.parentElement) {
      const pr = el.parentElement.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setIndicatorStyle({ left: er.left - pr.left, width: er.width });
    }
  }, [typeFilter, loading]);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', type: 'feature', boardId: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  // Prefetch full content for the user's own posts in the background.
  // Fires after the list loads so edit opens instantly from cache.
  useEffect(() => {
    if (!user?.id || posts.length === 0) return;
    const ownPosts = posts
      .filter(p => p.author?.id === user.id)
      .filter(p => !(p.id in contentCacheRef.current));
    if (ownPosts.length === 0) return;
    let cancelled = false;
    (async () => {
      // Sequential to avoid hammering the server on pages with many posts.
      for (const p of ownPosts) {
        if (cancelled) return;
        try {
          const res = await api.get(`/posts/by-id/${p.id}`);
          if (res.data.success) {
            contentCacheRef.current[p.id] = res.data.data.post.content || '';
            forceCacheBump(n => n + 1);
          }
        } catch { /* ignore — will fall back to on-demand fetch */ }
      }
    })();
    return () => { cancelled = true; };
  }, [posts, user?.id]);

  const fetchData = async () => {
    try {
      const [postsRes, boardsRes] = await Promise.all([
        api.get('/posts', { params: { limit: 'all' } }),
        api.get('/boards'),
      ]);
      if (postsRes.data.success) {
        const fetchedPosts = postsRes.data.data.posts;
        setPosts(fetchedPosts);
        fetchedPosts.forEach((p: Post & { hasVoted?: boolean }) => init(p.id, p.voteCount ?? 0, p.hasVoted ?? false));
      }
      if (boardsRes.data.success) setBoards(boardsRes.data.data.boards);
    } catch (err) { console.error('Error fetching data', err); }
    finally { setLoading(false); }
  };

  const handleVote = (postId: string) => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    toggle(postId);
    setAnimatingPosts(prev => { const next = new Set(prev); next.add(postId); return next; });
    setTimeout(() => setAnimatingPosts(prev => { const next = new Set(prev); next.delete(postId); return next; }), 400);
  };

  const [postContent, setPostContent] = useState('');

  const handleCreatePost = async (htmlContent?: string) => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.boardId) errors.boardId = 'Please select a board';
    if (!formData.type) errors.type = 'Please select a type';
    const contentText = (htmlContent || postContent || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (contentText.length < 10) errors.content = 'Content must be at least 10 characters';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    try {
      setCreating(true);
      const content = htmlContent || postContent;
      const response = await api.post('/posts', { ...formData, content, isDraft: false });
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ title: '', type: 'feature', boardId: '' });
        setPostContent('');
        toast.success('Post published!');
        fetchData();
      }
    } catch { toast.error('Failed to create post'); }
    finally { setCreating(false); }
  };

  const handleDeletePost = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${deleteConfirm.id}`);
      setPosts(prev => prev.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setOpenMenuId(null);
      toast.success('Post deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const openEditModal = async (post: Post) => {
    if (user?.id !== post.author?.id) { toast.error('You can only edit your own posts.'); return; }
    setEditingPost(post);
    setEditFormData({ title: post.title, type: post.type });
    // Prefer cached content (prefetched after list load) for instant edit.
    const cached = contentCacheRef.current[post.id];
    setEditContent(cached ?? '');
    setShowEditModal(true);
    if (cached !== undefined) return;
    // Fallback: fetch on demand if the background prefetch hasn't reached this post yet.
    try {
      const res = await api.get(`/posts/by-id/${post.id}`);
      if (res.data.success) {
        const content = res.data.data.post.content || '';
        contentCacheRef.current[post.id] = content;
        setEditContent(content);
      }
    } catch {
      toast.error('Failed to load post content');
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    if (!editFormData.title.trim()) { toast.error('Title is required'); return; }
    const contentText = (editContent || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (contentText.length < 10) { toast.error('Content must be at least 10 characters'); return; }
    setUpdating(true);
    try {
      const res = await api.put(`/posts/${editingPost.id}`, {
        title: editFormData.title,
        type: editFormData.type,
        content: editContent,
      });
      if (res.data.success) {
        setShowEditModal(false);
        setEditingPost(null);
        setEditContent('');
        toast.success('Post updated');
        fetchData();
      }
    } catch { toast.error('Failed to update post'); }
    finally { setUpdating(false); }
  };

  // Base filtered posts — everything except type filter, used for type tab counts
  const baseFilteredPosts = posts.filter(p => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (boardFilter !== 'all' && p.board?.id !== boardFilter) return false;
    if (activityFilter === 'my-posts' && p.author?.id !== user?.id) return false;
    if (activityFilter === 'my-voted' && !p.hasVoted) return false;
    if (activityFilter === 'my-commented' && !p.hasCommented) return false;
    return true;
  });

  const filteredPosts = baseFilteredPosts.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    return true;
  });

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || boardFilter !== 'all' || activityFilter !== 'all';

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'most-voted') return (b.voteCount ?? 0) - (a.voteCount ?? 0);
    if (sortBy === 'trending') return ((b.voteCount ?? 0) + (b.commentCount ?? 0)) - ((a.voteCount ?? 0) + (a.commentCount ?? 0));
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPages = Math.ceil(sortedPosts.length / rowsPerPage);
  const paginatedPosts = sortedPosts.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setBoardFilter('all'); setActivityFilter('all'); setPage(0); };

  return (
    <UserLayout>
      <style>{`@keyframes slideUpCount { 0% { opacity: 0; transform: translateY(8px) scale(0.85); } 60% { opacity: 1; transform: translateY(-2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } } @keyframes previewFadeIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>
              {boardFilter !== 'all' ? boards.find(b => b.id === boardFilter)?.name || 'All Board Posts' : 'All Board Posts'}
            </h1>
            <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
              {boardFilter !== 'all' ? (boards.find(b => b.id === boardFilter)?.description || `${posts.length} posts`) : 'Have something to say? Join the conversation.'}
            </p>
          </div>
          <button onClick={() => { if (!isAuthenticated) { setShowLoginModal(true); return; } setShowCreateModal(true); setFormErrors({}); }}
            className="flex items-center gap-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition"
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

            {isAuthenticated && (
              <CustomDropdown label="Show" value={activityFilter}
                options={[
                  { value: 'all', label: 'All Posts' },
                  { value: 'my-posts', label: 'My Posts' },
                  { value: 'my-voted', label: 'My Voted Posts' },
                  { value: 'my-commented', label: 'My Commented Posts' },
                ]}
                onChange={(v) => { setActivityFilter(v as typeof activityFilter); setPage(0); }} />
            )}

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-2 font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
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
                  className={`flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    sortBy === key
                      ? 'border-[#059669] text-[#059669] bg-transparent'
                      : d ? 'border-transparent text-gray-400 hover:bg-gray-700 hover:text-white' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`} style={{ height: '36px' }}>
                  <SortIcon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? <LoadingBar /> : (
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div style={{ padding: '24px 24px 16px 24px' }}>
              <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>
                {boardFilter !== 'all' ? (boards.find(b => b.id === boardFilter)?.name || 'All Posts') : 'All Posts'}
              </h2>
            </div>
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
                const count = tab.key === 'all' ? baseFilteredPosts.length : baseFilteredPosts.filter(p => p.type === tab.key).length;
                return (
                  <button key={tab.key} ref={(el) => { tabsRef.current[tab.key] = el; }}
                    onClick={() => { setTypeFilter(tab.key); setPage(0); }}
                    className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors cursor-pointer ${
                      isActive ? (d ? 'text-white' : 'text-gray-900') : (d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                    }`}>
                    {tab.label}
                    <span className={`inline-flex items-center justify-center min-w-[24px] h-[24px] px-1 rounded-md text-[11px] font-bold ${
                      d ? `${tab.darkBadgeBg} ${tab.darkBadgeText}` : `${tab.badgeBg} ${tab.badgeText}`
                    }`}>{count}</span>
                  </button>
                );
              })}
              <div className={`absolute bottom-0 h-0.5 ${d ? 'bg-white' : 'bg-gray-900'}`}
                style={{ left: indicatorStyle.left, width: indicatorStyle.width, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>

            <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                  {['Upvote', 'Title', 'Status', 'Board', 'Type', 'Actions'].map((h, i) => (
                    <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px', color: d ? undefined : '#1C252E',
                        textAlign: i === 5 ? 'right' as const : 'left' as const,
                        width: i === 0 ? '90px' : i === 1 ? '500px' : i === 2 ? '170px' : i === 3 ? '180px' : i === 4 ? '120px' : i === 5 ? '80px' : undefined,
                      }}>
                      <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 5 ? '24px' : '16px' }}>{h}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.length > 0 ? paginatedPosts.map(post => {
                  const isOwner = user?.id === post.author?.id;
                  const sc = STATUS_CONFIG[post.status] || STATUS_CONFIG.open;
                  return (
                    <tr key={post.id} onClick={() => navigate(`/user/posts/${post.slug}`)}
                      className={`border-b border-dashed transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                      {/* Upvote */}
                      <td className={denseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '24px', paddingRight: '12px', width: '90px' }}
                        onClick={(e) => { e.stopPropagation(); handleVote(post.id); }}>
                        <div className="inline-flex flex-row items-center justify-center rounded-lg border font-bold transition-all cursor-pointer overflow-hidden"
                          style={{
                            padding: '8px 14px', fontSize: '13px', gap: '6px',
                            backgroundColor: 'transparent',
                            borderColor: votes[post.id]?.voted ? '#059669' : (d ? '#4b5563' : '#e5e7eb'),
                            color: votes[post.id]?.voted ? '#059669' : (d ? '#d1d5db' : '#374151'),
                          }}
                          onMouseEnter={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = '#059669'; }}
                          onMouseLeave={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = d ? '#4b5563' : '#e5e7eb'; }}>
                          <ArrowUpRight className="w-4 h-4 rotate-[-45deg]" />
                          <span key={votes[post.id]?.count}
                            style={{ animation: animatingPosts.has(post.id) ? 'slideUpCount 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', display: 'block' }}>
                            {votes[post.id]?.count ?? post.voteCount ?? 0}
                          </span>
                        </div>
                      </td>
                      {/* Title + Content Preview */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} pl-5 pr-10 max-w-0 overflow-hidden`}
                        onMouseEnter={(e) => {
                          const td = e.currentTarget.getBoundingClientRect();
                          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                          hoverTimeout.current = setTimeout(() => setHoverPost({ post, x: td.left, y: td.bottom + 4, rowTop: td.top }), 300);
                        }}
                        onMouseLeave={() => {
                          if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                          hoverTimeout.current = setTimeout(() => setHoverPost(null), 150);
                        }}>
                        <p className={`text-[15px] font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                        {(() => {
                          const text = stripImages(post.content || post.description || '');
                          return text ? <p className={`text-[13px] truncate mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{text}</p> : null;
                        })()}
                      </td>
                      {/* Status */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[13px] font-semibold ${sc.bg} ${sc.text}`}>
                          {post.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      {/* Board */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} max-w-0`}>
                        <Tooltip title={post.board?.name ? `Board Name : ${post.board.name}` : ''}>
                          <span className={`block text-sm font-medium truncate ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                            {post.board?.name || '—'}
                          </span>
                        </Tooltip>
                      </td>
                      {/* Type */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        {(() => {
                          const typeStyles: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
                            feature:     { bg: 'bg-blue-100',   text: 'text-blue-700',   darkBg: 'bg-blue-900/40',   darkText: 'text-blue-300' },
                            bug:         { bg: 'bg-red-100',    text: 'text-red-700',    darkBg: 'bg-red-900/40',    darkText: 'text-red-300' },
                            improvement: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/40', darkText: 'text-orange-300' },
                            integration: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/40', darkText: 'text-purple-300' },
                          };
                          const ts = typeStyles[post.type] || typeStyles.feature;
                          return (
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${d ? `${ts.darkBg} ${ts.darkText}` : `${ts.bg} ${ts.text}`}`}>
                              {post.type}
                            </span>
                          );
                        })()}
                      </td>
                      {/* Actions */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '24px' }} onClick={(e) => e.stopPropagation()}>
                        {isOwner && (
                          <div className="relative inline-block">
                            <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                              className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                              <MoreVertical className={`w-4 h-4 ${d ? 'text-gray-300' : 'text-gray-600'}`} />
                            </button>
                            {openMenuId === post.id && (
                              <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${
                                d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'
                              }`} style={{ minWidth: '160px' }}>
                                <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                                <button onClick={() => { openEditModal(post); setOpenMenuId(null); }}
                                  className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                                  <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Edit
                                </button>
                                <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                                <button onClick={() => { setDeleteConfirm({ id: post.id, title: post.title }); setOpenMenuId(null); }}
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
                              rowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
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
      </div>

      {/* Close overlays */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full flex flex-col ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '800px', maxHeight: 'calc(100vh - 32px)' }}>
            <div className={`flex items-center justify-between border-b shrink-0 ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '20px 24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create New Post</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ padding: '24px' }}>
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

                {/* Board & Type */}
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
                    className="px-5 py-2.5 bg-[#059669] text-white text-sm font-semibold rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-70">Publish Post</LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full flex flex-col ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '800px', maxHeight: 'calc(100vh - 32px)' }}>
            <div className={`flex items-center justify-between border-b shrink-0 ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '20px 24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Edit Post</h2>
              <button onClick={() => { setShowEditModal(false); setEditingPost(null); setEditContent(''); }} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ padding: '24px' }}>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <div className="relative">
                    <input type="text" value={editFormData.title} placeholder=" "
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      style={{ padding: '16.5px 14px' }}
                      className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                        d ? 'border-gray-700 bg-gray-800 text-white hover:border-gray-500 focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-gray-400'
                      }`} />
                    <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                      top-1/2 -translate-y-1/2
                      peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                      ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Title *</span>
                  </div>
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the title for your post.</p>
                </div>

                {/* Rich Text Editor */}
                <div>
                  <CommentEditor
                    key={editingPost.id}
                    initialContent={editContent}
                    onSubmit={() => handleUpdatePost()}
                    placeholder="Write your post content here..."
                    buttonLabel="Save"
                    submitting={updating}
                    hideButton
                    maxEditorHeight="450px"
                    onContentChange={(html) => setEditContent(html)}
                  />
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Minimum 10 characters required.</p>
                </div>

                {/* Board (read-only) & Type */}
                <div className="flex gap-4 relative z-[60]" style={{ marginTop: '20px' }}>
                  <div className="flex-1">
                    <div className={`w-full rounded-lg border flex items-center ${d ? 'border-gray-700 bg-gray-800/60' : 'border-gray-300 bg-gray-50'}`} style={{ padding: '16.5px 14px', height: '56px' }}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board</p>
                        <p className={`text-sm font-medium truncate ${d ? 'text-gray-300' : 'text-gray-700'}`}>{editingPost.board?.name || '—'}</p>
                      </div>
                    </div>
                    <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Board cannot be changed after creation.</p>
                  </div>
                  <div className="flex-1">
                    <CustomDropdown label="Type *" value={editFormData.type}
                      options={[{ value: 'feature', label: 'Feature' }, { value: 'bug', label: 'Bug' }, { value: 'improvement', label: 'Improvement' }, { value: 'integration', label: 'Integration' }]}
                      onChange={(v) => setEditFormData({ ...editFormData, type: v })} minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} portalMode />
                    <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Select the type of post.</p>
                  </div>
                </div>

                {/* Cancel + Save */}
                <div className="flex gap-3 justify-end pt-2">
                  <button onClick={() => { setShowEditModal(false); setEditingPost(null); setEditContent(''); }}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                  <LoadingButton loading={updating} onClick={handleUpdatePost}
                    className="px-5 py-2.5 bg-[#0C68E9] text-white text-sm font-semibold rounded-lg hover:bg-[#0b5dd0] transition-colors disabled:opacity-70">Save Changes</LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Preview Popup */}
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
              {hp.content && (() => {
                const text = stripImages(hp.content);
                return text ? (
                <div className={`text-xs leading-relaxed overflow-hidden ${d ? 'text-gray-400' : 'text-gray-500'}`}
                  style={{ display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical' as const }}>
                  {text}
                </div>) : null;
              })()}
            </div>
          </div>
        );
      })()}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl ${d ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="text-center py-12 px-6">
              <h2 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>Sign in</h2>
              <p className={`text-sm mb-8 ${d ? 'text-gray-400' : 'text-gray-600'}`}>Sign in to vote, comment, and create posts</p>
              <button onClick={() => { localStorage.setItem('loginRedirect', window.location.pathname); navigate('/login'); }}
                className="w-full px-4 py-3 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0] transition font-semibold mb-3">Continue with email</button>
              <p className={`text-sm mt-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                Don't have an account?{' '}
                <button onClick={() => { localStorage.setItem('loginRedirect', window.location.pathname); navigate('/register'); }}
                  className="text-[#0c68e9] font-medium hover:underline">Sign up</button>
              </p>
              <button onClick={() => setShowLoginModal(false)}
                className={`mt-4 text-sm ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

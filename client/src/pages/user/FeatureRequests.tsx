import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight, MessageSquare } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';

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
  author: { id?: string; name: string; avatar?: string };
  board: { id: string; name: string; slug?: string };
  tags?: { tag: { id: string; name: string; color: string } }[];
  hasVoted?: boolean;
  _count?: { comments: number };
}

interface Board {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  planned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  live: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
  hold: 'bg-red-100 text-red-700',
};

const TYPE_FILTERS = [
  { label: 'All Types', value: 'all' },
  { label: 'Feature', value: 'feature' },
  { label: 'Bug', value: 'bug' },
  { label: 'Improvement', value: 'improvement' },
  { label: 'Integration', value: 'integration' },
];

const STATUS_FILTERS = [
  { label: 'All Status', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Live', value: 'live' },
];

export default function UserFeatureRequests() {
  const theme = useThemeStore((state) => state.theme);
  const { init, toggle, votes } = useVoteStore();
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [postsRes, boardsRes] = await Promise.all([
        api.get('/posts', { params: { limit: 50 } }),
        api.get('/boards'),
      ]);
      if (postsRes.data.success) {
        const fetchedPosts = postsRes.data.data.posts;
        setPosts(fetchedPosts);
        fetchedPosts.forEach((p: Post) => init(p.id, p.voteCount ?? 0, p.hasVoted ?? false));
      }
      if (boardsRes.data.success) {
        setBoards(boardsRes.data.data.boards);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId: string) => {
    toggle(postId);
    setAnimatingPosts(prev => { const next = new Set(prev); next.add(postId); return next; });
    setTimeout(() => setAnimatingPosts(prev => { const next = new Set(prev); next.delete(postId); return next; }), 400);

    try {
      const isVoted = votes[postId]?.voted;
      if (isVoted) {
        await api.delete(`/votes/${postId}`);
      } else {
        await api.post(`/votes/${postId}`);
      }
    } catch (error) {
      toggle(postId);
      console.error('Vote error:', error);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (boardFilter !== 'all' && p.board?.id !== boardFilter) return false;
    return true;
  });

  const hasFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || boardFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setBoardFilter('all');
  };

  return (
    <UserLayout>
      <style>{`@keyframes slideUpCount { 0% { opacity: 0; transform: translateY(8px) scale(0.85); } 60% { opacity: 1; transform: translateY(-2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Feature Requests</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Vote on features you want to see, or submit your own ideas
          </p>
        </div>

        {/* Filters */}
        <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[180px] max-w-[280px] ${
              d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by title..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
              {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
              {TYPE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <select value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
              <option value="all">All Boards</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600">
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingBar />
        ) : (
          <div className={`rounded-xl border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full table-fixed">
              <thead>
                <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  {['Upvote', 'Post', 'Board', 'Status', 'Comments'].map((h, i) => (
                    <th key={h} className={`font-semibold uppercase tracking-wider text-left ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px',
                        color: d ? undefined : '#1C252E',
                        padding: '16px',
                        paddingLeft: i === 0 ? '24px' : '16px',
                        paddingRight: i === 4 ? '24px' : '16px',
                        width: i === 0 ? '120px' : i === 2 ? '300px' : i === 3 ? '180px' : i === 4 ? '200px' : undefined,
                        textAlign: i === 4 ? 'right' as const : 'left' as const,
                      }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                  <tr key={post.id} onClick={() => navigate(`/user/posts/${post.slug}`)}
                    className={`border-t transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    {/* Upvote */}
                    <td className="py-4" style={{ paddingLeft: '24px', paddingRight: '12px', width: '120px' }}
                      onClick={(e) => { e.stopPropagation(); handleVote(post.id); }}>
                      <div
                        className="inline-flex flex-col items-center justify-center h-11 rounded-lg border font-bold transition-all cursor-pointer overflow-hidden"
                        style={{
                          width: '56px',
                          fontSize: '13px',
                          gap: '1px',
                          backgroundColor: votes[post.id]?.voted ? '#1c252e' : 'transparent',
                          borderColor: votes[post.id]?.voted ? '#1c252e' : (d ? '#4b5563' : '#e5e7eb'),
                          color: votes[post.id]?.voted ? '#ffffff' : (d ? '#d1d5db' : '#374151'),
                        }}
                        onMouseEnter={e => { if (!votes[post.id]?.voted) e.currentTarget.style.borderColor = '#1c252e'; }}
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
                    {/* Title + description */}
                    <td className="px-5 py-4 max-w-0 overflow-hidden">
                      <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                      {post.description && (
                        <p className={`text-xs truncate mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>
                      )}
                    </td>
                    {/* Board */}
                    <td className={`px-5 py-4 text-sm max-w-0 overflow-hidden ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="truncate block">{post.board?.name || '-'}</span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-700'}`}>
                        {post.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {/* Comments */}
                    <td className="py-4" style={{ paddingRight: '24px', textAlign: 'right' }}>
                      <div className={`inline-flex items-center gap-1.5 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        <MessageSquare className="w-4 h-4" />
                        {post.commentCount ?? post._count?.comments ?? 0}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className={`px-5 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      No feature requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Layout, TrendingUp, ArrowUpRight } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';

interface Board {
  id: string;
  name: string;
  slug: string;
  color?: string;
  description?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  description?: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  board?: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  planned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  live: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  hold: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', under_review: 'Under Review', planned: 'Planned',
  in_progress: 'In Progress', live: 'Live', closed: 'Closed', hold: 'On Hold',
};

export default function UserDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const d = theme === 'dark';
  const { votes, init, toggle } = useVoteStore();

  const [boards, setBoards] = useState<Board[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingPosts, setAnimatingPosts] = useState<Set<string>>(new Set());

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const boardsRes = await api.get('/boards');
      setBoards(boardsRes.data?.data?.boards || []);

      const postsRes = await api.get('/posts', { params: { limit: 5, sortBy: 'voteCount', order: 'desc' } });
      const postList: Post[] = postsRes.data?.data?.posts || [];
      setPosts(postList);

      // Seed global vote store
      postList.forEach((p: any) => init(p.id, p.voteCount || 0, p.hasVoted ?? false));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = (postId: string) => {
    toggle(postId);
    setAnimatingPosts(prev => { const next = new Set(prev); next.add(postId); return next; });
    setTimeout(() => setAnimatingPosts(prev => { const next = new Set(prev); next.delete(postId); return next; }), 400);
  };

  const statCards = [
    {
      label: 'Total Boards',
      value: boards.length,
      icon: Layout,
      iconColor: 'text-orange-400',
      glowColor: 'linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(255,255,255,0.0) 100%)',
    },
    {
      label: 'Total Posts',
      value: posts.length,
      icon: MessageSquare,
      iconColor: 'text-blue-400',
      glowColor: 'linear-gradient(180deg, rgba(96,165,250,0.15) 0%, rgba(255,255,255,0.0) 100%)',
    },
    {
      label: 'Total Votes',
      value: Object.values(votes).reduce((s, v) => s + v.count, 0),
      icon: ThumbsUp,
      iconColor: 'text-cyan-400',
      glowColor: 'linear-gradient(180deg, rgba(34,211,238,0.15) 0%, rgba(255,255,255,0.0) 100%)',
    },
    {
      label: 'Active Boards',
      value: boards.length,
      icon: TrendingUp,
      iconColor: 'text-green-500',
      glowColor: 'linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(255,255,255,0.0) 100%)',
    },
  ];

  if (loading) {
    return (
      <UserLayout>
        <LoadingBar />
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <style>{`@keyframes slideUpCount { 0% { opacity: 0; transform: translateY(8px) scale(0.85); } 60% { opacity: 1; transform: translateY(-2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>
            Dashboard
          </h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Welcome back, {user?.name} — here's an overview of your boards
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`relative flex items-center justify-between overflow-hidden rounded-2xl border ${
                  d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                }`}
                style={{ padding: '24px 20px 24px 24px', background: d ? undefined : '#FFFFFF', boxShadow: d ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                {/* Left: number + label */}
                <div className="relative z-10">
                  <p className={`font-extrabold mb-1 leading-none ${d ? 'text-white' : ''}`}
                    style={{ fontSize: '28px', color: d ? undefined : '#1c252e' }}>
                    {card.value}
                  </p>
                  <p className={`text-sm font-medium mt-1.5 ${d ? 'text-gray-400' : ''}`}
                    style={!d ? { color: '#637381' } : {}}>
                    {card.label}
                  </p>
                </div>
                {/* Right: rotated square diamond */}
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    width: '110px',
                    height: '110px',
                    right: '-30px',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(45deg)',
                    borderRadius: '16px',
                    background: card.glowColor,
                  }}
                >
                  <Icon className={`w-7 h-7 ${card.iconColor}`} style={{ transform: 'rotate(-45deg)', marginRight: '20px' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Posts */}
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`border-b ${d ? 'border-gray-700' : 'border-gray-100'}`} style={{ padding: '24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Top Posts (Most Voted)</h2>
          </div>
          <table className="w-full table-fixed">
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                {['Upvote', 'Post', 'Board', 'Status', 'Comments'].map((h, i) => (
                  <th key={h} className={`font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : ''}`}
                    style={{ fontSize: '14px', color: d ? undefined : '#1C252E', padding: '16px', paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 0 ? '12px' : i === 4 ? '24px' : '16px', width: i === 0 ? '120px' : i === 2 ? '300px' : i === 3 ? '180px' : i === 4 ? '200px' : undefined, textAlign: i === 4 ? 'right' as const : 'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.length > 0 ? posts.map((post) => (
                <tr key={post.id} onClick={() => navigate(`/user/posts/${post.slug}`)}
                  className={`border-t transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                  {/* Upvote */}
                  <td className="py-4" style={{ paddingLeft: '24px', paddingRight: '12px', width: '120px' }}
                    onClick={(e) => { e.stopPropagation(); handleVote(post.id); }}>
                    <div
                      className={`inline-flex flex-col items-center justify-center h-11 rounded-lg border font-bold transition-all cursor-pointer overflow-hidden`}
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
                        {votes[post.id]?.count ?? post.voteCount}
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
                    <span className="truncate block">{post.board?.name || '—'}</span>
                  </td>
                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                  </td>
                  {/* Comments */}
                  <td className="py-4" style={{ paddingRight: '24px', textAlign: 'right' }}>
                    <div className={`inline-flex items-center gap-1.5 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      <MessageSquare className="w-4 h-4" />
                      {post.commentCount}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className={`px-5 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No posts yet</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
      </div>
    </UserLayout>
  );
}

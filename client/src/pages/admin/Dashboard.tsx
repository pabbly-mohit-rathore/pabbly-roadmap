import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ArrowUpRight, MessageSquare, Users, Layout, TrendingUp, BarChart2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';

interface DashboardStats {
  totalPosts: number;
  totalVotes: number;
  totalUsers: number;
  totalBoards: number;
  activeUsers: number;
  totalComments?: number;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  description?: string;
  hasVoted?: boolean;
  voteCount?: number;
  board?: { name: string };
  _count: {
    votes?: number;
    comments: number;
  };
}

const STAT_CONFIG: Record<string, { iconColor: string; glowColor: string; icon: React.ElementType }> = {
  'Total Posts':    { iconColor: 'text-blue-400',   glowColor: 'linear-gradient(180deg, rgba(96,165,250,0.15) 0%, rgba(255,255,255,0.0) 100%)',  icon: MessageSquare },
  'Total Votes':    { iconColor: 'text-cyan-400',   glowColor: 'linear-gradient(180deg, rgba(34,211,238,0.15) 0%, rgba(255,255,255,0.0) 100%)',  icon: ThumbsUp },
  'Total Users':    { iconColor: 'text-purple-400', glowColor: 'linear-gradient(180deg, rgba(167,139,250,0.15) 0%, rgba(255,255,255,0.0) 100%)', icon: Users },
  'Active Users':   { iconColor: 'text-orange-400', glowColor: 'linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(255,255,255,0.0) 100%)',  icon: TrendingUp },
  'Total Boards':   { iconColor: 'text-green-500',  glowColor: 'linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(255,255,255,0.0) 100%)',   icon: Layout },
  'Total Comments': { iconColor: 'text-indigo-400', glowColor: 'linear-gradient(180deg, rgba(129,140,248,0.15) 0%, rgba(255,255,255,0.0) 100%)', icon: BarChart2 },
};

export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const { init, toggle, votes } = useVoteStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingPosts, setAnimatingPosts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const d = theme === 'dark';

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, postsResponse] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/top-posts?limit=5'),
      ]);
      if (statsResponse.data.success) setStats(statsResponse.data.data.stats);
      if (postsResponse.data.success) {
        const posts = postsResponse.data.data.posts;
        setTopPosts(posts);
        posts.forEach((p: Post) => init(p.id, p.voteCount ?? p._count.votes ?? 0, p.hasVoted ?? false));
      }
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

  const statsCards = [
    { label: 'Total Posts', value: stats?.totalPosts },
    { label: 'Total Votes', value: stats?.totalVotes },
    { label: 'Total Users', value: stats?.totalUsers },
    { label: 'Active Users', value: stats?.activeUsers },
    { label: 'Total Boards', value: stats?.totalBoards },
    { label: 'Total Comments', value: stats?.totalComments || 0 },
  ];

  const getStatusColor = (status: string) => {
    const c: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      planned: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-orange-100 text-orange-700',
      live: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
      hold: 'bg-red-100 text-red-700',
    };
    return c[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <style>{`@keyframes slideUpCount { 0% { opacity: 0; transform: translateY(8px) scale(0.85); } 60% { opacity: 1; transform: translateY(-2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>Overview of your platform performance</p>
      </div>

      {loading ? (
        <LoadingBar />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statsCards.map((card) => {
              const cfg = STAT_CONFIG[card.label] || { iconColor: 'text-gray-400', glowColor: 'rgba(156,163,175,0.2)', icon: BarChart2 };
              const Icon = cfg.icon;
              return (
                <div key={card.label}
                  className={`relative flex items-center justify-between overflow-hidden rounded-2xl border ${
                    d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`}
                  style={{ padding: '24px 20px 24px 24px', background: d ? undefined : '#FFFFFF', boxShadow: d ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  <div className="relative z-10">
                    <p className={`font-extrabold mb-1 leading-none ${d ? 'text-white' : ''}`}
                      style={{ fontSize: '28px', color: d ? undefined : '#1c252e' }}>
                      {card.value ?? 0}
                    </p>
                    <p className={`text-sm font-medium mt-1.5 ${d ? 'text-gray-400' : ''}`}
                      style={!d ? { color: '#637381' } : {}}>{card.label}</p>
                  </div>
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      width: '110px',
                      height: '110px',
                      right: '-30px',
                      top: '50%',
                      transform: 'translateY(-50%) rotate(45deg)',
                      borderRadius: '16px',
                      background: cfg.glowColor,
                    }}
                  >
                    <Icon className={`w-7 h-7 ${cfg.iconColor}`} style={{ transform: 'rotate(-45deg)', marginRight: '20px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Posts - Table */}
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
                {topPosts.length > 0 ? topPosts.map((post) => (
                  <tr key={post.id} onClick={() => navigate(`/admin/posts/${post.slug}`)}
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
                          {votes[post.id]?.count ?? post.voteCount ?? post._count.votes ?? 0}
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
                      <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${getStatusColor(post.status)}`}>
                        {post.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {/* Comments */}
                    <td className="py-4" style={{ paddingRight: '24px', textAlign: 'right' }}>
                      <div className={`inline-flex items-center gap-1.5 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        <MessageSquare className="w-4 h-4" />
                        {post._count.comments}
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
        </>
      )}
    </div>
  );
}

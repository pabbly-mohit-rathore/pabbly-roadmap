import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Layout, TrendingUp, ArrowUpRight, MessageCircle } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

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

  const [boards, setBoards] = useState<Board[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get boards user has access to
      const boardsRes = await api.get('/boards');
      const boardList: Board[] = boardsRes.data?.data?.boards || [];
      setBoards(boardList);

      // Get top posts from those boards
      const postsRes = await api.get('/posts', {
        params: { limit: 5, sortBy: 'voteCount', order: 'desc' },
      });
      const postList: Post[] = postsRes.data?.data?.posts || [];
      setPosts(postList);

      // Total votes across all top posts
      const votes = postList.reduce((sum: number, p: Post) => sum + (p.voteCount || 0), 0);
      setTotalVotes(votes);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
      value: totalVotes,
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
        <div className="text-center py-12 text-gray-400">Loading dashboard...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
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
          <table className="w-full">
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                {['Upvote', 'Post', 'Status', 'Board', 'Comments'].map((h, i) => (
                  <th key={h} className={`text-left font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : ''}`}
                    style={{ fontSize: '14px', color: d ? undefined : '#1C252E', padding: '16px', paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 0 ? '12px' : i === 4 ? '24px' : '16px', width: i === 0 ? '120px' : i === 4 ? '200px' : undefined, textAlign: i === 3 || i === 4 ? 'right' as const : 'left' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.length > 0 ? posts.map((post) => (
                <tr key={post.id} onClick={() => navigate(`/user/posts/${post.slug}`)}
                  className={`border-t transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                  {/* Upvote */}
                  <td className="py-4" style={{ paddingLeft: '24px', paddingRight: '12px', width: '120px' }}>
                    <div className={`inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg border text-xs font-bold gap-0.5 ${
                      d ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'
                    }`}>
                      <ArrowUpRight className="w-3 h-3 rotate-[-45deg]" />
                      {post.voteCount}
                    </div>
                  </td>
                  {/* Title + description */}
                  <td className="px-5 py-4 max-w-xs">
                    <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                    {post.description && (
                      <p className={`text-xs truncate mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                  </td>
                  {/* Board */}
                  <td className={`px-5 py-4 text-sm text-right ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    {post.board?.name || '—'}
                  </td>
                  {/* Comments */}
                  <td className="py-4" style={{ paddingRight: '24px', textAlign: 'right' }}>
                    <div className={`inline-flex items-center gap-1.5 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      <MessageCircle className="w-4 h-4" />
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

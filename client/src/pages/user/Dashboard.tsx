import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, ThumbsUp, Layout, TrendingUp } from 'lucide-react';
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
      color: 'bg-blue-50 text-blue-600',
      desc: 'Boards you have access to',
    },
    {
      label: 'Total Posts',
      value: posts.length,
      icon: MessageSquare,
      color: 'bg-purple-50 text-purple-600',
      desc: 'Across your boards',
    },
    {
      label: 'Total Votes',
      value: totalVotes,
      icon: ThumbsUp,
      color: 'bg-green-50 text-green-600',
      desc: 'Votes on top posts',
    },
    {
      label: 'Active Boards',
      value: boards.length,
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600',
      desc: 'Currently active',
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
          <div className="flex items-center gap-3 mb-1">
            <LayoutDashboard className={`w-7 h-7 ${d ? 'text-white' : 'text-gray-900'}`} />
            <h1 className={`text-3xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>
              Dashboard
            </h1>
          </div>
          <p className={`text-sm ml-10 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
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
                className={`p-5 rounded-xl border ${
                  d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                    {card.label}
                  </p>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className={`text-3xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>
                  {card.value}
                </p>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{card.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Top Posts */}
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${d ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className={`text-base font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>Top Posts (Most Voted)</h2>
            </div>
            <div className="divide-y">
              {posts.length > 0 ? posts.map((post, idx) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/user/posts/${post.slug}`)}
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                    d ? 'divide-gray-700 hover:bg-gray-700' : 'divide-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-bold w-5 ${d ? 'text-blue-400' : 'text-blue-600'}`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-gray-900'}`}>
                      {post.title}
                    </p>
                    {post.board && (
                      <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{post.board.name}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_LABELS[post.status] || post.status}
                  </span>
                  <div className={`flex items-center gap-3 text-xs flex-shrink-0 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>👍 {post.voteCount}</span>
                    <span>💬 {post.commentCount}</span>
                  </div>
                </div>
              )) : (
                <p className={`text-sm text-center py-6 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  No posts yet
                </p>
              )}
            </div>
          </div>
      </div>
    </UserLayout>
  );
}

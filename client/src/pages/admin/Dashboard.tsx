import { useEffect, useState } from 'react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

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
  _count: {
    votes: number;
    comments: number;
  };
}

const STAT_CONFIG: Record<string, { color: string; sub: string }> = {
  'Total Posts': { color: 'text-blue-600', sub: 'All feedback posts' },
  'Total Votes': { color: 'text-green-600', sub: 'Votes received' },
  'Total Users': { color: 'text-purple-600', sub: 'Registered users' },
  'Active Users': { color: 'text-orange-500', sub: 'Active this period' },
  'Total Boards': { color: 'text-red-500', sub: 'Product boards' },
  'Total Comments': { color: 'text-indigo-600', sub: 'Comments made' },
};

export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const d = theme === 'dark';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, postsResponse] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/top-posts?limit=5'),
      ]);
      if (statsResponse.data.success) setStats(statsResponse.data.data.stats);
      if (postsResponse.data.success) setTopPosts(postsResponse.data.data.posts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-4xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>Overview of your platform performance</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading dashboard...</div>
      ) : (
        <>
          {/* Stats Cards - Pabbly PM Style */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statsCards.map((card) => {
              const cfg = STAT_CONFIG[card.label] || { color: 'text-gray-900', sub: '' };
              return (
                <div key={card.label}
                  className={`p-5 rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <p className={`text-sm font-medium mb-2 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{card.label}</p>
                  <p className={`text-3xl font-bold mb-1 ${cfg.color}`}>{card.value ?? 0}</p>
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{cfg.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Top Posts - Table */}
          <div className={`rounded-xl border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="px-4 py-4">
              <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Top Posts (Most Voted)</h2>
            </div>
            <table className="w-full">
              <thead className={d ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  {['#', 'Title', 'Status', 'Votes', 'Comments'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPosts.length > 0 ? topPosts.map((post, index) => (
                  <tr key={post.id} className={`border-t transition ${d ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700'
                        : index === 1 ? 'bg-gray-100 text-gray-600'
                        : index === 2 ? 'bg-orange-100 text-orange-700'
                        : d ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className={`px-4 py-3.5 text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{post.title}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusColor(post.status)}`}>
                        {post.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-sm font-semibold ${d ? 'text-teal-400' : 'text-teal-600'}`}>
                      👍 {post._count.votes}
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      💬 {post._count.comments}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className={`px-4 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No posts yet</td>
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

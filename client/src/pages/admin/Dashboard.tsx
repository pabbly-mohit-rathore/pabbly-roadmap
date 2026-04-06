import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, ArrowUpRight, MessageSquare, Users, Layout, TrendingUp, BarChart2 } from 'lucide-react';
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

const STAT_CONFIG: Record<string, { iconBg: string; iconColor: string; icon: React.ElementType }> = {
  'Total Posts':    { iconBg: 'bg-blue-50',   iconColor: 'text-blue-400',   icon: MessageSquare },
  'Total Votes':    { iconBg: 'bg-cyan-50',   iconColor: 'text-cyan-400',   icon: ThumbsUp },
  'Total Users':    { iconBg: 'bg-purple-50', iconColor: 'text-purple-400', icon: Users },
  'Active Users':   { iconBg: 'bg-orange-50', iconColor: 'text-orange-400', icon: TrendingUp },
  'Total Boards':   { iconBg: 'bg-green-50',  iconColor: 'text-green-500',  icon: Layout },
  'Total Comments': { iconBg: 'bg-indigo-50', iconColor: 'text-indigo-400', icon: BarChart2 },
};

export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
        <h1 className={`text-2xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>Overview of your platform performance</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading dashboard...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statsCards.map((card) => {
              const cfg = STAT_CONFIG[card.label] || { iconBg: 'bg-gray-50', iconColor: 'text-gray-400', icon: BarChart2 };
              const Icon = cfg.icon;
              return (
                <div key={card.label}
                  className={`relative p-5 rounded-2xl border flex items-start justify-between overflow-hidden ${
                    d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`}
                  style={{ boxShadow: d ? 'none' : '0 1px 8px rgba(0,0,0,0.05)' }}
                >
                  <div>
                    <p className={`text-4xl font-extrabold mb-1.5 tracking-tight ${d ? 'text-white' : 'text-gray-900'}`}>
                      {card.value ?? 0}
                    </p>
                    <p className={`text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    d ? 'bg-gray-700' : cfg.iconBg
                  }`}>
                    <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Posts - Table */}
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="px-5 py-4">
              <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Top Posts (Most Voted)</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12 ${d ? 'text-gray-400' : 'text-gray-500'}`}>S.No</th>
                  <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Title</th>
                  <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider w-28 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Votes</th>
                  <th className={`px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider w-28 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Comments</th>
                  <th className={`px-5 py-3 w-10`}></th>
                </tr>
              </thead>
              <tbody>
                {topPosts.length > 0 ? topPosts.map((post, index) => (
                  <tr key={post.id} onClick={() => navigate(`/admin/posts/${post.slug}`)}
                    className={`border-t transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`px-5 py-4 text-sm font-medium ${d ? 'text-blue-400' : 'text-blue-600'}`}>{index + 1}</td>
                    <td className={`px-5 py-4 text-sm font-medium max-w-xs truncate ${d ? 'text-white' : 'text-gray-900'}`}>
                      {post.title}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${getStatusColor(post.status)}`}>
                        {post.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${d ? 'text-blue-400' : 'text-blue-600'}`}>
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {post._count.votes}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        <MessageCircle className="w-3.5 h-3.5" />
                        {post._count.comments}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ArrowUpRight className={`w-4 h-4 ${d ? 'text-gray-600' : 'text-gray-300'}`} />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className={`px-5 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No posts yet</td>
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

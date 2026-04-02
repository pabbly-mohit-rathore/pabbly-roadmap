import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare, Activity, Target } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

interface DashboardStats {
  totalPosts: number;
  totalVotes: number;
  totalUsers: number;
  totalBoards: number;
  activeUsers: number;
  engagementRate: number;
  avgPostsPerBoard: number;
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


export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, postsResponse] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/top-posts?limit=5'),
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data.stats);
      }
      if (postsResponse.data.success) {
        setTopPosts(postsResponse.data.data.posts);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { label: 'Total Posts', value: stats?.totalPosts, icon: MessageSquare, color: 'bg-blue-500' },
    { label: 'Total Votes', value: stats?.totalVotes, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'bg-purple-500' },
    { label: 'Active Users', value: stats?.activeUsers, icon: Activity, color: 'bg-orange-500' },
    { label: 'Total Boards', value: stats?.totalBoards, icon: Target, color: 'bg-red-500' },
    { label: 'Total Comments', value: stats?.totalComments || 0, icon: BarChart3, color: 'bg-indigo-500' },
  ];

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-orange-100 text-orange-800',
      live: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      hold: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-12">
        <h1 className={`text-4xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Dashboard
        </h1>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Overview of your platform performance
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading dashboard...</div>
      ) : (
        <>
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`p-6 rounded-lg border overflow-hidden relative ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-16 h-16 ${card.color} opacity-10 rounded-full -mr-4 -mt-4`} />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {card.label}
                    </p>
                    <Icon className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className={`text-3xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  } relative z-10`}>
                    {card.value ?? 0}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Top Posts Section */}
          <div className={`p-6 rounded-lg border mb-12 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Top Posts (Most Voted)
            </h2>
            <div className="space-y-4">
              {topPosts.map((post, index) => (
                <div
                  key={post.id}
                  className={`p-4 rounded-lg flex items-start justify-between ${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                  } transition-colors cursor-pointer`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {post.title}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                    }`}>
                      👍 {post._count.votes}
                    </div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      💬 {post._count.comments}
                    </div>
                  </div>
                </div>
              ))}
              {topPosts.length === 0 && (
                <div className={`text-center py-8 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No posts yet
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}

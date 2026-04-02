import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare, Activity } from 'lucide-react';
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

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminReporting() {
  const theme = useThemeStore((state) => state.theme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [statsResponse, postsResponse, activitiesResponse] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/top-posts?limit=5'),
        api.get('/activity-log?limit=20'),
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data.stats);
      }
      if (postsResponse.data.success) {
        setTopPosts(postsResponse.data.data.posts);
      }
      if (activitiesResponse.data.success) {
        setRecentActivities(activitiesResponse.data.data.activities);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reportCards = [
    { label: 'Total Posts', value: stats?.totalPosts, icon: MessageSquare },
    { label: 'Total Votes', value: stats?.totalVotes, icon: TrendingUp },
    { label: 'Total Users', value: stats?.totalUsers, icon: Users },
    { label: 'Active Users', value: stats?.activeUsers, icon: Users },
  ];

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-800';
    if (action.includes('deleted')) return 'bg-red-100 text-red-800';
    if (action.includes('voted')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-12">
        <h1 className={`text-4xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Reporting & Analytics
        </h1>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Analyze platform metrics and trends
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : (
        <>
          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {reportCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {card.label}
                    </p>
                    <Icon className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                    }`} />
                  </div>
                  <p className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Engagement Metrics */}
            <div className={`p-6 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Key Metrics
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Engagement Rate
                  </span>
                  <span className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats?.engagementRate.toFixed(2) || '0'}x
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Avg Posts per Board
                  </span>
                  <span className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats?.avgPostsPerBoard.toFixed(1) || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Avg Votes per Post
                  </span>
                  <span className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats?.totalPosts ? (stats.totalVotes / stats.totalPosts).toFixed(1) : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className={`p-6 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                System Health
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      User Participation
                    </span>
                    <span className={`text-sm font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats?.totalUsers ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{
                        width: stats?.totalUsers ? `${(stats.activeUsers / stats.totalUsers) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Platform Status
                    </span>
                    <span className={`text-sm font-bold text-green-600`}>
                      Operational
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      All systems operational
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Posts */}
          <div className={`p-6 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Top Posts
            </h2>
            <div className="space-y-3">
              {topPosts.map((post) => (
                <div
                  key={post.id}
                  className={`p-4 rounded-lg flex justify-between items-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className={`font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {post.title}
                    </p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Status: {post.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                    }`}>
                      {post._count.votes} votes
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {post._count.comments} comments
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className={`p-6 rounded-lg border mt-8 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Activity Log
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-4 rounded-lg border-l-4 border-gray-300 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getActionColor(activity.action)}`}>
                          {activity.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          by {activity.user.name}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {activity.description}
                      </p>
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className={`text-center py-8 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No activities yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

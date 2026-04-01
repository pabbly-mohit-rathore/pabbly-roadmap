import { useEffect, useState } from 'react';
import { Eye, MessageSquare, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: Eye,
      label: 'Total Posts',
      value: stats?.totalPosts || 0,
      change: '+12%',
      trend: 'up',
      color: 'teal',
    },
    {
      icon: MessageSquare,
      label: 'Total Votes',
      value: stats?.totalVotes || 0,
      change: '+8%',
      trend: 'up',
      color: 'blue',
    },
    {
      icon: Users,
      label: 'Active Users',
      value: stats?.activeUsers || 0,
      change: '+5%',
      trend: 'up',
      color: 'green',
    },
    {
      icon: TrendingUp,
      label: 'Engagement Rate',
      value: stats?.engagementRate.toFixed(2) || '0',
      change: '+3%',
      trend: 'up',
      color: 'purple',
      suffix: 'x',
    },
  ];

  const getColorClasses = (color: string, isDark: boolean) => {
    const colors: { [key: string]: { bg: string; text: string; border: string } } = {
      teal: {
        bg: isDark ? 'bg-teal-500/10' : 'bg-teal-50',
        text: isDark ? 'text-teal-400' : 'text-teal-600',
        border: isDark ? 'border-teal-500/20' : 'border-teal-200',
      },
      blue: {
        bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
        text: isDark ? 'text-blue-400' : 'text-blue-600',
        border: isDark ? 'border-blue-500/20' : 'border-blue-200',
      },
      purple: {
        bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
        text: isDark ? 'text-purple-400' : 'text-purple-600',
        border: isDark ? 'border-purple-500/20' : 'border-purple-200',
      },
      green: {
        bg: isDark ? 'bg-green-500/10' : 'bg-green-50',
        text: isDark ? 'text-green-400' : 'text-green-600',
        border: isDark ? 'border-green-500/20' : 'border-green-200',
      },
    };
    return colors[color] || colors.teal;
  };

  return (
    <div>
      <h1 className={`text-3xl font-bold mb-8 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color, theme === 'dark');
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          const trendColor = stat.trend === 'up' ? 'text-green-500' : 'text-red-500';

          return (
            <div
              key={stat.label}
              className={`p-6 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <p className={`text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {stat.label}
              </p>
              <h3 className={`text-3xl font-bold mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stat.value}{stat.suffix || ''}
              </h3>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                From last month
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Voted Posts */}
        <div className={`lg:col-span-2 p-6 rounded-xl border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Top Voted Posts
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`p-3 rounded-lg flex justify-between items-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Post Title #{i}
                  </p>
                  <p className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Posted on {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                  }`}>
                    {100 - i * 10} votes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`p-6 rounded-xl border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Recent Activity
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  User posted feedback
                </p>
                <p>2 hours ago</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

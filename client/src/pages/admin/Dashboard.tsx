import { TrendingUp, MessageSquare, ThumbsUp, Users } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);

  const stats = [
    {
      icon: MessageSquare,
      label: 'Total Posts',
      value: '1,234',
      change: '+12% from last month',
      color: 'teal',
    },
    {
      icon: ThumbsUp,
      label: 'Total Votes',
      value: '5,678',
      change: '+8% from last month',
      color: 'blue',
    },
    {
      icon: Users,
      label: 'Total Users',
      value: '342',
      change: '+5% from last month',
      color: 'purple',
    },
    {
      icon: TrendingUp,
      label: 'Engagement Rate',
      value: '78%',
      change: '+3% from last month',
      color: 'green',
    },
  ];

  const getColorClasses = (color: string, isDark: boolean) => {
    const colors: { [key: string]: { bg: string; text: string } } = {
      teal: {
        bg: isDark ? 'bg-teal-900/30' : 'bg-teal-50',
        text: isDark ? 'text-teal-400' : 'text-teal-600',
      },
      blue: {
        bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50',
        text: isDark ? 'text-blue-400' : 'text-blue-600',
      },
      purple: {
        bg: isDark ? 'bg-purple-900/30' : 'bg-purple-50',
        text: isDark ? 'text-purple-400' : 'text-purple-600',
      },
      green: {
        bg: isDark ? 'bg-green-900/30' : 'bg-green-50',
        text: isDark ? 'text-green-400' : 'text-green-600',
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color, theme === 'dark');

          return (
            <div
              key={stat.label}
              className={`p-6 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
              </div>
              <p className={`text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {stat.label}
              </p>
              <h3 className={`text-2xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stat.value}
              </h3>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {stat.change}
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

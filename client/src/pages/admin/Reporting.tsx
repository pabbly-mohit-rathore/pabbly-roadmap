import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, ThumbsUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

interface ActivityData {
  posts: { count: number; change: number };
  votes: { count: number; change: number };
  comments: { count: number; change: number };
}

interface NewPost {
  id: string;
  title: string;
  slug: string;
  voteCount: number;
  createdAt: string;
  board: { name: string };
}

interface StalePost {
  id: string;
  title: string;
  slug: string;
  status: string;
  voteCount: number;
  updatedAt: string;
  board: { name: string };
}

interface BoardData {
  name: string;
  color: string;
  count: number;
}

interface AdminData {
  id: string;
  name: string;
  email: string;
  _count: { votes: number; posts: number; comments: number };
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: { name: string; email: string };
  post?: { title: string } | null;
  board?: { name: string } | null;
}

export default function AdminReporting() {
  const theme = useThemeStore((state) => state.theme);
  const [period, setPeriod] = useState('week');
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [newPosts, setNewPosts] = useState<NewPost[]>([]);
  const [stalePosts, setStalePosts] = useState<StalePost[]>([]);
  const [boardData, setBoardData] = useState<{ boards: BoardData[]; total: number }>({ boards: [], total: 0 });
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [period]);

  useEffect(() => {
    fetchActivityLogs();
  }, [logPage, logRowsPerPage]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [actRes, newRes, staleRes, boardRes, adminRes] = await Promise.all([
        api.get('/reporting/activity-overview', { params: { period } }),
        api.get('/reporting/new-posts', { params: { period } }),
        api.get('/reporting/stale-posts'),
        api.get('/reporting/posts-by-board', { params: { period } }),
        api.get('/reporting/admin-activity', { params: { period } }),
      ]);
      if (actRes.data.success) setActivity(actRes.data.data);
      if (newRes.data.success) setNewPosts(newRes.data.data.posts);
      if (staleRes.data.success) setStalePosts(staleRes.data.data.posts);
      if (boardRes.data.success) setBoardData(boardRes.data.data);
      if (adminRes.data.success) setAdmins(adminRes.data.data.admins);
      fetchActivityLogs();
    } catch (error) {
      console.error('Error fetching reporting:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const res = await api.get('/activity-log', {
        params: { limit: logRowsPerPage, offset: logPage * logRowsPerPage },
      });
      if (res.data.success) {
        setActivityLogs(res.data.data.activities);
        setLogTotal(res.data.data.pagination?.total || res.data.data.activities.length);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const getActionBadge = (action: string) => {
    const config: Record<string, string> = {
      created: 'bg-green-100 text-green-700',
      updated: 'bg-blue-100 text-blue-700',
      status_changed: 'bg-purple-100 text-purple-700',
      commented: 'bg-yellow-100 text-yellow-700',
      voted: 'bg-pink-100 text-pink-700',
      merged: 'bg-indigo-100 text-indigo-700',
      member_added: 'bg-teal-100 text-teal-700',
      member_removed: 'bg-red-100 text-red-700',
      user_banned: 'bg-red-100 text-red-700',
      user_unbanned: 'bg-green-100 text-green-700',
    };
    return config[action] || 'bg-gray-100 text-gray-700';
  };

  const totalLogPages = Math.ceil(logTotal / logRowsPerPage);

  const StatCard = ({ label, count, change }: { label: string; count: number; change: number }) => (
    <div className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <div className="flex items-end gap-3">
        <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{count}</span>
        <span className={`flex items-center gap-1 text-xs font-semibold mb-1 ${
          change >= 0 ? 'text-green-600' : 'text-red-500'
        }`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change >= 0 ? '+' : ''}{change}%
        </span>
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    const c: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      planned: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-orange-100 text-orange-700',
    };
    return c[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <div className="text-center py-12">Loading reporting...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reporting</h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Platform activity and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
            }`}>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Activity Overview */}
      <div className={`p-6 rounded-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          {activity && (
            <>
              <StatCard label="Posts" count={activity.posts.count} change={activity.posts.change} />
              <StatCard label="Votes" count={activity.votes.count} change={activity.votes.change} />
              <StatCard label="Comments" count={activity.comments.count} change={activity.comments.change} />
            </>
          )}
        </div>
      </div>

      {/* New Posts + Stale Posts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* New Posts */}
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>New Posts</h2>
          {newPosts.length > 0 ? (
            <div className="space-y-3">
              {newPosts.map((post) => (
                <div key={post.id} className={`flex items-center gap-3 py-2 ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                }`}>
                  <div className={`flex flex-col items-center px-2 py-1 rounded border ${
                    post.voteCount > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <ThumbsUp className="w-3 h-3" />
                    <span className="text-xs font-bold">{post.voteCount}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {post.title}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.board.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm text-center py-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No new posts this period</p>
          )}
        </div>

        {/* Stale Posts */}
        <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Stale Posts
            <span className={`ml-2 text-xs font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              No activity for 7+ days
            </span>
          </h2>
          {stalePosts.length > 0 ? (
            <div className="space-y-3">
              {stalePosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {post.title}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {post.board.name} · Last activity {new Date(post.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${getStatusColor(post.status)}`}>
                    {post.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>None of your posts are stale.</p>
            </div>
          )}
        </div>
      </div>

      {/* Posts by Board (Donut Chart) */}
      <div className={`p-6 rounded-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Posts Overview</h2>
        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>View distribution of all posts across your boards.</p>

        {boardData.boards.length > 0 ? (
          <div className="flex items-center justify-center gap-12">
            <div style={{ width: 250, height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={boardData.boards}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                    stroke={theme === 'dark' ? '#1f2937' : '#fff'}
                  >
                    {boardData.boards.map((entry, index) => (
                      <Cell key={index} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {/* Center text */}
                  <text x="50%" y="48%" textAnchor="middle" className="text-2xl font-bold" fill={theme === 'dark' ? '#fff' : '#111'}>
                    {boardData.total}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" className="text-xs" fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}>
                    Posts
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {boardData.boards.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color || '#3b82f6' }} />
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {b.name} ({b.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className={`text-sm text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No posts data</p>
        )}
      </div>

      {/* Admin Activity Table */}
      <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Admin Activity</h2>
        <div className={`rounded-lg border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Votes</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Posts</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                        {admin.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{admin.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {admin._count.votes || '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {admin._count.posts || '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {admin._count.comments || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className={`p-6 rounded-lg border mt-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity Log</h2>
        <div className={`rounded-lg border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Post</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Board</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <tr key={log.id} className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {log.user.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{log.user.name}</p>
                          <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{log.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs max-w-[200px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {log.description}
                    </td>
                    <td className={`px-4 py-3 text-xs truncate max-w-[150px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {log.post?.title || '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {log.board?.name || '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    No activity logs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Rows per page:</span>
            <select
              value={logRowsPerPage}
              onChange={(e) => { setLogRowsPerPage(Number(e.target.value)); setLogPage(0); }}
              className={`px-2 py-1 rounded border text-xs ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
              }`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {logPage * logRowsPerPage + 1}–{Math.min((logPage + 1) * logRowsPerPage, logTotal)} of {logTotal}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setLogPage(Math.max(0, logPage - 1))}
                disabled={logPage === 0}
                className={`p-1.5 rounded transition disabled:opacity-30 ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLogPage(Math.min(totalLogPages - 1, logPage + 1))}
                disabled={logPage >= totalLogPages - 1}
                className={`p-1.5 rounded transition disabled:opacity-30 ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

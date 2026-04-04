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

  const statColors: Record<string, string> = {
    'Posts': 'text-blue-600',
    'Votes': 'text-green-600',
    'Comments': 'text-purple-600',
  };

  const statSubs: Record<string, string> = {
    'Posts': 'Total posts created',
    'Votes': 'Total votes received',
    'Comments': 'Total comments made',
  };

  const StatCard = ({ label, count, change }: { label: string; count: number; change: number }) => (
    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
      <p className={`text-3xl font-bold mb-1 ${statColors[label] || (theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>{count}</p>
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        {statSubs[label] || ''}
        {change !== 0 && (
          <span className={`ml-2 font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </p>
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
          <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity Log</h1>
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

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {activity && (
          <>
            <StatCard label="Posts" count={activity.posts.count} change={activity.posts.change} />
            <StatCard label="Votes" count={activity.votes.count} change={activity.votes.change} />
            <StatCard label="Comments" count={activity.comments.count} change={activity.comments.change} />
          </>
        )}
      </div>

      {/* 3 Cards: Posts Overview (donut) + New Posts + Stale Posts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Posts Overview - Donut Chart */}
        <div className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Posts Overview</h2>
          <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Board distribution</p>

          {boardData.boards.length > 0 ? (
            <>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={boardData.boards}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      strokeWidth={3}
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
                    <text x="50%" y="46%" textAnchor="middle" className="text-xs" fill={theme === 'dark' ? '#9ca3af' : '#9ca3af'}>
                      Total
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" className="text-xl font-bold" fill={theme === 'dark' ? '#fff' : '#1e3a5f'}>
                      {boardData.total}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={`mt-3 pt-3 border-t space-y-1.5 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                {boardData.boards.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color || '#3b82f6' }} />
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{b.name} ({b.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={`text-sm text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No data</p>
          )}
        </div>

        {/* New Posts */}
        <div className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-base font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>New Posts</h2>
          {newPosts.length > 0 ? (
            <div className="space-y-3">
              {newPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-3">
                  <div className={`flex flex-col items-center px-2 py-1 rounded border ${
                    post.voteCount > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <ThumbsUp className="w-3 h-3" />
                    <span className="text-xs font-bold">{post.voteCount}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.board.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No new posts</p>
          )}
        </div>

        {/* Stale Posts */}
        <div className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-base font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Stale Posts</h2>
          <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No activity for 7+ days</p>
          {stalePosts.length > 0 ? (
            <div className="space-y-3">
              {stalePosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.board.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ml-2 ${getStatusColor(post.status)}`}>
                    {post.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>None of your posts are stale.</p>
          )}
        </div>
      </div>

      {/* Admin Activity Table */}
      <div className={`rounded-lg border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-4 py-4">
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Admin Activity</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              {['Admin', 'Votes', 'Posts', 'Comments'].map((h, i) => (
                <th key={h} className={`px-4 py-3 ${i === 0 ? 'text-left' : 'text-center'} text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.length > 0 ? admins.map((admin) => (
              <tr key={admin.id} className={`border-t transition ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {admin.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{admin.name}</p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-3.5 text-center text-sm font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                  {admin._count.votes || '—'}
                </td>
                <td className={`px-4 py-3.5 text-center text-sm font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                  {admin._count.posts || '—'}
                </td>
                <td className={`px-4 py-3.5 text-center text-sm font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                  {admin._count.comments || '—'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className={`px-4 py-12 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No admin activity</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Activity Log Table */}
      <div className={`rounded-lg border mt-6 overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-4 py-4">
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity Log</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{logTotal} activities</p>
        </div>
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              {['User', 'Action', 'Description', 'Post', 'Board', 'Time'].map(h => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <tr key={log.id} className={`border-t transition ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {log.user.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{log.user.name}</p>
                        <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{log.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${getActionBadge(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 text-xs max-w-[220px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {log.description}
                  </td>
                  <td className={`px-4 py-3.5 text-xs truncate max-w-[150px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {log.post?.title || '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {log.board?.name || '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-xs whitespace-nowrap ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={`px-4 py-12 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  No activity logs
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
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

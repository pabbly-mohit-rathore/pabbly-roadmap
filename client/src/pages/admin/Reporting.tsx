import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, Calendar, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, MessageCircle, ArrowUpRight } from 'lucide-react';
import useVoteStore from '../../store/voteStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';

interface ActivityData {
  posts: { count: number; change: number };
  votes: { count: number; change: number };
  comments: { count: number; change: number };
}

interface NewPost {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  voteCount: number;
  commentCount: number;
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
  const navigate = useNavigate();
  const { init: initVote, toggle: toggleVote, votes } = useVoteStore();
  const [period, setPeriod] = useState('week');
  const [boardFilter, setBoardFilter] = useState('all');
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [newPosts, setNewPosts] = useState<NewPost[]>([]);
  const [stalePosts, setStalePosts] = useState<StalePost[]>([]);
  const [boardData, setBoardData] = useState<{ boards: BoardData[]; total: number }>({ boards: [], total: 0 });
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);
  const [logDenseMode, setLogDenseMode] = useState(false);
  const [logRowsDropOpen, setLogRowsDropOpen] = useState(false);
  const [adminPage, setAdminPage] = useState(0);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(10);
  const [adminDenseMode, setAdminDenseMode] = useState(false);
  const [adminRowsDropOpen, setAdminRowsDropOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBoards(), fetchAll()]);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [period, boardFilter]);

  const fetchBoards = async () => {
    try {
      const res = await api.get('/boards');
      if (res.data.success) setBoards(res.data.data.boards);
    } catch {}
  };

  useEffect(() => {
    fetchActivityLogs();
  }, [logPage, logRowsPerPage]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bp = { period, boardId: boardFilter };
      const [actRes, newRes, staleRes, boardRes, adminRes] = await Promise.all([
        api.get('/reporting/activity-overview', { params: bp }),
        api.get('/reporting/new-posts', { params: bp }),
        api.get('/reporting/stale-posts', { params: { boardId: boardFilter } }),
        api.get('/reporting/posts-by-board', { params: bp }),
        api.get('/reporting/admin-activity', { params: { period } }),
      ]);
      if (actRes.data.success) setActivity(actRes.data.data);
      if (newRes.data.success) {
        const posts = newRes.data.data.posts;
        setNewPosts(posts);
        posts.forEach((p: any) => initVote(p.id, p.voteCount ?? 0, p.hasVoted ?? false));
      }
      if (staleRes.data.success) setStalePosts(staleRes.data.data.posts);
      if (boardRes.data.success) setBoardData(boardRes.data.data);
      if (adminRes.data.success) setAdmins(adminRes.data.data.admins);
    } catch (error) {
      console.error('Error fetching reporting:', error);
    } finally {
      setLoading(false);
    }
    fetchActivityLogs();
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

  const STAT_CFG: Record<string, { icon: React.ElementType; iconColor: string; glowColor: string }> = {
    'Posts':    { icon: MessageSquare,  iconColor: 'text-blue-400',   glowColor: 'linear-gradient(180deg, rgba(96,165,250,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
    'Votes':    { icon: ThumbsUp,       iconColor: 'text-cyan-400',   glowColor: 'linear-gradient(180deg, rgba(34,211,238,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
    'Comments': { icon: MessageCircle,  iconColor: 'text-purple-400', glowColor: 'linear-gradient(180deg, rgba(167,139,250,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
  };

  const StatCard = ({ label, count, change }: { label: string; count: number; change: number }) => {
    const cfg = STAT_CFG[label] || STAT_CFG['Posts'];
    const Icon = cfg.icon;
    return (
      <div
        className={`relative flex items-center justify-between overflow-hidden rounded-2xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}
        style={{ padding: '24px 20px 24px 24px', background: theme === 'dark' ? undefined : '#FFFFFF', boxShadow: theme === 'dark' ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <div className="relative z-10">
          <p className="font-extrabold mb-1 leading-none" style={{ fontSize: '28px', color: theme === 'dark' ? '#fff' : '#1c252e' }}>
            {count}
          </p>
          <p className={`text-sm font-medium mt-1.5 ${theme === 'dark' ? 'text-gray-400' : ''}`} style={theme !== 'dark' ? { color: '#637381' } : {}}>
            {label}
          </p>
          {change !== 0 && (
            <span className={`text-xs font-semibold mt-1 block ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </span>
          )}
        </div>
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: '110px', height: '110px',
            right: '-30px', top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            borderRadius: '16px',
            background: cfg.glowColor,
          }}
        >
          <Icon className={`w-7 h-7 ${cfg.iconColor}`} style={{ transform: 'rotate(-45deg)', marginRight: '20px' }} />
        </div>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    const c: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      planned: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-orange-100 text-orange-700',
    };
    return c[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <LoadingBar />;

  const d = theme === 'dark';

  return (
    <div>
      {/* Filter Bar */}
      <div className={`p-4 rounded-lg border mb-5 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <CustomDropdown label="Board" value={boardFilter}
            options={[{value:'all',label:'All Boards'}, ...boards.map(b => ({value:b.id, label:b.name}))]}
            onChange={(v) => setBoardFilter(v)} />

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <CustomDropdown label="Period" value={period}
              options={[{value:'week',label:'This week'},{value:'month',label:'This month'},{value:'all',label:'All time'}]}
              onChange={(v) => setPeriod(v)} />
          </div>
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
        <div className={`p-5 rounded-lg border flex flex-col ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Posts Overview</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Board distribution</p>

          {boardData.boards.length > 0 ? (
            <>
            <div className="flex items-center justify-center flex-1" style={{ width: '100%', minHeight: 260 }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={boardData.boards}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={115}
                    strokeWidth={3}
                    stroke={theme === 'dark' ? '#1f2937' : '#fff'}
                    isAnimationActive={false}
                  >
                    {boardData.boards.map((_, index) => (
                      <Cell key={index} fill={['#004B50', '#007867', '#5BE49B', '#C8FAD6', '#22c55e', '#16a34a', '#059669', '#10b981'][index % 8]} />
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

            {/* Dashed Divider */}
            <div className={`border-t border-dashed mt-4 mb-5 -mx-5 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} />

            {/* Board Legend */}
            <div className="space-y-4">
              {boardData.boards.slice(0, 5).map((board, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: ['#004B50', '#007867', '#5BE49B', '#C8FAD6', '#22c55e', '#16a34a', '#059669', '#10b981'][index % 8] }} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{board.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{board.count}</span>
                </div>
              ))}
            </div>
            </>
          ) : (
            <p className={`text-sm text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No data</p>
          )}
        </div>

        {/* New Posts */}
        <div className={`rounded-lg border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="px-5 pt-5 pb-3">
            <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>New Posts</h2>
          </div>
          {newPosts.length > 0 ? (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  {['Upvote', 'Title', 'Status', 'Comments'].map((h, i) => (
                    <th key={h} className={`py-2.5 text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      style={{ textAlign: i === 3 ? 'right' : 'left', paddingLeft: i === 0 ? '16px' : '12px', paddingRight: i === 3 ? '16px' : '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newPosts.slice(0, 10).map((post) => {
                  const sc: Record<string, string> = { open: 'text-blue-600', under_review: 'text-yellow-600', planned: 'text-purple-600', in_progress: 'text-orange-500', live: 'text-green-600', closed: 'text-gray-500', hold: 'text-red-500' };
                  return (
                    <tr key={post.id} onClick={() => navigate(`/admin/posts/${post.slug}`, { state: { from: '/admin/settings', source: 'settings' } })}
                      className={`border-t border-dashed cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className="py-3" style={{ paddingLeft: '16px', width: '70px' }} onClick={(e) => { e.stopPropagation(); toggleVote(post.id); }}>
                        <div className={`inline-flex flex-row items-center justify-center rounded-lg border font-bold cursor-pointer transition-all bg-transparent ${
                          votes[post.id]?.voted ? 'border-[#059669] text-[#059669]' : (theme === 'dark' ? 'border-gray-600 text-gray-400 hover:border-gray-400' : 'border-gray-200 text-gray-500 hover:border-gray-400')
                        }`} style={{ padding: '8px 14px', fontSize: '11px', gap: '6px' }}>
                          <ArrowUpRight className="w-3 h-3 rotate-[-45deg]" />
                          <span>{votes[post.id]?.count ?? post.voteCount}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-0 overflow-hidden">
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                        {post.description && <p className={`text-xs truncate mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>}
                      </td>
                      <td className="py-3 px-3" style={{ width: '110px' }}>
                        <span className={`text-xs font-semibold ${sc[post.status] || 'text-gray-500'}`}>
                          {post.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td className={`py-3 text-sm text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingRight: '16px', width: '80px' }}>
                        {post.commentCount ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className={`text-sm text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No new posts</p>
          )}
        </div>

        {/* Stale Posts */}
        <div className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Stale Posts</h2>
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
      <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Admin Activity</h2>
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
              {['Admin', 'Votes', 'Posts', 'Comments'].map((h, i) => (
                <th key={h} className={`font-semibold ${theme === 'dark' ? 'text-gray-400' : ''}`}
                  style={{ fontSize: '14px', color: theme === 'dark' ? undefined : '#1C252E', textAlign: i === 0 ? 'left' : 'center',
                    width: i === 0 ? '400px' : '150px' }}>
                  <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: '16px' }}>{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const paginatedAdmins = admins.slice(adminPage * adminRowsPerPage, (adminPage + 1) * adminRowsPerPage);
              return paginatedAdmins.length > 0 ? paginatedAdmins.map((admin) => (
                <tr key={admin.id} className={`border-b border-dashed transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <td className={adminDenseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '24px' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {admin.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{admin.name}</p>
                        <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 ${adminDenseMode ? 'py-1.5' : 'py-4'} text-center text-sm font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>{admin._count.votes || '—'}</td>
                  <td className={`px-4 ${adminDenseMode ? 'py-1.5' : 'py-4'} text-center text-sm font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>{admin._count.posts || '—'}</td>
                  <td className={`px-4 ${adminDenseMode ? 'py-1.5' : 'py-4'} text-center text-sm font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>{admin._count.comments || '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4}>
                  <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '200px' }}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No admin activity</p>
                  </div>
                </td></tr>
              );
            })()}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setAdminDenseMode(!adminDenseMode)}
              className={`relative w-9 h-5 rounded-full transition-colors ${adminDenseMode ? 'bg-[#0c68e9]' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300')}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${adminDenseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
              <div className="relative">
                <button onClick={() => setAdminRowsDropOpen(!adminRowsDropOpen)}
                  className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {adminRowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminRowsDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {adminRowsDropOpen && (
                  <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    {[10, 25, 50, 100].map(n => (
                      <button key={n} onClick={() => { setAdminRowsPerPage(n); setAdminRowsDropOpen(false); setAdminPage(0); }}
                        className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                          adminRowsPerPage === n ? (theme === 'dark' ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                          : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                        }`}>{n}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {admins.length > 0 ? `${adminPage * adminRowsPerPage + 1}–${Math.min((adminPage + 1) * adminRowsPerPage, admins.length)}` : '0–0'} of {admins.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setAdminPage(Math.max(0, adminPage - 1))} disabled={adminPage === 0}
                className={`p-1.5 rounded transition disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setAdminPage(Math.min(Math.ceil(admins.length / adminRowsPerPage) - 1, adminPage + 1))} disabled={adminPage >= Math.ceil(admins.length / adminRowsPerPage) - 1}
                className={`p-1.5 rounded transition disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {adminRowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setAdminRowsDropOpen(false)} />}
      </div>

      {/* Activity Log Table */}
      <div className={`rounded-xl border mt-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Activity Log</h2>
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
              {['User', 'Action', 'Description', 'Post', 'Board', 'Time'].map((h, i) => (
                <th key={h} className={`font-semibold ${theme === 'dark' ? 'text-gray-400' : ''}`}
                  style={{ fontSize: '14px', color: theme === 'dark' ? undefined : '#1C252E', textAlign: 'left',
                    width: i === 0 ? '220px' : i === 1 ? '120px' : i === 2 ? '250px' : i === 3 ? '180px' : i === 4 ? '130px' : '160px' }}>
                  <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: '16px' }}>{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activityLogs.length > 0 ? activityLogs.map((log) => (
              <tr key={log.id} className={`border-b border-dashed transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                <td className={logDenseMode ? 'py-1.5' : 'py-4'} style={{ paddingLeft: '24px' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {log.user.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{log.user.name}</p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{log.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'}`}>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${getActionBadge(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm max-w-[250px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{log.description}</td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm truncate max-w-[180px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{log.post?.title || '—'}</td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{log.board?.name || '—'}</td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6}>
                <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '200px' }}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No activity logs</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLogDenseMode(!logDenseMode)}
              className={`relative w-9 h-5 rounded-full transition-colors ${logDenseMode ? 'bg-[#0c68e9]' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300')}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${logDenseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
              <div className="relative">
                <button onClick={() => setLogRowsDropOpen(!logRowsDropOpen)}
                  className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {logRowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${logRowsDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {logRowsDropOpen && (
                  <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    {[10, 25, 50, 100].map(n => (
                      <button key={n} onClick={() => { setLogRowsPerPage(n); setLogRowsDropOpen(false); setLogPage(0); }}
                        className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                          logRowsPerPage === n ? (theme === 'dark' ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                          : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                        }`}>{n}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {logTotal > 0 ? `${logPage * logRowsPerPage + 1}–${Math.min((logPage + 1) * logRowsPerPage, logTotal)}` : '0–0'} of {logTotal}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setLogPage(Math.max(0, logPage - 1))} disabled={logPage === 0}
                className={`p-1.5 rounded transition disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setLogPage(Math.min(totalLogPages - 1, logPage + 1))} disabled={logPage >= totalLogPages - 1}
                className={`p-1.5 rounded transition disabled:opacity-30 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {logRowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setLogRowsDropOpen(false)} />}
      </div>
    </div>
  );
}

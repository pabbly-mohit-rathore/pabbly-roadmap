import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, Calendar, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, MessageCircle, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';
import UITooltip from '../../components/ui/Tooltip';

interface ActivityData {
  posts: { count: number; change: number };
  votes: { count: number; change: number };
  comments: { count: number; change: number };
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


interface ActivityLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: { name: string; email: string };
  post?: { title: string } | null;
  board?: { name: string } | null;
}

export default function AdminReporting({ showFilters = false }: { showFilters?: boolean } = {}) {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [period, setPeriod] = useState('week');
  const [boardFilter, setBoardFilter] = useState('all');
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [statusPipeline, setStatusPipeline] = useState<{ status: string; count: number }[]>([]);
  const [stalePosts, setStalePosts] = useState<StalePost[]>([]);
  const [boardData, setBoardData] = useState<{ boards: BoardData[]; total: number }>({ boards: [], total: 0 });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);
  const [logDenseMode, setLogDenseMode] = useState(false);
  const [logRowsDropOpen, setLogRowsDropOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, boardFilter]);

  const fetchBoards = async () => {
    try {
      const res = await api.get('/boards');
      if (res.data.success) setBoards(res.data.data.boards);
    } catch {}
  };

  useEffect(() => {
    fetchActivityLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPage, logRowsPerPage]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bp = { period, boardId: boardFilter };
      const [actRes, staleRes, boardRes, pipelineRes] = await Promise.all([
        api.get('/reporting/activity-overview', { params: bp }),
        api.get('/reporting/stale-posts', { params: { boardId: boardFilter } }),
        api.get('/reporting/posts-by-board', { params: bp }),
        api.get('/reporting/status-pipeline'),
      ]);
      if (actRes.data.success) setActivity(actRes.data.data);
      if (staleRes.data.success) setStalePosts(staleRes.data.data.posts);
      if (boardRes.data.success) setBoardData(boardRes.data.data);
      if (pipelineRes.data.success) setStatusPipeline(pipelineRes.data.data.pipeline);
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


  if (loading) return <LoadingBar />;

  const d = theme === 'dark';

  return (
    <div>
      {/* Filter Bar */}
      {showFilters && (
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
      )}

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
                      <Cell key={index} fill={['#136847', '#22c55e', '#1d9d8e', '#198ab6', '#6cc399', '#f97316'][index % 8]} />
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
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'][index % 8] }} />
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

        {/* Status Pipeline — Column Chart */}
        <div className={`rounded-lg border overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="px-5 pt-5 pb-2">
            <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Status Pipeline</h2>
            <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Posts distribution by status</p>
          </div>
          {(() => {
            const STATUS_LABELS: Record<string, string> = {
              open: 'Open', under_review: 'Review', planned: 'Planned',
              in_progress: 'Progress', live: 'Live', hold: 'Hold',
            };
            const chartData = statusPipeline.map(item => ({
              name: STATUS_LABELS[item.status] || item.status,
              count: item.count,
            }));
            const d = theme === 'dark';
            return chartData.length > 0 ? (
              <div className="flex-1 px-2 pb-4" style={{ minHeight: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 16, left: -10, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={d ? '#374151' : '#e8e8e8'} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 500, fill: d ? '#9ca3af' : '#919eab' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false}
                      tick={{ fontSize: 12, fill: d ? '#6b7280' : '#919eab' }} dx={-4} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const val = payload[0].value;
                        return (
                          <div style={{
                            backgroundColor: d ? '#1f2937' : '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            padding: 0,
                            minWidth: 120,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              padding: '8px 14px',
                              backgroundColor: d ? '#374151' : '#f4f6f8',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: d ? '#fff' : '#212b36',
                            }}>{label}</div>
                            <div style={{
                              borderTop: `1px dashed ${d ? '#4b5563' : '#e0e0e0'}`,
                              padding: '8px 14px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: d ? '#5be49b' : '#00a76f',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#329284', display: 'inline-block' }} />
                              {val} posts
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" fill="#329284" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={`text-sm text-center py-12 flex-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>No data</p>
            );
          })()}
        </div>

        {/* Stale Posts */}
        <div className={`rounded-lg border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="px-5 pt-5 pb-3">
            <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Stale Posts</h2>
            <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No activity for 7+ days</p>
          </div>
          {stalePosts.length > 0 ? (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  {[{ label: 'Upvote', tip: 'Total upvotes received' }, { label: 'Title', tip: 'Title of the post or entry' }, { label: 'Board', tip: 'Board name this item belongs to' }, { label: 'Status', tip: 'Current status of the item' }].map((h, i) => (
                    <th key={h.label} className={`py-2.5 text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      style={{ textAlign: 'left', paddingLeft: i === 0 ? '16px' : '12px', paddingRight: i === 3 ? '16px' : '12px' }}><UITooltip title={h.tip}><span>{h.label}</span></UITooltip></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stalePosts.slice(0, 10).map((post) => {
                  const sc: Record<string, string> = { open: 'text-blue-600', under_review: 'text-yellow-600', planned: 'text-purple-600', in_progress: 'text-orange-500', live: 'text-green-600', hold: 'text-red-500' };
                  return (
                    <tr key={post.id} onClick={() => navigate(`/admin/posts/${post.slug}`, { state: { from: '/admin/settings', source: 'settings' } })}
                      className={`border-t border-dashed cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className="py-3" style={{ paddingLeft: '16px', width: '70px' }}>
                        <div className={`inline-flex flex-row items-center justify-center rounded-lg border font-bold bg-transparent ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-500'}`}
                          style={{ padding: '8px 14px', fontSize: '11px', gap: '6px' }}>
                          <ArrowUpRight className="w-3 h-3 rotate-[-45deg]" />
                          <span>{post.voteCount ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-0 overflow-hidden">
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.title}</p>
                      </td>
                      <td className={`py-3 px-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ width: '110px' }}>
                        <span className="truncate block">{post.board.name}</span>
                      </td>
                      <td className="py-3 px-3" style={{ width: '110px', paddingRight: '16px' }}>
                        <span className={`text-xs font-semibold ${sc[post.status] || 'text-gray-500'}`}>
                          {post.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className={`text-sm text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>None of your posts are stale.</p>
          )}
        </div>
      </div>

      {/* Activity Log Table */}
      <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Activity Log</h2>
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
              {[
                { label: 'User', tip: 'Who performed the action' },
                { label: 'Action', tip: 'Type of action performed' },
                { label: 'Description', tip: 'Details about the action' },
                { label: 'Post', tip: 'Related post, if any' },
                { label: 'Board', tip: 'Related board, if any' },
                { label: 'Time', tip: 'When the action was performed' },
              ].map((h, i) => (
                <th key={h.label} className={`font-semibold ${theme === 'dark' ? 'text-gray-400' : ''}`}
                  style={{ fontSize: '14px', color: theme === 'dark' ? undefined : '#1C252E', textAlign: i === 5 ? 'right' : 'left',
                    width: i === 0 ? '220px' : i === 1 ? '120px' : i === 2 ? '350px' : i === 3 ? '260px' : i === 4 ? '220px' : '130px' }}>
                  <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 5 ? '24px' : '16px' }}>
                    <UITooltip title={h.tip}><span>{h.label}</span></UITooltip>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activityLogs.length > 0 ? activityLogs.map((log) => (
              <tr key={log.id} className={`border-b border-dashed transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                <td className={`${logDenseMode ? 'py-1.5' : 'py-4'} overflow-hidden`} style={{ paddingLeft: '24px' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {log.user.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
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
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm overflow-hidden ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <UITooltip title={log.description}>
                    <span className="block truncate">{log.description}</span>
                  </UITooltip>
                </td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm overflow-hidden ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <UITooltip title={log.post?.title || '—'}>
                    <span className="block truncate">{log.post?.title || '—'}</span>
                  </UITooltip>
                </td>
                <td className={`px-4 ${logDenseMode ? 'py-1.5' : 'py-4'} text-sm overflow-hidden ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <UITooltip title={log.board?.name || '—'}>
                    <span className="block truncate">{log.board?.name || '—'}</span>
                  </UITooltip>
                </td>
                <td className={`${logDenseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap text-right ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ paddingRight: '24px', paddingLeft: '16px' }}>
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
              className={`relative w-9 h-5 rounded-full transition-colors ${logDenseMode ? 'bg-[#059669]' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300')}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${logDenseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}><UITooltip title="Switch to reduce the table size."><span>Dense</span></UITooltip></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}><UITooltip title="Select the number of rows displayed per page."><span>Rows per page:</span></UITooltip></span>
              <div className="relative">
                <button onClick={() => setLogRowsDropOpen(!logRowsDropOpen)}
                  className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {logRowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${logRowsDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {logRowsDropOpen && (
                  <div className={`absolute bottom-full mb-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
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
            <UITooltip title="Shows the current range of rows being displayed and the total number of rows."><span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {logTotal > 0 ? `${logPage * logRowsPerPage + 1}–${Math.min((logPage + 1) * logRowsPerPage, logTotal)}` : '0–0'} of {logTotal}
            </span></UITooltip>
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

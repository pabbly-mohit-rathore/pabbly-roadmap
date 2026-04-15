import React, { useEffect, useState } from 'react';
import { MessageSquare, Users, Layout, TrendingUp, BarChart2, ThumbsUp, Plus, X, MoreVertical, Edit2, Trash2, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Tooltip from '../../components/ui/Tooltip';

interface DashboardStats {
  totalPosts: number;
  totalVotes: number;
  totalUsers: number;
  totalBoards: number;
  activeUsers: number;
  totalComments?: number;
}

interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  order: number;
  createdAt?: string;
}

const STAT_CONFIG: Record<string, { iconColor: string; glowColor: string; icon: React.ElementType }> = {
  'Total Posts':    { iconColor: 'text-blue-400',   glowColor: 'linear-gradient(180deg, rgba(96,165,250,0.15) 0%, rgba(255,255,255,0.0) 100%)',  icon: MessageSquare },
  'Total Votes':    { iconColor: 'text-cyan-400',   glowColor: 'linear-gradient(180deg, rgba(34,211,238,0.15) 0%, rgba(255,255,255,0.0) 100%)',  icon: ThumbsUp },
  'Total Users':    { iconColor: 'text-purple-400', glowColor: 'linear-gradient(180deg, rgba(167,139,250,0.15) 0%, rgba(255,255,255,0.0) 100%)', icon: Users },
  'Active Users':   { iconColor: 'text-orange-400', glowColor: 'linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(255,255,255,0.0) 100%)',  icon: TrendingUp },
  'Total Boards':   { iconColor: 'text-green-500',  glowColor: 'linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(255,255,255,0.0) 100%)',   icon: Layout },
  'Total Comments': { iconColor: 'text-indigo-400', glowColor: 'linear-gradient(180deg, rgba(129,140,248,0.15) 0%, rgba(255,255,255,0.0) 100%)', icon: BarChart2 },
};

const BOARD_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

export default function AdminDashboard() {
  const theme = useThemeStore((state) => state.theme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const { isTeamAccess, accessLevel } = useTeamAccessStore();
  const isTeamManager = isTeamAccess && accessLevel === 'manager';
  const d = theme === 'dark';

  // Board management state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366f1' });
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [updatingBoard, setUpdatingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [denseMode, setDenseMode] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, boardsResponse] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/boards'),
      ]);
      if (statsResponse.data.success) setStats(statsResponse.data.data.stats);
      if (boardsResponse.data.success) setBoards(boardsResponse.data.data.boards);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!formData.name.trim()) { toast.error('Please enter board name'); return; }
    setCreatingBoard(true);
    try {
      const response = await api.post('/boards', { name: formData.name, description: formData.description, color: formData.color });
      if (response.data.success) {
        toast.success('Board created successfully');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', color: '#6366f1' });
        fetchDashboardData();
      }
    } catch { toast.error('Failed to create board'); } finally { setCreatingBoard(false); }
  };

  const handleUpdateBoard = async () => {
    if (!selectedBoard || !formData.name.trim()) { toast.error('Please enter board name'); return; }
    setUpdatingBoard(true);
    try {
      const response = await api.put(`/boards/${selectedBoard.id}`, { name: formData.name, description: formData.description, color: formData.color });
      if (response.data.success) {
        setShowEditModal(false);
        setSelectedBoard(null);
        setFormData({ name: '', description: '', color: '#6366f1' });
        fetchDashboardData();
      }
    } catch { toast.error('Failed to update board'); } finally { setUpdatingBoard(false); }
  };

  const handleDeleteBoard = async () => {
    if (!deleteConfirm) return;
    setDeletingBoard(true);
    try {
      const response = await api.delete(`/boards/${deleteConfirm.id}`);
      if (response.data.success) { setDeleteConfirm(null); fetchDashboardData(); toast.success('Board deleted'); }
    } catch { toast.error('Failed to delete board'); } finally { setDeletingBoard(false); }
  };

  const openEditModal = (board: Board) => {
    setSelectedBoard(board);
    setFormData({ name: board.name, description: board.description || '', color: board.color });
    setShowEditModal(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const statsCards = [
    { label: 'Total Posts', value: stats?.totalPosts },
    { label: 'Total Votes', value: stats?.totalVotes },
    { label: 'Total Users', value: stats?.totalUsers },
    { label: 'Active Users', value: stats?.activeUsers },
    { label: 'Total Boards', value: stats?.totalBoards },
    { label: 'Total Comments', value: stats?.totalComments || 0 },
  ];

  const totalPages = Math.ceil(boards.length / rowsPerPage);
  const paginatedBoards = boards.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div>
      {/* Header with Create Board button */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>Overview of your platform performance</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#009966] text-white rounded-lg hover:bg-[#047857] transition shrink-0"
          style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
          <Plus className="w-5 h-5" /> Create Board
        </button>
      </div>

      {loading ? (
        <LoadingBar />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statsCards.map((card) => {
              const cfg = STAT_CONFIG[card.label] || { iconColor: 'text-gray-400', glowColor: 'rgba(156,163,175,0.2)', icon: BarChart2 };
              const Icon = cfg.icon;
              return (
                <div key={card.label}
                  className={`relative flex items-center justify-between overflow-hidden rounded-2xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                  style={{ padding: '24px 20px 24px 24px', background: d ? undefined : '#FFFFFF', boxShadow: d ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="relative z-10">
                    <p className={`font-extrabold mb-1 leading-none ${d ? 'text-white' : ''}`} style={{ fontSize: '28px', color: d ? undefined : '#1c252e' }}>{card.value ?? 0}</p>
                    <p className={`text-sm font-medium mt-1.5 ${d ? 'text-gray-400' : ''}`} style={!d ? { color: '#637381' } : {}}>{card.label}</p>
                  </div>
                  <div className="absolute flex items-center justify-center"
                    style={{ width: '110px', height: '110px', right: '-30px', top: '50%', transform: 'translateY(-50%) rotate(45deg)', borderRadius: '16px', background: cfg.glowColor }}>
                    <Icon className={`w-7 h-7 ${cfg.iconColor}`} style={{ transform: 'rotate(-45deg)', marginRight: '20px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boards Table */}
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div style={{ padding: '24px 24px 16px 24px' }}>
              <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Boards</h2>
            </div>

            <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                  {['S.No', 'Board', 'Description', 'Created At', 'Actions'].map((h, i) => (
                    <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px', color: d ? undefined : '#1C252E',
                        textAlign: i === 4 ? 'right' as const : 'left' as const,
                        width: i === 0 ? '80px' : i === 1 ? '280px' : i === 3 ? '200px' : i === 4 ? '100px' : undefined,
                      }}>
                      <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 4 ? '24px' : '16px' }}>{h}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedBoards.length > 0 ? paginatedBoards.map((board, idx) => {
                  const boardColor = board.color || '#6366f1';
                  const initial = board.name?.charAt(0).toUpperCase();
                  return (
                    <tr key={board.id}
                      className={`border-b border-dashed transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                        {page * rowsPerPage + idx + 1}
                      </td>
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                            style={{ backgroundColor: boardColor + '15' }}>
                            <span className="text-sm font-bold" style={{ color: boardColor }}>{initial}</span>
                          </div>
                          <Tooltip title={board.name}>
                            <span className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{board.name}</span>
                          </Tooltip>
                        </div>
                      </td>
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'} overflow-hidden`}>
                        <Tooltip title={board.description || 'No description provided.'}>
                          <span className="block truncate">{board.description || 'No description provided.'}</span>
                        </Tooltip>
                      </td>
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(board.createdAt)}
                      </td>
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                        <div className="relative inline-block">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === board.id ? null : board.id); }}
                            className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                          {openMenuId === board.id && (
                            <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '160px' }}>
                              <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(board); setOpenMenuId(null); }}
                                className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                                <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Edit
                              </button>
                              {!isTeamManager && (
                              <>
                              <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: board.id, name: board.name }); setOpenMenuId(null); }}
                                disabled={deletingBoard}
                                className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg disabled:opacity-50 ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                                <Trash2 className="w-[18px] h-[18px]" /> Delete
                              </button>
                              </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5}>
                    <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <LayoutGrid className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Boards Created</p>
                      <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Use the "Create Board" button above to get started.</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setDenseMode(!denseMode)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${denseMode ? 'bg-[#0c68e9]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${denseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                  <div className="relative">
                    <button onClick={() => setRowsDropOpen(!rowsDropOpen)}
                      className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                      {rowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rowsDropOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {rowsDropOpen && (
                      <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        {[10, 25, 50, 100].map(n => (
                          <button key={n} onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
                            className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                              rowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                              : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                            }`}>{n}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  {boards.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, boards.length)}` : '0–0'} of {boards.length}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                    className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                    className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            {rowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setRowsDropOpen(false)} />}
          </div>
        </>
      )}

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Do you really want to delete this board?"
        message={`"${deleteConfirm?.name || ''}" and all its posts will be permanently deleted. This action cannot be undone.`}
        onConfirm={handleDeleteBoard}
        onCancel={() => setDeleteConfirm(null)}
        loading={deletingBoard}
      />

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create New Board</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              <div>
                <div className="relative">
                  <input type="text" value={formData.name} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Board Name *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the name for your board.</p>
              </div>
              <div>
                <div className="relative">
                  <input type="text" value={formData.description} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Short description for your board.</p>
              </div>
              <div>
                <p className={`text-xs font-medium mb-3 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Board Color</p>
                <div className="flex flex-wrap gap-4" style={{ marginLeft: '14px' }}>
                  {BOARD_COLORS.map((color) => (
                    <button key={color} onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowCreateModal(false); setFormData({ name: '', description: '', color: '#6366f1' }); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreateBoard} loading={creatingBoard}
                  className="px-3 py-1.5 bg-[#009966] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Create Board</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEditModal && selectedBoard && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-h-[90vh] overflow-y-auto ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b sticky top-0 z-10 ${d ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Edit Board</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              <div>
                <div className="relative">
                  <input type="text" value={formData.name} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Board Name *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the name for your board.</p>
              </div>
              <div>
                <div className="relative">
                  <input type="text" value={formData.description} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Short description for your board.</p>
              </div>
              <div>
                <p className={`text-xs font-medium mb-3 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Board Color</p>
                <div className="grid grid-cols-4 gap-2">
                  {BOARD_COLORS.map((color) => (
                    <button key={color} onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${formData.color === color ? 'border-white shadow-lg scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className={`flex gap-3 pt-2 ${isTeamManager ? 'justify-end' : 'justify-between'}`}>
                {!isTeamManager && (
                <button onClick={() => { const name = selectedBoard.name; const id = selectedBoard.id; setShowEditModal(false); setSelectedBoard(null); setDeleteConfirm({ id, name }); }}
                  disabled={deletingBoard}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium border transition-colors disabled:opacity-70 ${d ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'}`} style={{ borderRadius: '8px' }}>
                  <Trash2 className="w-4 h-4" /> Delete Board
                </button>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                    className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                  <LoadingButton onClick={handleUpdateBoard} loading={updatingBoard}
                    className="px-3 py-1.5 bg-[#009966] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Update Board</LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

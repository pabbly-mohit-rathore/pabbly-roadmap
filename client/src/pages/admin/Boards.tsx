import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Edit2, LayoutGrid } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Tooltip from '../../components/ui/Tooltip';

interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  order: number;
  createdAt?: string;
}

export default function AdminBoards({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366f1' });

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) setShowCreateModal(true);
  }, [triggerCreate]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const [creatingBoard, setCreatingBoard] = useState(false);
  const [updatingBoard, setUpdatingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [denseMode, setDenseMode] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleCreateBoard = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter board name');
      return;
    }

    setCreatingBoard(true);
    try {
      const response = await api.post('/boards', {
        name: formData.name,
        description: formData.description,
        color: formData.color,
      });

      if (response.data.success) {
        toast.success('Board created successfully');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', color: '#6366f1' });
        fetchBoards();
      }
    } catch {
      toast.error('Failed to create board');
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleUpdateBoard = async () => {
    if (!selectedBoard || !formData.name.trim()) {
      alert('Please enter board name');
      return;
    }

    setUpdatingBoard(true);
    try {
      const response = await api.put(`/boards/${selectedBoard.id}`, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
      });

      if (response.data.success) {
        setShowEditModal(false);
        setSelectedBoard(null);
        setFormData({ name: '', description: '', color: '#6366f1' });
        fetchBoards();
      }
    } catch (error) {
      console.error('Error updating board:', error);
      alert('Failed to update board');
    } finally {
      setUpdatingBoard(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!deleteConfirm) return;
    setDeletingBoard(true);
    try {
      const response = await api.delete(`/boards/${deleteConfirm.id}`);
      if (response.data.success) {
        setDeleteConfirm(null);
        fetchBoards();
        toast.success('Board deleted');
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    } finally {
      setDeletingBoard(false);
    }
  };

  const openEditModal = (board: Board) => {
    setSelectedBoard(board);
    setFormData({ name: board.name, description: board.description || '', color: board.color });
    setShowEditModal(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const colors = [
    '#6366f1', // indigo
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#8b5cf6', // violet
  ];

  const d = theme === 'dark';
  const totalPages = Math.ceil(boards.length / rowsPerPage);
  const paginatedBoards = boards.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div>
      {/* Boards Table */}
      {loading ? (
        <LoadingBar />
      ) : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Title */}
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Boards</h2>
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {[{ label: 'S.No', tip: 'Serial number of the row' }, { label: 'Board', tip: 'Board name this item belongs to' }, { label: 'Description', tip: 'Short description of the item' }, { label: 'Created At', tip: 'Date when this item was created' }, { label: 'Actions', tip: 'Available actions for this item' }].map((h, i) => (
                  <th key={h.label} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: d ? undefined : '#1C252E',
                      textAlign: i === 4 ? 'right' as const : 'left' as const,
                      width: i === 0 ? '80px' : i === 3 ? '200px' : i === 4 ? '100px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 4 ? '24px' : '16px' }}><Tooltip title={h.tip}><span>{h.label}</span></Tooltip></div>
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
                    className={`border-b border-dashed transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => navigate(`/admin/boards/${board.id}`)}>
                    {/* S.No */}
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                      {page * rowsPerPage + idx + 1}
                    </td>
                    {/* Board */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                          style={{ backgroundColor: boardColor + '15' }}>
                          <span className="text-sm font-bold" style={{ color: boardColor }}>{initial}</span>
                        </div>
                        <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{board.name}</span>
                      </div>
                    </td>
                    {/* Description */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="line-clamp-1">{board.description || 'No description provided.'}</span>
                    </td>
                    {/* Created At */}
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(board.createdAt)}
                    </td>
                    {/* Actions */}
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
                            <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: board.id, name: board.name }); setOpenMenuId(null); }}
                              disabled={deletingBoard}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg disabled:opacity-50 ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                              <Trash2 className="w-[18px] h-[18px]" /> Delete
                            </button>
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
                    <p className={`text-sm mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Create your first board to get started.</p>
                    <button onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors text-sm font-medium">
                      <Plus className="w-4 h-4" /> Create First Board
                    </button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setDenseMode(!denseMode)}
                className={`relative w-9 h-5 rounded-full transition-colors ${denseMode ? 'bg-[#059669]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${denseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}><Tooltip title="Switch to reduce the table size."><span>Dense</span></Tooltip></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}><Tooltip title="Select the number of rows displayed per page."><span>Rows per page:</span></Tooltip></span>
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
              <Tooltip title="Shows the current range of rows being displayed and the total number of rows."><span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                {boards.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, boards.length)}` : '0–0'} of {boards.length}
              </span></Tooltip>
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
          <div className={`rounded-xl w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Board</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Board Name */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.name} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${theme === 'dark' ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Board Name *</span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the name for your board.</p>
              </div>

              {/* Description */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.description} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${theme === 'dark' ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Short description for your board.</p>
              </div>

              {/* Board Color */}
              <div>
                <p className={`text-xs font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Board Color</p>
                <div className="flex flex-wrap gap-4" style={{ marginLeft: '14px' }}>
                  {colors.map((color) => (
                    <button key={color} onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowCreateModal(false); setFormData({ name: '', description: '', color: '#6366f1' }); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreateBoard} loading={creatingBoard}
                  className="px-3 py-1.5 bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Create Board</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEditModal && selectedBoard && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b sticky top-0 z-10 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Edit Board</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Board Name */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.name} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${theme === 'dark' ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Board Name *</span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the name for your board.</p>
              </div>

              {/* Description */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.description} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${theme === 'dark' ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Short description for your board.</p>
              </div>

              {/* Board Color */}
              <div>
                <p className={`text-xs font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Board Color</p>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button key={color} onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${formData.color === color ? 'border-white shadow-lg scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-between pt-2">
                <button onClick={() => { const name = selectedBoard.name; const id = selectedBoard.id; setShowEditModal(false); setSelectedBoard(null); setDeleteConfirm({ id, name }); }}
                  disabled={deletingBoard}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium border transition-colors disabled:opacity-70 ${
                    theme === 'dark' ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`} style={{ borderRadius: '8px' }}>
                  <Trash2 className="w-4 h-4" /> Delete Board
                </button>
                <div className="flex gap-3">
                  <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                    className={`px-3 py-1.5 text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                  <LoadingButton onClick={handleUpdateBoard} loading={updatingBoard}
                    className="px-3 py-1.5 bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Update Board</LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

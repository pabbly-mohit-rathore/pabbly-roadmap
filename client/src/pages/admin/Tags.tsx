import { useEffect, useState } from 'react';
import { Edit2, Trash2, X, Search, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, Tag as TagIcon } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';

interface Tag { id: string; name: string; slug: string; color: string; boardId: string; }
interface Board { id: string; name: string; }

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

export default function AdminTags({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';
  const [tags, setTags] = useState<Tag[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1' });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);

  useEffect(() => { fetchBoards(); }, []);
  useEffect(() => { if (selectedBoard) fetchTags(); }, [selectedBoard]);
  useEffect(() => { if (triggerCreate && triggerCreate > 0) setShowCreateModal(true); }, [triggerCreate]);

  const fetchBoards = async () => {
    try {
      const r = await api.get('/boards');
      if (r.data.success) {
        setBoards(r.data.data.boards);
        if (r.data.data.boards.length > 0) setSelectedBoard(r.data.data.boards[0].id);
      }
    } catch {} finally { setLoading(false); }
  };

  const fetchTags = async () => {
    try { setLoading(true); const r = await api.get(`/tags?boardId=${selectedBoard}`); if (r.data.success) setTags(r.data.data.tags); } catch {} finally { setLoading(false); }
  };

  const handleCreateTag = async () => {
    if (!formData.name.trim()) { toast.error('Please enter tag name'); return; }
    setCreating(true);
    try {
      const r = await api.post('/tags', { name: formData.name, color: formData.color, boardId: selectedBoard });
      if (r.data.success) { setShowCreateModal(false); setFormData({ name: '', color: '#6366f1' }); fetchTags(); toast.success('Tag created'); }
    } catch { toast.error('Failed to create tag'); } finally { setCreating(false); }
  };

  const handleUpdateTag = async () => {
    if (!selectedTag || !formData.name.trim()) { toast.error('Please enter tag name'); return; }
    setUpdating(true);
    try {
      const r = await api.put(`/tags/${selectedTag.id}`, { name: formData.name, color: formData.color });
      if (r.data.success) { setShowEditModal(false); setSelectedTag(null); setFormData({ name: '', color: '#6366f1' }); fetchTags(); toast.success('Tag updated'); }
    } catch { toast.error('Failed to update tag'); } finally { setUpdating(false); }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag?')) return;
    setDeletingId(tagId);
    try { await api.delete(`/tags/${tagId}`); setTags(prev => prev.filter(t => t.id !== tagId)); setOpenMenuId(null); toast.success('Tag deleted'); } catch { toast.error('Failed to delete'); } finally { setDeletingId(null); }
  };

  const filteredTags = tags.filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filteredTags.length / rowsPerPage);
  const paginatedTags = filteredTags.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div>
      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search tags..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>
          <CustomDropdown label="Board" value={selectedBoard}
            options={boards.map(b => ({ value: b.id, label: b.name }))}
            onChange={(v) => { setSelectedBoard(v); setPage(0); }} />

        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingBar /> : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Title */}
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Tags</h2>
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {['S.No', 'Tag Name', 'Color', 'Slug', 'Board', 'Actions'].map((h, i) => (
                  <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: d ? undefined : '#1C252E',
                      textAlign: i === 5 ? 'right' as const : i === 2 ? 'center' as const : 'left' as const,
                      width: i === 0 ? '80px' : i === 2 ? '280px' : i === 3 ? '250px' : i === 4 ? '200px' : i === 5 ? '70px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 5 ? '24px' : '16px' }}>{h}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTags.length > 0 ? paginatedTags.map((tag, idx) => (
                <tr key={tag.id} className={`border-b border-dashed transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {/* S.No */}
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                    {page * rowsPerPage + idx + 1}
                  </td>
                  {/* Tag Name */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}` }}>
                      {tag.name}
                    </span>
                  </td>
                  {/* Color */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-center`}>
                    <div className="w-6 h-6 rounded-full mx-auto" style={{ backgroundColor: tag.color }} />
                  </td>
                  {/* Slug */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    <code className={`px-2 py-0.5 rounded text-xs ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>{tag.slug}</code>
                  </td>
                  {/* Board */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    {boards.find(b => b.id === tag.boardId)?.name || '-'}
                  </td>
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                    <div className="relative inline-block">
                      <button onClick={() => setOpenMenuId(openMenuId === tag.id ? null : tag.id)}
                        className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {openMenuId === tag.id && (
                        <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '160px' }}>
                          <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                          <button onClick={() => { setSelectedTag(tag); setFormData({ name: tag.name, color: tag.color }); setShowEditModal(true); setOpenMenuId(null); }}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                            <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Edit
                          </button>
                          <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                          <button onClick={() => handleDeleteTag(tag.id)} disabled={deletingId === tag.id}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg disabled:opacity-50 ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                            <Trash2 className="w-[18px] h-[18px]" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>
                  <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <TagIcon className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Tags Found</p>
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Create your first tag for this board.</p>
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
                {filteredTags.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredTags.length)}` : '0–0'} of {filteredTags.length}
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
      )}

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create Tag</h2>
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
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Tag Name *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the name for your tag.</p>
              </div>
              <div>
                <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Tag Color</p>
                <div className="flex flex-wrap gap-4" style={{ marginLeft: '14px', marginTop: '22px' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowCreateModal(false)}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreateTag} loading={creating}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Create</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTag && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Edit Tag</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedTag(null); }} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
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
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Tag Name *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the name for your tag.</p>
              </div>
              <div>
                <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Tag Color</p>
                <div className="flex flex-wrap gap-4" style={{ marginLeft: '14px' }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowEditModal(false); setSelectedTag(null); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleUpdateTag} loading={updating}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Update</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

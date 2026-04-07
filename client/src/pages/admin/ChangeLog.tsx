import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2, Send, X, Search, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import toast from 'react-hot-toast';

interface Board {
  id: string;
  name: string;
  color: string;
}

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  allBoards: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  author: { id: string; name: string };
  boards: { board: Board }[];
  _count: { likes: number };
}

export default function AdminChangeLog({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'new',
    allBoards: true,
    boardIds: [] as string[],
  });

  useEffect(() => {
    fetchEntries();
    fetchBoards();
  }, [filterStatus, filterType]);

  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) setShowModal(true);
  }, [triggerCreate]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const response = await api.get('/changelog', { params });
      if (response.data.success) {
        setEntries(response.data.data.entries);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const response = await api.post('/changelog', {
        title: form.title,
        content: form.description,
        type: form.type,
        allBoards: form.allBoards,
        boardIds: form.boardIds,
      });

      if (response.data.success) {
        setShowModal(false);
        // Navigate to editor page
        navigate(`/admin/changelog/${response.data.data.entry.id}/edit`);
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/changelog/${id}`);
      toast.success('Entry deleted');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-green-100 text-green-700',
    };
    return config[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      new: 'bg-emerald-100 text-emerald-700',
      improved: 'bg-blue-100 text-blue-700',
      fixed: 'bg-orange-100 text-orange-700',
    };
    return config[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredEntries = entries.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedEntries = filteredEntries.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(filteredEntries.length / rowsPerPage);
  const hasFilters = searchQuery || filterStatus || filterType;
  const d = theme === 'dark';

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/changelog/${id}/publish`);
      toast.success('Published!');
      fetchEntries();
    } catch { toast.error('Failed to publish'); }
  };

  return (
    <div>
      {/* Count */}
      <p className={`text-sm mb-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{filteredEntries.length} entries</p>

      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[180px] max-w-[280px] ${
            d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search entries..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
            className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
            <option value="">All Types</option>
            <option value="new">New</option>
            <option value="improved">Improved</option>
            <option value="fixed">Fixed</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterType(''); setPage(0); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600">
              <X className="w-4 h-4" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingBar />
      ) : (
        <div className={`rounded-lg border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <table className="w-full">
            <thead className={d ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                {['Title', 'Type', 'Status', 'Boards', 'Likes', 'Created', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id}
                    onClick={() => navigate(entry.status === 'draft' ? `/admin/changelog/${entry.id}/edit` : `/admin/changelog/${entry.id}/view`)}
                    className={`border-t cursor-pointer transition ${d ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`px-4 py-3.5 text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{entry.title}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getTypeBadge(entry.type)}`}>{entry.type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(entry.status)}`}>{entry.status}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-xs ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entry.allBoards ? 'All Boards' : entry.boards.map((b) => b.board.name).join(', ')}
                    </td>
                    <td className={`px-4 py-3.5 text-sm font-semibold ${d ? 'text-teal-400' : 'text-teal-600'}`}>{entry._count.likes}</td>
                    <td className={`px-4 py-3.5 text-xs whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {openMenuId === entry.id && (
                          <div className={`absolute right-0 top-full mt-1 w-36 rounded-lg shadow-xl border z-50 py-1 ${
                            d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            <button onClick={() => { navigate(`/admin/changelog/${entry.id}/edit`); setOpenMenuId(null); }}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${d ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {entry.status === 'draft' && (
                              <button onClick={() => { handlePublish(entry.id); setOpenMenuId(null); }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-green-600 ${d ? 'hover:bg-gray-600' : 'hover:bg-green-50'}`}>
                                <Send className="w-3.5 h-3.5" /> Publish
                              </button>
                            )}
                            <button onClick={() => { handleDelete(entry.id); setOpenMenuId(null); }}
                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-4 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    No changelog entries yet. Create your first entry!
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredEntries.length > 0 && (
            <div className={`flex items-center justify-between px-4 py-3 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${d ? 'text-gray-400' : 'text-gray-500'}`}>Rows per page:</span>
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                  className={`px-2 py-1 rounded border text-xs ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                  {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredEntries.length)} of {filteredEntries.length}
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
          )}
        </div>
      )}

      {/* Close menu on click outside */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      {/* Create Modal - Simple */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-lg w-full rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Create Changelog Entry
              </h2>
              <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg ${
                theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Entry Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What's new?"
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this changelog entry..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              {/* Type */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Type</label>
                <div className="flex gap-3">
                  {['new', 'improved', 'fixed'].map((t) => (
                    <button key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        form.type === t
                          ? t === 'new' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : t === 'improved' ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-orange-100 text-orange-700 border-orange-300'
                          : theme === 'dark' ? 'border-gray-700 text-gray-400 hover:bg-gray-800'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Visible to</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="visibility" checked={form.allBoards}
                      onChange={() => setForm({ ...form, allBoards: true, boardIds: [] })} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>All Boards</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="visibility" checked={!form.allBoards}
                      onChange={() => setForm({ ...form, allBoards: false })} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Selected Boards</span>
                  </label>
                  {!form.allBoards && (
                    <div className="pl-6 space-y-2 max-h-40 overflow-y-auto">
                      {boards.map((board) => (
                        <label key={board.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.boardIds.includes(board.id)}
                            onChange={(e) => {
                              if (e.target.checked) setForm({ ...form, boardIds: [...form.boardIds, board.id] });
                              else setForm({ ...form, boardIds: form.boardIds.filter((id) => id !== board.id) });
                            }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: board.color }} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{board.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Create Button */}
              <button onClick={handleCreate}
                className="w-full px-4 py-3 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0] font-semibold transition">
                Create Changelog Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

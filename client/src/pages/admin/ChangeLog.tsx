import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Send, Clock, X, Search } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
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

export default function AdminChangeLog() {
  const theme = useThemeStore((state) => state.theme);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'new',
    allBoards: true,
    boardIds: [] as string[],
  });

  useEffect(() => {
    fetchEntries();
    fetchBoards();
  }, [filterStatus, filterType]);

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

  const openCreateModal = () => {
    setEditingEntry(null);
    setForm({ title: '', content: '', type: 'new', allBoards: true, boardIds: [] });
    setShowModal(true);
  };

  const openEditModal = (entry: ChangelogEntry) => {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      content: entry.content,
      type: entry.type,
      allBoards: entry.allBoards,
      boardIds: entry.boards.map((b) => b.board.id),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      if (editingEntry) {
        await api.put(`/changelog/${editingEntry.id}`, form);
        toast.success('Entry updated');
      } else {
        await api.post('/changelog', form);
        toast.success('Entry created');
      }
      setShowModal(false);
      fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/changelog/${id}`);
      toast.success('Entry deleted');
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/changelog/${id}/publish`);
      toast.success('Entry published!');
      fetchEntries();
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Failed to publish');
    }
  };

  const handleSchedule = async (id: string) => {
    const dateStr = prompt('Schedule date (YYYY-MM-DD HH:mm):');
    if (!dateStr) return;
    try {
      await api.post(`/changelog/${id}/publish`, { scheduledAt: dateStr });
      toast.success('Entry scheduled!');
      fetchEntries();
    } catch (error) {
      console.error('Error scheduling:', error);
      toast.error('Failed to schedule');
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Changelog
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Create and manage product changelog entries
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[200px] max-w-[300px] ${
            theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent text-sm outline-none w-full ${
                theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <option value="">All Types</option>
            <option value="new">New</option>
            <option value="improved">Improved</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className={`rounded-lg border overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Boards</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Likes</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-t ${
                      theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-6 py-4 text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {entry.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getTypeBadge(entry.type)}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entry.allBoards ? 'All Boards' : entry.boards.map((b) => b.board.name).join(', ')}
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entry._count.likes}
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {entry.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handlePublish(entry.id)}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition"
                              title="Publish Now"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSchedule(entry.id)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition"
                              title="Schedule"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEditModal(entry)}
                          className={`p-1.5 rounded-lg transition ${
                            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                          }`}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center text-sm ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    No changelog entries yet. Create your first entry!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-2xl w-full rounded-xl max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingEntry ? 'Edit Entry' : 'Create Entry'}
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
                }`}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Entry title..."
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Content (Markdown supported)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Share recent product changes..."
                  rows={8}
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
                <div className="flex gap-4">
                  {['new', 'improved', 'fixed'].map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        checked={form.type === t}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      />
                      <span className={`text-sm capitalize ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Board Visibility */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Visible to</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={form.allBoards}
                      onChange={() => setForm({ ...form, allBoards: true, boardIds: [] })}
                    />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      All Boards
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!form.allBoards}
                      onChange={() => setForm({ ...form, allBoards: false })}
                    />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Selected Boards
                    </span>
                  </label>

                  {!form.allBoards && (
                    <div className="pl-6 space-y-2">
                      {boards.map((board) => (
                        <label key={board.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.boardIds.includes(board.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, boardIds: [...form.boardIds, board.id] });
                              } else {
                                setForm({ ...form, boardIds: form.boardIds.filter((id) => id !== board.id) });
                              }
                            }}
                          />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: board.color }} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {board.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border font-medium ${
                    theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold"
                >
                  {editingEntry ? 'Update' : 'Save as Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

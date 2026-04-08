import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  boardId: string;
}

interface Board {
  id: string;
  name: string;
}

export default function AdminTags() {
  const theme = useThemeStore((state) => state.theme);
  const [tags, setTags] = useState<Tag[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1' });

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) fetchTags();
  }, [selectedBoard]);

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
        if (response.data.data.boards.length > 0) {
          setSelectedBoard(response.data.data.boards[0].id);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tags?boardId=${selectedBoard}`);
      if (response.data.success) {
        setTags(response.data.data.tags);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!formData.name.trim()) {
      alert('Please enter tag name');
      return;
    }

    try {
      const response = await api.post('/tags', {
        name: formData.name,
        color: formData.color,
        boardId: selectedBoard,
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ name: '', color: '#6366f1' });
        fetchTags();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create tag');
    }
  };

  const handleUpdateTag = async () => {
    if (!selectedTag || !formData.name.trim()) {
      alert('Please enter tag name');
      return;
    }

    try {
      const response = await api.put(`/tags/${selectedTag.id}`, {
        name: formData.name,
        color: formData.color,
      });

      if (response.data.success) {
        setShowEditModal(false);
        setSelectedTag(null);
        setFormData({ name: '', color: '#6366f1' });
        fetchTags();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag?')) return;

    try {
      const response = await api.delete(`/tags/${tagId}`);
      if (response.data.success) {
        fetchTags();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete tag');
    }
  };

  const colors = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0]"
          >
            <Plus className="w-4 h-4" />
            Create Tag
          </button>
        </div>

        <CustomDropdown
          label="Board"
          value={selectedBoard}
          options={boards.map((b) => ({ value: b.id, label: b.name }))}
          onChange={(v) => setSelectedBoard(v)}
          minWidth="200px"
        />
      </div>

      {loading ? (
        <LoadingBar />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`p-4 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTag(tag);
                      setFormData({ name: tag.name, color: tag.color });
                      setShowEditModal(true);
                    }}
                    className={`p-1 rounded ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className={`p-1 rounded ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className={`font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {tag.name}
              </p>
            </div>
          ))}

          {tags.length === 0 && (
            <div className={`col-span-full p-8 text-center rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              No tags for this board
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Create Tag
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-1 rounded ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tag name"
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-200'
                }`}
              />

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-8 rounded border-2 ${
                        formData.color === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTag}
                  className="px-4 py-2 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0]"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Edit Tag
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTag(null);
                }}
                className={`p-1 rounded ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-200'
                }`}
              />

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-8 rounded border-2 ${
                        formData.color === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTag(null);
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTag}
                  className="px-4 py-2 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0]"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

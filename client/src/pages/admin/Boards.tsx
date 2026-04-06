import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, Upload } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
}

export default function AdminBoards({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366f1', icon: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const cardLogoInputRef = useRef<HTMLInputElement>(null);
  const [cardLogoBoard, _setCardLogoBoard] = useState<Board | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Image too large. Max size: 500KB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, icon: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleCardLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardLogoBoard) return;
    if (file.size > 500 * 1024) { toast.error('Image too large. Max size: 500KB'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api.put(`/boards/${cardLogoBoard.id}`, {
          name: cardLogoBoard.name,
          description: cardLogoBoard.description,
          color: cardLogoBoard.color,
          icon: reader.result as string,
        });
        toast.success('Logo updated!');
        fetchBoards();
      } catch { toast.error('Failed to update logo'); }
    };
    reader.readAsDataURL(file);
  };

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

  const handleCreateBoard = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter board name');
      return;
    }

    try {
      const response = await api.post('/boards', {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
      });

      if (response.data.success) {
        toast.success('Board created successfully');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', color: '#6366f1', icon: '' });
        fetchBoards();
      }
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create board');
    }
  };

  const handleUpdateBoard = async () => {
    if (!selectedBoard || !formData.name.trim()) {
      alert('Please enter board name');
      return;
    }

    try {
      const response = await api.put(`/boards/${selectedBoard.id}`, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
      });

      if (response.data.success) {
        setShowEditModal(false);
        setSelectedBoard(null);
        setFormData({ name: '', description: '', color: '#6366f1', icon: '' });
        fetchBoards();
      }
    } catch (error) {
      console.error('Error updating board:', error);
      alert('Failed to update board');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) return;

    try {
      const response = await api.delete(`/boards/${boardId}`);
      if (response.data.success) {
        fetchBoards();
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    }
  };

  const openEditModal = (board: Board) => {
    setSelectedBoard(board);
    setFormData({ name: board.name, description: board.description || '', color: board.color, icon: board.icon || '' });
    setShowEditModal(true);
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

  return (
    <div>
      {/* Hidden input for card logo change */}
      <input ref={cardLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleCardLogoChange} />

      {/* Boards Grid */}
      {loading ? (
        <div className="text-center py-8">Loading boards...</div>
      ) : (
        <>
          {boards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board) => {
                const boardColor = board.color || '#6366f1';
                const initial = board.name?.charAt(0).toUpperCase();
                const d = theme === 'dark';
                return (
                  <div
                    key={board.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col transition-all hover:shadow-lg ${
                      d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Icon area */}
                    <div
                      className="w-full h-48 flex items-center justify-center cursor-pointer overflow-hidden"
                      style={{ backgroundColor: boardColor + '22' }}
                      onClick={() => navigate(`/admin/boards/${board.id}`)}
                    >
                      {board.icon ? (
                        <img src={board.icon} alt={board.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-6xl font-bold" style={{ color: boardColor }}>
                          {initial}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-8 flex flex-col flex-1 items-center text-center">
                      <h3
                        className={`font-bold cursor-pointer mb-4 ${d ? 'text-white' : 'text-gray-900'}`}
                        style={{ fontSize: '20px' }}
                        onClick={() => navigate(`/admin/boards/${board.id}`)}
                      >
                        {board.name}
                      </h3>
                      <p className={`flex-1 line-clamp-2 mb-8 ${d ? 'text-gray-400' : 'text-gray-500'}`}
                        style={{ fontSize: '16px' }}>
                        {board.description || 'No description provided.'}
                      </p>

                      {/* Buttons */}
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => navigate(`/admin/boards/${board.id}`)}
                          className={`flex-1 py-2.5 rounded-xl border-2 font-semibold uppercase tracking-wide transition-colors ${
                            d
                              ? 'border-gray-500 text-gray-300 hover:border-white hover:text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900'
                          }`}
                          style={{ fontSize: '16px' }}
                        >
                          Access Now
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(board); }}
                          className={`flex-1 py-2.5 rounded-xl border-2 font-semibold uppercase tracking-wide transition-colors ${
                            d
                              ? 'border-gray-500 text-gray-300 hover:border-white hover:text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900'
                          }`}
                          style={{ fontSize: '16px' }}
                        >
                          Edit Board
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`p-8 text-center rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <p className="mb-4">No boards created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Board
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Create New Board
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-1 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Board Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                  placeholder="e.g., Pabbly Connect"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                  placeholder="Board description"
                  rows={3}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Board Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${
                        formData.color === color ? 'border-white shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Board Logo <span className={`text-xs font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(optional — recommended: 200×200px, max 500KB, PNG/JPG)</span>
                </label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {formData.icon ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.icon} alt="logo" className="w-14 h-14 rounded-xl object-contain border" />
                    <button onClick={() => setFormData({ ...formData, icon: '' })} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed text-sm transition-colors ${
                      theme === 'dark' ? 'border-gray-600 text-gray-400 hover:border-gray-400' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    <Upload className="w-4 h-4" /> Upload Logo
                  </button>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '', color: '#6366f1', icon: '' });
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
                  onClick={handleCreateBoard}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Create Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEditModal && selectedBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-6 border-b sticky top-0 z-10 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Edit Board
              </h2>
              <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Board Name */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Board Name</label>
                <input type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                  }`} />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                  }`} rows={3} />
              </div>

              {/* Board Color */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Board Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button key={color} onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${
                        formData.color === color ? 'border-white shadow-lg' : 'border-transparent'
                      }`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Board Logo <span className={`text-xs font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(recommended: 200×200px, max 500KB)</span>
                </label>
                <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {formData.icon ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.icon} alt="logo" className="w-14 h-14 rounded-xl object-contain border" />
                    <button onClick={() => setFormData({ ...formData, icon: '' })} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed text-sm transition-colors ${
                      theme === 'dark' ? 'border-gray-600 text-gray-400 hover:border-gray-400' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    <Upload className="w-4 h-4" /> Upload Logo
                  </button>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-between pt-4">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedBoard(null); selectedBoard && handleDeleteBoard(selectedBoard.id); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                    theme === 'dark' ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Delete Board
                </button>
                <div className="flex gap-3">
                  <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                    className={`px-4 py-2 rounded-lg border text-sm ${
                      theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}>Cancel</button>
                  <button onClick={handleUpdateBoard}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
                    Update Board
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

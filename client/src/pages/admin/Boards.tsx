import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, Upload } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
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

  const [creatingBoard, setCreatingBoard] = useState(false);
  const [updatingBoard, setUpdatingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);

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
        icon: formData.icon,
      });

      if (response.data.success) {
        toast.success('Board created successfully');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', color: '#6366f1', icon: '' });
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
    } finally {
      setUpdatingBoard(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) return;

    setDeletingBoard(true);
    try {
      const response = await api.delete(`/boards/${boardId}`);
      if (response.data.success) {
        fetchBoards();
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    } finally {
      setDeletingBoard(false);
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
        <LoadingBar />
      ) : (
        <>
          {boards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {boards.map((board) => {
                const boardColor = board.color || '#6366f1';
                const initial = board.name?.charAt(0).toUpperCase();
                const d = theme === 'dark';
                return (
                  <div
                    key={board.id}
                    className={`rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-md group cursor-pointer ${
                      d ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => navigate(`/admin/boards/${board.id}`)}
                  >
                    {/* Icon area */}
                    <div
                      className="w-full flex items-center justify-center overflow-hidden relative"
                      style={{ backgroundColor: boardColor + '15', height: '180px' }}
                    >
                      {board.icon ? (
                        <img src={board.icon} alt={board.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold transition-transform group-hover:scale-110" style={{ color: boardColor }}>
                          {initial}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className={`font-semibold text-base mb-1.5 truncate ${d ? 'text-white' : 'text-gray-900'}`}>
                        {board.name}
                      </h3>
                      <p className={`text-sm line-clamp-2 mb-5 flex-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        {board.description || 'No description provided.'}
                      </p>

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/boards/${board.id}`); }}
                          className="flex-1 rounded-lg text-sm font-semibold bg-[#0C68E9] text-white hover:bg-[#0b5dd0] transition-colors"
                          style={{ height: '40px' }}
                        >
                          Access
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(board); }}
                          className={`flex-1 rounded-lg text-sm font-semibold border transition-colors ${
                            d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                          style={{ height: '40px' }}
                        >
                          Edit
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c68e9] text-white rounded-lg hover:bg-[#0b5dd0] transition-colors"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

              {/* Logo Upload */}
              <div>
                <input ref={fileInputRef} type="file" accept=".webp,.svg,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.gif,.avif,.apng,.png" className="hidden" onChange={handleImageUpload} />
                {formData.icon ? (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={formData.icon} alt="logo" className="w-8 h-8 rounded object-contain" />
                      <span className={`text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Board Logo</span>
                    </div>
                    <button onClick={() => setFormData({ ...formData, icon: '' })} className={`p-1 rounded-lg shrink-0 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                      <X className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:border-gray-400' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                    }`} style={{ padding: '28px 24px' }}>
                    <Upload className={`w-8 h-8 mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Choose image files (PNG, JPG, etc.) or drag them here
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Allowed: .webp, .svg, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .gif, .avif, .apng, .png
                    </p>
                    <p className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Max file size: 500 KB
                    </p>
                  </div>
                )}
              </div>

              {/* Board Color */}
              <div>
                <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Board Color</p>
                <div className="flex flex-wrap gap-4" style={{ marginLeft: '14px' }}>
                  {colors.map((color) => (
                    <button key={color} onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowCreateModal(false); setFormData({ name: '', description: '', color: '#6366f1', icon: '' }); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreateBoard} loading={creatingBoard}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Create Board</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEditModal && selectedBoard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

              {/* Logo Upload */}
              <div>
                <input ref={editFileInputRef} type="file" accept=".webp,.svg,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.gif,.avif,.apng,.png" className="hidden" onChange={handleImageUpload} />
                {formData.icon ? (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={formData.icon} alt="logo" className="w-8 h-8 rounded object-contain" />
                      <span className={`text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Board Logo</span>
                    </div>
                    <button onClick={() => setFormData({ ...formData, icon: '' })} className={`p-1 rounded-lg shrink-0 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                      <X className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => editFileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:border-gray-400' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                    }`} style={{ padding: '28px 24px' }}>
                    <Upload className={`w-8 h-8 mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Choose image files (PNG, JPG, etc.) or drag them here
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Allowed: .webp, .svg, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .gif, .avif, .apng, .png
                    </p>
                    <p className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Max file size: 500 KB</p>
                  </div>
                )}
              </div>

              {/* Board Color */}
              <div>
                <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Board Color</p>
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
                <button onClick={() => { const id = selectedBoard.id; setShowEditModal(false); setSelectedBoard(null); handleDeleteBoard(id); }}
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
                    className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Update Board</LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

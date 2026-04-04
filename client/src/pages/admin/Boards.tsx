import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, UserPlus, Shield } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  order: number;
}

interface BoardManager {
  id: string;
  userId: string;
  canEditPost: boolean;
  canDeletePost: boolean;
  canEditComment: boolean;
  canDeleteComment: boolean;
  user: { id: string; name: string; email: string };
}

export default function AdminBoards() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardManagers, setBoardManagers] = useState<BoardManager[]>([]);
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [managerPerms, setManagerPerms] = useState({ canEditPost: false, canDeletePost: false, canEditComment: false, canDeleteComment: false });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    managerEmail: '',
    canEditPost: false,
    canDeletePost: false,
    canEditComment: false,
    canDeleteComment: false,
  });

  useEffect(() => {
    fetchBoards();
  }, []);

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
      });

      if (response.data.success) {
        const newBoardId = response.data.data.board.id;

        if (formData.managerEmail.trim()) {
          try {
            const usersResponse = await api.get('/admin/users');
            if (usersResponse.data.success) {
              const users = usersResponse.data.data.users;
              const matchedUser = users.find(
                (u: { email: string }) =>
                  u.email.toLowerCase() === formData.managerEmail.trim().toLowerCase()
              );
              if (matchedUser) {
                await api.post(`/boards/${newBoardId}/members`, {
                  userId: matchedUser.id,
                  canEditPost: formData.canEditPost,
                  canDeletePost: formData.canDeletePost,
                  canEditComment: formData.canEditComment,
                  canDeleteComment: formData.canDeleteComment,
                });
                toast.success('Board created and manager assigned!');
              } else {
                toast.error('Board created, but no user found with that email');
              }
            }
          } catch (error) {
            console.error('Error adding manager:', error);
            toast.error('Board created, but failed to add manager');
          }
        } else {
          toast.success('Board created successfully');
        }

        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          color: '#6366f1',
          managerEmail: '',
          canEditPost: false,
          canDeletePost: false,
          canEditComment: false,
          canDeleteComment: false,
        });
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
      });

      if (response.data.success) {
        setShowEditModal(false);
        setSelectedBoard(null);
        setFormData({ name: '', description: '', color: '#6366f1', managerEmail: '', canEditPost: false, canDeletePost: false, canEditComment: false, canDeleteComment: false });
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

  const fetchBoardManagers = async (boardId: string) => {
    try {
      const response = await api.get(`/boards/${boardId}/members`);
      if (response.data.success) {
        setBoardManagers(response.data.data.members || []);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleAddManager = async () => {
    if (!selectedBoard || !newManagerEmail.trim()) {
      toast.error('Enter manager email');
      return;
    }
    try {
      // Find user by email
      const usersRes = await api.get('/admin/users', { params: { search: newManagerEmail } });
      const users = usersRes.data.data?.users || [];
      const user = users.find((u: any) => u.email === newManagerEmail);
      if (!user) {
        toast.error('User not found with this email');
        return;
      }

      await api.post(`/boards/${selectedBoard.id}/members`, {
        userId: user.id,
        ...managerPerms,
      });
      toast.success('Manager added');
      setNewManagerEmail('');
      setManagerPerms({ canEditPost: false, canDeletePost: false, canEditComment: false, canDeleteComment: false });
      fetchBoardManagers(selectedBoard.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add manager');
    }
  };

  const handleRemoveManager = async (userId: string) => {
    if (!selectedBoard || !confirm('Remove this manager?')) return;
    try {
      await api.delete(`/boards/${selectedBoard.id}/members`, { data: { userId } });
      toast.success('Manager removed');
      fetchBoardManagers(selectedBoard.id);
    } catch (error) {
      toast.error('Failed to remove manager');
    }
  };

  const openEditModal = (board: Board) => {
    setSelectedBoard(board);
    setFormData({
      name: board.name,
      description: board.description || '',
      color: board.color,
      managerEmail: '',
      canEditPost: false,
      canDeletePost: false,
      canEditComment: false,
      canDeleteComment: false,
    });
    setBoardManagers([]);
    setNewManagerEmail('');
    fetchBoardManagers(board.id);
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Board
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      {loading ? (
        <div className="text-center py-8">Loading boards...</div>
      ) : (
        <>
          {boards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => navigate(`/admin/boards/${board.id}`)}
                  className={`p-6 rounded-lg border cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  } transition-all hover:shadow-lg`}
                >
                  {/* Color indicator */}
                  <div
                    className="w-full h-2 rounded-full mb-4"
                    style={{ backgroundColor: board.color }}
                  />

                  <h3 className={`text-xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {board.name}
                  </h3>

                  {board.description && (
                    <p className={`text-sm mb-4 line-clamp-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {board.description}
                    </p>
                  )}

                  <div className={`text-xs mb-4 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Slug: <code className="font-mono">{board.slug}</code>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(board);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board.id);
                      }}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        theme === 'dark'
                          ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400'
                          : 'bg-red-50 hover:bg-red-100 text-red-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Manager Email <span className={`text-xs font-normal ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>(optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                  placeholder="manager@example.com"
                />
              </div>

              {formData.managerEmail && (
                <div>
                  <label className={`block text-sm font-medium mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Manager Permissions
                  </label>
                  <div className={`space-y-2 p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canEditPost}
                        onChange={(e) => setFormData({ ...formData, canEditPost: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        Edit Posts
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canDeletePost}
                        onChange={(e) => setFormData({ ...formData, canDeletePost: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        Delete Posts
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canEditComment}
                        onChange={(e) => setFormData({ ...formData, canEditComment: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        Edit Comments
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canDeleteComment}
                        onChange={(e) => setFormData({ ...formData, canDeleteComment: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        Delete Comments
                      </span>
                    </label>
                  </div>
                </div>
              )}

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

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      name: '',
                      description: '',
                      color: '#6366f1',
                      managerEmail: '',
                      canEditPost: false,
                      canDeletePost: false,
                      canEditComment: false,
                      canDeleteComment: false,
                    });
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

              {/* Managers Section */}
              <div className={`pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <label className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Board Managers ({boardManagers.length})
                  </label>
                </div>

                {/* Current Managers */}
                {boardManagers.length > 0 ? (
                  <div className={`rounded-lg border mb-4 overflow-hidden ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <table className="w-full">
                      <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Manager</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold">Permissions</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boardManagers.map((m) => (
                          <tr key={m.id} className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <td className="px-3 py-2">
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{m.user.name}</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{m.user.email}</p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {m.canEditPost && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">Edit Post</span>}
                                {m.canDeletePost && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">Delete Post</span>}
                                {m.canEditComment && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">Edit Comment</span>}
                                {m.canDeleteComment && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">Delete Comment</span>}
                                {!m.canEditPost && !m.canDeletePost && !m.canEditComment && !m.canDeleteComment && (
                                  <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No permissions</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => handleRemoveManager(m.userId)}
                                className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition">
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No managers assigned</p>
                )}

                {/* Add Manager */}
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Add Manager</p>
                  <div className="flex gap-2 mb-3">
                    <input type="email" value={newManagerEmail}
                      onChange={(e) => setNewManagerEmail(e.target.value)}
                      placeholder="Enter manager email..."
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                      }`} />
                    <button onClick={handleAddManager}
                      className="flex items-center gap-1 px-3 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800">
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  {/* Permissions */}
                  <p className={`text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Permissions for new manager:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'canEditPost', label: 'Edit Posts' },
                      { key: 'canDeletePost', label: 'Delete Posts' },
                      { key: 'canEditComment', label: 'Edit Comments' },
                      { key: 'canDeleteComment', label: 'Delete Comments' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={(managerPerms as any)[key]}
                          onChange={(e) => setManagerPerms({ ...managerPerms, [key]: e.target.checked })} />
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => { setShowEditModal(false); setSelectedBoard(null); }}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>Cancel</button>
                <button onClick={handleUpdateBoard}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                  Update Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

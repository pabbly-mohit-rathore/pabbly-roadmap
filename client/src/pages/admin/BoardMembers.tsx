import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface BoardMember {
  userId: string;
  user: User;
  boardId: string;
  canEditPost: boolean;
  canDeletePost: boolean;
  canEditComment: boolean;
  canDeleteComment: boolean;
}

interface Board {
  id: string;
  name: string;
}

export default function AdminBoardMembers() {
  const theme = useThemeStore((state) => state.theme);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchBoards();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchMembers();
    }
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
      console.error('Error fetching boards:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setAllUsers(response.data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/boards/${selectedBoard}/members`);
      if (response.data.success) {
        setMembers(response.data.data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }

    try {
      const response = await api.post(`/boards/${selectedBoard}/members`, {
        userId: selectedUserId,
      });

      if (response.data.success) {
        setShowAddModal(false);
        setSelectedUserId('');
        fetchMembers();
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return;

    try {
      const response = await api.delete(`/boards/${selectedBoard}/members/${userId}`);
      if (response.data.success) {
        fetchMembers();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const availableUsers = allUsers.filter(
    (user) => !members.some((member) => member.userId === user.id)
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Board Members
            </h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Assign managers to boards
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!selectedBoard || availableUsers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>

        {/* Board Selector */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Select Board
          </label>
          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200'
            }`}
          >
            <option value="">Select Board</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="text-center py-8">Loading members...</div>
      ) : (
        <>
          {members.length > 0 ? (
            <div className={`rounded-lg border overflow-hidden ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <table className="w-full">
                <thead className={`${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Permissions</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.userId}
                      className={`border-t ${
                        theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {member.user.name}
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {member.user.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {member.canEditPost && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                              Edit Post
                            </span>
                          )}
                          {member.canDeletePost && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                              Delete Post
                            </span>
                          )}
                          {member.canEditComment && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                              Edit Comment
                            </span>
                          )}
                          {member.canDeleteComment && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                              Delete Comment
                            </span>
                          )}
                          {!member.canEditPost &&
                            !member.canDeletePost &&
                            !member.canEditComment &&
                            !member.canDeleteComment && (
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                theme === 'dark'
                                  ? 'bg-gray-700 text-gray-300'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                View Only
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`p-8 text-center rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              No members assigned to this board yet
            </div>
          )}
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Add Member to {boards.find((b) => b.id === selectedBoard)?.name}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-1 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <option value="">Select User</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

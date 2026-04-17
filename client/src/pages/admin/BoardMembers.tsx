import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import CustomDropdown from '../../components/ui/CustomDropdown';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

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
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; name: string } | null>(null);

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
      toast.error('Please select a user');
      return;
    }

    setAdding(true);
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
      toast.error('Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteConfirm) return;
    const userId = deleteConfirm.userId;
    setRemovingId(userId);
    try {
      const response = await api.delete(`/boards/${selectedBoard}/members/${userId}`);
      if (response.data.success) {
        setDeleteConfirm(null);
        fetchMembers();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingId(null);
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
            <h1 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Board Members
            </h1>
            <p className={`text-base ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Assign managers to boards
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!selectedBoard || availableUsers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>

        {/* Board Selector */}
        <div>
          <CustomDropdown
            label="Board"
            value={selectedBoard}
            options={[{ value: '', label: 'Select Board' }, ...boards.map((b) => ({ value: b.id, label: b.name }))]}
            onChange={(v) => setSelectedBoard(v)}
            minWidth="200px"
          />
        </div>
      </div>

      {/* Members List */}
      {loading ? (
        <LoadingBar />
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Permissions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
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
                      <td className={`px-4 py-3.5 text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {member.user.name}
                      </td>
                      <td className={`px-4 py-3.5 text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {member.user.email}
                      </td>
                      <td className="px-4 py-3.5">
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
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setDeleteConfirm({ userId: member.userId, name: member.user.name })}
                          disabled={removingId === member.userId}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                          } ${removingId === member.userId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {removingId === member.userId ? (
                            <svg className="animate-spin w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
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

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Remove this member?"
        message={`${deleteConfirm?.name || 'This member'} will lose access to this board. You can re-add them anytime.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
        onCancel={() => setDeleteConfirm(null)}
        loading={removingId !== null}
      />

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
                <CustomDropdown
                  label="User"
                  value={selectedUserId}
                  options={[{ value: '', label: 'Select User' }, ...availableUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))]}
                  onChange={(v) => setSelectedUserId(v)}
                  minWidth="100%"
                  bgClass={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
                />
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
                <LoadingButton
                  onClick={handleAddMember}
                  loading={adding}
                  className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-70"
                >
                  Add Member
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

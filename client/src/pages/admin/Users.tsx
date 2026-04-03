import { useEffect, useState } from 'react';
import { Search, Shield, X, Copy, Check } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface BoardInfo {
  board: {
    id: string;
    name: string;
    slug: string;
    color: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  boardAccess: BoardInfo[];
  _count: {
    posts: number;
    votes: number;
    comments: number;
    boardMemberships: number;
    boardAccess: number;
  };
}

export default function AdminUsers() {
  const theme = useThemeStore((state) => state.theme);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/admin/users', { params });
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBanUser = async (userId: string, action: 'ban' | 'unban') => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { action });
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isActive: action === 'unban' } : null);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-12">
        <h1 className={`text-4xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Users
        </h1>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Manage platform users and permissions
        </p>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-6 ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-200'
              }`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-200'
            }`}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : (
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
                <th className="px-6 py-3 text-left text-sm font-semibold">User</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Posts</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Votes</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Boards</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`border-t cursor-pointer ${
                    selectedUser?.id === user.id
                      ? theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'
                      : ''
                  } ${
                    theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <td className={`px-6 py-4 text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p>{user.name}</p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className="flex items-center gap-1">
                      {user.role === 'admin' && <Shield className="w-4 h-4" />}
                      {user.role}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {user._count.posts}
                  </td>
                  <td className={`px-6 py-4 text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {user._count.votes}
                  </td>
                  <td className={`px-6 py-4 text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {user._count.boardAccess}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleBanUser(user.id, user.isActive ? 'ban' : 'unban')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          user.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.isActive ? 'Ban' : 'Unban'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className={`p-8 text-center ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No users found
            </div>
          )}
        </div>
      )}

      {/* Right Side Drawer */}
      {selectedUser && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedUser(null)}
          />

          {/* Drawer */}
          <div className={`fixed top-16 right-0 z-50 h-[calc(100vh-64px)] w-[380px] border-l shadow-2xl overflow-y-auto transition-transform ${
            theme === 'dark'
              ? 'bg-gray-900 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${
                theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* User Header */}
            <div className={`p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center text-pink-700 text-xl font-bold shrink-0">
                  {selectedUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedUser.name}
                  </h2>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedUser.isActive ? 'bg-blue-500' : 'bg-red-500'}`} />
                    <span>{selectedUser._count.votes} vote{selectedUser._count.votes !== 1 ? 's' : ''}</span>
                    <span className="mx-1">·</span>
                    <span>{selectedUser._count.posts} post{selectedUser._count.posts !== 1 ? 's' : ''}</span>
                    <span className="mx-1">·</span>
                    <span>{selectedUser._count.comments} comment{selectedUser._count.comments !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="p-6">
              <h3 className={`text-sm font-bold mb-5 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                User details
              </h3>

              <div className="space-y-5">
                {/* Role */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>Role</p>
                  <p className={`text-sm font-semibold capitalize ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{selectedUser.role}</p>
                </div>

                {/* Account Created */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>Account Created</p>
                  <p className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}</p>
                </div>

                {/* Email */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>Email</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{selectedUser.email}</p>
                    <button
                      onClick={() => handleCopy(selectedUser.email, 'email')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        copiedField === 'email'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {copiedField === 'email' ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> COPIED</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> COPY</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>Name</p>
                  <p className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{selectedUser.name}</p>
                </div>

                {/* User ID */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>User ID</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold font-mono ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{selectedUser.id}</p>
                    <button
                      onClick={() => handleCopy(selectedUser.id, 'id')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        copiedField === 'id'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {copiedField === 'id' ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> COPIED</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> COPY</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedUser.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedUser.isActive ? 'Active' : 'Banned'}
                  </span>
                </div>

                {/* Boards */}
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>Board Access ({selectedUser._count.boardAccess})</p>
                  {selectedUser.boardAccess && selectedUser.boardAccess.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {selectedUser.boardAccess.map((ba) => (
                        <div
                          key={ba.board.id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: ba.board.color || '#6366f1' }}
                          />
                          <span className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>{ba.board.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>No boards</p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {selectedUser.role !== 'admin' && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleBanUser(selectedUser.id, selectedUser.isActive ? 'ban' : 'unban')}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      selectedUser.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {selectedUser.isActive ? 'Ban User' : 'Unban User'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

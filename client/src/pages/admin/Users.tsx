import { useEffect, useState } from 'react';
import { Search, Shield, X, Copy, Check, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const d = theme === 'dark';

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

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  const handleBanUser = async (userId: string, action: 'ban' | 'unban') => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { action });
      fetchUsers();
      toast.success(action === 'ban' ? 'User banned' : 'User unbanned');
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isActive: action === 'unban' } : null);
      }
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const hasFilters = searchQuery || statusFilter !== 'all';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Users</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>{filteredUsers.length} users</p>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[180px] max-w-[300px] ${
            d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or email..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className={`px-3 py-2 rounded-lg border text-sm ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>

          {hasFilters && (
            <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); setPage(0); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600">
              <X className="w-4 h-4" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading users...</div>
      ) : (
        <div className={`rounded-lg border overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <table className="w-full">
            <thead className={d ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                {['User', 'Role', 'Posts', 'Votes', 'Boards', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`border-t cursor-pointer transition ${
                      selectedUser?.id === user.id ? d ? 'bg-gray-700' : 'bg-blue-50' : ''
                    } ${d ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>

                    {/* User */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                          <p className={`text-xs truncate ${d ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'admin' && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                        <span className={`text-xs capitalize ${d ? 'text-gray-400' : 'text-gray-600'}`}>{user.role}</span>
                      </div>
                    </td>

                    {/* Posts */}
                    <td className={`px-4 py-3.5 text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>{user._count.posts}</td>

                    {/* Votes */}
                    <td className={`px-4 py-3.5 text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>{user._count.votes}</td>

                    {/* Boards */}
                    <td className={`px-4 py-3.5 text-sm font-semibold ${d ? 'text-teal-400' : 'text-teal-600'}`}>{user._count.boardAccess}</td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.isActive ? 'Active' : 'Banned'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className={`px-4 py-3.5 text-xs whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {openMenuId === user.id && (
                          <div className={`absolute right-0 top-full mt-1 w-36 rounded-lg shadow-xl border z-50 py-1 ${
                            d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                          }`}>
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => { handleBanUser(user.id, user.isActive ? 'ban' : 'unban'); setOpenMenuId(null); }}
                                className={`w-full px-3 py-2 text-left text-sm ${
                                  user.isActive
                                    ? 'text-red-500 hover:bg-red-50'
                                    : 'text-green-600 hover:bg-green-50'
                                }`}>
                                {user.isActive ? 'Ban User' : 'Unban User'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={`px-4 py-12 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
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
                  {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredUsers.length)} of {filteredUsers.length}
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

      {/* Right Side Drawer */}
      {selectedUser && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSelectedUser(null)} />
          <div className={`fixed top-16 right-0 z-50 h-[calc(100vh-64px)] w-[380px] border-l shadow-2xl overflow-y-auto transition-transform ${
            d ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <button onClick={() => setSelectedUser(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X className="w-5 h-5" />
            </button>

            {/* User Header */}
            <div className={`p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center text-pink-700 text-xl font-bold shrink-0">
                  {selectedUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.name}</h2>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
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
              <h3 className={`text-sm font-bold mb-5 ${d ? 'text-white' : 'text-gray-900'}`}>User details</h3>
              <div className="space-y-5">
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Role</p>
                  <p className={`text-sm font-semibold capitalize ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.role}</p>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Account Created</p>
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Email</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.email}</p>
                    <button onClick={() => handleCopy(selectedUser.email, 'email')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        copiedField === 'email' ? 'bg-green-100 text-green-700 border-green-200'
                        : d ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}>
                      {copiedField === 'email' ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> COPIED</span>
                        : <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> COPY</span>}
                    </button>
                  </div>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Name</p>
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.name}</p>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>User ID</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold font-mono ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.id}</p>
                    <button onClick={() => handleCopy(selectedUser.id, 'id')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        copiedField === 'id' ? 'bg-green-100 text-green-700 border-green-200'
                        : d ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}>
                      {copiedField === 'id' ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> COPIED</span>
                        : <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> COPY</span>}
                    </button>
                  </div>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>{selectedUser.isActive ? 'Active' : 'Banned'}</span>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Board Access ({selectedUser._count.boardAccess})</p>
                  {selectedUser.boardAccess && selectedUser.boardAccess.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {selectedUser.boardAccess.map((ba) => (
                        <div key={ba.board.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${d ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ba.board.color || '#6366f1' }} />
                          <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{ba.board.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No boards</p>
                  )}
                </div>
              </div>

              {selectedUser.role !== 'admin' && (
                <div className={`mt-8 pt-6 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button onClick={() => handleBanUser(selectedUser.id, selectedUser.isActive ? 'ban' : 'unban')}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      selectedUser.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}>
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

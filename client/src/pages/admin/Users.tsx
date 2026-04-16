import { useEffect, useState, useRef } from 'react';
import { Search, Shield, X, Copy, Check, ChevronLeft, ChevronRight, ChevronDown, MoreVertical, Users as UsersIcon } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';

interface BoardInfo { board: { id: string; name: string; slug: string; color: string; }; }
interface User {
  id: string; email: string; name: string; avatar?: string; role: string; isActive: boolean; createdAt: string;
  boardAccess: BoardInfo[];
  _count: { posts: number; votes: number; comments: number; boardMemberships: number; boardAccess: number; };
}

export default function AdminUsers() {
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedField, setCopiedField] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const el = tabsRef.current[statusFilter];
    if (el?.parentElement) {
      const pr = el.parentElement.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setIndicatorStyle({ left: er.left - pr.left, width: er.width });
    }
  }, [statusFilter, loading]);

  const fetchUsers = async () => {
    try { setLoading(true); const r = await api.get('/admin/users'); if (r.data.success) setUsers(r.data.data.users); } catch {} finally { setLoading(false); }
  };

  const filteredUsers = users.filter(u => {
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'banned' && u.isActive) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleBanUser = async (userId: string, action: 'ban' | 'unban') => {
    try { await api.patch(`/admin/users/${userId}/status`, { action }); fetchUsers(); toast.success(action === 'ban' ? 'User banned' : 'User unbanned');
      if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, isActive: action === 'unban' } : null);
    } catch { toast.error('Failed to update user status'); }
  };

  const handleCopy = (text: string, field: string) => { navigator.clipboard.writeText(text); setCopiedField(field); toast.success('Copied!'); setTimeout(() => setCopiedField(''), 2000); };

  return (
    <div>
      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or email..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>

          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setPage(0); }}
              className="flex items-center gap-2 font-medium text-red-500 border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
              style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
              <X className="w-5 h-5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingBar /> : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Title */}
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Users</h2>
          </div>
          <div className={`border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Status Tabs */}
          <div className={`relative flex items-end border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ height: '48px', paddingLeft: '24px', gap: '40px' }}>
            {[
              { key: 'all', label: 'All', badgeBg: 'bg-gray-800', badgeText: 'text-white', darkBadgeBg: 'bg-white', darkBadgeText: 'text-gray-900' },
              { key: 'active', label: 'Active', badgeBg: 'bg-green-100', badgeText: 'text-green-700', darkBadgeBg: 'bg-green-900/40', darkBadgeText: 'text-green-300' },
              { key: 'banned', label: 'Banned', badgeBg: 'bg-red-100', badgeText: 'text-red-700', darkBadgeBg: 'bg-red-900/40', darkBadgeText: 'text-red-300' },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              const count = tab.key === 'all' ? users.length : tab.key === 'active' ? users.filter(u => u.isActive).length : users.filter(u => !u.isActive).length;
              return (
                <button key={tab.key} ref={(el) => { tabsRef.current[tab.key] = el; }}
                  onClick={() => { setStatusFilter(tab.key); setPage(0); }}
                  className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors ${
                    isActive ? (d ? 'text-white' : 'text-gray-900') : (d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                  }`}>
                  {tab.label}
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-[24px] px-1 rounded-md text-[11px] font-bold ${
                    d ? `${tab.darkBadgeBg} ${tab.darkBadgeText}` : `${tab.badgeBg} ${tab.badgeText}`
                  }`}>{count}</span>
                </button>
              );
            })}
            <div className={`absolute bottom-0 h-0.5 ${d ? 'bg-white' : 'bg-gray-900'}`}
              style={{ left: indicatorStyle.left, width: indicatorStyle.width, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {['User', 'Role', 'Posts', 'Votes', 'Boards', 'Status', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: d ? undefined : '#1C252E',
                      textAlign: i === 2 || i === 3 || i === 4 ? 'center' as const : i === 7 ? 'right' as const : 'left' as const,
                      width: i === 0 ? '280px' : i === 1 ? '120px' : i === 2 ? '100px' : i === 3 ? '100px' : i === 4 ? '100px' : i === 5 ? '120px' : i === 6 ? '120px' : i === 7 ? '60px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 7 ? '24px' : '16px' }}>{h}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? paginatedUsers.map((user) => (
                <tr key={user.id} onClick={() => setSelectedUser(user)}
                  className={`border-b border-dashed cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? (d ? 'bg-gray-700' : 'bg-blue-50') : ''
                  } ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} px-5`} style={{ paddingLeft: '24px' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                        <p className={`text-xs truncate ${d ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                    <div className="flex items-center gap-1.5">
                      {user.role === 'admin' && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                      <span className={`text-sm capitalize ${d ? 'text-gray-400' : 'text-gray-600'}`}>{user.role}</span>
                    </div>
                  </td>
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>{user._count.posts}</td>
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>{user._count.votes}</td>
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm text-center font-semibold ${d ? 'text-teal-400' : 'text-teal-600'}`}>{user._count.boardAccess}</td>
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                    <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isActive ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                    {user.role !== 'admin' && (
                      <div className="relative inline-block">
                        <button onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {openMenuId === user.id && (
                          <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '160px' }}>
                            <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                            <button onClick={() => { handleBanUser(user.id, user.isActive ? 'ban' : 'unban'); setOpenMenuId(null); }}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${
                                user.isActive ? (d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50')
                                : (d ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50')
                              }`}>
                              <Shield className="w-[18px] h-[18px]" /> {user.isActive ? 'Ban User' : 'Unban User'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8}>
                  <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <UsersIcon className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Users Found</p>
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No users match your search criteria.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setDenseMode(!denseMode)}
                className={`relative w-9 h-5 rounded-full transition-colors ${denseMode ? 'bg-[#0c68e9]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${denseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                <div className="relative">
                  <button onClick={() => setRowsDropOpen(!rowsDropOpen)}
                    className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                    {rowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rowsDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {rowsDropOpen && (
                    <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      {[10, 25, 50, 100].map(n => (
                        <button key={n} onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
                          className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                            rowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                            : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                          }`}>{n}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredUsers.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredUsers.length)}` : '0–0'} of {filteredUsers.length}
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
          {rowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setRowsDropOpen(false)} />}
        </div>
      )}

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      {/* User Detail Drawer */}
      {selectedUser && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSelectedUser(null)} />
          <div className={`fixed top-16 right-0 z-50 h-[calc(100vh-64px)] w-[380px] border-l shadow-2xl overflow-y-auto transition-transform ${d ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setSelectedUser(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X className="w-5 h-5" />
            </button>
            <div className={`p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {selectedUser.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.name}</h2>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedUser.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>{selectedUser._count.votes} votes</span>
                    <span className="mx-1">·</span>
                    <span>{selectedUser._count.posts} posts</span>
                    <span className="mx-1">·</span>
                    <span>{selectedUser._count.comments} comments</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className={`text-sm font-bold mb-5 ${d ? 'text-white' : 'text-gray-900'}`}>User details</h3>
              <div className="space-y-5">
                <div>
                  <p className={`text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Role</p>
                  <p className={`text-sm font-semibold capitalize ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.role}</p>
                </div>
                <div>
                  <p className={`text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Account Created</p>
                  <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className={`text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
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
                  <p className={`text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>User ID</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold font-mono truncate ${d ? 'text-white' : 'text-gray-900'}`}>{selectedUser.id}</p>
                    <button onClick={() => handleCopy(selectedUser.id, 'id')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition shrink-0 ${
                        copiedField === 'id' ? 'bg-green-100 text-green-700 border-green-200'
                        : d ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}>
                      {copiedField === 'id' ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> COPIED</span>
                        : <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> COPY</span>}
                    </button>
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedUser.isActive ? 'Active' : 'Banned'}
                  </span>
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

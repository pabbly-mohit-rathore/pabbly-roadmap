import { useEffect, useState, useRef } from 'react';
import { Copy, Trash2, X, Search, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, Link2, Edit2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';

interface InviteLink {
  id: string;
  token: string;
  name?: string;
  boardIds: string[];
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Board { id: string; name: string; }

export default function AdminInviteLinks({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const [formData, setFormData] = useState({ name: '', boardIds: [] as string[], expiresAt: '', maxUses: '' });

  useEffect(() => { fetchLinks(); fetchBoards(); }, []);
  useEffect(() => { if (triggerCreate && triggerCreate > 0) setShowCreateModal(true); }, [triggerCreate]);

  useEffect(() => {
    const el = tabsRef.current[statusFilter];
    if (el?.parentElement) {
      const pr = el.parentElement.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setIndicatorStyle({ left: er.left - pr.left, width: er.width });
    }
  }, [statusFilter, loading]);

  const fetchLinks = async () => {
    try { setLoading(true); const r = await api.get('/invite-links'); if (r.data.success) setLinks(r.data.data.links); } catch {} finally { setLoading(false); }
  };
  const fetchBoards = async () => {
    try { const r = await api.get('/boards'); if (r.data.success) setBoards(r.data.data.boards); } catch {}
  };

  const handleCreateLink = async () => {
    if (!formData.name.trim() || formData.boardIds.length === 0) { toast.error('Name and boards are required'); return; }
    setCreating(true);
    try {
      const r = await api.post('/invite-links', { name: formData.name, boardIds: formData.boardIds, expiresAt: formData.expiresAt || null, maxUses: formData.maxUses ? parseInt(formData.maxUses) : null });
      if (r.data.success) { setShowCreateModal(false); setFormData({ name: '', boardIds: [], expiresAt: '', maxUses: '' }); fetchLinks(); toast.success('Invite link created!'); }
    } catch { toast.error('Failed to create link'); } finally { setCreating(false); }
  };

  const handleDeleteLink = async (id: string) => { if (!confirm('Delete this invite link?')) return; try { await api.delete(`/invite-links/${id}`); setLinks(prev => prev.filter(l => l.id !== id)); setOpenMenuId(null); toast.success('Deleted'); } catch { toast.error('Failed to delete'); } };
  const handleRevokeLink = async (id: string, isActive: boolean) => { try { await api.put(`/invite-links/${id}/revoke`, { isActive: !isActive }); fetchLinks(); setOpenMenuId(null); toast.success(isActive ? 'Revoked' : 'Reactivated'); } catch { toast.error('Failed'); } };
  const copyToClipboard = (token: string) => { navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`); toast.success('Link copied!'); };

  const getStatus = (link: InviteLink) => {
    if (!link.isActive) return 'revoked';
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return 'expired';
    if (link.maxUses && link.usedCount >= link.maxUses) return 'full';
    return 'active';
  };

  const filteredLinks = links.filter(l => {
    if (searchQuery && !(l.name || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && getStatus(l) !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLinks.length / rowsPerPage);
  const paginatedLinks = filteredLinks.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const statusBadge = (s: string) => {
    const c: Record<string, string> = { active: 'bg-green-100 text-green-700', revoked: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-700', full: 'bg-orange-100 text-orange-700' };
    return c[s] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      {/* Count */}
      <p className={`text-sm mb-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{filteredLinks.length} links</p>

      {/* Filters */}
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingBar /> : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Title */}
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Invite Links</h2>
          </div>
          <div className={`border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Status Tabs */}
          <div className={`relative flex items-end border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ height: '48px', paddingLeft: '24px', gap: '40px' }}>
            {[
              { key: 'all', label: 'All', badgeBg: 'bg-gray-800', badgeText: 'text-white', darkBadgeBg: 'bg-white', darkBadgeText: 'text-gray-900' },
              { key: 'active', label: 'Active', badgeBg: 'bg-green-100', badgeText: 'text-green-700', darkBadgeBg: 'bg-green-900/40', darkBadgeText: 'text-green-300' },
              { key: 'revoked', label: 'Revoked', badgeBg: 'bg-red-100', badgeText: 'text-red-700', darkBadgeBg: 'bg-red-900/40', darkBadgeText: 'text-red-300' },
              { key: 'expired', label: 'Expired', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700', darkBadgeBg: 'bg-gray-700', darkBadgeText: 'text-gray-300' },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              const count = tab.key === 'all' ? links.length : links.filter(l => getStatus(l) === tab.key).length;
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
                {['Name', 'Link', 'Boards', 'Status', 'Used', 'Expires', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: d ? undefined : '#1C252E',
                      textAlign: i === 4 ? 'center' as const : i === 7 ? 'right' as const : 'left' as const,
                      width: i === 0 ? '250px' : i === 1 ? '300px' : i === 2 ? '150px' : i === 3 ? '130px' : i === 4 ? '100px' : i === 5 ? '150px' : i === 6 ? '120px' : i === 7 ? '70px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 7 ? '24px' : '16px' }}>{h}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedLinks.length > 0 ? paginatedLinks.map((link) => {
                const status = getStatus(link);
                return (
                  <tr key={link.id} className={`border-b border-dashed cursor-pointer transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} px-5`} style={{ paddingLeft: '24px' }}>
                      <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{link.name || 'Unnamed'}</p>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`} onClick={(e) => { e.stopPropagation(); copyToClipboard(link.token); }}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${d ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50 hover:bg-blue-100'}`}>
                        <code className="text-xs truncate block text-blue-600 font-medium flex-1">
                          {window.location.origin}/invite/{link.token.substring(0, 8)}...
                        </code>
                        <Copy className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      </div>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="truncate block" style={{ maxWidth: '120px' }}>{link.boardIds.map(bid => boards.find(b => b.id === bid)?.name).filter(Boolean).join(', ') || '-'}</span>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${statusBadge(status)}`}>{status}</span>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm text-center font-semibold ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                      {link.usedCount}{link.maxUses ? `/${link.maxUses}` : ''}
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(link.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={() => setOpenMenuId(openMenuId === link.id ? null : link.id)}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {openMenuId === link.id && (
                          <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '170px' }}>
                            <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                            <button onClick={() => handleRevokeLink(link.id, link.isActive)}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                              <Edit2 className="w-[18px] h-[18px] text-amber-500" /> {link.isActive ? 'Revoke' : 'Reactivate'}
                            </button>
                            <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                            <button onClick={() => handleDeleteLink(link.id)}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                              <Trash2 className="w-[18px] h-[18px]" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8}>
                  <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Link2 className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Invite Links</p>
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Create your first invite link to get started.</p>
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
                {filteredLinks.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredLinks.length)}` : '0–0'} of {filteredLinks.length}
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

      {/* Close menu overlay */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Generate Invite Link</h2>
              <button onClick={() => setShowCreateModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Link Name */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.name} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Link Name *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>e.g., Support Team Access</p>
              </div>

              {/* Select Boards */}
              <div>
                <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Select Boards *</p>
                <div className={`space-y-2 max-h-40 overflow-y-auto p-3 rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  {boards.map((board) => (
                    <label key={board.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.boardIds.includes(board.id)}
                        onChange={() => setFormData(prev => ({
                          ...prev, boardIds: prev.boardIds.includes(board.id) ? prev.boardIds.filter(id => id !== board.id) : [...prev.boardIds, board.id]
                        }))} className="w-4 h-4" />
                      <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>{board.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <div className="relative">
                  <input type="date" value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-[11px] font-medium ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`} style={{ top: 0, transform: 'translateY(-50%)' }}>Expiry Date</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Optional. Leave empty for no expiry.</p>
              </div>

              {/* Max Uses */}
              <div>
                <div className="relative">
                  <input type="number" value={formData.maxUses} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Max Uses</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Optional. Leave empty for unlimited.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowCreateModal(false)}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleCreateLink} loading={creating}
                  className="px-3 py-1.5 bg-[#0C68E9] text-white text-sm font-medium hover:bg-[#0b5dd0] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Generate</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Search, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Power, Copy } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';
import Tooltip from '../../components/ui/Tooltip';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface EmbedWidget {
  id: string;
  token: string;
  name: string;
  type: string;
  theme: string;
  accentColor: string;
  isActive: boolean;
  modules: string[];
  createdAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
}

type TabKey = 'all' | 'active' | 'inactive';

export default function AdminEmbedWidgets({ triggerCreate, showFilters = false }: { triggerCreate?: number; showFilters?: boolean }) {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';

  const [widgets, setWidgets] = useState<EmbedWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);

  useEffect(() => { fetchWidgets(); }, []);
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) handleCreate();
  }, [triggerCreate]);

  const fetchWidgets = async () => {
    setLoading(true);
    try {
      const r = await api.get('/embed-widgets');
      if (r.data.success) setWidgets(r.data.data.widgets);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const r = await api.post('/embed-widgets', { name: 'Untitled widget' });
      if (r.data.success) {
        const id = r.data.data.widget.id;
        navigate(`/admin/settings/embed-widgets/${id}/edit`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create widget');
    }
  };

  const handleToggle = async (w: EmbedWidget) => {
    setTogglingId(w.id);
    try {
      const r = await api.post(`/embed-widgets/${w.id}/toggle`);
      if (r.data.success) {
        setWidgets((prev) => prev.map((x) => (x.id === w.id ? r.data.data.widget : x)));
        toast.success(r.data.message || 'Updated');
      }
    } catch { toast.error('Failed'); }
    finally { setTogglingId(null); setOpenMenuId(null); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/embed-widgets/${id}`);
      setWidgets((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirm(null);
      toast.success('Widget deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied');
  };

  const tabFiltered = widgets.filter((w) => {
    if (activeTab === 'active') return w.isActive;
    if (activeTab === 'inactive') return !w.isActive;
    return true;
  });
  const filtered = tabFiltered.filter((w) => !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const allCount = widgets.length;
  const activeCount = widgets.filter((w) => w.isActive).length;
  const inactiveCount = widgets.filter((w) => !w.isActive).length;

  return (
    <div>
      {showFilters && (
        <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search widgets..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
            </div>
            <CustomDropdown label="Status" value={activeTab}
              options={[
                { value: 'all', label: `All (${allCount})` },
                { value: 'active', label: `Active (${activeCount})` },
                { value: 'inactive', label: `Inactive (${inactiveCount})` },
              ]}
              onChange={(v) => { setActiveTab(v as TabKey); setPage(0); }} />
          </div>
        </div>
      )}

      {loading ? <LoadingBar /> : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Widgets</h2>
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {[
                  { label: 'S.No', tip: 'Serial number of the row' },
                  { label: 'Name', tip: 'Widget display name' },
                  { label: 'Widget Token', tip: 'Unique token used in the embed script' },
                  { label: 'Status', tip: 'Whether this widget is currently active' },
                  { label: 'Type', tip: 'How the widget opens — modal or popover' },
                  { label: 'Actions', tip: 'Manage this widget' },
                ].map((h, i) => (
                  <th key={h.label} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: d ? undefined : '#1C252E',
                      textAlign: i === 5 ? 'right' as const : 'left' as const,
                      width: i === 0 ? '80px' : i === 1 ? '180px' : i === 3 ? '200px' : i === 4 ? '200px' : i === 5 ? '70px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 5 ? '24px' : '16px' }}>
                      <Tooltip title={h.tip}><span>{h.label}</span></Tooltip>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? paginated.map((w, idx) => (
                <tr key={w.id} className={`border-b border-dashed transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                    {page * rowsPerPage + idx + 1}
                  </td>
                  {/* Name */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                    <button onClick={() => navigate(`/admin/settings/embed-widgets/${w.id}/edit`)}
                      className={`text-left font-semibold text-sm hover:underline ${d ? 'text-white' : 'text-gray-900'}`}>
                      {w.name}
                    </button>
                  </td>
                  {/* Token */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm`}>
                    <div className="flex items-center gap-2">
                      <Tooltip title={w.token}>
                        <code className={`font-mono text-xs px-2 py-1 rounded ${d ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                          style={{ display: 'inline-block', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.token}
                        </code>
                      </Tooltip>
                      <Tooltip title="Copy token">
                        <button onClick={() => copyToken(w.token)}
                          className={`p-1 rounded transition ${d ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  {/* Status */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      w.isActive
                        ? (d ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                        : (d ? 'bg-gray-500/15 text-gray-300' : 'bg-gray-100 text-gray-600')
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${w.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {w.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {/* Type */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${d ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                      {w.type}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                    <div className="relative inline-block">
                      <Tooltip title="Click to see options.">
                        <button onClick={() => setOpenMenuId(openMenuId === w.id ? null : w.id)}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </Tooltip>
                      {openMenuId === w.id && (
                        <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '180px' }}>
                          <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                          <button onClick={() => { navigate(`/admin/settings/embed-widgets/${w.id}/edit`); setOpenMenuId(null); }}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                            <Edit2 className="w-[18px] h-[18px] text-amber-500" />Edit
                          </button>
                          <button onClick={() => handleToggle(w)} disabled={togglingId === w.id}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 rounded-lg disabled:opacity-50 ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                            <Power className={`w-[18px] h-[18px] ${w.isActive ? 'text-amber-500' : 'text-emerald-500'}`} />{w.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                          <button onClick={() => { setDeleteConfirm(w.id); setOpenMenuId(null); }}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                            <Trash2 className="w-[18px] h-[18px]" />Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>
                  <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <LayoutGrid className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Widgets Found</p>
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Create a widget to embed on your website.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <Tooltip title="Toggle compact view."><button onClick={() => setDenseMode(!denseMode)}
                className={`relative w-9 h-5 rounded-full transition-colors ${denseMode ? 'bg-[#059669]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${denseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button></Tooltip>
              <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}><Tooltip title="Switch to reduce the table size."><span>Dense</span></Tooltip></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}><Tooltip title="Select the number of rows displayed per page."><span>Rows per page:</span></Tooltip></span>
                <div className="relative">
                  <Tooltip title="Click to change rows per page."><button onClick={() => setRowsDropOpen(!rowsDropOpen)}
                    className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                    {rowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rowsDropOpen ? 'rotate-180' : ''}`} />
                  </button></Tooltip>
                  {rowsDropOpen && (
                    <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      {[10, 25, 50, 100].map((n) => (
                        <Tooltip title="Select the number of rows per page." key={n}><button onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
                          className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                            rowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                              : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                          }`}>{n}</button></Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Tooltip title="Shows the current range of rows being displayed and the total number of rows."><span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                {filtered.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filtered.length)}` : '0–0'} of {filtered.length}
              </span></Tooltip>
              <div className="flex gap-1">
                <Tooltip title="Go to the previous page."><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </button></Tooltip>
                <Tooltip title="Go to the next page."><button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <ChevronRight className="w-4 h-4" />
                </button></Tooltip>
              </div>
            </div>
          </div>
          {rowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setRowsDropOpen(false)} />}
        </div>
      )}

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Widget"
        message="Are you sure you want to delete this widget? Any sites using its embed code will stop showing the widget."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={!!deletingId}
      />
    </div>
  );
}

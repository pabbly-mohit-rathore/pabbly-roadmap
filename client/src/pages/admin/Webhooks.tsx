import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, X, Search, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, Webhook as WebhookIcon, Send, Power, Check } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';
import Tooltip from '../../components/ui/Tooltip';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
  _count?: { deliveries: number };
}

interface EventOption { value: string; label: string; description: string; }

type TabKey = 'all' | 'active' | 'inactive';

export default function AdminWebhooks({ triggerCreate, showFilters = false }: { triggerCreate?: number; showFilters?: boolean }) {
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selected, setSelected] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState<{ name: string; url: string; events: string[]; isActive: boolean }>({ name: '', url: '', events: [], isActive: true });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const [eventsDropOpen, setEventsDropOpen] = useState(false);
  const eventsTriggerRef = useRef<HTMLDivElement>(null);
  const [eventsDropPos, setEventsDropPos] = useState({ left: 0, top: 0, width: 0 });

  useEffect(() => {
    if (!eventsDropOpen) return;
    const update = () => {
      const el = eventsTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setEventsDropPos({ left: r.left, top: r.bottom + 6, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [eventsDropOpen]);

  useEffect(() => { fetchWebhooks(); fetchEvents(); }, []);
  useEffect(() => { if (triggerCreate && triggerCreate > 0) openCreate(); }, [triggerCreate]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try { const r = await api.get('/webhooks'); if (r.data.success) setWebhooks(r.data.data.webhooks); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };
  const fetchEvents = async () => {
    try { const r = await api.get('/webhooks/events'); if (r.data.success) setEvents(r.data.data.events); } catch { /* ignore */ }
  };

  const openCreate = () => {
    setFormData({ name: '', url: '', events: [], isActive: true });
    setShowCreateModal(true);
  };
  const openEdit = (w: Webhook) => {
    setSelected(w);
    setFormData({ name: w.name, url: w.url, events: [...w.events], isActive: w.isActive });
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const validate = () => {
    if (!formData.name.trim()) { toast.error('Enter a webhook name'); return false; }
    if (!/^https?:\/\//i.test(formData.url.trim())) { toast.error('URL must start with http:// or https://'); return false; }
    if (formData.events.length === 0) { toast.error('Select at least one event'); return false; }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const r = await api.post('/webhooks', formData);
      if (r.data.success) { setShowCreateModal(false); fetchWebhooks(); toast.success('Webhook created'); }
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };
  const handleUpdate = async () => {
    if (!selected || !validate()) return;
    setSaving(true);
    try {
      const r = await api.put(`/webhooks/${selected.id}`, formData);
      if (r.data.success) { setShowEditModal(false); setSelected(null); fetchWebhooks(); toast.success('Webhook updated'); }
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };
  const handleToggle = async (w: Webhook) => {
    setTogglingId(w.id);
    try {
      const r = await api.post(`/webhooks/${w.id}/toggle`);
      if (r.data.success) {
        setWebhooks((prev) => prev.map((x) => (x.id === w.id ? r.data.data.webhook : x)));
        toast.success(r.data.message || 'Updated');
      }
    } catch { toast.error('Failed'); }
    finally { setTogglingId(null); setOpenMenuId(null); }
  };
  const handleTest = async (w: Webhook) => {
    setTestingId(w.id);
    try {
      const r = await api.post(`/webhooks/${w.id}/test`);
      if (r.data.success) toast.success(r.data.message);
      else toast.error(r.data.message || 'Test failed');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Test failed'); }
    finally { setTestingId(null); setOpenMenuId(null); }
  };
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirm(null);
      toast.success('Webhook deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };

  const toggleEvent = (evt: string) => {
    setFormData((f) => ({ ...f, events: f.events.includes(evt) ? f.events.filter((e) => e !== evt) : [...f.events, evt] }));
  };
  const allSelected = events.length > 0 && formData.events.length === events.length;
  const toggleSelectAll = () => {
    setFormData((f) => ({ ...f, events: allSelected ? [] : events.map((e) => e.value) }));
  };

  const tabFiltered = webhooks.filter((w) => {
    if (activeTab === 'active') return w.isActive;
    if (activeTab === 'inactive') return !w.isActive;
    return true;
  });
  const filtered = tabFiltered.filter((w) => !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.url.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const allCount = webhooks.length;
  const activeCount = webhooks.filter((w) => w.isActive).length;
  const inactiveCount = webhooks.filter((w) => !w.isActive).length;

  const eventLabel = (value: string) => events.find((e) => e.value === value)?.label || value;

  return (
    <div>
      {showFilters && (
        <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search webhooks..." value={searchQuery}
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
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Webhooks</h2>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {[
                  { label: 'S.No', tip: 'Serial number of the row' },
                  { label: 'Name', tip: 'Webhook display name' },
                  { label: 'Webhook URL', tip: 'Destination URL where events are sent' },
                  { label: 'Status', tip: 'Whether this webhook is currently active' },
                  { label: 'Events', tip: 'Events that trigger this webhook' },
                  { label: 'Actions', tip: 'Manage this webhook' },
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
                    <div className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>{w.name}</div>
                  </td>
                  {/* URL */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm`}>
                    <Tooltip title={w.url}>
                      <code className={`font-mono text-xs px-2 py-1 rounded ${d ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                        style={{ display: 'inline-block', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {w.url}
                      </code>
                    </Tooltip>
                  </td>
                  {/* Status chip */}
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
                  {/* Events — show 1 chip + N-more counter (hover reveals all) */}
                  <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm`}>
                    <div className="flex flex-wrap items-center gap-1">
                      {w.events.slice(0, 1).map((ev) => (
                        <span key={ev}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${d ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                          {eventLabel(ev)}
                        </span>
                      ))}
                      {w.events.length > 1 && (
                        <Tooltip title={w.events.map(eventLabel).join(', ')}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-help ${d ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                            +{w.events.length - 1} more
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                    <div className="relative inline-block">
                      <Tooltip title="Click to see options.">
                        <button onClick={(e) => {
                          if (openMenuId === w.id) { setOpenMenuId(null); setMenuPos(null); return; }
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const spaceBelow = window.innerHeight - r.bottom;
                          const right = window.innerWidth - r.right;
                          setMenuPos(spaceBelow < 200
                            ? { bottom: window.innerHeight - r.top + 8, right }
                            : { top: r.bottom + 8, right });
                          setOpenMenuId(w.id);
                        }}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </Tooltip>
                      {openMenuId === w.id && menuPos && (
                        <div className={`fixed rounded-xl z-[100] p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '180px', top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}>
                          <div className={`absolute right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent ${menuPos.bottom !== undefined ? `-bottom-2 border-t-[8px] ${d ? 'border-t-gray-700' : 'border-t-white'}` : `-top-2 border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`}`} />
                          <button onClick={() => openEdit(w)}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                            <Edit2 className="w-[18px] h-[18px] text-amber-500" />Edit
                          </button>
                          <button onClick={() => handleTest(w)} disabled={testingId === w.id}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 rounded-lg disabled:opacity-50 ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                            <Send className="w-[18px] h-[18px] text-blue-500" />{testingId === w.id ? 'Sending…' : 'Send Test'}
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
                      <WebhookIcon className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Webhooks Found</p>
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Add a webhook to get real-time event callbacks.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-y-6 sm:gap-3 gap-x-3 px-4 sm:px-6 py-3">
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
              <div className="flex gap-1 ml-auto">
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

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => { setOpenMenuId(null); setMenuPos(null); }} />}

      {/* Create / Edit modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`rounded-xl w-full max-h-[95vh] overflow-y-auto ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '640px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>
                {showEditModal ? 'Edit Webhook' : 'Add Webhook'}
              </h2>
              <Tooltip title="Click here to close.">
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); setSelected(null); setEventsDropOpen(false); }}
                  className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            <div className="space-y-5" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Name */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.name} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-900 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-white bg-gray-900' : 'text-gray-500 bg-white'}`}>Webhook Name *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>A friendly name to identify this webhook (e.g. "Slack #product").</p>
              </div>

              {/* URL */}
              <div>
                <div className="relative">
                  <input type="text" value={formData.url} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-900 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-white bg-gray-900' : 'text-gray-500 bg-white'}`}>Webhook URL *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Destination URL that will receive event payloads via POST.</p>
              </div>

              {/* Events — floating-label field with chips rendered inline */}
              <div>
                <div className="relative">
                  <div
                    ref={eventsTriggerRef}
                    onClick={() => setEventsDropOpen(!eventsDropOpen)}
                    role="button" tabIndex={0}
                    className={`w-full rounded-lg border text-sm outline-none transition-colors cursor-pointer flex items-center flex-wrap gap-1.5 ${d ? 'border-gray-700 bg-gray-900 text-white hover:border-gray-500' : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'} ${eventsDropOpen ? (d ? '!border-gray-400' : '!border-gray-400') : ''}`}
                    style={{ padding: '11px 40px 11px 11px', minHeight: '53px' }}>
                    {formData.events.length === 0 ? null : formData.events.map((ev) => (
                      <span key={ev}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${d ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
                        {eventLabel(ev)}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleEvent(ev); }}
                          className={`rounded-full p-0.5 cursor-pointer ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none ${
                    (eventsDropOpen || formData.events.length > 0)
                      ? 'top-0 -translate-y-1/2 text-[11px] font-medium'
                      : 'top-1/2 -translate-y-1/2'
                  } ${d ? 'text-white bg-gray-900' : 'text-gray-500 bg-white'}`}>Webhook Events *</span>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform pointer-events-none ${eventsDropOpen ? 'rotate-180' : ''}`} />
                  {eventsDropOpen && createPortal(
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setEventsDropOpen(false)} />
                      <div
                        style={{
                          position: 'fixed',
                          left: eventsDropPos.left,
                          top: eventsDropPos.top,
                          width: eventsDropPos.width,
                          zIndex: 9999,
                          maxHeight: '320px',
                        }}
                        className={`rounded-lg border shadow-xl p-1 overflow-y-auto ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <button type="button" onClick={toggleSelectAll}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-[#059669] border-[#059669]' : d ? 'border-gray-500' : 'border-gray-400'}`}>
                            {allSelected && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className={`font-semibold ${d ? 'text-gray-100' : 'text-gray-900'}`}>{allSelected ? 'Deselect All' : 'Select All'}</span>
                          <span className={`ml-auto text-[11px] ${d ? 'text-gray-500' : 'text-gray-400'}`}>{formData.events.length}/{events.length}</span>
                        </button>
                        <div className={`mx-2 my-1 border-t border-dashed ${d ? 'border-gray-600' : 'border-gray-200'}`} />
                        {events.map((e) => {
                          const checked = formData.events.includes(e.value);
                          return (
                            <button key={e.value} type="button" onClick={() => toggleEvent(e.value)}
                              className={`w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm rounded-md ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                              <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-[#059669] border-[#059669]' : d ? 'border-gray-500' : 'border-gray-400'}`}>
                                {checked && <Check className="w-3 h-3 text-white" />}
                              </span>
                              <div className="flex-1">
                                <div className={`font-medium ${d ? 'text-gray-100' : 'text-gray-900'}`}>{e.label}</div>
                                <div className={`text-xs ${d ? 'text-gray-500' : 'text-gray-500'}`}>{e.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>,
                    document.body
                  )}
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Choose the events that should invoke this webhook.</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3" style={{ marginLeft: '2px' }}>
                <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${formData.isActive ? 'bg-[#059669]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <div className={`text-sm font-medium ${d ? 'text-gray-100' : 'text-gray-800'}`}>{formData.isActive ? 'Active' : 'Inactive'}</div>
                  <div className={`text-xs ${d ? 'text-gray-500' : 'text-gray-500'}`}>Inactive webhooks will not receive events.</div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); setSelected(null); setEventsDropOpen(false); }}
                  className={`px-4 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>
                  Cancel
                </button>
                <LoadingButton onClick={showEditModal ? handleUpdate : handleCreate} loading={saving}
                  className="px-4 py-1.5 bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>
                  {showEditModal ? 'Update Webhook' : 'Add Webhook'}
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Webhook"
        message="Are you sure you want to delete this webhook? Delivery history will be removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={!!deletingId}
      />
    </div>
  );
}

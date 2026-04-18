import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2, Send, X, Search, MoreVertical, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Icon } from '@iconify/react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Tooltip from '../../components/ui/Tooltip';

interface Board {
  id: string;
  name: string;
  color: string;
}

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  allBoards: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  author: { id: string; name: string };
  boards: { board: Board }[];
  _count: { likes: number };
}

export default function AdminChangeLog({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeTabFilter, setTypeTabFilter] = useState('all');
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'new',
    allBoards: true,
    boardIds: [] as string[],
  });

  useEffect(() => {
    fetchEntries();
    fetchBoards();
  }, [filterStatus, filterType]);

  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) setShowModal(true);
  }, [triggerCreate]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const response = await api.get('/changelog', { params });
      if (response.data.success) {
        setEntries(response.data.data.entries);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setCreating(true);
      const response = await api.post('/changelog', {
        title: form.title,
        description: form.description,
        content: '<p></p>',
        type: form.type,
        allBoards: form.allBoards,
        boardIds: form.boardIds,
      });

      if (response.data.success) {
        setShowModal(false);
        // Navigate to editor page
        navigate(`/admin/changelog/${response.data.data.entry.id}/edit`);
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/changelog/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      toast.success('Entry deleted');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-green-100 text-green-700',
    };
    return config[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      new: 'bg-emerald-100 text-emerald-700',
      improved: 'bg-blue-100 text-blue-700',
      fixed: 'bg-orange-100 text-orange-700',
    };
    return config[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredEntries = entries.filter((e) => {
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterType && e.type !== filterType) return false;
    if (typeTabFilter !== 'all' && e.type !== typeTabFilter) return false;
    return true;
  });

  const paginatedEntries = filteredEntries.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(filteredEntries.length / rowsPerPage);
  const hasFilters = searchQuery || filterStatus || filterType;
  const d = theme === 'dark';

  useEffect(() => {
    const el = tabsRef.current[typeTabFilter];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        
        
        setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
      }
    }
  }, [typeTabFilter, loading]);

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/changelog/${id}/publish`);
      toast.success('Published!');
      fetchEntries();
    } catch { toast.error('Failed to publish'); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{filteredEntries.length} entries</p>
        <Tooltip title="Click here to toggle filters."><button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-4 text-sm font-medium rounded-lg border transition-colors duration-200 ${
            showFilters
              ? 'border-[#059669] text-[#059669]'
              : d ? 'border-gray-700 text-gray-400 hover:border-[#059669] hover:text-[#059669]' : 'border-gray-200 text-gray-600 hover:border-[#059669] hover:text-[#059669]'
          }`}
          style={{ height: '48px' }}>
          <Icon icon="iconoir:filter" width={16} height={16} />
          Filters
        </button></Tooltip>
      </div>

      {/* Filters */}
      {showFilters && (
      <div className={`p-4 rounded-lg border mb-4 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${
            d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`} style={{ padding: '0 14px', height: '48px' }}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search entries..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>
          <CustomDropdown label="Status" value={filterStatus}
            options={[{value:'',label:'All Status'},{value:'draft',label:'Draft'},{value:'scheduled',label:'Scheduled'},{value:'published',label:'Published'}]}
            onChange={(v) => { setFilterStatus(v); setPage(0); }} />
          <CustomDropdown label="Type" value={filterType}
            options={[{value:'',label:'All Types'},{value:'new',label:'New'},{value:'improved',label:'Improved'},{value:'fixed',label:'Fixed'}]}
            onChange={(v) => { setFilterType(v); setPage(0); }} />
          {hasFilters && (
            <Tooltip title="Click here to clear all filters."><button onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterType(''); setPage(0); }}
              className="flex items-center gap-2 font-medium text-red-500 border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
              style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
              <X className="w-5 h-5" /> Clear Filters
            </button></Tooltip>
          )}
        </div>
      </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingBar />
      ) : (
        <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Title */}
          <div style={{ padding: '24px 24px 16px 24px' }}>
            <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Entries</h2>
          </div>
          <div className={`border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Type Tabs */}
          <div className={`relative flex items-end border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ height: '48px', paddingLeft: '24px', gap: '40px' }}>
            {[
              { key: 'all', label: 'All', tip: 'View all changelog entries', badgeBg: 'bg-gray-800', badgeText: 'text-white', darkBadgeBg: 'bg-white', darkBadgeText: 'text-gray-900' },
              { key: 'new', label: 'New', tip: 'View new feature entries', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', darkBadgeBg: 'bg-emerald-900/40', darkBadgeText: 'text-emerald-300' },
              { key: 'improved', label: 'Improved', tip: 'View improved feature entries', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', darkBadgeBg: 'bg-blue-900/40', darkBadgeText: 'text-blue-300' },
              { key: 'fixed', label: 'Fixed', tip: 'View bug fix entries', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', darkBadgeBg: 'bg-orange-900/40', darkBadgeText: 'text-orange-300' },
            ].map((tab) => {
              const isActive = typeTabFilter === tab.key;
              const count = tab.key === 'all' ? entries.length : entries.filter(e => e.type === tab.key).length;
              return (
                <Tooltip key={tab.key} title={tab.tip}>
                <button ref={(el) => { tabsRef.current[tab.key] = el; }}
                  onClick={() => { setTypeTabFilter(tab.key); setPage(0); }}
                  className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors ${
                    isActive ? (d ? 'text-white' : 'text-gray-900') : (d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                  }`}>
                  {tab.label}
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-[24px] px-1 rounded-md text-[11px] font-bold ${
                    d ? `${tab.darkBadgeBg} ${tab.darkBadgeText}` : `${tab.badgeBg} ${tab.badgeText}`
                  }`}>{count}</span>
                </button>
                </Tooltip>
              );
            })}
            <div className={`absolute bottom-0 h-0.5 ${d ? 'bg-white' : 'bg-gray-900'}`}
              style={{ left: indicatorStyle.left, width: indicatorStyle.width, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                {[{ label: 'Title', tip: 'Title of the post or entry' }, { label: 'Type', tip: 'Category type of the item' }, { label: 'Status', tip: 'Current status of the item' }, { label: 'Boards', tip: 'Boards associated with this item' }, { label: 'Likes', tip: 'Total number of likes received' }, { label: 'Author', tip: 'User who created this item' }, { label: 'Created', tip: 'Date when this item was created' }, { label: 'Actions', tip: 'Available actions for this item' }].map((h, i) => (
                  <th key={h.label} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                    style={{
                      fontSize: '14px', color: d ? undefined : '#1C252E',
                      textAlign: i === 4 ? 'center' as const : i === 7 ? 'right' as const : 'left' as const,
                      width: i === 0 ? '280px' : i === 1 ? '180px' : i === 2 ? '180px' : i === 3 ? '150px' : i === 4 ? '120px' : i === 5 ? '200px' : i === 6 ? '180px' : i === 7 ? '70px' : undefined,
                    }}>
                    <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 7 ? '24px' : '16px' }}><Tooltip title={h.tip}><span>{h.label}</span></Tooltip></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id}
                    onClick={() => navigate(entry.status === 'draft' ? `/admin/changelog/${entry.id}/edit` : `/admin/changelog/${entry.id}/view`)}
                    className={`border-b border-dashed cursor-pointer transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} px-5 max-w-0 overflow-hidden`} style={{ paddingLeft: '24px' }}>
                      <p className={`text-sm font-semibold truncate ${d ? 'text-white' : 'text-gray-900'}`}>{entry.title}</p>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${getTypeBadge(entry.type)}`}>{entry.type}</span>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${getStatusBadge(entry.status)}`}>{entry.status}</span>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="truncate block" style={{ maxWidth: '120px' }}>{entry.allBoards ? 'All Boards' : entry.boards.map((b) => b.board.name).join(', ')}</span>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm font-semibold text-center ${d ? 'text-teal-400' : 'text-teal-600'}`}>{entry._count.likes}</td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                          {entry.author?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className={`text-sm truncate ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ maxWidth: '100px' }}>{entry.author?.name}</span>
                      </div>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <Tooltip title="Click to see options."><button onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                          className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button></Tooltip>
                        {openMenuId === entry.id && (
                          <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${
                            d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'
                          }`} style={{ minWidth: '160px' }}>
                            <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                            <div className="relative group/mi1">
                                <button onClick={() => { navigate(`/admin/changelog/${entry.id}/edit`); setOpenMenuId(null); }}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                              <Edit2 className="w-[18px] h-[18px] text-amber-500" />  Edit
                            </button>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/mi1:flex items-center z-[60] pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">Click here to edit this post.</div>
                                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-900 -ml-[1px]" />
                                </div>
                              </div>
                            {entry.status === 'draft' && (
                              <>
                                <div className="relative group/mi3">
                                <button onClick={() => { handlePublish(entry.id); setOpenMenuId(null); }}
                                  className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50'}`}>
                                  <Send className="w-[18px] h-[18px]" />  Publish
                                </button>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/mi3:flex items-center z-[60] pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">Click here to publish this entry.</div>
                                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-900 -ml-[1px]" />
                                </div>
                              </div>
                              </>
                            )}
                            <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                            <div className="relative group/mi2">
                                <button onClick={() => { setDeleteConfirm({ id: entry.id, title: entry.title }); setOpenMenuId(null); }}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                              <Trash2 className="w-[18px] h-[18px]" />  Delete
                            </button>
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/mi2:flex items-center z-[60] pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">Click here to delete this post.</div>
                                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-900 -ml-[1px]" />
                                </div>
                              </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <Edit2 className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Changelog Entries</p>
                      <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Create your first changelog entry to get started.</p>
                    </div>
                  </td>
                </tr>
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
                    <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${
                      d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      {[10, 25, 50, 100].map(n => (
                        <Tooltip title="Select the number of rows per page."><button key={n} onClick={() => { setRowsPerPage(n); setRowsDropOpen(false); setPage(0); }}
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
                {filteredEntries.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredEntries.length)}` : '0–0'} of {filteredEntries.length}
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

      {/* Close menu on click outside */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Do you really want to delete this entry?"
        message={`"${deleteConfirm?.title || ''}" will be permanently deleted. This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Create Changelog Entry</h2>
              <Tooltip title="Click here to close."><button onClick={() => setShowModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button></Tooltip>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Title */}
              <div>
                <div className="relative">
                  <input type="text" value={form.title} placeholder=" "
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Entry Title *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Enter the title for your changelog entry.</p>
              </div>

              {/* Description */}
              <div>
                <div className="relative">
                  <input type="text" value={form.description} placeholder=" "
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Description</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Brief description of this changelog entry.</p>
              </div>

              {/* Type */}
              <div>
                <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Type</p>
                <div className="flex gap-3">
                  {['new', 'improved', 'fixed'].map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border-0 transition ${
                        form.type === t
                          ? t === 'new' ? 'bg-emerald-600 text-white'
                            : t === 'improved' ? 'bg-blue-600 text-white'
                            : 'bg-orange-500 text-white'
                          : d ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div>
                <p className={`text-xs font-medium mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '14px' }}>Visible to</p>
                <div className="space-y-3 ml-3.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="visibility" checked={form.allBoards}
                      onChange={() => setForm({ ...form, allBoards: true, boardIds: [] })} />
                    <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>All Boards</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="visibility" checked={!form.allBoards}
                      onChange={() => setForm({ ...form, allBoards: false })} />
                    <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>Selected Boards</span>
                  </label>
                  {!form.allBoards && (
                    <div className="pl-6 space-y-2 max-h-40 overflow-y-auto">
                      {boards.map((board) => (
                        <label key={board.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.boardIds.includes(board.id)}
                            onChange={(e) => {
                              if (e.target.checked) setForm({ ...form, boardIds: [...form.boardIds, board.id] });
                              else setForm({ ...form, boardIds: form.boardIds.filter((id) => id !== board.id) });
                            }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: board.color }} />
                          <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>{board.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Tooltip title="Click here to cancel and close."><button onClick={() => setShowModal(false)}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button></Tooltip>
                <LoadingButton loading={creating} onClick={handleCreate}
                  className="px-3 py-1.5 bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Next</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

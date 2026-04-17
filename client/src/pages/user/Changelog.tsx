import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronLeft, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/Tooltip';

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  allBoards: boolean;
  publishedAt: string;
  author: { id: string; name: string };
  boards: { board: { id: string; name: string; color: string } }[];
  isLiked: boolean;
  _count: { likes: number };
}

export default function UserChangelog() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const d = theme === 'dark';

  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeTabFilter, setTypeTabFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denseMode, setDenseMode] = useState(false);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => { fetchEntries(); }, []);

  useEffect(() => {
    const el = tabsRef.current[typeTabFilter];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        
        
        setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
      }
    }
  }, [typeTabFilter, loading]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/changelog/public');
      if (response.data.success) {
        setEntries(response.data.data.entries);
      }
    } catch (error) {
      console.error('Error fetching changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (entryId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to like');
      return;
    }
    // Optimistic update
    setEntries(prev => prev.map(e => e.id === entryId
      ? { ...e, isLiked: !e.isLiked, _count: { likes: e.isLiked ? e._count.likes - 1 : e._count.likes + 1 } }
      : e
    ));
    try {
      const response = await api.post(`/changelog/${entryId}/like`);
      if (response.data.success) {
        setEntries(prev => prev.map(e => e.id === entryId
          ? { ...e, isLiked: response.data.data.liked, _count: { likes: response.data.data.likeCount } }
          : e
        ));
      }
    } catch {
      // Revert
      setEntries(prev => prev.map(e => e.id === entryId
        ? { ...e, isLiked: !e.isLiked, _count: { likes: e.isLiked ? e._count.likes - 1 : e._count.likes + 1 } }
        : e
      ));
      toast.error('Failed to like');
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      new: d ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
      improved: d ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700',
      fixed: d ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700',
    };
    return config[type] || (d ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700');
  };

  const filteredEntries = typeTabFilter === 'all' ? entries : entries.filter(e => e.type === typeTabFilter);
  const totalPages = Math.ceil(filteredEntries.length / rowsPerPage);
  const paginatedEntries = filteredEntries.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const HEADERS = [{ label: 'Title', tip: 'Title of the post or entry' }, { label: 'Type', tip: 'Category type of the item' }, { label: 'Boards', tip: 'Boards associated with this item' }, { label: 'Published', tip: 'Date when the entry was published' }, { label: 'Likes', tip: 'Total number of likes received' }];

  return (
    <UserLayout>
      <div>
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>Changelog</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>Latest product updates and announcements</p>
        </div>

        {loading ? (
          <LoadingBar />
        ) : (
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Title */}
            <div style={{ padding: '24px 24px 16px 24px' }}>
              <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Updates</h2>
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
                  {HEADERS.map((h, i) => (
                    <th key={h.label} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px', color: d ? undefined : '#1C252E',
                        textAlign: i === 4 ? 'center' as const : 'left' as const,
                        width: i === 4 ? '100px' : undefined,
                      }}>
                      <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: '16px' }}><Tooltip title={h.tip}><span>{h.label}</span></Tooltip></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length > 0 ? paginatedEntries.map((entry) => (
                  <tr key={entry.id}
                    onClick={() => navigate(`/user/changelog/${entry.id}`)}
                    className={`border-b border-dashed cursor-pointer transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`${denseMode ? 'py-1.5' : 'py-4'}`} style={{ paddingLeft: '24px' }}>
                      <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{entry.title}</p>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                      <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold capitalize ${getTypeBadge(entry.type)}`}>{entry.type}</span>
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      {entry.allBoards ? (
                        <span className="text-xs font-medium">All Boards</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {entry.boards?.map((b) => (
                            <span key={b.board.id} className="flex items-center gap-1 text-xs">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.board.color }} />
                              {b.board.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm whitespace-nowrap ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                      {entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                    <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-center`} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleLike(entry.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-sm ${
                          entry.isLiked
                            ? 'text-red-500 bg-red-50'
                            : d ? 'text-gray-400 hover:text-red-500 hover:bg-gray-700' : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
                        }`}
                      >
                        <Heart className="w-4 h-4" fill={entry.isLiked ? 'currentColor' : 'none'} />
                        {entry._count.likes}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>
                    <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <FileText className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Updates Yet</p>
                      <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Check back later for product updates.</p>
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
      </div>
    </UserLayout>
  );
}

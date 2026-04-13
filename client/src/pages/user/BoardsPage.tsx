import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';

interface Board {
  id: string;
  name: string;
  description?: string;
  slug: string;
  color?: string;
  createdAt?: string;
}

export default function UserBoardsPage() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [denseMode, setDenseMode] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowsDropOpen, setRowsDropOpen] = useState(false);
  const d = theme === 'dark';

  useEffect(() => {
    fetchUserBoards();
  }, [isAuthenticated]);

  const fetchUserBoards = async () => {
    try {
      setLoading(true);
      const invitedBoardIds = Object.keys(localStorage)
        .filter(key => key.startsWith('invite_board_'))
        .map(key => {
          const boardData = localStorage.getItem(key);
          if (boardData) {
            try { return JSON.parse(boardData).id; } catch (e) { return null; }
          }
          return null;
        })
        .filter(Boolean);

      if (invitedBoardIds.length > 0) {
        const invitedBoards = invitedBoardIds
          .map(id => {
            const boardData = localStorage.getItem(`invite_board_${id}`);
            if (boardData) {
              try { return JSON.parse(boardData); } catch (e) { return null; }
            }
            return null;
          })
          .filter(Boolean);

        setBoards(invitedBoards);

        if (!isAuthenticated) {
          const inviteToken = Object.keys(localStorage)
            .find(key => key.startsWith('invite_token_'))
            ?.replace('invite_token_', '');
          if (inviteToken) {
            try {
              await api.post('/invite-links/redeem', { token: inviteToken });
              Object.keys(localStorage)
                .filter(key => key.startsWith('invite_'))
                .forEach(key => localStorage.removeItem(key));
            } catch (error) {
              console.error('Error redeeming invite link:', error);
            }
          }
        }
      } else {
        const response = await api.get('/boards');
        if (response.data.success) {
          setBoards(response.data.data.boards || []);
        }
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(boards.length / rowsPerPage);
  const paginatedBoards = boards.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>
            Boards
          </h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            All boards you have access to
          </p>
        </div>

        {loading ? (
          <LoadingBar />
        ) : (
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Title */}
            <div style={{ padding: '24px 24px 16px 24px' }}>
              <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>All Boards</h2>
            </div>

            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                  {['S.No', 'Board', 'Description', 'Created At', 'Actions'].map((h, i) => (
                    <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                      style={{
                        fontSize: '14px', color: d ? undefined : '#1C252E',
                        textAlign: i === 4 ? 'right' as const : 'left' as const,
                        width: i === 0 ? '80px' : i === 3 ? '200px' : i === 4 ? '140px' : undefined,
                      }}>
                      <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 4 ? '24px' : '16px' }}>{h}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedBoards.length > 0 ? paginatedBoards.map((board, idx) => {
                  const boardColor = board.color || '#6366f1';
                  const initial = board.name?.charAt(0).toUpperCase();
                  return (
                    <tr key={board.id}
                      className={`border-b border-dashed transition-colors cursor-pointer ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => navigate(`/user/boards/${board.id}`, { state: { board } })}>
                      {/* S.No */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                        {page * rowsPerPage + idx + 1}
                      </td>
                      {/* Board */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                            style={{ backgroundColor: boardColor + '15' }}>
                            <span className="text-sm font-bold" style={{ color: boardColor }}>{initial}</span>
                          </div>
                          <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{board.name}</span>
                        </div>
                      </td>
                      {/* Description */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="line-clamp-1">{board.description || 'No description provided.'}</span>
                      </td>
                      {/* Created At */}
                      <td className={`px-4 ${denseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(board.createdAt)}
                      </td>
                      {/* Actions */}
                      <td className={`${denseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '24px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/user/boards/${board.id}`, { state: { board } }); }}
                          className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#0C68E9] text-white hover:bg-[#0b5dd0] transition-colors">
                          Access
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5}>
                    <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <LayoutGrid className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Boards Available</p>
                      <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No boards available yet.</p>
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
                  {boards.length > 0 ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, boards.length)}` : '0–0'} of {boards.length}
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
      </div>
    </UserLayout>
  );
}

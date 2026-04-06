import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

interface Board {
  id: string;
  name: string;
  description?: string;
  slug: string;
  color?: string;
  icon?: string;
}

export default function UserBoardsPage() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-4xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>
            Boards
          </h1>
          <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
            All boards you have access to
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className={d ? 'text-gray-400' : 'text-gray-600'}>Loading boards...</p>
          </div>
        ) : (
          <>
            {boards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board) => {
                  const boardColor = board.color || '#6366f1';
                  const initial = board.name?.charAt(0).toUpperCase();
                  return (
                    <div
                      key={board.id}
                      className={`rounded-2xl border overflow-hidden flex flex-col ${
                        d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      } transition-all hover:shadow-lg`}
                    >
                      {/* Icon area */}
                      <div
                        className="w-full h-48 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: boardColor + '22' }}
                      >
                        {board.icon ? (
                          <img src={board.icon} alt={board.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-6xl font-bold" style={{ color: boardColor }}>
                            {initial}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-8 flex flex-col flex-1 items-center text-center">
                        <h3 className={`font-bold mb-4 ${d ? 'text-white' : 'text-gray-900'}`}
                          style={{ fontSize: '20px' }}>
                          {board.name}
                        </h3>
                        <p className={`flex-1 line-clamp-2 mb-8 ${d ? 'text-gray-400' : 'text-gray-500'}`}
                          style={{ fontSize: '16px' }}>
                          {board.description || 'No description provided.'}
                        </p>
                        <button
                          onClick={() => navigate(`/user/boards/${board.id}`, { state: { board } })}
                          className={`w-full py-2.5 rounded-xl border-2 font-semibold uppercase tracking-wide transition-colors ${
                            d
                              ? 'border-gray-500 text-gray-300 hover:border-white hover:text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900'
                          }`}
                          style={{ fontSize: '16px' }}
                        >
                          Access Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-lg border ${
                d ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
                <p>No boards available yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
}

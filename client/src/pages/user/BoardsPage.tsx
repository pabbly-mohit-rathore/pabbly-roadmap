import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
          <>
            {boards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {boards.map((board) => {
                  const boardColor = board.color || '#6366f1';
                  const initial = board.name?.charAt(0).toUpperCase();
                  return (
                    <div key={board.id}
                      className={`rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-md group cursor-pointer ${
                        d ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => navigate(`/user/boards/${board.id}`, { state: { board } })}>
                      <div className="w-full flex items-center justify-center overflow-hidden relative"
                        style={{ backgroundColor: boardColor + '15', height: '180px' }}>
                        {board.icon ? (
                          <img src={board.icon} alt={board.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl font-bold transition-transform group-hover:scale-110" style={{ color: boardColor }}>
                            {initial}
                          </span>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className={`font-semibold text-base mb-1.5 truncate ${d ? 'text-white' : 'text-gray-900'}`}>
                          {board.name}
                        </h3>
                        <p className={`text-sm line-clamp-2 mb-5 flex-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                          {board.description || 'No description provided.'}
                        </p>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/user/boards/${board.id}`, { state: { board } }); }}
                          className="w-full rounded-lg text-sm font-semibold bg-[#0C68E9] text-white hover:bg-[#0b5dd0] transition-colors"
                          style={{ height: '40px' }}>
                          Access
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

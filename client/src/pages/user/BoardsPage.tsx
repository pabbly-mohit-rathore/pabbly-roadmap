import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

interface Board {
  id: string;
  name: string;
  description?: string;
  slug: string;
  color?: string;
}

export default function UserBoardsPage() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserBoards();
  }, []);

  const fetchUserBoards = async () => {
    try {
      setLoading(true);

      // Check if user came from invite link (invited boards stored in localStorage)
      const invitedBoardIds = Object.keys(localStorage)
        .filter(key => key.startsWith('invite_board_'))
        .map(key => {
          const boardData = localStorage.getItem(key);
          if (boardData) {
            try {
              return JSON.parse(boardData).id;
            } catch (e) {
              return null;
            }
          }
          return null;
        })
        .filter(Boolean);

      // If user has invited boards, show only those
      if (invitedBoardIds.length > 0) {
        const invitedBoards = invitedBoardIds
          .map(id => {
            const boardData = localStorage.getItem(`invite_board_${id}`);
            if (boardData) {
              try {
                return JSON.parse(boardData);
              } catch (e) {
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);

        setBoards(invitedBoards);
      } else {
        // Otherwise fetch user's accessible boards from API
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
        {/* Header Section */}
        <div className="mb-8">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Your Boards
            </h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Boards you have access to
            </p>
          </div>
        </div>

        {/* Boards Grid */}
        {loading ? (
          <div className="text-center py-8">
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Loading boards...
            </p>
          </div>
        ) : (
          <>
            {boards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/user/boards/${board.id}`)}
                    className={`p-6 rounded-lg border cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } transition-all hover:shadow-lg`}
                  >
                    {/* Color indicator */}
                    {board.color && (
                      <div
                        className="w-full h-2 rounded-full mb-4"
                        style={{ backgroundColor: board.color }}
                      />
                    )}

                    <h3 className={`text-xl font-bold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {board.name}
                    </h3>

                    {board.description && (
                      <p className={`text-sm mb-4 line-clamp-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {board.description}
                      </p>
                    )}

                    {board.slug && (
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Slug: <code className="font-mono">{board.slug}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-400'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
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

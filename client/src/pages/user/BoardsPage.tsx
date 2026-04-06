import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3x3, Users, LogIn } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import api from '../../services/api';

interface Board {
  id: string;
  name: string;
  description?: string;
  slug: string;
  color?: string;
  icon?: string;
}

interface SharedBoard {
  id: string;
  accessLevel: string;
  createdAt: string;
  board: { id: string; name: string; slug: string; color: string; description?: string };
}

const TABS = [
  { id: 'boards', label: 'Boards', icon: Grid3x3 },
  { id: 'team-member', label: 'Team Member', icon: Users },
];

export default function UserBoardsPage() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated, user } = useAuthStore();
  const { enterTeamAccess } = useTeamAccessStore();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('boards');
  const d = theme === 'dark';

  useEffect(() => {
    fetchUserBoards();
    if (isAuthenticated) fetchSharedBoards();
  }, [isAuthenticated]);

  const fetchSharedBoards = async () => {
    try {
      const res = await api.get('/team-members/shared-with-me');
      if (res.data.success) {
        setSharedBoards(res.data.data.memberships || []);
      }
    } catch (error) {
      console.error('Error fetching shared boards:', error);
    }
  };

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

  const handleAccessBoard = (item: SharedBoard) => {
    enterTeamAccess({
      accessLevel: item.accessLevel,
      boardId: item.board.id,
      boardName: item.board.name,
      memberName: user?.name || '',
    });
    navigate('/admin/dashboard');
  };

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-2">
          <h1 className={`text-4xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>
            Board Management
          </h1>
          <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your boards and team access
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-5 mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? `border-black ${d ? 'text-white' : 'text-gray-900'}`
                    : `border-transparent ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Boards Tab */}
        {activeTab === 'boards' && (
          <>
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

                            {/* Button */}
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
          </>
        )}

        {/* Team Member Tab */}
        {activeTab === 'team-member' && (
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-5 pb-0">
              <h2 className={`text-xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>
                Boards Shared With You
              </h2>
              <p className={`text-sm mb-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                Boards where you have been granted team member access
              </p>
            </div>

            <div>
              <table className="w-full">
                <thead className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>S.No</th>
                    <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Shared On</th>
                    <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board Name</th>
                    <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Permission Type</th>
                    <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Access Board</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedBoards.length > 0 ? (
                    sharedBoards.map((item, idx) => (
                      <tr key={item.id} className={`border-t ${d ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className={`px-5 py-4 text-sm font-medium ${d ? 'text-blue-400' : 'text-blue-600'}`}>{idx + 1}</td>
                        <td className={`px-5 py-4 text-sm ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                          {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.board.color }} />
                            <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{item.board.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.accessLevel === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.accessLevel === 'admin' ? 'Full Access' : 'Manager Access'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleAccessBoard(item)}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                              d ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10' : 'border-blue-500 text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            Access Now
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={`px-5 py-10 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                        No boards shared with you yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

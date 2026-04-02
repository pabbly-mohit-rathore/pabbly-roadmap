import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  author: { name: string };
}

interface Board {
  id: string;
  name: string;
}

const STATUS_ORDER = ['open', 'under_review', 'planned', 'in_progress', 'live', 'closed', 'hold'];

export default function RoadmapPage() {
  const theme = useThemeStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const boardId = searchParams.get('board');
  const inviteToken = searchParams.get('invite');
  const isInviteMode = !!inviteToken && !isAuthenticated;

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { status: 'open,under_review,planned,in_progress,live' };

      // If boardId is provided, fetch only posts from that board
      if (boardId) {
        params.boardId = boardId;
        // Try to get board details from localStorage first
        const storedBoard = localStorage.getItem(`invite_board_${boardId}`);
        if (storedBoard) {
          try {
            setBoard(JSON.parse(storedBoard));
          } catch (e) {
            console.error('Error parsing stored board data:', e);
          }
        }
      }

      const response = await api.get('/posts', { params });
      if (response.data.success) {
        setPosts(response.data.data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Auto-redeem invite link when authenticated user arrives
  useEffect(() => {
    if (isAuthenticated && inviteToken && boardId) {
      const redeemInvite = async () => {
        try {
          await api.post('/invite-links/redeem', { token: inviteToken });
          // Clear invite params from URL after redemption
          navigate(`/?board=${boardId}`, { replace: true });
        } catch (error) {
          console.error('Error redeeming invite link:', error);
        }
      };
      redeemInvite();
    }
  }, [isAuthenticated, inviteToken, boardId, navigate]);

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      feature: 'bg-indigo-100 text-indigo-800',
      bug: 'bg-red-100 text-red-800',
      improvement: 'bg-blue-100 text-blue-800',
      integration: 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-orange-100 text-orange-800',
      live: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      hold: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const postsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = posts.filter(post => post.status === status);
    return acc;
  }, {} as Record<string, Post[]>);

  const visibleStatuses = STATUS_ORDER.filter(status => status !== 'closed' && status !== 'hold');

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">Loading roadmap...</div>
        </div>
      </div>
    );
  }

  const handlePostClick = (post: Post) => {
    if (isInviteMode) {
      setShowLoginModal(true);
      return;
    }
    window.location.href = `/post/${post.slug}`;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      {/* Invite Mode Banner */}
      {isInviteMode && (
        <div className="bg-blue-100 border-b border-blue-300">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="text-sm text-blue-900">
              🔒 Preview mode: You can view this board's posts, but need to log in to vote or comment.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`border-b ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className={`text-4xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {board ? board.name : 'Product Roadmap'}
          </h1>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {board ? `Posts and feedback for ${board.name}` : 'See what\'s coming next — items are organized by status'}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 auto-rows-min">
          {visibleStatuses.map((status) => (
            <div key={status}>
              <div className="mb-4">
                <h2 className={`text-sm font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {getStatusLabel(status)}
                  <span className={`ml-2 inline-block px-2 py-1 rounded text-xs font-semibold ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {postsByStatus[status].length}
                  </span>
                </h2>
              </div>

              <div className="space-y-3">
                {postsByStatus[status].length > 0 ? (
                  postsByStatus[status].map((post) => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post)}
                      className={`p-4 rounded-lg border block transition-all hover:shadow-md cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className={`font-medium text-sm mb-2 line-clamp-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {post.title}
                      </h3>

                      <div className="flex gap-2 mb-3 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(post.type)}`}>
                          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <div className="flex gap-3">
                          <span>👍 {post.voteCount}</span>
                          <span>💬 {post.commentCount}</span>
                        </div>
                        <span>{post.author.name}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`p-3 text-center rounded-lg text-xs ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-50 text-gray-500'
                  }`}>
                    No items
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className={`p-12 text-center rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-400'
              : 'bg-white border-gray-200 text-gray-500'
          }`}>
            No items on the roadmap yet
          </div>
        )}
      </div>

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 p-8 rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Login Required
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className={`p-1 hover:bg-gray-200 rounded transition ${
                  theme === 'dark' ? 'hover:bg-gray-700' : ''
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`mb-6 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              If you need to interact with the {board?.name || 'product'} post, please login and then communicate with our team.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className={`flex-1 px-4 py-2 rounded border transition ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
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
  description?: string;
  content?: string;
  board?: { name: string };
}

interface Board {
  id: string;
  name: string;
}

const STATUS_ORDER = ['under_review', 'planned', 'in_progress', 'live', 'hold'];

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; borderColor: string }> = {
  under_review: { label: 'Under Review', dotColor: 'bg-yellow-500', borderColor: 'border-t-yellow-500' },
  planned: { label: 'Planned', dotColor: 'bg-purple-500', borderColor: 'border-t-purple-500' },
  in_progress: { label: 'In Progress', dotColor: 'bg-orange-500', borderColor: 'border-t-orange-500' },
  live: { label: 'Live', dotColor: 'bg-green-500', borderColor: 'border-t-green-500' },
  hold: { label: 'On Hold', dotColor: 'bg-red-500', borderColor: 'border-t-red-500' },
};

export default function RoadmapPage() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});

  const boardId = searchParams.get('board');
  const inviteToken = searchParams.get('invite');
  const isInviteMode = !!inviteToken && !isAuthenticated;

  // Redirect admin users to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { status: 'under_review,planned,in_progress,live,hold' };

      if (boardId) {
        params.boardId = boardId;
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
          navigate(`/?board=${boardId}`, { replace: true });
        } catch (error) {
          console.error('Error redeeming invite link:', error);
        }
      };
      redeemInvite();
    }
  }, [isAuthenticated, inviteToken, boardId, navigate]);

  const postsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = posts.filter(post => post.status === status);
    return acc;
  }, {} as Record<string, Post[]>);

  const getFilteredPosts = (status: string): Post[] => {
    let filtered = postsByStatus[status] || [];
    const colSearch = columnSearches[status];
    if (colSearch) {
      const q = colSearch.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
    }
    return filtered;
  };

  const handlePostClick = (post: Post) => {
    if (isInviteMode) {
      setShowLoginModal(true);
      return;
    }
    window.location.href = `/post/${post.slug}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">Loading roadmap...</div>
        </div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-4xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Roadmap
          </h1>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {board ? `Posts and feedback for ${board.name}` : 'View your product roadmap by status'}
          </p>
        </div>

        {/* Info Bar */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm ${
          theme === 'dark'
            ? 'bg-blue-900/20 text-blue-300 border border-blue-800'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <span>💡</span>
          <span>Browse items by status to see what's coming next.</span>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 320px)' }}>
          <div className="grid gap-4 h-full" style={{
            gridTemplateColumns: `repeat(${STATUS_ORDER.length}, minmax(260px, 1fr))`,
            minHeight: 'calc(100vh - 320px)',
          }}>
            {STATUS_ORDER.map((status) => {
              const filteredPosts = getFilteredPosts(status);
              const config = STATUS_CONFIG[status];

              return (
                <div
                  key={status}
                  className={`rounded-lg border border-t-[3px] ${config.borderColor} flex flex-col overflow-hidden ${
                    theme === 'dark'
                      ? 'border-gray-700'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Column Header */}
                  <div className={`px-4 pt-4 pb-3 ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
                        <h2 className={`text-sm font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {config.label}
                        </h2>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {filteredPosts.length}
                      </span>
                    </div>

                    {/* Column Search */}
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <Search className="w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={columnSearches[status] || ''}
                        onChange={(e) => setColumnSearches(prev => ({ ...prev, [status]: e.target.value }))}
                        className={`bg-transparent text-xs outline-none w-full ${
                          theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Cards */}
                  <div className={`flex-1 px-3 pb-3 pt-3 space-y-2.5 overflow-y-auto ${
                    theme === 'dark' ? 'bg-gray-850' : 'bg-[#f5f5f5]'
                  }`}>
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map((post) => {
                        const subtitle = (post.description && post.description.trim())
                          || (post.content ? post.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '');
                        const typeStyles: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
                          feature:     { bg: 'bg-blue-100',   text: 'text-blue-700',   darkBg: 'bg-blue-900/40',   darkText: 'text-blue-300' },
                          bug:         { bg: 'bg-red-100',    text: 'text-red-700',    darkBg: 'bg-red-900/40',    darkText: 'text-red-300' },
                          improvement: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/40', darkText: 'text-orange-300' },
                          integration: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/40', darkText: 'text-purple-300' },
                        };
                        const ts = typeStyles[post.type] || typeStyles.feature;
                        return (
                        <div
                          key={post.id}
                          onClick={() => handlePostClick(post)}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all hover:shadow-md flex flex-col ${
                            theme === 'dark'
                              ? 'bg-gray-750 border-gray-600 hover:border-gray-500'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ minHeight: '104px' }}
                        >
                          <div className={!subtitle ? 'flex-1 flex items-center' : ''}>
                            <div className="w-full">
                              <p className={`text-sm font-semibold truncate leading-snug ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {post.title}
                              </p>
                              {subtitle && (
                                <p className={`text-xs line-clamp-1 mt-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>
                              )}
                            </div>
                          </div>
                          {/* Board + Type chips */}
                          <div className="flex items-center gap-2 flex-wrap mt-auto pt-3">
                            {post.board?.name && (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                {post.board.name}
                              </span>
                            )}
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${theme === 'dark' ? `${ts.darkBg} ${ts.darkText}` : `${ts.bg} ${ts.text}`}`}>
                              {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                            </span>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className={`text-center py-12 text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        No items yet
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

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

const STATUS_ORDER = ['under_review', 'planned', 'in_progress', 'live', 'hold'];

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; borderColor: string }> = {
  under_review: { label: 'Under Review', dotColor: 'bg-yellow-500', borderColor: 'border-t-yellow-500' },
  planned: { label: 'Planned', dotColor: 'bg-purple-500', borderColor: 'border-t-purple-500' },
  in_progress: { label: 'In Progress', dotColor: 'bg-orange-500', borderColor: 'border-t-orange-500' },
  live: { label: 'Live', dotColor: 'bg-green-500', borderColor: 'border-t-green-500' },
  hold: { label: 'On Hold', dotColor: 'bg-red-500', borderColor: 'border-t-red-500' },
};

export default function UserRoadmapPage() {
  const theme = useThemeStore((state) => state.theme);
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});

  const boardId = searchParams.get('board');

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
            console.error('Error parsing stored board:', e);
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
    window.location.href = `/post/${post.slug}`;
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="text-center py-12">Loading roadmap...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div>
        <div className="pb-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Roadmap
            </h1>
            <p className={`text-base ${
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
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{
              minWidth: `${STATUS_ORDER.length * 280}px`,
            }}>
              {STATUS_ORDER.map((status) => {
                const filteredPosts = getFilteredPosts(status);
                const config = STATUS_CONFIG[status];

                return (
                  <div
                    key={status}
                    className={`rounded-lg border border-t-[3px] ${config.borderColor} flex flex-col overflow-hidden flex-shrink-0 ${
                      theme === 'dark'
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    }`}
                    style={{ width: '260px', minHeight: '400px' }}
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
                        filteredPosts.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => handlePostClick(post)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              theme === 'dark'
                                ? 'bg-gray-750 border-gray-600 hover:border-gray-500'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {/* ID Badge */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                {post.slug?.substring(0, 12).toUpperCase() || post.id.substring(0, 8)}
                              </span>
                            </div>

                            {/* Title */}
                            <p className={`text-sm font-medium mb-4 line-clamp-2 leading-snug ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {post.title}
                            </p>

                            {/* Separator */}
                            <div className={`border-t mb-3 ${
                              theme === 'dark' ? 'border-gray-600' : 'border-gray-100'
                            }`} />

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-orange-500">
                                {new Date(post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                              </span>

                              <div className="flex items-center gap-2">
                                <div className={`flex gap-2 text-[10px] mr-1 ${
                                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  <span>👍{post.voteCount || 0}</span>
                                  <span>💬{post.commentCount || 0}</span>
                                </div>

                                {/* Author Avatar */}
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold">
                                  {post.author?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
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
      </div>
    </UserLayout>
  );
}

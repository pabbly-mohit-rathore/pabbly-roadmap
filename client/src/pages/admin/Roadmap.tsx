import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  createdAt: string;
  author: { name: string };
  board: { name: string };
  tags?: { tag: { id: string; name: string; color: string } }[];
  _count: {
    votes: number;
    comments: number;
  };
}

interface RoadmapData {
  [key: string]: Post[];
}

interface Board {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const STATUS_ORDER = ['under_review', 'planned', 'in_progress', 'live', 'hold'];

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; borderColor: string }> = {
  under_review: { label: 'Under Review', dotColor: 'bg-yellow-500', borderColor: 'border-t-yellow-500' },
  planned: { label: 'Planned', dotColor: 'bg-purple-500', borderColor: 'border-t-purple-500' },
  in_progress: { label: 'In Progress', dotColor: 'bg-orange-500', borderColor: 'border-t-orange-500' },
  live: { label: 'Live', dotColor: 'bg-green-500', borderColor: 'border-t-green-500' },
  hold: { label: 'On Hold', dotColor: 'bg-red-500', borderColor: 'border-t-red-500' },
};

export default function AdminRoadmap() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<RoadmapData>({});
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      Promise.all([fetchRoadmap(), fetchTags()]);
    }
  }, [selectedBoard]);

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
        if (response.data.data.boards.length > 0) {
          setSelectedBoard(response.data.data.boards[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get('/tags', { params: { boardId: selectedBoard } });
      if (response.data.success) {
        setTags(response.data.data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/roadmap?boardId=${selectedBoard}`);
      if (response.data.success) {
        setRoadmap(response.data.data.roadmap);
      }
    } catch (error) {
      console.error('Error fetching roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (post: Post) => {
    setDraggedPost(post);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedPost || draggedPost.status === newStatus) {
      setDraggedPost(null);
      return;
    }

    try {
      const response = await api.put(`/posts/${draggedPost.id}/status`, { status: newStatus });
      if (response.data.success) {
        fetchRoadmap();
      }
    } catch (error) {
      console.error('Error changing status:', error);
    } finally {
      setDraggedPost(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setFilterTag('');
    setColumnSearches({});
  };

  const hasActiveFilters = searchQuery || filterType || filterTag;

  // Filter posts for a given status
  const getFilteredPosts = (status: string): Post[] => {
    let posts = roadmap[status] || [];

    // Global search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(p => p.title.toLowerCase().includes(q));
    }

    // Type filter
    if (filterType) {
      posts = posts.filter(p => p.type === filterType);
    }

    // Tag filter
    if (filterTag) {
      posts = posts.filter(p => p.tags?.some(t => t.tag.id === filterTag));
    }

    // Column-level search
    const colSearch = columnSearches[status];
    if (colSearch) {
      const q = colSearch.toLowerCase();
      posts = posts.filter(p => p.title.toLowerCase().includes(q));
    }

    return posts;
  };

  return (
    <div>
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
          View your product roadmap by status
        </p>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-lg border mb-4 ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[200px] max-w-[300px] ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent text-sm outline-none w-full ${
                theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          {/* Board Selector */}
          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          >
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          >
            <option value="">All Types</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="improvement">Improvement</option>
            <option value="integration">Integration</option>
          </select>

          {/* Tag Filter */}
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm ${
        theme === 'dark'
          ? 'bg-blue-900/20 text-blue-300 border border-blue-800'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        <span>💡</span>
        <span>Drag and drop cards between columns to change status, or use the dropdown on each card.</span>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="text-center py-12">Loading roadmap...</div>
      ) : (
        <div className="overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 320px)' }}>
          <div className="grid gap-4 h-full" style={{
            gridTemplateColumns: `repeat(${STATUS_ORDER.length}, minmax(260px, 1fr))`,
            minHeight: 'calc(100vh - 320px)',
          }}>
            {STATUS_ORDER.map((status) => {
              const posts = getFilteredPosts(status);
              const config = STATUS_CONFIG[status];

              return (
                <div
                  key={status}
                  className={`rounded-lg border border-t-[3px] ${config.borderColor} flex flex-col overflow-hidden ${
                    theme === 'dark'
                      ? 'border-gray-700'
                      : 'border-gray-200'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(status)}
                >
                  {/* Column Header - White bg */}
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
                        {posts.length}
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

                  {/* Cards - Light gray bg */}
                  <div className={`flex-1 px-3 pb-3 pt-3 space-y-2.5 overflow-y-auto ${
                    theme === 'dark' ? 'bg-gray-850' : 'bg-[#f5f5f5]'
                  }`}>
                    {posts.length > 0 ? (
                      posts.map((post) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={() => handleDragStart(post)}
                          onClick={() => {
                            if (!draggedPost) {
                              navigate(`/admin/posts/${post.slug}`);
                            }
                          }}
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            draggedPost?.id === post.id ? 'opacity-50 scale-95' : ''
                          } ${
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
                              {/* Vote/Comment counts */}
                              <div className={`flex gap-2 text-[10px] mr-1 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                <span>👍{post._count?.votes || 0}</span>
                                <span>💬{post._count?.comments || 0}</span>
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
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

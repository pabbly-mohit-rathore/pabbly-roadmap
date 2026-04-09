import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight, MessageSquare } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  createdAt: string;
  author: { name: string };
  board: { name: string };
  description?: string;
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

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; borderColor: string; textColor: string }> = {
  under_review: { label: 'Under Review', dotColor: 'bg-yellow-500', borderColor: 'border-t-yellow-500', textColor: 'text-yellow-600' },
  planned: { label: 'Planned', dotColor: 'bg-purple-500', borderColor: 'border-t-purple-500', textColor: 'text-purple-600' },
  in_progress: { label: 'In Progress', dotColor: 'bg-orange-500', borderColor: 'border-t-orange-500', textColor: 'text-orange-500' },
  live: { label: 'Live', dotColor: 'bg-green-500', borderColor: 'border-t-green-500', textColor: 'text-green-600' },
  hold: { label: 'On Hold', dotColor: 'bg-red-500', borderColor: 'border-t-red-500', textColor: 'text-red-500' },
};

export default function AdminRoadmap() {
  const theme = useThemeStore((state) => state.theme);
  const { init: initVote, toggle: toggleVote, votes } = useVoteStore();
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

  const initialized = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        const response = await api.get('/boards');
        if (response.data.success) {
          setBoards(response.data.data.boards);
        }
        // Fetch All Boards roadmap
        const roadmapRes = await api.get('/roadmap');
        if (roadmapRes.data.success) {
          const rm = roadmapRes.data.data.roadmap;
          setRoadmap(rm);
          Object.values(rm).flat().forEach((p: any) => initVote(p.id, p.voteCount ?? p._count?.votes ?? 0, p.hasVoted ?? false));
        }
        initialized.current = true;
      } catch (error) {
        console.error('Error initializing roadmap:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (initialized.current) {
      fetchBoardData(selectedBoard);
    }
  }, [selectedBoard]);

  const fetchBoardData = async (boardId: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (boardId) params.boardId = boardId;
      const [roadmapRes, tagsRes] = await Promise.all([
        api.get('/roadmap', { params }),
        boardId ? api.get('/tags', { params: { boardId } }) : Promise.resolve({ data: { success: true, data: { tags: [] } } }),
      ]);
      if (roadmapRes.data.success) {
        const rm = roadmapRes.data.data.roadmap;
        setRoadmap(rm);
        Object.values(rm).flat().forEach((p: any) => initVote(p.id, p.voteCount ?? p._count?.votes ?? 0, p.hasVoted ?? false));
      }
      if (tagsRes.data.success) setTags(tagsRes.data.data.tags || []);
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

    const postId = draggedPost.id;
    const oldStatus = draggedPost.status;

    // Optimistic update — move card instantly
    setRoadmap(prev => {
      const updated = { ...prev };
      // Remove from old status
      updated[oldStatus] = (updated[oldStatus] || []).filter((p: Post) => p.id !== postId);
      // Add to new status
      updated[newStatus] = [...(updated[newStatus] || []), { ...draggedPost, status: newStatus }];
      return updated;
    });
    setDraggedPost(null);

    // API call in background
    try {
      await api.put(`/posts/${postId}/status`, { status: newStatus });
    } catch {
      // Revert on error
      setRoadmap(prev => {
        const reverted = { ...prev };
        reverted[newStatus] = (reverted[newStatus] || []).filter((p: Post) => p.id !== postId);
        reverted[oldStatus] = [...(reverted[oldStatus] || []), { ...draggedPost, status: oldStatus }];
        return reverted;
      });
      toast.error('Failed to change status');
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
        <h1 className={`text-2xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Roadmap
        </h1>
        <p className={`text-base ${
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
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[200px] max-w-[380px] ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          }`} style={{ padding: '0 14px', height: '48px' }}>
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
          <CustomDropdown
            label="Board"
            value={selectedBoard}
            options={[{ value: '', label: 'All Boards' }, ...boards.map((b) => ({ value: b.id, label: b.name }))]}
            onChange={(v) => setSelectedBoard(v)}
          />

          {/* Type Filter */}
          <CustomDropdown
            label="Type"
            value={filterType}
            options={[
              { value: '', label: 'All Types' },
              { value: 'feature', label: 'Feature' },
              { value: 'bug', label: 'Bug' },
              { value: 'improvement', label: 'Improvement' },
              { value: 'integration', label: 'Integration' },
            ]}
            onChange={(v) => setFilterType(v)}
          />

          {/* Tag Filter */}
          <CustomDropdown
            label="Tag"
            value={filterTag}
            options={[
              { value: '', label: 'All Tags' },
              ...tags.map((t) => ({ value: t.id, label: t.name })),
            ]}
            onChange={(v) => setFilterTag(v)}
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-2 font-medium text-red-500 border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
              style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
              <X className="w-5 h-5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm ${
        theme === 'dark'
          ? 'bg-blue-900/20 text-blue-300 border border-blue-800'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        <span>💡</span>
        <span>Drag and drop cards between columns to change status, or use the dropdown on each card.</span>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <LoadingBar />
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
                          onClick={() => { if (!draggedPost) navigate(`/admin/posts/${post.slug}`, { state: { from: '/admin/roadmap', source: 'roadmap' } }); }}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            draggedPost?.id === post.id ? 'opacity-50 scale-95 !cursor-grabbing' : ''
                          } ${
                            theme === 'dark'
                              ? 'bg-gray-750 border-gray-600 hover:border-gray-500'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Top: Vote + Title/Description */}
                          <div className="flex gap-3">
                            <div onClick={(e) => { e.stopPropagation(); toggleVote(post.id); }}
                              className={`inline-flex flex-col items-center justify-center h-10 rounded-lg border font-bold shrink-0 cursor-pointer transition-all ${
                                votes[post.id]?.voted
                                  ? 'bg-[#1c252e] border-[#1c252e] text-white'
                                  : (theme === 'dark' ? 'border-gray-600 text-gray-300 hover:border-gray-400' : 'border-gray-200 text-gray-700 hover:border-gray-400')
                              }`} style={{ width: '44px', fontSize: '12px', gap: '1px' }}>
                              <ArrowUpRight className="w-3.5 h-3.5 rotate-[-45deg]" />
                              <span>{votes[post.id]?.count ?? post._count?.votes ?? 0}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold line-clamp-2 leading-snug ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>{post.title}</p>
                              {post.description && (
                                <p className={`text-xs line-clamp-1 mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{post.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className={`border-t border-dashed my-3 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`} />

                          {/* Footer: Date left, Author + Comments right */}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${config.textColor}`}>
                              {new Date(post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                            <div className="flex items-center gap-2.5">
                              <div className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{post._count?.comments || 0}</span>
                              </div>
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[9px] font-bold">
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

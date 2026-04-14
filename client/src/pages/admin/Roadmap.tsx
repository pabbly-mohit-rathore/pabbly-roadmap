import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useVoteStore from '../../store/voteStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';
import StatusReasonDialog from '../../components/ui/StatusReasonDialog';
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
  content?: string;
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
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  // Pending status change that's waiting on a reason from admin (hold / live flow)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ post: Post; oldStatus: string; newStatus: string } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
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
      const roadmapRes = await api.get('/roadmap', { params });
      if (roadmapRes.data.success) {
        const rm = roadmapRes.data.data.roadmap;
        setRoadmap(rm);
        Object.values(rm).flat().forEach((p: any) => initVote(p.id, p.voteCount ?? p._count?.votes ?? 0, p.hasVoted ?? false));
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

  const applyStatusChange = async (post: Post, oldStatus: string, newStatus: string, reason?: string) => {
    const postId = post.id;
    // Optimistic update — move card instantly
    setRoadmap(prev => {
      const updated = { ...prev };
      updated[oldStatus] = (updated[oldStatus] || []).filter((p: Post) => p.id !== postId);
      updated[newStatus] = [...(updated[newStatus] || []), { ...post, status: newStatus }];
      return updated;
    });

    try {
      await api.put(`/posts/${postId}/status`, { status: newStatus });
      // If a reason was supplied (hold/live flow), post it as a comment so the
      // decision is recorded on the post timeline.
      if (reason) {
        // `reason` is already rich-text HTML from CommentEditor — just prepend a label.
        const label = newStatus === 'hold' ? 'Status changed to On Hold' : 'Status changed to Live';
        const content = `<p><strong>${label}</strong></p>${reason}`;
        try {
          const r = await api.post(`/comments/post/${postId}`, { content });
          console.log('[status-reason-comment] posted', r.data);
          toast.success(`Status updated to ${newStatus === 'hold' ? 'On Hold' : 'Live'}`);
        } catch (err) {
          console.error('[status-reason-comment] failed', err);
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          toast.error(msg || 'Status updated but failed to post reason as comment');
        }
      }
    } catch {
      // Revert on error
      setRoadmap(prev => {
        const reverted = { ...prev };
        reverted[newStatus] = (reverted[newStatus] || []).filter((p: Post) => p.id !== postId);
        reverted[oldStatus] = [...(reverted[oldStatus] || []), { ...post, status: oldStatus }];
        return reverted;
      });
      toast.error('Failed to change status');
    }
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedPost || draggedPost.status === newStatus) {
      setDraggedPost(null);
      return;
    }

    // hold / live require a reason — open dialog first
    if (newStatus === 'hold' || newStatus === 'live') {
      setPendingStatusChange({ post: draggedPost, oldStatus: draggedPost.status, newStatus });
      setDraggedPost(null);
      return;
    }

    const post = draggedPost;
    const oldStatus = draggedPost.status;
    setDraggedPost(null);
    await applyStatusChange(post, oldStatus, newStatus);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setColumnSearches({});
  };

  const hasActiveFilters = searchQuery || filterType;

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
                          <div className="flex items-start gap-3">
                            <div onClick={(e) => { e.stopPropagation(); toggleVote(post.id); }}
                              className={`inline-flex flex-row items-center justify-center rounded-lg border font-bold shrink-0 cursor-pointer transition-all bg-transparent ${
                                votes[post.id]?.voted
                                  ? 'border-[#059669] text-[#059669]'
                                  : (theme === 'dark' ? 'border-gray-600 text-gray-300 hover:border-[#059669]' : 'border-gray-200 text-gray-700 hover:border-[#059669]')
                              }`} style={{ padding: '6px 10px', fontSize: '12px', gap: '5px' }}>
                              <ArrowUpRight className="w-3.5 h-3.5 rotate-[-45deg]" />
                              <span>{votes[post.id]?.count ?? post._count?.votes ?? 0}</span>
                            </div>
                            {(() => {
                              const subtitle = (post.description && post.description.trim())
                                || (post.content ? post.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '');
                              return (
                            <div className="flex-1 min-w-0 flex flex-col" style={{ minHeight: '78px' }}>
                              <div className={!subtitle ? 'flex-1 flex items-center' : ''}>
                                <div className="w-full">
                                  <p className={`text-sm font-semibold truncate leading-snug ${
                                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                                  }`}>{post.title}</p>
                                  {subtitle && (
                                    <p className={`text-xs line-clamp-1 mt-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>
                                  )}
                                </div>
                              </div>
                              {/* Board + Type chips */}
                              <div className="flex items-center gap-2 flex-wrap mt-auto pt-3">
                                {post.board?.name && (
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                    theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {post.board.name}
                                  </span>
                                )}
                                {(() => {
                                  const typeStyles: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
                                    feature:     { bg: 'bg-blue-100',   text: 'text-blue-700',   darkBg: 'bg-blue-900/40',   darkText: 'text-blue-300' },
                                    bug:         { bg: 'bg-red-100',    text: 'text-red-700',    darkBg: 'bg-red-900/40',    darkText: 'text-red-300' },
                                    improvement: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/40', darkText: 'text-orange-300' },
                                    integration: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/40', darkText: 'text-purple-300' },
                                  };
                                  const ts = typeStyles[post.type] || typeStyles.feature;
                                  return (
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                      theme === 'dark' ? `${ts.darkBg} ${ts.darkText}` : `${ts.bg} ${ts.text}`
                                    }`}>
                                      {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            );
                            })()}
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

      <StatusReasonDialog
        open={!!pendingStatusChange}
        status={pendingStatusChange?.newStatus === 'hold' ? 'hold' : pendingStatusChange?.newStatus === 'live' ? 'live' : null}
        loading={statusSaving}
        onConfirm={async (reason) => {
          if (!pendingStatusChange) return;
          setStatusSaving(true);
          await applyStatusChange(pendingStatusChange.post, pendingStatusChange.oldStatus, pendingStatusChange.newStatus, reason);
          setStatusSaving(false);
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}

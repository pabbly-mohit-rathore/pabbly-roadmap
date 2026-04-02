import { useEffect, useState } from 'react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
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

const STATUS_ORDER = ['open', 'under_review', 'planned', 'in_progress', 'live', 'closed', 'hold'];

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'border-l-4 border-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-500/10' },
  under_review: { label: 'Under Review', color: 'border-l-4 border-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10' },
  planned: { label: 'Planned', color: 'border-l-4 border-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-500/10' },
  in_progress: { label: 'In Progress', color: 'border-l-4 border-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10' },
  live: { label: 'Live', color: 'border-l-4 border-green-500', bgColor: 'bg-green-50 dark:bg-green-500/10' },
  closed: { label: 'Closed', color: 'border-l-4 border-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-500/10' },
  hold: { label: 'Hold', color: 'border-l-4 border-red-500', bgColor: 'bg-red-50 dark:bg-red-500/10' },
};

export default function AdminRoadmap() {
  const theme = useThemeStore((state) => state.theme);
  const [roadmap, setRoadmap] = useState<RoadmapData>({});
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchRoadmap();
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

  const handleChangeStatus = async (postId: string, newStatus: string) => {
    try {
      const response = await api.put(`/posts/${postId}/status`, { status: newStatus });
      if (response.data.success) {
        fetchRoadmap();
      }
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
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
        </div>

        {/* Board Selector */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Select Board
          </label>
          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200'
            }`}
          >
            <option value="">Select Board</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading roadmap...</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-6" style={{
            gridTemplateColumns: `repeat(${STATUS_ORDER.length}, minmax(300px, 1fr))`,
          }}>
            {STATUS_ORDER.map((status) => {
              const posts = roadmap[status] || [];
              const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];

              return (
                <div
                  key={status}
                  className={`rounded-lg border p-4 h-full min-h-96 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(status)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.color.split('border-')[1]}`} />
                      <h2 className={`font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {config.label}
                      </h2>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {posts.length}
                    </span>
                  </div>

                  {/* Posts */}
                  <div className="space-y-3">
                    {posts && posts.length > 0 ? (
                      posts.map((post) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={() => handleDragStart(post)}
                          className={`p-3 rounded-lg cursor-move transition-all hover:shadow-lg ${
                            draggedPost?.id === post.id ? 'opacity-50' : ''
                          } ${
                            theme === 'dark'
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <p className={`text-sm font-medium mb-2 line-clamp-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {post.title}
                          </p>

                          {/* Status Dropdown */}
                          <div className="mb-2">
                            <select
                              value={post.status}
                              onChange={(e) => handleChangeStatus(post.id, e.target.value)}
                              className={`w-full px-2 py-1 text-xs rounded border-0 cursor-pointer font-semibold ${
                                theme === 'dark'
                                  ? 'bg-gray-600 text-white'
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                            >
                              <option value="open">Open</option>
                              <option value="under_review">Under Review</option>
                              <option value="planned">Planned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="live">Live</option>
                              <option value="closed">Closed</option>
                              <option value="hold">Hold</option>
                            </select>
                          </div>

                          {/* Stats */}
                          <div className={`flex gap-3 text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <span>👍 {post._count?.votes || 0}</span>
                            <span>💬 {post._count?.comments || 0}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-8 text-sm ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        No posts
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!loading && selectedBoard && (
        <div className={`mt-8 p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-blue-800'
          }`}>
            💡 <strong>Tip:</strong> Drag posts between columns to change their status, or use the dropdown menu to change status directly.
          </p>
        </div>
      )}
    </div>
  );
}

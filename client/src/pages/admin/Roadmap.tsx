import { useEffect, useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
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

export default function AdminRoadmap() {
  const theme = useThemeStore((state) => state.theme);
  const [roadmap, setRoadmap] = useState<RoadmapData>({});
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [boards, setBoards] = useState<any[]>([]);

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

  const statusLabels: { [key: string]: string } = {
    open: 'Open',
    under_review: 'Under Review',
    planned: 'Planned',
    in_progress: 'In Progress',
    live: 'Live',
    closed: 'Closed',
    hold: 'Hold',
  };

  const statusColors: { [key: string]: string } = {
    open: 'border-l-4 border-blue-500',
    under_review: 'border-l-4 border-yellow-500',
    planned: 'border-l-4 border-purple-500',
    in_progress: 'border-l-4 border-orange-500',
    live: 'border-l-4 border-green-500',
    closed: 'border-l-4 border-gray-500',
    hold: 'border-l-4 border-red-500',
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-12">
        <h1 className={`text-4xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Roadmap
        </h1>
        <p className={`text-sm mb-6 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          View your product roadmap by status
        </p>

        {/* Board Selector */}
        <div className="mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.entries(roadmap).map(([status, posts]) => (
            <div
              key={status}
              className={`rounded-lg border p-4 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <h2 className={`font-bold mb-4 pb-3 border-b ${
                theme === 'dark' ? 'border-gray-700 text-white' : 'border-gray-200'
              }`}>
                {statusLabels[status] || status}
              </h2>
              <div className="space-y-3">
                {posts && posts.length > 0 ? (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className={`p-3 rounded-lg ${statusColors[status]} ${
                        theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-white hover:bg-gray-100'
                      } cursor-pointer transition-colors`}
                    >
                      <p className={`text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {post.title}
                      </p>
                      <div className={`flex gap-2 text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span>👍 {post._count?.votes || 0}</span>
                        <span>💬 {post._count?.comments || 0}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    No posts
                  </p>
                )}
              </div>
              <p className={`text-xs mt-4 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {posts?.length || 0} items
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

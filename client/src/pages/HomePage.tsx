import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import useThemeStore from '../store/themeStore';
import Tooltip from '../components/ui/Tooltip';
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

export default function HomePage() {
  const theme = useThemeStore((state) => state.theme);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sortBy === 'trending') params.sort = 'voteCount';

      const response = await api.get('/posts', { params });
      if (response.data.success) {
        setPosts(response.data.data.posts);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-orange-100 text-orange-800',
      live: 'bg-green-100 text-green-800',
      hold: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'
    }`}>
      <div className={`border-b ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-12 flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Feature Requests & Feedback
            </h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Share your ideas and upvote features you'd like to see
            </p>
          </div>
          <Tooltip title="Click here to toggle filters."><button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 text-sm font-medium rounded-lg border transition-colors duration-200 ${
              showFilters
                ? 'border-[#059669] text-[#059669]'
                : theme === 'dark' ? 'border-gray-700 text-gray-400 hover:border-[#059669] hover:text-[#059669]' : 'border-gray-200 text-gray-600 hover:border-[#059669] hover:text-[#059669]'
            }`}
            style={{ height: '48px' }}>
            <Icon icon="iconoir:filter" width={16} height={16} />
            Filters
          </button></Tooltip>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        {showFilters && (
        <div className={`p-4 rounded-lg border mb-8 grid grid-cols-1 md:grid-cols-4 gap-3 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-200'
            }`}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-200'
            }`}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="live">Live</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-200'
            }`}
          >
            <option value="newest">Newest</option>
            <option value="trending">Most Voted</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSortBy('newest');
            }}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            Reset
          </button>
        </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="text-center py-12">Loading posts...</div>
        ) : (
          <>
            {filteredPosts.length > 0 ? (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <a
                    key={post.id}
                    href={`/post/${post.slug}`}
                    className={`p-6 rounded-lg border block transition-all hover:shadow-lg ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className={`text-lg font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {post.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post.status)}`}>
                        {post.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={`flex gap-4 text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span>👍 {post.voteCount}</span>
                        <span>💬 {post.commentCount}</span>
                        <span>by {post.author.name}</span>
                      </div>
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={`p-12 text-center rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-400'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}>
                No posts found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

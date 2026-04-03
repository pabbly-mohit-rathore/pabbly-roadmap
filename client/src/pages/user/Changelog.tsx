import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  publishedAt: string;
  author: { id: string; name: string };
  isLiked: boolean;
  _count: { likes: number };
}

export default function UserChangelog() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/changelog/public');
      if (response.data.success) {
        setEntries(response.data.data.entries);
      }
    } catch (error) {
      console.error('Error fetching changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (entryId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to like');
      return;
    }

    try {
      const response = await api.post(`/changelog/${entryId}/like`);
      if (response.data.success) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, isLiked: response.data.data.liked, _count: { likes: response.data.data.likeCount } }
              : e
          )
        );
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      new: 'bg-emerald-100 text-emerald-700',
      improved: 'bg-blue-100 text-blue-700',
      fixed: 'bg-orange-100 text-orange-700',
    };
    return config[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Changelog
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Latest product updates and announcements
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className={`rounded-lg border overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Published</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Likes</th>
                </tr>
              </thead>
              <tbody>
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => navigate(`/user/changelog/${entry.id}`)}
                      className={`border-t cursor-pointer ${
                        theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {entry.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getTypeBadge(entry.type)}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleLike(entry.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-sm ${
                            entry.isLiked
                              ? 'text-red-500 bg-red-50'
                              : theme === 'dark'
                                ? 'text-gray-400 hover:text-red-500 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
                          }`}
                        >
                          <Heart className="w-4 h-4" fill={entry.isLiked ? 'currentColor' : 'none'} />
                          {entry._count.likes}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className={`px-6 py-12 text-center text-sm ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      No changelog entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

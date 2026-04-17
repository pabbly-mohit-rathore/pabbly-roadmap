import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Edit2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import Tooltip from '../../components/ui/Tooltip';

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  publishedAt: string;
  createdAt: string;
  author: { id: string; name: string };
  isLiked: boolean;
  _count: { likes: number };
}

export default function ChangelogView() {
  const theme = useThemeStore((state) => state.theme);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/changelog/${id}`);
      if (response.data.success) {
        setEntry(response.data.data.entry);
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const response = await api.post(`/changelog/${id}/like`);
      if (response.data.success) {
        setEntry((prev) =>
          prev ? { ...prev, isLiked: response.data.data.liked, _count: { likes: response.data.data.likeCount } } : null
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

  if (loading) return <LoadingBar />;
  if (!entry) return <div className="text-center py-12">Entry not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/admin/changelog')}
          className={`flex items-center gap-1 text-sm ${
            theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}>
          <ChevronLeft className="w-4 h-4" /> Back to Changelog
        </button>

        <div className="flex items-center gap-2">
          {user?.role === 'admin' && entry.status === 'draft' && (
            <Tooltip title="Click here to open the editor."><button onClick={() => navigate(`/admin/changelog/${id}/edit`)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
              }`}>
              <Edit2 className="w-4 h-4" />  Edit
            </button></Tooltip>
          )}

          <button onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
              entry.isLiked
                ? 'bg-red-50 text-red-500 border border-red-200'
                : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <Heart className="w-4 h-4" fill={entry.isLiked ? 'currentColor' : 'none'} />
            {entry._count.likes}
          </button>
        </div>
      </div>

      {/* Post Card */}
      <div className={`rounded-xl border p-8 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${getTypeBadge(entry.type)}`}>
            {entry.type}
          </span>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {entry.publishedAt
              ? new Date(entry.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : new Date(entry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            }
          </span>
        </div>

        {/* Title */}
        <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {entry.title}
        </h1>

        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          By {entry.author.name}
        </p>

        {/* Content */}
        <div className={`tiptap-preview ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
          dangerouslySetInnerHTML={{ __html: entry.content }} />
      </div>
    </div>
  );
}

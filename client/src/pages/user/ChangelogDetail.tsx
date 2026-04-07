import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import toast from 'react-hot-toast';

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

export default function UserChangelogDetail() {
  const theme = useThemeStore((state) => state.theme);
  const { isAuthenticated } = useAuthStore();
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
    if (!isAuthenticated) {
      toast.error('Please login to like');
      return;
    }
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

  if (loading) {
    return <UserLayout><LoadingBar /></UserLayout>;
  }

  if (!entry) {
    return <UserLayout><div className="text-center py-12">Entry not found</div></UserLayout>;
  }

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/user/changelog')}
            className={`flex items-center gap-1 text-sm ${
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
            <ChevronLeft className="w-4 h-4" /> Back to Changelog
          </button>

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
    </UserLayout>
  );
}

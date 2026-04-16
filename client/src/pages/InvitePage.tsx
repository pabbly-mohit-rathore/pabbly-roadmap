import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function InvitePage() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Invalid invite link'); return; }
    handleInvite();
  }, [token]);

  const handleInvite = async () => {
    try {
      // Validate the link
      const response = await api.get(`/invite-links/${token}`);
      if (!response.data.success) { setError('Invalid invite link'); return; }

      // Store invite token in localStorage
      localStorage.setItem('invite_token', token!);

      if (isAuthenticated) {
        // Redeem immediately
        try { await api.post('/invite-links/redeem', { token }); } catch {}
        localStorage.removeItem('invite_token');
      }

      // Always go to All Posts
      navigate('/user/all-posts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid invite link');
    }
  };

  if (error) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'} flex items-center justify-center`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Invalid Invite</h1>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
            <a href="/user/all-posts" className="inline-block px-6 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors font-medium">
              Go to All Posts
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'} flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-[#059669] rounded-full animate-spin mx-auto mb-4"></div>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Redirecting...</p>
      </div>
    </div>
  );
}

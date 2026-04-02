import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';

interface InviteData {
  token: string;
  boards: Array<{ id: string; name: string; slug: string }>;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
}

export default function InvitePage() {
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    try {
      if (!token) {
        setError('Invalid invite link');
        return;
      }

      const response = await api.get(`/invite-links/${token}`);
      if (response.data.success) {
        const data = response.data.data;

        // Check if invite is expired
        if (new Date(data.expiresAt) < new Date()) {
          setError('This invite link has expired');
          return;
        }

        // Check if max uses reached
        if (data.maxUses !== null && data.usedCount >= data.maxUses) {
          setError('This invite link has reached its maximum uses');
          return;
        }

        setInviteData(data);
      }
    } catch (error: any) {
      console.error('Error validating invite:', error);
      setError(error.response?.data?.message || 'Invalid invite link');
    } finally {
      setLoading(false);
    }
  };

  // Redeem invite for authenticated user
  const redeemAndNavigate = async () => {
    try {
      // Redeem the invite to add user as board member
      await api.post('/invite-links/redeem', { token: token! });
      navigate(`/user/boards`);
    } catch (error) {
      console.error('Error redeeming invite:', error);
      // Still navigate even if redeem fails
      navigate(`/user/boards`);
    }
  };

  // Auto-redirect - for all cases, go directly to board (no selection UI)
  useEffect(() => {
    if (inviteData && !error && inviteData.boards.length > 0) {
      const boards = inviteData.boards; // Store ALL boards

      // Clear all previous invite boards from localStorage
      Object.keys(localStorage)
        .filter(key => key.startsWith('invite_board_'))
        .forEach(key => localStorage.removeItem(key));

      // Store ALL invite boards
      boards.forEach(board => {
        localStorage.setItem(`invite_token_${board.id}`, token!);
        localStorage.setItem(`invite_board_${board.id}`, JSON.stringify(board));
      });

      if (isAuthenticated) {
        // Authenticated user - redeem and go to user dashboard
        redeemAndNavigate();
      } else {
        // Unauthenticated user - go to user boards view (with invite data in localStorage)
        navigate(`/user/boards`);
      }
    }
  }, [inviteData, error, token, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Validating invite...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'} flex items-center justify-center`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Invalid Invite
            </h1>
            <p className={`mb-6 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {error}
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'} flex items-center justify-center`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-lg border ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎉</span>
          </div>

          <h1 className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            You're Invited!
          </h1>

          <p className={`text-sm mb-6 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            You've been invited to join
          </p>

          {/* Single Board - Auto Redirect */}
          {inviteData && inviteData.boards.length === 1 && (
            <>
              <div className="mb-8">
                <div className={`p-4 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700'
                    : 'bg-gray-50'
                }`}>
                  <p className={`font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {inviteData.boards[0].name}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className={`text-sm text-center ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Redirecting you to the board...
                </p>
              </div>
            </>
          )}


          {!isAuthenticated && (
            <p className={`text-xs text-center ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Don't have an account?{' '}
              <a
                href={`/register?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                className={`font-semibold hover:underline ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}
              >
                Sign up
              </a>
            </p>
          )}

          {/* Expiry Info */}
          <div className={`mt-6 p-3 rounded-lg text-xs ${
            theme === 'dark'
              ? 'bg-gray-700 text-gray-400'
              : 'bg-gray-100 text-gray-600'
          }`}>
            <p>Expires: {new Date(inviteData?.expiresAt || '').toLocaleDateString()}</p>
            {inviteData?.maxUses && (
              <p>Remaining uses: {inviteData.maxUses - inviteData.usedCount}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

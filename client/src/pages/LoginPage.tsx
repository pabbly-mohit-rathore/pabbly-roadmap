import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SquareCheckBig } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import GoogleLoginButton from '../components/GoogleLoginButton';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const redirectAfterLogin = (user: { role: string }) => {
    if (user.role === 'admin') {
      navigate('/admin/dashboard');
      return;
    }
    const redirectUrl = localStorage.getItem('loginRedirect');
    if (redirectUrl) localStorage.removeItem('loginRedirect');
    navigate(redirectUrl || '/user/all-posts');
  };

  const handleGoogleSuccess = async (accessToken: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { accessToken, role: 'user' });
      const { user, accessToken: jwtToken, refreshToken } = res.data.data;
      login(user, jwtToken, refreshToken);
      toast.success('Login successful!');

      const pendingInvite = localStorage.getItem('invite_token');
      if (pendingInvite) {
        try { await api.post('/invite-links/redeem', { token: pendingInvite }); } catch { /* silent */ }
        localStorage.removeItem('invite_token');
      }
      Object.keys(localStorage).filter(key => key.startsWith('invite_')).forEach(key => localStorage.removeItem(key));

      redirectAfterLogin(user);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;

      login(user, accessToken, refreshToken);
      toast.success('Login successful!');

      const pendingInvite = localStorage.getItem('invite_token');
      if (pendingInvite) {
        try { await api.post('/invite-links/redeem', { token: pendingInvite }); } catch { /* silent */ }
        localStorage.removeItem('invite_token');
      }

      Object.keys(localStorage)
        .filter(key => key.startsWith('invite_'))
        .forEach(key => localStorage.removeItem(key));

      redirectAfterLogin(user);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Login failed.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <SquareCheckBig className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Sign in to continue to Pabbly Roadmap
          </p>

          {/* Google Button + Divider — only when GOOGLE_CLIENT_ID is set */}
          {GOOGLE_CLIENT_ID && (
            <>
              <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={loading} />
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-400">or continue with email</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 h-[52px] border-2 border-gray-200 rounded-2xl text-sm placeholder-gray-400 hover:border-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors duration-200"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 h-[52px] border-2 border-gray-200 rounded-2xl text-sm placeholder-gray-400 hover:border-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors duration-200"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white h-[52px] rounded-2xl text-sm font-medium hover:bg-neutral-800 hover:shadow-lg active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-sm text-gray-500 text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-neutral-900 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

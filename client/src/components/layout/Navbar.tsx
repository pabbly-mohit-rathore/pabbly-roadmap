
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareText, Eye, Bell, LogOut, Sun, Moon, Settings, ChevronDown, Layout, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import useNotificationStore from '../../store/notificationStore';
import useTeamAccessStore from '../../store/teamAccessStore';

const getTimeAgo = (dateStr: string): string => {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [invitationBusyId, setInvitationBusyId] = useState<string | null>(null);
  const { theme, setTheme } = useThemeStore();
  const { unreadCount, notifications, fetchUnreadCount, fetchNotifications, markAsRead, markAllRead, acceptInvitation, rejectInvitation } = useNotificationStore();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { isAuthenticated, user, logout } = useAuthStore();
  const isTeamAccess = useTeamAccessStore((state) => state.isTeamAccess);
  const showViewToggle = user?.role === 'admin' || isTeamAccess;

  const parseInvitationId = (data?: string | null): string | null => {
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return typeof parsed?.invitationId === 'string' ? parsed.invitationId : null;
    } catch {
      return null;
    }
  };

  const handleAcceptInvitation = async (notificationId: string, invitationId: string) => {
    setInvitationBusyId(notificationId);
    const result = await acceptInvitation(notificationId, invitationId);
    setInvitationBusyId(null);
    if (result) {
      toast.success(`Accepted — you now have ${result.accessLevel === 'admin' ? 'Admin' : 'Manager'} access to ${result.boardName}`);
      setNotifOpen(false);
      navigate('/admin/dashboard');
    } else {
      toast.error('Could not accept invitation');
    }
  };

  const handleRejectInvitation = async (notificationId: string, invitationId: string) => {
    setInvitationBusyId(notificationId);
    const ok = await rejectInvitation(notificationId, invitationId);
    setInvitationBusyId(null);
    if (ok) {
      toast.success('Invitation declined');
    } else {
      toast.error('Could not decline invitation');
    }
  };

  // Fetch unread count on mount + poll every 30s
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  return (
    <nav className={`sticky top-0 z-50 border-b transition-colors ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side — Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 text-white" />
              </div>
              <span className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Pabbly Roadmap</span>
            </Link>
          </div>

          {/* Right side */}
          {isAuthenticated ? (
            // ──── Logged in navbar ────
            <div className="flex items-center gap-1">
              {/* Toggle between Admin/User view */}
              {showViewToggle && (
                <div className="flex items-center gap-2">
                  <Link
                    to="/user/roadmap"
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                      !location.pathname.startsWith('/admin')
                        ? 'border-[#059669] text-[#059669]'
                        : theme === 'dark' ? 'border-gray-700 text-gray-400 hover:border-[#059669] hover:text-[#059669]' : 'border-gray-200 text-gray-600 hover:border-[#059669] hover:text-[#059669]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    User View
                  </Link>
                  <Link
                    to="/admin/dashboard"
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                      location.pathname.startsWith('/admin')
                        ? 'border-[#059669] text-[#059669]'
                        : theme === 'dark' ? 'border-gray-700 text-gray-400 hover:border-[#059669] hover:text-[#059669]' : 'border-gray-200 text-gray-600 hover:border-[#059669] hover:text-[#059669]'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                </div>
              )}

              {/* Notifications */}
              <div className="relative ml-2" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); if (!notifOpen) fetchNotifications(); }}
                  className={`relative p-2.5 rounded-lg transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className={`absolute right-0 mt-2 w-[380px] max-h-[480px] rounded-xl shadow-lg border z-50 flex flex-col ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                      <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-[#0c68e9] hover:underline">
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    {/* List */}
                    <div className="overflow-y-auto flex-1">
                      {notifications.length > 0 ? notifications.map(n => {
                        const invitationId = n.type === 'team_access_request' ? parseInvitationId(n.data) : null;
                        const isBusy = invitationBusyId === n.id;
                        const isTeamNotif = n.type?.startsWith('team_access');
                        const isClickable = !isTeamNotif && n.post;
                        return (
                        <div key={n.id}
                          onClick={() => {
                            if (!isClickable) return;
                            markAsRead(n.id);
                            const isAdmin = location.pathname.startsWith('/admin');
                            const basePath = isAdmin ? `/admin/posts/${n.post!.slug}` : `/user/posts/${n.post!.slug}`;
                            // Comment notifications: navigate with commentId for scroll
                            let parsed: Record<string, string> | null = null;
                            try { parsed = n.data ? JSON.parse(n.data) : null; } catch { /* ignore */ }
                            const commentId = parsed?.commentId || parsed?.parentId;
                            navigate(commentId ? `${basePath}?commentId=${commentId}` : basePath);
                            setNotifOpen(false);
                          }}
                          className={`flex gap-3 px-4 py-3 transition-colors ${isClickable ? 'cursor-pointer' : ''} ${
                            !n.isRead
                              ? (theme === 'dark' ? 'bg-blue-900/10 hover:bg-gray-700' : 'bg-blue-50/50 hover:bg-gray-50')
                              : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                          }`}>
                          {/* Dot */}
                          <div className="pt-1.5 shrink-0">
                            {!n.isRead ? (
                              <div className="w-2 h-2 rounded-full bg-[#0c68e9]" />
                            ) : (
                              <div className="w-2 h-2" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{n.title}</p>
                            <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{n.message}</p>
                            <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{getTimeAgo(n.createdAt)}</p>
                            {invitationId && !n.accepted && !n.rejected && (
                              <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  disabled={isBusy}
                                  onClick={() => handleAcceptInvitation(n.id, invitationId)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Check className="w-3 h-3" /> Accept
                                </button>
                                <button
                                  disabled={isBusy}
                                  onClick={() => handleRejectInvitation(n.id, invitationId)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                    theme === 'dark'
                                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            )}
                            {n.accepted && (
                              <p className="mt-2 text-xs font-semibold text-emerald-600">You have accepted the access</p>
                            )}
                            {n.rejected && (
                              <p className="mt-2 text-xs font-semibold text-red-500">You have rejected the access</p>
                            )}
                          </div>
                        </div>
                      );
                      }) : (
                        <div className={`flex flex-col items-center justify-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          <Bell className="w-8 h-8 mb-2 opacity-40" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
              </div>

              {/* Profile */}
              <div className="relative ml-2" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                    theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                  title="Profile"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-neutral-200'
                  }`}>
                    {user?.avatar ? (
                      <img src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.avatar}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-gray-300' : 'text-neutral-700'
                      }`}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-sm font-medium leading-tight ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {user?.name}
                    </span>
                    {user?.isBanned && (
                      <span className={`text-[10px] font-semibold leading-tight px-1.5 py-0.5 rounded mt-0.5 ${
                        theme === 'dark' ? 'text-red-400 bg-red-900/30' : 'text-red-500 bg-red-50'
                      }`}>
                        Account Banned
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div className={`absolute right-0 mt-2 w-[254px] rounded-xl shadow-lg border z-50 ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className={`px-4 py-4 border-b ${
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{user?.name}</p>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>{user?.email}</p>
                    </div>

                    {/* Theme Section */}
                    <div className={`px-4 py-3 border-b ${
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <p className={`text-xs font-semibold uppercase mb-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>Theme</p>
                      <div className={`flex p-1 rounded-lg gap-1 ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-emerald-50'
                      }`}>
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                            theme === 'light'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-transparent text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          Light
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-600 text-white'
                              : 'bg-transparent text-gray-600 hover:bg-emerald-100'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          Dark
                        </button>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to="/admin/profile-settings?tab=profile"
                      onClick={() => setProfileOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700 border-gray-700'
                          : 'text-gray-700 hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ──── Not logged in — Toggle ────
            <div className={`relative flex items-center rounded-full p-1 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <Link
                to="/login"
                className={`relative z-10 w-24 text-center text-sm font-medium py-2 rounded-full transition-colors duration-300 ${
                  isLoginPage ? 'text-white' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className={`relative z-10 w-24 text-center text-sm font-medium py-2 rounded-full transition-colors duration-300 ${
                  !isLoginPage ? 'text-white' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Sign up
              </Link>

              {/* Sliding black box */}
              <div
                className={`absolute top-1 bottom-1 w-24 rounded-full transition-all duration-300 ease-in-out ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-neutral-900'
                } ${isLoginPage ? 'left-1' : 'left-[calc(50%+2px)]'}`}
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

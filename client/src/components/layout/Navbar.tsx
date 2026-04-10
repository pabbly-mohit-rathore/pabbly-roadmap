
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquareText, Eye, Bell, LogOut, Sun, Moon, Settings, ChevronDown, Layout } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
export default function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { isAuthenticated, user, logout } = useAuthStore();

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
              {user?.role === 'admin' && (
                <>
                  {location.pathname.startsWith('/admin') ? (
                    <Link
                      to="/user/dashboard"
                      className={`flex items-center gap-3 pl-2 pr-1.5 py-1.5 rounded-lg border transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'border-gray-700 text-gray-300 bg-gray-800'
                          : 'border-gray-200 text-gray-600 bg-gray-50'
                      }`}
                      title="User View"
                    >
                      <span className="text-sm font-medium">User View</span>
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shadow-sm ${theme === 'dark' ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  ) : (
                    <Link
                      to="/admin/dashboard"
                      className={`flex items-center gap-3 pl-2 pr-1.5 py-1.5 rounded-lg border transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'border-gray-700 text-gray-300 bg-gray-800'
                          : 'border-gray-200 text-gray-600 bg-gray-50'
                      }`}
                      title="Admin Dashboard"
                    >
                      <span className="text-sm font-medium">Admin View</span>
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shadow-sm ${theme === 'dark' ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}>
                        <Layout className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  )}
                </>
              )}

              {/* Notifications */}
              <button
                className={`relative p-2.5 ml-2 rounded-lg transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>

              {/* Profile */}
              <div className="relative ml-2">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
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
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {user?.name}
                  </span>
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
                      <div className={`flex gap-2-50 p-1 rounded-lg gap-1 ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-teal-50'
                      }`}>
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                            theme === 'light'
                              ? 'bg-teal-500 text-white'
                              : theme === 'dark'
                              ? 'bg-transparent text-gray-400 hover:bg-gray-600'
                              : 'bg-transparent text-gray-600 hover:bg-teal-100'
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
                              : 'bg-transparent text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          Dark
                        </button>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to="/profile"
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

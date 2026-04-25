import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { User, Bell, Lock, Settings, Eye, Layout } from 'lucide-react';
import { Icon } from '@iconify/react';

function RoadmapIcon({ className }: { className?: string }) {
  return <Icon icon="streamline:arrow-roadmap" className={className} width={20} height={20} />;
}

function AllPostsIcon({ className }: { className?: string }) {
  return <Icon icon="material-symbols:post-add-sharp" className={className} width={20} height={20} />;
}
import useThemeStore from '../../store/themeStore';
import useSidebarStore from '../../store/sidebarStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';

export default function UserSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useThemeStore((state) => state.theme);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const { user } = useAuthStore();
  const { isTeamAccess } = useTeamAccessStore();
  const showViewToggle = user?.role === 'admin' || isTeamAccess;
  const onAdminRoute = location.pathname.startsWith('/admin');
  const isProfileSettings = location.pathname.startsWith('/admin/profile-settings');

  const profileMenuItems = [
    { label: 'Profile', icon: User, path: '/admin/profile-settings?tab=profile', tab: 'profile' },
    { label: 'Notifications', icon: Bell, path: '/admin/profile-settings?tab=notifications', tab: 'notifications' },
    { label: 'Change Password', icon: Lock, path: '/admin/profile-settings?tab=password', tab: 'password' },
    { label: 'Account Settings', icon: Settings, path: '/admin/profile-settings?tab=account', tab: 'account' },
  ];

  const menuItems = [
    { label: 'Roadmap', icon: RoadmapIcon, path: '/user/roadmap' },
    { label: 'All Posts', icon: AllPostsIcon, path: '/user/all-posts' },
  ];

  const isActive = (path: string) => {
    const onPostPage = location.pathname.startsWith('/user/posts');
    if (path === '/user/all-posts') {
      if (onPostPage) return true;
      return location.pathname.startsWith('/user/all-posts');
    }
    if (path === '/user/roadmap') {
      return location.pathname.startsWith('/user/roadmap');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isProfileTabActive = (tab: string) => {
    return isProfileSettings && searchParams.get('tab') === tab;
  };

  return (
    <aside
      className={`fixed md:static md:h-full inset-y-0 left-0 z-40 border-r overflow-y-auto flex-shrink-0 transition-transform duration-200 md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}
      style={{ width: '207px', top: '64px', height: 'calc(100vh - 64px)' }}
    >
      <div className={`h-px w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />

      {/* View Toggle (mobile only) — switches between Admin and User view */}
      {showViewToggle && (
        <div className={`md:hidden p-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 px-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>View</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/admin/dashboard"
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                onAdminRoute
                  ? 'border-[#059669] text-[#059669]'
                  : theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              Admin
            </Link>
            <Link
              to="/user/roadmap"
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                !onAdminRoute
                  ? 'border-[#059669] text-[#059669]'
                  : theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              User
            </Link>
          </div>
        </div>
      )}

      <nav className="p-3">
        <ul className="space-y-1">
          {isProfileSettings ? (
            profileMenuItems.map((item) => {
              const TabIcon = item.icon;
              const active = isProfileTabActive(item.tab);
              return (
                <li key={item.tab}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 font-medium text-sm ${
                      active
                        ? theme === 'dark'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 text-white'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <TabIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })
          ) : (
            menuItems.map((item) => {
              const MenuIcon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 font-medium text-sm ${
                      active
                        ? theme === 'dark'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 text-white'
                        : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <MenuIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </nav>
    </aside>
  );
}

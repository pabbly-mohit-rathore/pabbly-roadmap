import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Settings, User, Bell, Lock, Settings as SettingsIcon } from 'lucide-react';
import { Icon } from '@iconify/react';

function RoadmapIcon({ className }: { className?: string }) {
  return <Icon icon="streamline:arrow-roadmap" className={className} width={20} height={20} />;
}

function AllPostsIcon({ className }: { className?: string }) {
  return <Icon icon="material-symbols:post-add-sharp" className={className} width={20} height={20} />;
}
import useThemeStore from '../../store/themeStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import useAuthStore from '../../store/authStore';

export default function AdminSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useThemeStore((state) => state.theme);
  const { isTeamAccess } = useTeamAccessStore();
  const { user } = useAuthStore();

  const isRealAdmin = user?.role === 'admin';
  const isTeamMember = isTeamAccess && !isRealAdmin;
  const isProfileSettings = location.pathname.startsWith('/admin/profile-settings');

  // Profile settings tabs
  const profileMenuItems = [
    { label: 'Profile', icon: User, path: '/admin/profile-settings?tab=profile', tab: 'profile' },
    { label: 'Notifications', icon: Bell, path: '/admin/profile-settings?tab=notifications', tab: 'notifications' },
    { label: 'Change Password', icon: Lock, path: '/admin/profile-settings?tab=password', tab: 'password' },
    { label: 'Account Settings', icon: SettingsIcon, path: '/admin/profile-settings?tab=account', tab: 'account' },
  ];

  // Full admin menu
  const allMenuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Roadmap', icon: RoadmapIcon, path: '/admin/roadmap' },
    { label: 'All Posts', icon: AllPostsIcon, path: '/admin/all-posts' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  // Filter menu based on team access level
  let menuItems = allMenuItems;
  if (isTeamMember) {
    menuItems = allMenuItems.filter(item => item.label !== 'Settings');
  }

  const isActive = (path: string) => {
    const source = (location.state as { source?: string } | null)?.source;
    const onPostPage = location.pathname.startsWith('/admin/posts');

    if (path === '/admin/all-posts') {
      if (onPostPage) return !source || source === 'feedback';
      return location.pathname.startsWith('/admin/all-posts');
    }
    if (path === '/admin/board-management') {
      if (onPostPage) return source === 'board';
      return location.pathname.startsWith('/admin/board-management') || location.pathname.startsWith('/admin/boards') || location.pathname.startsWith('/admin/changelog');
    }
    if (path === '/admin/roadmap') {
      if (onPostPage) return source === 'roadmap';
      return location.pathname.startsWith('/admin/roadmap');
    }
    if (path === '/admin/settings') {
      if (onPostPage) return source === 'settings';
      return location.pathname.startsWith('/admin/settings') || location.pathname.startsWith('/admin/boards');
    }
    return location.pathname.startsWith(path);
  };

  const isProfileTabActive = (tab: string) => {
    return isProfileSettings && searchParams.get('tab') === tab;
  };

  return (
    <aside
      className={`fixed left-0 z-40 border-r transition-colors overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'
      }`}
      style={{ width: '207px', top: '64px', height: 'calc(100vh - 64px)' }}
    >
      <div className={`h-px w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />

      <nav className="p-3">
        <ul className="space-y-1">
          {isProfileSettings ? (
            // Profile settings tabs
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
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <TabIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })
          ) : (
            // Normal admin menu
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
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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

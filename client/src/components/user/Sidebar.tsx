import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { User, Bell, Lock, Settings } from 'lucide-react';
import { Icon } from '@iconify/react';

function RoadmapIcon({ className }: { className?: string }) {
  return <Icon icon="streamline:arrow-roadmap" className={className} width={20} height={20} />;
}

function AllPostsIcon({ className }: { className?: string }) {
  return <Icon icon="material-symbols:post-add-sharp" className={className} width={20} height={20} />;
}
import useThemeStore from '../../store/themeStore';

export default function UserSidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useThemeStore((state) => state.theme);
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
      className={`h-full border-r transition-colors overflow-y-auto flex-shrink-0 ${
        theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'
      }`}
      style={{ width: '207px' }}
    >
      <div className={`h-px w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`} />

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

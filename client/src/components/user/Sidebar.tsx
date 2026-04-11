import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';

function RoadmapIcon({ className }: { className?: string }) {
  return <Icon icon="streamline:arrow-roadmap" className={className} width={20} height={20} />;
}
import useThemeStore from '../../store/themeStore';

export default function UserSidebar() {
  const location = useLocation();
  const theme = useThemeStore((state) => state.theme);

  const menuItems = [
    { label: 'All Posts', icon: ({ className }: { className?: string }) => <Icon icon="material-symbols:post-add-sharp" className={className} width={20} height={20} />, path: '/user/all-posts' },
    { label: 'Roadmap', icon: RoadmapIcon, path: '/user/roadmap' },
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
          {menuItems.map((item) => {
            const Icon = item.icon;
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
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

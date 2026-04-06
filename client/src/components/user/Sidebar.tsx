import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Grid3x3, MapPin, History, Settings } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export default function UserSidebar() {
  const location = useLocation();
  const theme = useThemeStore((state) => state.theme);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/user/dashboard' },
    { label: 'Boards', icon: Grid3x3, path: '/user/boards' },
    { label: 'Roadmap', icon: MapPin, path: '/user/roadmap' },
    { label: 'Changelog', icon: History, path: '/user/changelog' },
    { label: 'Settings', icon: Settings, path: '/user/settings' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

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
                        ? 'bg-black text-white'
                        : 'bg-black text-white'
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

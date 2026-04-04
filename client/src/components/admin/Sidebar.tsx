import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, MapPin, Users, Grid3x3, Settings } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export default function AdminSidebar() {
  const location = useLocation();
  const theme = useThemeStore((state) => state.theme);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Feedback', icon: MessageSquare, path: '/admin/feedback' },
    { label: 'Roadmap', icon: MapPin, path: '/admin/roadmap' },
    { label: 'Board Management', icon: Grid3x3, path: '/admin/board-management' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      className={`fixed top-16 left-0 z-40 border-r transition-colors overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'
      }`}
      style={{ width: '207px', height: 'calc(100vh - 64px)' }}
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

import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, MapPin, Users, History, BarChart3 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export default function AdminSidebar() {
  const location = useLocation();
  const theme = useThemeStore((state) => state.theme);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Feedback', icon: MessageSquare, path: '/admin/feedback' },
    { label: 'Roadmap', icon: MapPin, path: '/admin/roadmap' },
    { label: 'User', icon: Users, path: '/admin/users' },
    { label: 'Change Log', icon: History, path: '/admin/changelog' },
    { label: 'Reporting', icon: BarChart3, path: '/admin/reporting' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className={`h-screen fixed left-0 top-16 border-r transition-colors overflow-y-auto ${
      theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'
    }`} style={{ width: '207px' }}>
      <nav className="p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm ${
                    active
                      ? theme === 'dark'
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-900'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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

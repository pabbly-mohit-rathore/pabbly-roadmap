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
    <aside className={`w-64 h-screen fixed left-0 top-16 border-r transition-colors ${
      theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    }`}>
      <nav className="p-4">
        <div className={`text-xs font-semibold uppercase mb-4 px-3 ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          Menu
        </div>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    active
                      ? theme === 'dark'
                        ? 'bg-teal-600 text-white'
                        : 'bg-teal-50 text-teal-700'
                      : theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-800'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import AdminSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import useAuthStore from '../../store/authStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const { isTeamAccess, accessLevel, memberName, exitTeamAccess } = useTeamAccessStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const showAccessBar = isTeamAccess && user?.role !== 'admin';
  const accessBarHeight = showAccessBar ? 44 : 0;

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      {/* Team Access Bar */}
      {showAccessBar && (
        <div className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white flex items-center justify-center gap-4 px-4"
          style={{ height: `${accessBarHeight}px`, minHeight: `${accessBarHeight}px` }}>
          <span className="flex items-center gap-2 text-sm font-medium">
            <span>👤</span>
            {memberName || user?.name} logged in as: <strong>{accessLevel === 'admin' ? 'admin' : 'manager'}</strong>
          </span>
          <button
            onClick={() => {
              exitTeamAccess();
              navigate('/user/boards');
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Access
          </button>
        </div>
      )}
      <Navbar />
      <AdminSidebar accessBarHeight={accessBarHeight} />
      <main className="overflow-y-auto" style={{ marginLeft: '207px', height: `calc(100vh - 64px - ${accessBarHeight}px)` }}>
        <div className={`p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

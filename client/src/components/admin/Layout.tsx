import Navbar from '../layout/Navbar';
import AdminSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <Navbar />
      <AdminSidebar />
      <main style={{ marginLeft: '207px' }}>
        <div className={`min-h-screen p-6 ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'
        }`}>
          {children}
        </div>
      </main>
    </div>
  );
}

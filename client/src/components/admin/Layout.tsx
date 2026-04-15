import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import AdminSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useThemeStore((state) => state.theme);

  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <Navbar />
      <AdminSidebar />
      <main ref={mainRef} className="overflow-y-auto" style={{ marginLeft: '207px', height: 'calc(100vh - 64px)' }}>
        <div className={`p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

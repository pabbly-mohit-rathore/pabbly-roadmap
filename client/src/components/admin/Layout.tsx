import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import AdminSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';
import useSidebarStore from '../../store/sidebarStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const closeSidebar = useSidebarStore((s) => s.close);

  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <Navbar />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          style={{ top: '64px' }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <AdminSidebar />
      <main
        ref={mainRef}
        className="overflow-y-auto md:ml-[207px]"
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <div className={`p-3 sm:p-4 md:p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

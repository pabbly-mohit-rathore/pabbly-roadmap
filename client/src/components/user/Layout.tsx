import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import UserSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';
import useSidebarStore from '../../store/sidebarStore';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const closeSidebar = useSidebarStore((s) => s.close);

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
      <div className="flex flex-1 overflow-hidden">
        <UserSidebar />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className={`p-3 sm:p-4 md:p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

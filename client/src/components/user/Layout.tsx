import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import UserSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <UserSidebar />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className={`p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

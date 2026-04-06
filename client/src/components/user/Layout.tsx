import Navbar from '../layout/Navbar';
import UserSidebar from './Sidebar';
import useThemeStore from '../../store/themeStore';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <UserSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className={`p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

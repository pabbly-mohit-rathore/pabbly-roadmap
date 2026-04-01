import useThemeStore from '../store/themeStore';

export default function HomePage() {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Home Page</h1>
      <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Posts will appear here.</p>
    </div>
  );
}

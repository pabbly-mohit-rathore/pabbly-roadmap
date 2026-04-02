import useThemeStore from '../../store/themeStore';

export default function AdminSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { setTheme } = useThemeStore();

  return (
    <div>
      <div className="mb-12">
        <h1 className={`text-4xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Settings
        </h1>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Manage application settings
        </p>
      </div>

      {/* Theme Settings */}
      <div className={`p-6 rounded-lg border mb-8 ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-6 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Appearance
        </h2>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Theme
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-black text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-black text-white'
                    : theme === 'light'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className={`p-6 rounded-lg border ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-6 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          System Information
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-300">
            <span className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Version
            </span>
            <span className={`font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              1.0.0
            </span>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-gray-300">
            <span className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Status
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-green-600">Operational</span>
            </span>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-gray-300">
            <span className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Database
            </span>
            <span className={`font-semibold ${
              theme === 'dark' ? 'text-green-400' : 'text-green-600'
            }`}>
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              API Server
            </span>
            <span className={`font-semibold ${
              theme === 'dark' ? 'text-green-400' : 'text-green-600'
            }`}>
              Running
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

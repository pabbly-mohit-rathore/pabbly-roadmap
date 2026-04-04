import { useState } from 'react';
import { BarChart3, Tags as TagsIcon, Settings as SettingsIcon } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import AdminReporting from './Reporting';
import AdminTags from './Tags';

const TABS = [
  { id: 'activity-log', label: 'Activity Log', icon: BarChart3 },
  { id: 'tags', label: 'Tags', icon: TagsIcon },
  { id: 'general', label: 'General', icon: SettingsIcon },
];

export default function AdminSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('activity-log');
  const d = theme === 'dark';

  return (
    <div>
      {/* Header */}
      <h1 className={`text-4xl font-bold mb-3 ${d ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
      <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
        Manage activity logs, tags, and application settings.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-6 mt-6 mb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? `border-black ${d ? 'text-white' : 'text-gray-900'}`
                  : `border-transparent ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'activity-log' && <AdminReporting />}
      {activeTab === 'tags' && <AdminTags />}
      {activeTab === 'general' && (
        <div>
          {/* Theme Settings */}
          <div className={`p-6 rounded-lg border mb-8 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-bold mb-6 ${d ? 'text-white' : 'text-gray-900'}`}>Appearance</h2>
            <div>
              <label className={`block text-sm font-medium mb-3 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Theme</label>
              <div className="flex gap-3">
                <button onClick={() => setTheme('light')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'light' ? 'bg-black text-white' : d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  Light
                </button>
                <button onClick={() => setTheme('dark')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'dark' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  Dark
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className={`p-6 rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-bold mb-6 ${d ? 'text-white' : 'text-gray-900'}`}>System Information</h2>
            <div className="space-y-4">
              {[
                { label: 'Version', value: '1.0.0' },
                { label: 'Status', value: 'Operational', color: 'text-green-600', dot: true },
                { label: 'Database', value: 'Connected', color: 'text-green-600' },
                { label: 'API Server', value: 'Running', color: 'text-green-600' },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between pb-4 ${i < 3 ? `border-b ${d ? 'border-gray-700' : 'border-gray-200'}` : ''}`}>
                  <span className={d ? 'text-gray-400' : 'text-gray-600'}>{item.label}</span>
                  <span className={`flex items-center gap-2 font-semibold ${item.color || (d ? 'text-white' : 'text-gray-900')}`}>
                    {item.dot && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

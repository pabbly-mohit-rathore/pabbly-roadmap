import { useState, useMemo } from 'react';
import { BarChart3, Tags as TagsIcon, Settings as SettingsIcon, Users, Plus } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import AdminReporting from './Reporting';
import AdminTags from './Tags';
import AdminTeamMembers from './TeamMembers';

const ALL_TABS = [
  { id: 'activity-log', label: 'Activity Log', icon: BarChart3, heading: 'Activity Log', description: 'View activity logs, reports, and analytics.', btnLabel: '' },
  { id: 'tags', label: 'Tags', icon: TagsIcon, heading: 'Tags', description: 'Create and manage tags for your posts.', btnLabel: 'Create Tag' },
  { id: 'team-members', label: 'Team Members', icon: Users, heading: 'Team Members', description: 'Manage team members and their access levels.', btnLabel: 'Add Member' },
  { id: 'general', label: 'General', icon: SettingsIcon, heading: 'General', description: 'Application settings and system information.', btnLabel: '' },
];

export default function AdminSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { isTeamAccess } = useTeamAccessStore();
  const d = theme === 'dark';

  const isRealAdmin = user?.role === 'admin';
  const isTeamMember = isTeamAccess && !isRealAdmin;

  const tabs = useMemo(() => {
    if (isTeamMember) return ALL_TABS.filter(t => t.id !== 'team-members' && t.id !== 'general');
    return ALL_TABS;
  }, [isTeamMember]);

  const [activeTab, setActiveTab] = useState('activity-log');
  const [triggerAction, setTriggerAction] = useState(0);
  const currentTab = ALL_TABS.find(t => t.id === activeTab)!;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setTriggerAction(0);
  };

  return (
    <div>
      {/* Header + Button */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>{currentTab.heading}</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>{currentTab.description}</p>
        </div>
        {currentTab.btnLabel && (
          <button onClick={() => setTriggerAction(prev => prev + 1)}
            className="flex items-center gap-2 bg-[#0C68E9] text-white rounded-lg hover:bg-[#0b5dd0] transition shrink-0"
            style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
            <Plus className="w-5 h-5" /> {currentTab.btnLabel}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-6 sticky z-30 ${d ? 'bg-gray-950' : 'bg-[#fafafa]'}`} style={{ top: '8px', marginTop: '26px', marginBottom: '26px', paddingTop: '10px', paddingBottom: '10px' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                active ? `border-black ${d ? 'text-white' : 'text-gray-900'}` : `border-transparent ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'activity-log' && <AdminReporting />}
      {activeTab === 'tags' && <AdminTags triggerCreate={triggerAction} />}
      {activeTab === 'team-members' && !isTeamMember && <AdminTeamMembers triggerCreate={triggerAction} />}
      {activeTab === 'general' && !isTeamMember && (
        <div>
          <div className={`p-6 rounded-lg border mb-8 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-bold mb-6 ${d ? 'text-white' : 'text-gray-900'}`}>Appearance</h2>
            <div>
              <label className={`block text-sm font-medium mb-3 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Theme</label>
              <div className="flex gap-3">
                <button onClick={() => setTheme('light')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'light' ? 'bg-[#0c68e9] text-white' : d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>Light</button>
                <button onClick={() => setTheme('dark')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'dark' ? 'bg-[#0c68e9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>Dark</button>
              </div>
            </div>
          </div>

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

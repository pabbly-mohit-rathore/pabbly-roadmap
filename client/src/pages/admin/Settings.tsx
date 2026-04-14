import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Users, Plus } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import AdminReporting from './Reporting';
import AdminUsers from './Users';
import AdminTeamMembers from './TeamMembers';

const ALL_TABS = [
  { id: 'activity-log', label: 'Activity Log', icon: BarChart3, heading: 'Activity Log', description: 'View activity logs, reports, and analytics.', btnLabel: '' },
  { id: 'users', label: 'Users', icon: Users, heading: 'Users', description: 'Manage registered users and their accounts.', btnLabel: '' },
  { id: 'team-members', label: 'Team Members', icon: Users, heading: 'Team Members', description: 'Manage team members and their access levels.', btnLabel: 'Add Team Member' },
];

export default function AdminSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { user } = useAuthStore();
  const { isTeamAccess } = useTeamAccessStore();
  const d = theme === 'dark';

  const isRealAdmin = user?.role === 'admin';
  const isTeamMember = isTeamAccess && !isRealAdmin;

  const tabs = useMemo(() => {
    if (isTeamMember) return ALL_TABS.filter(t => t.id !== 'team-members');
    return ALL_TABS;
  }, [isTeamMember]);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    const valid = ALL_TABS.some(t => t.id === tabFromUrl);
    return valid ? tabFromUrl! : 'activity-log';
  });
  const [triggerAction, setTriggerAction] = useState(0);
  const currentTab = ALL_TABS.find(t => t.id === activeTab)!;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  useEffect(() => {
    if (!tabFromUrl) setSearchParams({ tab: activeTab }, { replace: true });
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>{currentTab.heading}</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>{currentTab.description}</p>
        </div>
        {currentTab.btnLabel && (
          <button onClick={() => setTriggerAction(prev => prev + 1)}
            className="flex items-center gap-2 bg-[#009966] text-white rounded-lg hover:bg-[#047857] transition shrink-0"
            style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
            <Plus className="w-5 h-5" /> {currentTab.btnLabel}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-6 sticky z-30 ${d ? 'bg-gray-950' : 'bg-[#fafafa]'}`} style={{ top: '0px', marginTop: '26px', marginBottom: '26px', paddingTop: '10px', paddingBottom: '10px' }}>
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
      {activeTab === 'users' && !isTeamMember && <AdminUsers />}
      {activeTab === 'team-members' && !isTeamMember && <AdminTeamMembers triggerCreate={triggerAction} />}
    </div>
  );
}

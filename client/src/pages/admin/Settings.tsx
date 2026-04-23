import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Users, Plus, Tag as TagIcon, Webhook as WebhookIcon, LayoutGrid } from 'lucide-react';
import { Icon } from '@iconify/react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import AdminReporting from './Reporting';
import AdminUsers from './Users';
import AdminTeamMembers from './TeamMembers';
import AdminTags from './Tags';
import AdminWebhooks from './Webhooks';
import AdminEmbedWidgets from './EmbedWidgets';
import Tooltip from '../../components/ui/Tooltip';

const ALL_TABS = [
  { id: 'activity-log', label: 'Activity Log', icon: BarChart3, heading: 'Activity Log', description: 'View activity logs, reports, and analytics.', btnLabel: '' },
  { id: 'users', label: 'Users', icon: Users, heading: 'Users', description: 'Manage registered users and their accounts.', btnLabel: '' },
  { id: 'team-members', label: 'Team Members', icon: Users, heading: 'Team Members', description: 'Manage team members and their access levels.', btnLabel: 'Add Team Member' },
  { id: 'tags', label: 'Tags', icon: TagIcon, heading: 'Tags', description: 'Create and manage tags to categorize posts.', btnLabel: 'Create Tag' },
  { id: 'webhooks', label: 'Webhooks', icon: WebhookIcon, heading: 'Webhooks', description: 'Send real-time event notifications to external URLs.', btnLabel: 'Add Webhook' },
  { id: 'embed-widgets', label: 'Embed Widgets', icon: LayoutGrid, heading: 'Embed Widgets', description: 'Create embeddable feedback widgets for your website.', btnLabel: 'Add Widget' },
];

export default function AdminSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { user } = useAuthStore();
  const { isTeamAccess } = useTeamAccessStore();
  const d = theme === 'dark';

  const isRealAdmin = user?.role === 'admin';
  const isTeamMember = isTeamAccess && !isRealAdmin;

  const tabs = useMemo(() => {
    if (isTeamMember) return ALL_TABS.filter(t => t.id !== 'team-members' && t.id !== 'webhooks' && t.id !== 'embed-widgets');
    return ALL_TABS;
  }, [isTeamMember]);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    const valid = ALL_TABS.some(t => t.id === tabFromUrl);
    return valid ? tabFromUrl! : 'activity-log';
  });
  const [triggerAction, setTriggerAction] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const currentTab = ALL_TABS.find(t => t.id === activeTab)!;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
    setShowFilters(false); // reset filter panel on tab change
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
        <div className="flex items-center gap-3 shrink-0">
          <Tooltip title="Click here to toggle filters."><button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 text-sm font-medium rounded-lg border transition-colors duration-200 ${
              showFilters
                ? 'border-[#059669] text-[#059669]'
                : d ? 'border-gray-700 text-gray-400 hover:border-[#059669] hover:text-[#059669]' : 'border-gray-200 text-gray-600 hover:border-[#059669] hover:text-[#059669]'
            }`}
            style={{ height: '48px' }}>
            <Icon icon="iconoir:filter" width={16} height={16} />
            Filters
          </button></Tooltip>
          {currentTab.btnLabel && (
            <Tooltip title="Click here to add."><button onClick={() => setTriggerAction(prev => prev + 1)}
              className="flex items-center gap-2 bg-[#009966] text-white rounded-lg hover:bg-[#047857] transition"
              style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
              <Plus className="w-5 h-5" /> {currentTab.btnLabel}
            </button></Tooltip>
          )}
        </div>
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
      {activeTab === 'activity-log' && <AdminReporting showFilters={showFilters} />}
      {activeTab === 'users' && !isTeamMember && <AdminUsers showFilters={showFilters} />}
      {activeTab === 'team-members' && !isTeamMember && <AdminTeamMembers triggerCreate={triggerAction} showFilters={showFilters} />}
      {activeTab === 'tags' && <AdminTags triggerCreate={triggerAction} showFilters={showFilters} />}
      {activeTab === 'webhooks' && !isTeamMember && <AdminWebhooks triggerCreate={triggerAction} showFilters={showFilters} />}
      {activeTab === 'embed-widgets' && !isTeamMember && <AdminEmbedWidgets triggerCreate={triggerAction} showFilters={showFilters} />}
    </div>
  );
}

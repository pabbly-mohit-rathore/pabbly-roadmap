import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Grid3x3, History, Link2, Plus } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import AdminBoards from './Boards';
import AdminChangeLog from './ChangeLog';
import AdminInviteLinks from './InviteLinks';

const TABS = [
  { id: 'boards', label: 'Boards', icon: Grid3x3, heading: 'Boards', description: 'Create and manage your product boards.', btnLabel: 'Create Board' },
  { id: 'changelog', label: 'Change Log', icon: History, heading: 'Change Log', description: 'Create and manage product changelog entries.', btnLabel: 'Create Entry' },
  { id: 'invite-links', label: 'Invite Links', icon: Link2, heading: 'Invite Links', description: 'Create and manage user invitation links.', btnLabel: 'Generate Link' },
];

export default function BoardManagement() {
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('boards');
  const [triggerAction, setTriggerAction] = useState(0);

  useEffect(() => {
    const tab = (location.state as any)?.tab;
    if (tab) setActiveTab(tab);
  }, [location.state]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setTriggerAction(0);
  };
  const d = theme === 'dark';
  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <div>
      {/* Header + Create Button */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>{currentTab.heading}</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>{currentTab.description}</p>
        </div>
        <button onClick={() => setTriggerAction(prev => prev + 1)}
          className="flex items-center gap-2 bg-[#0C68E9] text-white rounded-lg hover:bg-[#0b5dd0] transition shrink-0"
          style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}>
          <Plus className="w-5 h-5" /> {currentTab.btnLabel}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6" style={{ marginTop: '26px', marginBottom: '26px' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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
      {activeTab === 'boards' && <AdminBoards triggerCreate={triggerAction} />}
      {activeTab === 'changelog' && <AdminChangeLog triggerCreate={triggerAction} />}
      {activeTab === 'invite-links' && <AdminInviteLinks triggerCreate={triggerAction} />}
    </div>
  );
}

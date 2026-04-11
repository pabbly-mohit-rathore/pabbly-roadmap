import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Grid3x3, Link2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import AdminBoards from './Boards';
import AdminInviteLinks from './InviteLinks';

const TABS = [
  { id: 'boards', label: 'Boards', icon: Grid3x3, heading: 'Boards', description: 'Create and manage your product boards.', btnLabel: 'Create Board' },
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

  return (
    <div>
      {/* Tabs */}
      <div className={`flex items-center gap-6 sticky z-30 ${d ? 'bg-gray-950' : 'bg-[#fafafa]'}`} style={{ top: '0px', marginTop: '26px', marginBottom: '26px', paddingTop: '10px', paddingBottom: '10px' }}>
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
      {activeTab === 'invite-links' && <AdminInviteLinks triggerCreate={triggerAction} />}
    </div>
  );
}

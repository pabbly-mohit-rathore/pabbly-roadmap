import { useState } from 'react';
import { Grid3x3, History, Link2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import AdminBoards from './Boards';
import AdminChangeLog from './ChangeLog';
import AdminInviteLinks from './InviteLinks';

const TABS = [
  { id: 'boards', label: 'Boards', icon: Grid3x3 },
  { id: 'changelog', label: 'Change Log', icon: History },
  { id: 'invite-links', label: 'Invite Links', icon: Link2 },
];

export default function BoardManagement() {
  const theme = useThemeStore((state) => state.theme);
  const [activeTab, setActiveTab] = useState('boards');
  const d = theme === 'dark';

  return (
    <div>
      {/* Header */}
      <h1 className={`text-4xl font-bold mb-3 ${d ? 'text-white' : 'text-gray-900'}`}>Board Management</h1>
      <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
        Create and manage your product boards, changelog entries, and invite links.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-6 mt-4 mb-3">
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
      {activeTab === 'boards' && <AdminBoards />}
      {activeTab === 'changelog' && <AdminChangeLog />}
      {activeTab === 'invite-links' && <AdminInviteLinks />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings as SettingsIcon, LogIn } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface SharedBoard {
  id: string;
  accessLevel: string;
  createdAt: string;
  board: { id: string; name: string; slug: string; color: string; description?: string };
}

const TABS = [
  { id: 'team-member', label: 'Team Member', icon: Users },
  { id: 'general', label: 'General Settings', icon: SettingsIcon },
];

export default function UserSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { user, login } = useAuthStore();
  const { enterTeamAccess } = useTeamAccessStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('team-member');
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const d = theme === 'dark';

  // General settings form
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSharedBoards();
  }, []);

  const fetchSharedBoards = async () => {
    try {
      setLoadingBoards(true);
      const res = await api.get('/team-members/shared-with-me');
      if (res.data.success) {
        setSharedBoards(res.data.data.memberships || []);
      }
    } catch (error) {
      console.error('Error fetching shared boards:', error);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleAccessBoard = (item: SharedBoard) => {
    enterTeamAccess({
      accessLevel: item.accessLevel,
      boardId: item.board.id,
      boardName: item.board.name,
      memberName: user?.name || '',
    });
    navigate('/admin/dashboard');
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    if (newPassword && newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword && newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    setSaving(true);
    try {
      const payload: Record<string, string> = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await api.put('/auth/profile', payload);
      if (res.data.success) {
        const state = useAuthStore.getState();
        login(res.data.data.user, state.accessToken || '', localStorage.getItem('refreshToken') || '');
        toast.success('Profile updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-4xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>
            Settings
          </h1>
          <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your account and team access
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
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

        {/* Team Member Tab */}
        {activeTab === 'team-member' && (
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-5 pb-0">
              <h2 className={`text-xl font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>
                Boards Shared With You
              </h2>
              <p className={`text-sm mb-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                Boards where you have been granted team member access
              </p>
            </div>
            <div>
              {loadingBoards ? (
                <p className={`px-5 py-8 text-sm text-center ${d ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p>
              ) : (
                <table className="w-full">
                  <thead className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>S.No</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Shared On</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board Name</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Permission Type</th>
                      <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Access Board</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedBoards.length > 0 ? (
                      sharedBoards.map((item, idx) => (
                        <tr key={item.id} className={`border-t ${d ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`px-5 py-4 text-sm font-medium ${d ? 'text-blue-400' : 'text-blue-600'}`}>{idx + 1}</td>
                          <td className={`px-5 py-4 text-sm ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                            {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.board.color }} />
                              <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{item.board.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              item.accessLevel === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.accessLevel === 'admin' ? 'Full Access' : 'Manager Access'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleAccessBoard(item)}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                d ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10' : 'border-blue-500 text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              Access Now
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={`px-5 py-10 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                          No boards shared with you yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-xl">
            {/* Profile */}
            <div className={`rounded-xl border p-6 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`text-lg font-bold mb-4 ${d ? 'text-white' : 'text-gray-900'}`}>Profile</h2>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 h-[44px] rounded-xl border text-sm ${
                      d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:border-gray-400`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className={`w-full px-4 h-[44px] rounded-xl border text-sm opacity-60 cursor-not-allowed ${
                      d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className={`rounded-xl border p-6 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`text-lg font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>
              <p className={`text-sm mb-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Leave blank if you don't want to change your password</p>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={`w-full px-4 h-[44px] rounded-xl border text-sm ${
                      d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:border-gray-400`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className={`w-full px-4 h-[44px] rounded-xl border text-sm ${
                      d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:border-gray-400`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`w-full px-4 h-[44px] rounded-xl border text-sm ${
                      d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:border-gray-400`}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

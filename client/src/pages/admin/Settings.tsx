import { useState, useMemo, useRef } from 'react';
import { BarChart3, Settings as SettingsIcon, Users, Plus, Camera, Grid3x3, Link2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AdminReporting from './Reporting';
import AdminUsers from './Users';
import AdminBoards from './Boards';
import AdminInviteLinks from './InviteLinks';
import AdminTeamMembers from './TeamMembers';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ALL_TABS = [
  { id: 'boards', label: 'Boards', icon: Grid3x3, heading: 'Boards', description: 'Create and manage your product boards.', btnLabel: 'Create Board' },
  { id: 'invite-links', label: 'Invite Links', icon: Link2, heading: 'Invite Links', description: 'Create and manage user invitation links.', btnLabel: 'Generate Link' },
  { id: 'activity-log', label: 'Activity Log', icon: BarChart3, heading: 'Activity Log', description: 'View activity logs, reports, and analytics.', btnLabel: '' },
  { id: 'users', label: 'Users', icon: Users, heading: 'Users', description: 'Manage registered users and their accounts.', btnLabel: '' },

  { id: 'team-members', label: 'Team Members', icon: Users, heading: 'Team Members', description: 'Manage team members and their access levels.', btnLabel: '' },
  { id: 'general', label: 'General', icon: SettingsIcon, heading: 'General', description: 'Manage your profile, appearance and account settings.', btnLabel: '' },
];

export default function AdminSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { setTheme } = useThemeStore();
  const { user, login } = useAuthStore();
  const { isTeamAccess } = useTeamAccessStore();
  const d = theme === 'dark';

  const isRealAdmin = user?.role === 'admin';
  const isTeamMember = isTeamAccess && !isRealAdmin;

  const tabs = useMemo(() => {
    if (isTeamMember) return ALL_TABS.filter(t => t.id !== 'team-members' && t.id !== 'general');
    return ALL_TABS;
  }, [isTeamMember]);

  const [activeTab, setActiveTab] = useState('boards');
  const [triggerAction, setTriggerAction] = useState(0);
  const currentTab = ALL_TABS.find(t => t.id === activeTab)!;

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setTriggerAction(0);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    if (newPassword && newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword && newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const payload: Record<string, string> = { name };
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
      const res = await api.put('/auth/profile', payload);
      if (res.data.success) {
        const state = useAuthStore.getState();
        login(res.data.data.user, state.accessToken || '', localStorage.getItem('refreshToken') || '');
        toast.success('Profile updated successfully');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('File size must be less than 3MB'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        const state = useAuthStore.getState();
        login(res.data.data.user, state.accessToken || '', localStorage.getItem('refreshToken') || '');
        toast.success('Avatar updated');
      }
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const avatarUrl = user?.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`)
    : null;

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
      {activeTab === 'boards' && !isTeamMember && <AdminBoards triggerCreate={triggerAction} />}
      {activeTab === 'invite-links' && !isTeamMember && <AdminInviteLinks triggerCreate={triggerAction} />}
      {activeTab === 'activity-log' && <AdminReporting />}
      {activeTab === 'users' && !isTeamMember && <AdminUsers />}

      {activeTab === 'team-members' && !isTeamMember && <AdminTeamMembers triggerCreate={triggerAction} />}
      {activeTab === 'general' && !isTeamMember && (
        <div>
          {/* Profile — Left/Right Layout */}
          <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>
            {/* Left Card — Avatar */}
            <div className={`rounded-xl border flex-shrink-0 flex flex-col items-center ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ width: '30%', padding: '40px 24px 32px' }}>
              {/* Avatar */}
              <div className="relative mb-4">
                <div className={`w-[120px] h-[120px] rounded-full overflow-hidden border-4 ${d ? 'border-gray-700 bg-gray-700' : 'border-gray-100 bg-gray-100'}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${d ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <span className={`text-4xl font-bold ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                    d ? 'bg-gray-600 border-gray-800 hover:bg-gray-500' : 'bg-white border-white hover:bg-gray-50'
                  } shadow-lg`}
                >
                  <Camera className={`w-4 h-4 ${d ? 'text-gray-300' : 'text-gray-600'}`} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpeg,.jpg,.png,.gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <p className={`text-xs text-center ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                Allowed *.jpeg, *.jpg, *.png, *.gif<br />max size of 3 MB
              </p>

              {/* User Info */}
              <div className={`w-full mt-6 pt-6 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <p className={`text-base font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                  <p className={`text-sm mt-0.5 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {user?.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card — Form Fields */}
            <div className={`rounded-xl border flex-1 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ padding: '24px' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Full Name */}
                <div className="relative">
                  <input type="text" value={name} placeholder=" "
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-white'}`}>Full name</span>
                </div>

                {/* Email Address */}
                <div className="relative">
                  <input type="email" value={user?.email || ''} placeholder=" " disabled
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none cursor-not-allowed opacity-70 ${d ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`} />
                  <span className={`absolute left-2.5 px-1 text-[11px] font-medium pointer-events-none top-0 -translate-y-1/2
                    ${d ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-white'}`}>Email address</span>
                </div>

                {/* Current Password */}
                <div className="relative">
                  <input type="password" value={currentPassword} placeholder=" "
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-white'}`}>Current password</span>
                </div>

                {/* New Password */}
                <div className="relative">
                  <input type="password" value={newPassword} placeholder=" "
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-white'}`}>New password</span>
                </div>

                {/* Confirm New Password */}
                <div className="relative">
                  <input type="password" value={confirmPassword} placeholder=" "
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'}`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-white'}`}>Confirm new password</span>
                </div>

                {/* Theme */}
                <div>
                    
                  <div className="flex gap-3">
                    <button onClick={() => setTheme('light')}
                      style={{ height: '52px', minWidth: '100px' }}
                      className={`flex-1 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'light' ? 'bg-[#0c68e9] text-white' : d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>Light</button>
                    <button onClick={() => setTheme('dark')}
                      style={{ height: '52px', minWidth: '100px' }}
                      className={`flex-1 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark' ? 'bg-[#0c68e9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>Dark</button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-[#1C252E] text-white text-sm font-semibold hover:bg-[#2a3640] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Bell, Lock, Settings, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../components/ui/LoadingBar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Tooltip from '../components/ui/Tooltip';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'password', label: 'Change Password', icon: Lock },
  { id: 'account', label: 'Account Settings', icon: Settings },
];

export default function ProfilePage() {
  const theme = useThemeStore((state) => state.theme);
  const { logout } = useAuthStore();
  const d = theme === 'dark';
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    return TABS.some(t => t.id === tabFromUrl) ? tabFromUrl! : 'profile';
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile edit
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Account
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true,
    postVoted: true,
    statusChange: true,
    newComment: true,
    commentLiked: true,
    commentReply: true,
  });

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => {
    if (!tabFromUrl) setSearchParams({ tab: activeTab }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/profile');
      if (res.data.success) {
        setProfile(res.data.data.user);
        setNameValue(res.data.data.user.name);
      }
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleUpdateName = async () => {
    if (!nameValue.trim()) { toast.error('Name is required'); return; }
    setSavingName(true);
    try {
      const res = await api.put('/auth/profile', { name: nameValue });
      if (res.data.success) {
        setProfile(prev => prev ? { ...prev, name: nameValue } : prev);
        setEditName(false);
        toast.success('Name updated!');
      }
    } catch { toast.error('Failed to update name'); }
    finally { setSavingName(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/auth/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setProfile(prev => prev ? { ...prev, avatar: res.data.data.user.avatar } : prev);
        toast.success('Avatar updated!');
      }
    } catch { toast.error('Failed to upload avatar'); }
    finally { setUploadingAvatar(false); }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentPassword || !newPassword || !confirmPassword) { toast.error('Fill all fields'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSavingPassword(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword, newPassword });
      if (res.data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed!');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPassword(false); }
  };

  const avatarSrc = profile?.avatar ? (profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE}${profile.avatar}`) : null;

  if (loading) return <LoadingBar />;

  // ─── Render Helpers ───
  const renderToggle = (checked: boolean, onChange: () => void) => (
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : d ? 'bg-gray-600' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  const renderPasswordInput = (label: string, key: 'currentPassword' | 'newPassword' | 'confirmPassword', placeholder: string, show: boolean, toggle: () => void) => (
    <div>
      <label className={`block text-sm font-semibold mb-2 ${d ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={passwordData[key]} placeholder={placeholder}
          onChange={(e) => setPasswordData({ ...passwordData, [key]: e.target.value })}
          className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${d ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
        />
        <button type="button" onClick={toggle} className={`absolute right-3 top-1/2 -translate-y-1/2 ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  // ─── Tab Content ───
  const renderProfileTab = () => (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Profile</h2>
      <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>This information appears publicly to your users.</p>

      <div className={`rounded-xl border divide-y ${d ? 'bg-gray-800/50 border-gray-700 divide-gray-700' : 'bg-white border-gray-200 divide-gray-100'}`}>
        {/* Avatar Row */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>Your Picture</span>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${d ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                  {profile?.name?.[0]?.toUpperCase()}
                </div>
              )}
              {uploadingAvatar && <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <label className={`text-sm font-semibold cursor-pointer transition-colors ${d ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}>
              {uploadingAvatar ? 'Uploading...' : 'Update'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
          </div>
        </div>

        {/* Name Row */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>Your Full Name</span>
          <div className="flex items-center gap-4">
            {editName ? (
              <div className="flex items-center gap-2">
                <input type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                />
                <Tooltip title="Click here to save."><button onClick={handleUpdateName} disabled={savingName}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                  {savingName ? '...' : 'Save'}
                </button></Tooltip>
                <button onClick={() => { setEditName(false); setNameValue(profile?.name || ''); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{profile?.name}</span>
                <Tooltip title="Click here to update."><button onClick={() => setEditName(true)}
                  className={`text-sm font-semibold transition-colors ${d ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}>
                  Update
                </button></Tooltip>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Email Notifications</h2>
        {renderToggle(notifSettings.emailNotifications, () => setNotifSettings(s => ({ ...s, emailNotifications: !s.emailNotifications })))}
      </div>
      <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>We'll notify you about important updates based on your preferences below.</p>

      {notifSettings.emailNotifications && (
        <div className={`rounded-xl border ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Post Section */}
          <div className={`flex items-center justify-between px-6 py-3 border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Post</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-gray-400'}`}>Notify</span>
          </div>
          {[
            { key: 'postVoted' as const, label: 'Someone votes on your post' },
            { key: 'statusChange' as const, label: 'Status change' },
          ].map(item => (
            <div key={item.key} className={`flex items-center justify-between px-6 py-3.5 border-b last:border-b-0 ${d ? 'border-gray-700/50' : 'border-gray-50'}`}>
              <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
              {renderToggle(notifSettings[item.key], () => setNotifSettings(s => ({ ...s, [item.key]: !s[item.key] })))}
            </div>
          ))}

          {/* Comment Section */}
          <div className={`flex items-center justify-between px-6 py-3 border-t border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Comment</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-gray-400'}`}>Notify</span>
          </div>
          {[
            { key: 'newComment' as const, label: 'New comment on your post' },
            { key: 'commentLiked' as const, label: 'Someone likes your comment' },
            { key: 'commentReply' as const, label: 'Someone replies to your comment' },
          ].map(item => (
            <div key={item.key} className={`flex items-center justify-between px-6 py-3.5 border-b last:border-b-0 ${d ? 'border-gray-700/50' : 'border-gray-50'}`}>
              <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
              {renderToggle(notifSettings[item.key], () => setNotifSettings(s => ({ ...s, [item.key]: !s[item.key] })))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPasswordTab = () => (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>
      <p className={`text-sm mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Update your current password. (Recommended every six months)</p>
      <p className={`text-xs mb-6 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Password must be at least 8 characters long.</p>

      <div className={`rounded-xl border p-6 ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderPasswordInput('Current Password', 'currentPassword', 'Your current password', showCurrent, () => setShowCurrent(!showCurrent))}
          {renderPasswordInput('New Password', 'newPassword', 'New password (8+ chars)', showNew, () => setShowNew(!showNew))}
          {renderPasswordInput('Confirm New Password', 'confirmPassword', 'Confirm new password', showConfirm, () => setShowConfirm(!showConfirm))}
        </div>
        <div className="mt-6 flex justify-end">
          <Tooltip title="Click here to update."><button onClick={handleChangePassword} disabled={savingPassword}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button></Tooltip>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>Account Settings</h2>
        <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Manage your account preferences and sessions.</p>
      </div>

      {/* Logout */}
      <div className={`rounded-xl border p-5 ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Logout from other sessions</p>
            <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>End all your other browser sessions across all devices.</p>
          </div>
          <button onClick={() => setLogoutConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <div className={`rounded-xl border p-5 ${d ? 'bg-red-950/30 border-red-900/40' : 'bg-red-50/50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-red-600">Delete account permanently</p>
            <p className={`text-xs mt-0.5 ${d ? 'text-red-400/70' : 'text-red-500/70'}`}>This permanently deletes your account. Your posts, comments, and votes will be disassociated.</p>
          </div>
          <Tooltip title="Click here to delete your account."><button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-100 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button></Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-[calc(100vh-64px)] ${d ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">

        {/* Left Sidebar Tabs */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1 sticky top-24">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? (d ? 'bg-gray-800 text-white' : 'bg-emerald-50 text-emerald-700')
                      : (d ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}>
                  <tab.icon className={`w-4 h-4 ${isActive ? (d ? 'text-emerald-400' : 'text-emerald-600') : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'password' && renderPasswordTab()}
          {activeTab === 'account' && renderAccountTab()}
        </div>
      </div>

      <ConfirmDialog
        open={logoutConfirm}
        title="Logout from all sessions?"
        message="This will end all your active sessions across all devices. You will need to log in again."
        onConfirm={() => { logout(); window.location.href = '/login'; }}
        onCancel={() => setLogoutConfirm(false)}
      />
    </div>
  );
}

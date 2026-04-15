import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Calendar, Lock, Eye, EyeOff, Camera } from 'lucide-react';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingBar from '../components/ui/LoadingBar';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const theme = useThemeStore((state) => state.theme);
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const d = theme === 'dark';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        setProfile(response.data.data.user);
        setFormData({
          name: response.data.data.user.name,
          email: response.data.data.user.email,
        });
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSaving(true);
    try {
      const response = await api.put('/auth/profile', {
        name: formData.name,
        email: formData.email,
      });
      if (response.data.success) {
        setProfile(response.data.data.user);
        setEditMode(false);
        toast.success('Profile updated successfully!');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        toast.success('Password changed successfully!');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/auth/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setProfile(prev => prev ? { ...prev, avatar: res.data.data.user.avatar } : prev);
        toast.success('Avatar updated!');
      }
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const avatarSrc = profile?.avatar
    ? (profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE}${profile.avatar}`)
    : null;

  if (loading) return <LoadingBar />;

  return (
    <div className={`min-h-screen ${d ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 text-sm font-medium mb-8 transition-colors ${d ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile Header Card */}
        <div className={`rounded-2xl border overflow-hidden mb-6 ${d ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white border-gray-200 shadow-sm'}`}>
          {/* Banner */}
          <div className={`h-24 ${d ? 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40' : 'bg-gradient-to-r from-emerald-50 to-teal-50'}`} />

          {/* Avatar + Name */}
          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end gap-4">
              <div className="relative group">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className={`w-20 h-20 rounded-full object-cover ring-4 shadow-lg ${d ? 'ring-gray-800' : 'ring-white'}`} />
                ) : (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ring-4 shadow-lg ${d ? 'ring-gray-800 bg-gradient-to-br from-emerald-600 to-teal-700 text-white' : 'ring-white bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                    {profile?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <label className={`absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploadingAvatar ? 'opacity-100' : ''} bg-black/40`}>
                  {uploadingAvatar ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              </div>
              <div className="pb-1">
                <h1 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{profile?.name}</h1>
                <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>{profile?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information Card */}
        <div className={`rounded-2xl border mb-6 ${d ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${d ? 'border-gray-700/60' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Account Information</h2>
            {!editMode && (
              <button onClick={() => setEditMode(true)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Edit
              </button>
            )}
          </div>

          {editMode ? (
            <div className="p-6 space-y-5">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Name</label>
                <input type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${d ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Email</label>
                <input type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${d ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
              </div>
              <div className={`flex gap-3 pt-4 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`}>
                <button onClick={handleUpdateProfile} disabled={saving}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditMode(false); setFormData({ name: profile?.name || '', email: profile?.email || '' }); }}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-0">
              {[
                { icon: User, label: 'Name', value: profile?.name },
                { icon: Mail, label: 'Email', value: profile?.email },
                { icon: Shield, label: 'Role', value: profile?.role, capitalize: true },
                { icon: Calendar, label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
              ].map((item, i, arr) => (
                <div key={item.label} className={`flex items-center gap-4 py-3.5 ${i < arr.length - 1 ? `border-b ${d ? 'border-gray-700/50' : 'border-gray-100'}` : ''}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${d ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-gray-400'}`}>{item.label}</p>
                    <p className={`text-sm font-medium mt-0.5 ${item.capitalize ? 'capitalize' : ''} ${d ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Card */}
        <div className={`rounded-2xl border mb-6 ${d ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${d ? 'border-gray-700/60' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Security</h2>
            {!showPasswordForm && (
              <button onClick={() => setShowPasswordForm(true)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <div className="p-6 space-y-5">
              {[
                { label: 'Current Password', key: 'currentPassword' as const, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { label: 'New Password', key: 'newPassword' as const, show: showNew, toggle: () => setShowNew(!showNew) },
                { label: 'Confirm New Password', key: 'confirmPassword' as const, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map(field => (
                <div key={field.key}>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.show ? 'text' : 'password'}
                      value={passwordData[field.key]}
                      onChange={(e) => setPasswordData({ ...passwordData, [field.key]: e.target.value })}
                      className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${d ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    />
                    <button type="button" onClick={field.toggle}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                      {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <div className={`flex gap-3 pt-4 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`}>
                <button onClick={handleChangePassword} disabled={savingPassword}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  {savingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${d ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>Password</p>
                  <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>Last changed: Unknown</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className={`rounded-2xl border ${d ? 'bg-gray-800/80 border-red-900/30' : 'bg-white border-red-100 shadow-sm'}`}>
          <div className={`px-6 py-4 border-b ${d ? 'border-gray-700/60' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider text-red-500`}>Danger Zone</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>Sign out of your account</p>
                <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>You will be redirected to the login page</p>
              </div>
              <button
                onClick={() => { logout(); window.location.href = '/login'; }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

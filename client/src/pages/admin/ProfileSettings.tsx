import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProfileSettings() {
  const d = useThemeStore((state) => state.theme) === 'dark';
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', role: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/profile');
        if (res.data.success) {
          const u = res.data.data.user;
          setProfile(u);
          const parts = (u.name || '').split(' ');
          setFormData({
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            email: u.email || '',
            role: u.role || 'user',
          });
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Image must be less than 3MB'); return; }
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

  const handleSave = async () => {
    if (!formData.firstName.trim()) { toast.error('First name is required'); return; }
    setSaving(true);
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const res = await api.put('/auth/profile', { name: fullName });
      if (res.data.success) {
        setProfile(prev => prev ? { ...prev, name: fullName } : prev);
        toast.success('Profile updated!');
      }
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const avatarSrc = profile?.avatar
    ? (profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE}${profile.avatar}`)
    : null;

  if (loading) return <div className={`text-center py-12 text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</div>;

  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${d ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`;
  const labelClass = `block text-xs font-semibold mb-1.5 ${d ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className={`rounded-xl border ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex flex-col md:flex-row">

        {/* Left — Avatar Card */}
        <div className={`w-full md:w-72 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r shrink-0 ${d ? 'border-gray-700' : 'border-gray-100'}`}>
          {/* Avatar */}
          <div className="relative group mb-3">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-28 h-28 rounded-full object-cover" />
            ) : (
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold ${d ? 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                {profile?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/40">
              {uploadingAvatar ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
              <input type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
          </div>
          <p className={`text-xs text-center ${d ? 'text-gray-500' : 'text-gray-400'}`}>
            Allowed *.jpeg, *.jpg, *.png, *.gif<br />max size of 3 MB
          </p>

          {/* Active Status */}
          <div className={`mt-6 w-full pt-4 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>Account Status</p>
                <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  {profile?.isActive ? 'Your account is active' : 'Your account is disabled'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${profile?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {profile?.isActive ? 'Active' : 'Banned'}
              </span>
            </div>
          </div>
        </div>

        {/* Right — Form Fields */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* First Name */}
            <div>
              <label className={labelClass}>First Name</label>
              <input type="text" value={formData.firstName} placeholder="Enter first name"
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inputClass} />
            </div>

            {/* Last Name */}
            <div>
              <label className={labelClass}>Last Name</label>
              <input type="text" value={formData.lastName} placeholder="Enter last name"
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inputClass} />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={formData.email} disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>

            {/* Role */}
            <div>
              <label className={labelClass}>Role</label>
              <input type="text" value={formData.role} disabled
                className={`${inputClass} opacity-60 cursor-not-allowed capitalize`} />
            </div>
          </div>

          {/* Save Button */}
          <div className={`mt-6 pt-5 border-t flex justify-end ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

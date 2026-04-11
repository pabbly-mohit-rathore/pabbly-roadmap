import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings as SettingsIcon, FolderInput, ChevronLeft, ChevronRight, ChevronDown, Camera } from 'lucide-react';
import UserLayout from '../../components/user/Layout';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface SharedBoard {
  id: string;
  accessLevel: string;
  createdAt: string;
  board: { id: string; name: string; slug: string; color: string; description?: string };
}

const TABS = [
  { id: 'team-member', label: 'Team Member', icon: Users },
  { id: 'general', label: 'General', icon: SettingsIcon },
];

export default function UserSettings() {
  const theme = useThemeStore((state) => state.theme);
  const { setTheme } = useThemeStore();
  const { user, login } = useAuthStore();
  const { enterTeamAccess } = useTeamAccessStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('team-member');
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const d = theme === 'dark';

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination for Shared Boards table
  const [swPage, setSwPage] = useState(0);
  const [swRowsPerPage, setSwRowsPerPage] = useState(10);
  const [swDenseMode, setSwDenseMode] = useState(false);
  const [swRowsDropOpen, setSwRowsDropOpen] = useState(false);
  const [openSharedMenuId, setOpenSharedMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedBoards();
  }, []);

  const fetchSharedBoards = async () => {
    try {
      setLoadingBoards(true);
      const res = await api.get('/team-members/shared-with-me');
      if (res.data.success) setSharedBoards(res.data.data.memberships || []);
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
    <UserLayout>
      <div>
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
          <p className={`text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage your team access and account settings.
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex items-center gap-6 sticky z-30 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`} style={{ top: '0px', marginTop: '26px', marginBottom: '26px', paddingTop: '10px', paddingBottom: '10px' }}>
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

        {/* Team Member Tab */}
        {activeTab === 'team-member' && (
          <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div style={{ padding: '24px 24px 16px 24px' }}>
              <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Boards Shared With You</h2>
            </div>

            {loadingBoards ? (
              <p className={`px-5 py-8 text-sm text-center ${d ? 'text-gray-500' : 'text-gray-400'}`}>Loading...</p>
            ) : (
              <>
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
                      {['S.No', 'Shared On', 'Board Name', 'Permission Type', 'Actions'].map((h, i) => (
                        <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                          style={{
                            fontSize: '14px', color: d ? undefined : '#1C252E',
                            textAlign: i === 4 ? 'right' as const : 'left' as const,
                            width: i === 0 ? '80px' : i === 4 ? '160px' : undefined,
                          }}>
                          <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 4 ? '24px' : '16px' }}>{h}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const paginatedShared = sharedBoards.slice(swPage * swRowsPerPage, (swPage + 1) * swRowsPerPage);
                      return paginatedShared.length > 0 ? paginatedShared.map((item, idx) => (
                        <tr key={item.id} className={`border-b border-dashed transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className={`${swDenseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                            {swPage * swRowsPerPage + idx + 1}
                          </td>
                          <td className={`px-4 ${swDenseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                            {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className={`px-4 ${swDenseMode ? 'py-1.5' : 'py-4'}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.board.color }} />
                              <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{item.board.name}</span>
                            </div>
                          </td>
                          <td className={`px-4 ${swDenseMode ? 'py-1.5' : 'py-4'}`}>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              item.accessLevel === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.accessLevel === 'admin' ? 'Full Access' : 'Manager Access'}
                            </span>
                          </td>
                          <td className={`${swDenseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                            <button
                              onClick={() => handleAccessBoard(item)}
                              className={`whitespace-nowrap px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                d ? 'border-[#0c68e9] text-[#0c68e9] hover:bg-[#0c68e9]/10' : 'border-[#0c68e9] text-[#0c68e9] hover:bg-blue-50'
                              }`}
                            >
                              Access Now
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5}>
                          <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <FolderInput className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                            </div>
                            <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Shared Boards</p>
                            <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No boards have been shared with you yet.</p>
                          </div>
                        </td></tr>
                      );
                    })()}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSwDenseMode(!swDenseMode)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${swDenseMode ? 'bg-[#0c68e9]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${swDenseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                      <div className="relative">
                        <button onClick={() => setSwRowsDropOpen(!swRowsDropOpen)}
                          className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                          {swRowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${swRowsDropOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {swRowsDropOpen && (
                          <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                            {[10, 25, 50, 100].map(n => (
                              <button key={n} onClick={() => { setSwRowsPerPage(n); setSwRowsDropOpen(false); setSwPage(0); }}
                                className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                                  swRowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                                  : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                                }`}>{n}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                      {sharedBoards.length > 0 ? `${swPage * swRowsPerPage + 1}–${Math.min((swPage + 1) * swRowsPerPage, sharedBoards.length)}` : '0–0'} of {sharedBoards.length}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setSwPage(Math.max(0, swPage - 1))} disabled={swPage === 0}
                        className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSwPage(Math.min(Math.ceil(sharedBoards.length / swRowsPerPage) - 1, swPage + 1))} disabled={swPage >= Math.ceil(sharedBoards.length / swRowsPerPage) - 1}
                        className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {swRowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setSwRowsDropOpen(false)} />}
                {openSharedMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenSharedMenuId(null)} />}
              </>
            )}
          </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && (
          <div>
            {/* Profile — Left/Right Layout */}
            <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>
              {/* Left Card — Avatar */}
              <div className={`rounded-xl border flex-shrink-0 flex flex-col items-center ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ width: '30%', padding: '40px 24px 32px' }}>
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
                <div className={`w-full mt-6 pt-6 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="text-center">
                    <p className={`text-base font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                    <p className={`text-sm mt-0.5 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
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
    </UserLayout>
  );
}

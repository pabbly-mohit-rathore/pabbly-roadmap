import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Tooltip from '../../components/ui/Tooltip';

export default function ChangePasswordSettings() {
  const d = useThemeStore((state) => state.theme) === 'dark';

  const [data, setData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) { toast.error('Fill all fields'); return; }
    if (data.newPassword !== data.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (data.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      if (res.data.success) {
        setData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed!');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const PasswordInput = ({ label, placeholder, value, show, onToggle, onChange }: {
    label: string; placeholder: string; value: string; show: boolean; onToggle: () => void; onChange: (v: string) => void;
  }) => (
    <div>
      <label className={`block text-sm font-semibold mb-2 ${d ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${d ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
        />
        <button type="button" onClick={onToggle}
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p className={`text-xs mb-6 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Password must be at least 8 characters long.</p>

      <div className={`rounded-xl border p-6 ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PasswordInput label="Current Password" placeholder="Your current password" value={data.currentPassword}
            show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} onChange={v => setData({ ...data, currentPassword: v })} />
          <PasswordInput label="New Password" placeholder="New password (8+ chars)" value={data.newPassword}
            show={showNew} onToggle={() => setShowNew(!showNew)} onChange={v => setData({ ...data, newPassword: v })} />
          <PasswordInput label="Confirm Password" placeholder="Confirm new password" value={data.confirmPassword}
            show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} onChange={v => setData({ ...data, confirmPassword: v })} />
        </div>
        <div className="mt-6 flex justify-end">
          <Tooltip title="Click here to submit."><button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
            {saving ? 'Updating...' : 'Update Password'}
          </button></Tooltip>
        </div>
      </div>
    </div>
  );
}

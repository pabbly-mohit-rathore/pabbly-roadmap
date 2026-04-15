import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function AccountSettings() {
  const d = useThemeStore((state) => state.theme) === 'dark';
  const { logout } = useAuthStore();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Logout from sessions */}
      <div className={`rounded-xl border p-5 ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Logout from other sessions</p>
            <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>End all your other browser sessions across all devices.</p>
          </div>
          <button onClick={() => setLogoutConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0">
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
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-100 transition-colors shrink-0">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
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

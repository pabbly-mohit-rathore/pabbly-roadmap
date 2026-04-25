import { useEffect, useState } from 'react';
import { ShieldX } from 'lucide-react';

export default function BannedDialog() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('account-banned', handler);
    return () => window.removeEventListener('account-banned', handler);
  }, []);

  if (!show) return null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('teamAccess');
    window.location.href = '/login';
  };

  const handleClose = () => {
    setShow(false);
    // Reset flag so dialog can show again on next write attempt
    (window as any).__bannedDialogShown = false;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Red header bar */}
        <div className="h-1.5 bg-red-500" />

        <div className="p-5 sm:p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Banned</h2>

          {/* Message */}
          <p className="text-sm text-gray-500 leading-relaxed mb-2">
            Your account has been banned by the administrator. You cannot perform this action.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            For unban, please contact our support team.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

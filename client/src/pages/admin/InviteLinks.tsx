import { useEffect, useState } from 'react';
import { Copy, Check, Link2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';

export default function AdminInviteLinks({ triggerCreate: _triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';
  const [inviteUrl, setInviteUrl] = useState('');
  const [usedCount, setUsedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchLink(); }, []);

  const fetchLink = async () => {
    try {
      setLoading(true);
      const r = await api.get('/invite-links/simple');
      if (r.data.success) {
        setInviteUrl(r.data.data.inviteLink.url);
        setUsedCount(r.data.data.inviteLink.usedCount);
      }
    } catch {
      console.error('Failed to fetch invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingBar />;

  return (
    <div>
      {/* Invite Link Card */}
      <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ padding: '24px' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
            <Link2 className={`w-5 h-5 ${d ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`text-base font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>Your Invite Link</h3>
            <p className={`text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>Share this link to invite users to your platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex-1 flex items-center px-4 rounded-lg border ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ height: '48px' }}>
            <span className={`text-sm truncate ${d ? 'text-gray-300' : 'text-gray-700'}`}>{inviteUrl}</span>
          </div>
          <button onClick={handleCopy}
            className={`flex items-center gap-2 px-5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
            }`} style={{ height: '48px' }}>
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
          </button>
        </div>

        <div className={`mt-4 pt-4 border-t ${d ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-6">
            <div>
              <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>Times Used</span>
              <p className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>{usedCount}</p>
            </div>
            <div>
              <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>Expiry</span>
              <p className={`text-lg font-bold ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>Never</p>
            </div>
            <div>
              <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>User Limit</span>
              <p className={`text-lg font-bold ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>Unlimited</p>
            </div>
          </div>
        </div>

        <div className={`mt-4 p-3 rounded-lg ${d ? 'bg-gray-700/50' : 'bg-amber-50'}`}>
          <p className={`text-xs ${d ? 'text-gray-400' : 'text-amber-700'}`}>
            Users who click this link will be directed to the All Posts page. They can browse all public boards without logging in. When they take an action (vote, comment, create post), they'll be prompted to sign in or sign up.
          </p>
        </div>
      </div>
    </div>
  );
}

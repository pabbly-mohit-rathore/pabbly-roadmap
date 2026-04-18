import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useThemeStore from '../../store/themeStore';
import pushNotifications from '../../services/pushNotification.service';

export default function NotificationSettings() {
  const d = useThemeStore((state) => state.theme) === 'dark';

  const [settings, setSettings] = useState({
    browserNotifications: false,
    postVoted: true,
    statusChange: true,
    newComment: true,
    commentLiked: true,
    commentReply: true,
  });
  const [pushSupported, setPushSupported] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    const supported = pushNotifications.isSupported();
    setPushSupported(supported);
    if (supported) {
      pushNotifications.isSubscribed().then((subscribed) => {
        setSettings((s) => ({ ...s, browserNotifications: subscribed }));
      });
    }
  }, []);

  const toggleBrowserPush = async () => {
    if (!pushSupported) {
      toast.error('Browser notifications not supported in this browser.');
      return;
    }
    setPushBusy(true);
    try {
      if (settings.browserNotifications) {
        await pushNotifications.unsubscribe();
        setSettings((s) => ({ ...s, browserNotifications: false }));
        toast.success('Browser notifications turned off.');
      } else {
        await pushNotifications.subscribe();
        setSettings((s) => ({ ...s, browserNotifications: true }));
        toast.success('Browser notifications enabled.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update notification settings.';
      toast.error(msg);
    } finally {
      setPushBusy(false);
    }
  };

  const toggle = (key: Exclude<keyof typeof settings, 'browserNotifications'>) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : d ? 'bg-gray-600' : 'bg-gray-300'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div>
      {/* Browser Push Master Toggle */}
      <div className={`rounded-xl border mb-6 ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="min-w-0 pr-4">
            <div className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>Browser Notifications</div>
            <div className={`text-xs mt-0.5 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
              {pushSupported
                ? 'Get desktop notifications when the app is in the background.'
                : 'Your browser does not support push notifications.'}
            </div>
          </div>
          <Toggle checked={settings.browserNotifications} onChange={toggleBrowserPush} disabled={!pushSupported || pushBusy} />
        </div>
      </div>

      {settings.browserNotifications && (
        <div className={`rounded-xl border ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Post Section Header */}
          <div className={`flex items-center justify-between px-6 py-3 border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Post</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-gray-400'}`}>Notify</span>
          </div>
          {[
            { key: 'postVoted' as const, label: 'Someone votes on your post' },
            { key: 'statusChange' as const, label: 'Status change' },
          ].map((item) => (
            <div key={item.key} className={`flex items-center justify-between px-6 py-4 border-b ${d ? 'border-gray-700/50' : 'border-gray-50'}`}>
              <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
              <Toggle checked={settings[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}

          {/* Comment Section Header */}
          <div className={`flex items-center justify-between px-6 py-3 border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Comment</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-gray-400'}`}>Notify</span>
          </div>
          {[
            { key: 'newComment' as const, label: 'New comment on your post' },
            { key: 'commentLiked' as const, label: 'Someone likes your comment' },
            { key: 'commentReply' as const, label: 'Someone replies to your comment' },
          ].map((item) => (
            <div key={item.key} className={`flex items-center justify-between px-6 py-4 border-b last:border-b-0 ${d ? 'border-gray-700/50' : 'border-gray-50'}`}>
              <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
              <Toggle checked={settings[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

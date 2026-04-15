import { useState } from 'react';
import useThemeStore from '../../store/themeStore';

export default function NotificationSettings() {
  const d = useThemeStore((state) => state.theme) === 'dark';

  const [settings, setSettings] = useState({
    emailNotifications: true,
    postVoted: true,
    statusChange: true,
    newComment: true,
    commentLiked: true,
    commentReply: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : d ? 'bg-gray-600' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div>
      {/* Master Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <Toggle checked={settings.emailNotifications} onChange={() => toggle('emailNotifications')} />
        <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>
          {settings.emailNotifications ? 'Email notifications enabled' : 'Email notifications disabled'}
        </span>
      </div>

      {settings.emailNotifications && (
        <div className={`rounded-xl border ${d ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Post Section Header */}
          <div className={`flex items-center justify-between px-6 py-3 border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={`text-sm font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Post</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-gray-400'}`}>Notify</span>
          </div>
          {[
            { key: 'postVoted' as const, label: 'Someone votes on your post' },
            { key: 'statusChange' as const, label: 'Status change' },
          ].map(item => (
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
          ].map(item => (
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

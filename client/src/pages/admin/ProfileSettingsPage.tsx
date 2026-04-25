import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useThemeStore from '../../store/themeStore';
import ProfileSettings from './ProfileSettings';
import NotificationSettings from './NotificationSettings';
import ChangePasswordSettings from './ChangePasswordSettings';
import AccountSettings from './AccountSettings';

const TAB_META: Record<string, { heading: string; description: string }> = {
  profile: { heading: 'Profile Settings', description: 'This information appears publicly to your users.' },
  notifications: { heading: 'Notifications', description: 'Manage your notification preferences.' },
  password: { heading: 'Change Password', description: 'Update your current password. (Recommended every six months)' },
  account: { heading: 'Account Settings', description: 'Manage your account preferences and sessions.' },
};

export default function ProfileSettingsPage() {
  const d = useThemeStore((state) => state.theme) === 'dark';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  useEffect(() => {
    if (!searchParams.get('tab')) setSearchParams({ tab: 'profile' }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = TAB_META[activeTab] || TAB_META.profile;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className={`text-xl sm:text-2xl font-bold mb-1 sm:mb-2 ${d ? 'text-white' : 'text-gray-900'}`}>{meta.heading}</h1>
        <p className={`text-sm sm:text-base ${d ? 'text-gray-400' : 'text-gray-500'}`}>{meta.description}</p>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileSettings />}
      {activeTab === 'notifications' && <NotificationSettings />}
      {activeTab === 'password' && <ChangePasswordSettings />}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  );
}

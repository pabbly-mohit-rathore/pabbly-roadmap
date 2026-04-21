import { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import useThemeStore from '../../store/themeStore';

export interface MentionUser {
  id: string;
  name: string;
  avatar?: string | null;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const MentionList = forwardRef<MentionListHandle, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command({ id: item.id, label: item.name });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className={`rounded-lg border shadow-2xl p-3 text-sm ${
        d ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
      }`} style={{ minWidth: '220px' }}>
        No users found
      </div>
    );
  }

  return (
    <div className={`rounded-lg border shadow-2xl p-1 max-h-[280px] overflow-y-auto ${
      d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
    }`} style={{ minWidth: '260px' }}>
      {items.map((item, index) => {
        const avatarUrl = item.avatar
          ? (item.avatar.startsWith('http') ? item.avatar : `${API_BASE}${item.avatar}`)
          : null;
        const active = index === selectedIndex;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-md transition-colors ${
              active
                ? d ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                : d ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                d ? 'bg-gray-600 text-gray-200' : 'bg-emerald-600 text-white'
              }`}>
                {item.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium truncate">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
});

MentionList.displayName = 'MentionList';
export default MentionList;

import { useEffect, useRef, useState } from 'react';
import useThemeStore from '../../store/themeStore';

export interface MentionUser {
  id: string;
  name: string;
  avatar?: string | null;
}

export type MentionKeyDownHandler = (props: { event: KeyboardEvent }) => boolean;

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
  keyDownRef?: { current: MentionKeyDownHandler | null };
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function MentionList({ items, command, keyDownRef }: MentionListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const theme = useThemeStore((s) => s.theme);
  const d = theme === 'dark';
  const itemsRef = useRef(items);
  const selectedIndexRef = useRef(selectedIndex);
  itemsRef.current = items;
  selectedIndexRef.current = selectedIndex;

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (index: number) => {
    const item = itemsRef.current[index];
    if (item) command({ id: item.id, label: item.name });
  };

  // Register a keyboard handler that the tiptap suggestion uses — avoids forwardRef.
  useEffect(() => {
    if (!keyDownRef) return;
    keyDownRef.current = ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + itemsRef.current.length - 1) % itemsRef.current.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % itemsRef.current.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndexRef.current);
        return true;
      }
      return false;
    };
    return () => { if (keyDownRef) keyDownRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyDownRef]);

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
}

import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import MentionList, { type MentionKeyDownHandler, type MentionUser } from './MentionList';
import api from '../../services/api';

let searchTimer: ReturnType<typeof setTimeout> | null = null;
let lastQuery = '';
let lastResults: MentionUser[] = [];

function fetchUsers(query: string): Promise<MentionUser[]> {
  return new Promise((resolve) => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      if (query === lastQuery && lastResults.length > 0) {
        resolve(lastResults);
        return;
      }
      try {
        const res = await api.get('/users/search', { params: { q: query, limit: 8 } });
        const users: MentionUser[] = res.data?.data?.users || [];
        lastQuery = query;
        lastResults = users;
        resolve(users);
      } catch {
        resolve([]);
      }
    }, 150);
  });
}

const mentionSuggestion = {
  items: async ({ query }: { query: string }) => {
    return fetchUsers(query);
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: TippyInstance[] | null = null;
    const keyDownRef: { current: MentionKeyDownHandler | null } = { current: null };

    return {
      onStart: (props: { clientRect?: (() => DOMRect | null) | null; editor: unknown }) => {
        component = new ReactRenderer(MentionList, {
          props: { ...props, keyDownRef },
          editor: props.editor as never,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'mention',
          arrow: false,
          offset: [0, 6],
        });
      },

      onUpdate: (props: { clientRect?: (() => DOMRect | null) | null }) => {
        component?.updateProps({ ...props, keyDownRef });
        if (!popup || !props.clientRect) return;
        popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        return keyDownRef.current?.(props) || false;
      },

      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
        popup = null;
        component = null;
        keyDownRef.current = null;
      },
    };
  },
};

export default mentionSuggestion;

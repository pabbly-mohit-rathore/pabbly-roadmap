import { create } from 'zustand';
import api from '../services/api';
import useTeamAccessStore from './teamAccessStore';
import useAuthStore from './authStore';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: string | null;
  post?: { id: string; title: string; slug: string };
}

interface InvitationResult {
  accessLevel: string;
  boardId: string;
  boardName: string;
}

interface NotificationStore {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  acceptInvitation: (notificationId: string, invitationId: string) => Promise<InvitationResult | null>;
  rejectInvitation: (notificationId: string, invitationId: string) => Promise<boolean>;
}

const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,

  fetchUnreadCount: async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data.success) set({ unreadCount: res.data.data.count });
    } catch { /* silent */ }
  },

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/notifications?limit=30');
      if (res.data.success) set({ notifications: res.data.data.notifications });
    } catch { /* silent */ }
    finally { set({ loading: false }); }
  },

  markAsRead: async (id: string) => {
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    try { await api.put(`/notifications/${id}/read`); } catch { /* silent */ }
  },

  markAllRead: async () => {
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
    try { await api.put('/notifications/read-all'); } catch { /* silent */ }
  },

  acceptInvitation: async (notificationId, invitationId) => {
    try {
      const res = await api.post(`/team-members/invitations/${invitationId}/accept`);
      if (!res.data.success) return null;
      const { accessLevel, boardId, boardName } = res.data.data as InvitationResult;
      const userName = useAuthStore.getState().user?.name || '';
      useTeamAccessStore.getState().enterTeamAccess({
        accessLevel,
        boardId,
        boardName,
        memberName: userName,
      });
      set(s => {
        const wasUnread = s.notifications.find(n => n.id === notificationId && !n.isRead);
        return {
          notifications: s.notifications.filter(n => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
        };
      });
      return { accessLevel, boardId, boardName };
    } catch {
      return null;
    }
  },

  rejectInvitation: async (notificationId, invitationId) => {
    try {
      const res = await api.post(`/team-members/invitations/${invitationId}/reject`);
      if (!res.data.success) return false;
      set(s => {
        const wasUnread = s.notifications.find(n => n.id === notificationId && !n.isRead);
        return {
          notifications: s.notifications.filter(n => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
        };
      });
      return true;
    } catch {
      return false;
    }
  },
}));

export default useNotificationStore;

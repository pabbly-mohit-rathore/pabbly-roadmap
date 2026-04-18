import api from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

const SUPPORTED = typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return buffer;
}

export const pushNotifications = {
  isSupported(): boolean {
    return SUPPORTED;
  },

  getPermission(): NotificationPermission {
    return SUPPORTED ? Notification.permission : 'denied';
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!SUPPORTED) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.error('SW registration failed:', err);
      return null;
    }
  },

  async getSubscription(): Promise<PushSubscription | null> {
    if (!SUPPORTED) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  },

  async isSubscribed(): Promise<boolean> {
    const sub = await this.getSubscription();
    return !!sub;
  },

  async subscribe(): Promise<boolean> {
    if (!SUPPORTED) {
      throw new Error('Push notifications are not supported in this browser.');
    }
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('Push notifications are not configured.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied.');
    }

    const reg = (await this.registerServiceWorker()) || (await navigator.serviceWorker.ready);
    if (!reg) throw new Error('Service worker registration failed.');

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    await api.post('/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    });

    return true;
  },

  async unsubscribe(): Promise<boolean> {
    const subscription = await this.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    try { await api.post('/push/unsubscribe', { endpoint }); } catch { /* ignore */ }
    try { await subscription.unsubscribe(); } catch { /* ignore */ }
    return true;
  },
};

export default pushNotifications;

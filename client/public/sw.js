// Pabbly Roadmap Service Worker — handles browser push notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Pabbly Roadmap', body: 'You have a new notification', url: '/' };

  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; }
    catch { payload.body = event.data.text(); }
  }

  const options = {
    body: payload.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: payload.url || '/' },
    tag: payload.type || 'pabbly-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            client.focus();
            client.postMessage({ type: 'navigate', url: targetUrl });
            return;
          }
        } catch { /* ignore */ }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

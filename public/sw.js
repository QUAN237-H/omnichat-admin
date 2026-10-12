/* OmniChat Ops service worker: install + push alerts. No desk page-warming. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const title = typeof data.title === 'string' && data.title ? data.title : 'OmniChat Ops';
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/notifications';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      renotify: typeof data.tag === 'string',
      icon: '/brand/omnichat-icon-192.png',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/notifications';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = new URL(url, self.location.origin).href;
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if (client.url !== target && 'navigate' in client) await client.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});

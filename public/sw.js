// Minimal service worker whose only job is Web Push: receive a push event
// from the browser's push service, show a notification, and route taps back
// into the app. Registered from lib/push/register.ts.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'CoachHub', body: event.data.text() };
  }

  const { title = 'CoachHub', body, tag, url = '/' } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url },
    })
  );
});

// Browsers may invalidate a push subscription's endpoint out from under us
// (key rotation, storage eviction) and fire this instead of just going
// silent. Re-subscribe with the same key, then hand the new subscription to
// any open tab — the service worker has no Supabase session of its own, so
// it can't persist the new endpoint itself; lib/push/register.ts does that
// via the 'PUSH_SUBSCRIPTION_CHANGED' message.
self.addEventListener('pushsubscriptionchange', (event) => {
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
  if (!applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then(async (subscription) => {
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: subscription.toJSON() });
        }
      })
      .catch((err) => console.error('sw: failed to resubscribe after pushsubscriptionchange', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

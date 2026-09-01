self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  event.waitUntil((async () => {
    try {
      const payload = event.data.json();
      const notification = payload.notification || {};
      const data = payload.data || {};
      const title = notification.title || data.title || 'Notificación';
      const options = {
        body: notification.body || data.body || '',
        icon: notification.icon || '/favicon.png',
        badge: '/favicon.png',
        tag: data.id_notificacion
          ? `notificacion-${data.id_notificacion}`
          : 'sgpmp-notificacion',
        data: { ...data, url: data.url || '/dashboard' },
      };

      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      windows.forEach((client) => {
        client.postMessage({ type: 'SGPMP_FCM_NOTIFICATION' });
      });
      await self.registration.showNotification(title, options);
    } catch {
      // Un payload inválido no debe interrumpir otros eventos del Service Worker.
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || '/dashboard';
  let targetUrl = new URL('/dashboard', self.location.origin).href;
  try {
    const parsedUrl = new URL(requestedUrl, self.location.origin);
    if (parsedUrl.origin === self.location.origin) targetUrl = parsedUrl.href;
  } catch {
    // Mantiene el destino seguro por defecto.
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    const client = windows[0];
    if (client) {
      if ('navigate' in client) await client.navigate(targetUrl);
      return client.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});

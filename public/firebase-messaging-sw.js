// Service Worker simple para Firebase Cloud Messaging
self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activado");
  self.clients.claim();
});

// Manejar notificaciones en background
self.addEventListener("push", (event) => {
  console.log("Push recibido en background:", event);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log("Datos de notificación:", data);

      const notification = data.notification || {};
      const title = notification.title || "Notificación";
      const options = {
        body: notification.body || "",
        icon: notification.icon || "/favicon.png",
        badge: "/favicon.png",
        tag: "notification",
        data: data.data || {},
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (error) {
      console.error("Error procesando notificación:", error);
    }
  }
});

// Manejar clicks en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("Notificación clickeada:", event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Si hay una ventana abierta, enfocarse en ella
      for (let client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});

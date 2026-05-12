//public\sw.js
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const visibleClients = clientsArr.filter((client) => client.visibilityState === "visible");

      if (visibleClients.length > 0) {
        visibleClients.forEach((client) => {
          client.postMessage({
            type: "KRONIX_STORE_PUSH_FOREGROUND",
            payload: data,
          });
        });

        return;
      }

      return self.registration.showNotification(data.title || "KroniX Store", {
        body: data.body || "Tienes una nueva actualización.",
        tag: data.tag || "kronix-store",
        requireInteraction: true,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: {
          url: data.url || "/",
          sound: data.sound || "store-general-alert",
          ts: data.ts || Date.now(),
        },
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(urlToOpen);
          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});